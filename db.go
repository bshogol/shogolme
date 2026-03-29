package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/driver/sqliteshim"
)

var dbDialect string // "sqlite" or "postgres"

func setupDB(dsn string) *bun.DB {

	var bunDB *bun.DB

	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		dbDialect = "postgres"
		sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
		bunDB = bun.NewDB(sqldb, pgdialect.New())
		slog.Info("using postgres database")
	} else {
		dbDialect = "sqlite"
		if dsn == "" {
			dsn = "file:blog.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)"
		}
		sqldb, err := sql.Open(sqliteshim.DriverName(), dsn)
		if err != nil {
			slog.Error("failed to open sqlite", "error", err)
			os.Exit(1)
		}
		bunDB = bun.NewDB(sqldb, sqlitedialect.New())
		slog.Info("using sqlite database")
	}

	ctx := context.Background()
	if err := createSchema(ctx, bunDB); err != nil {
		slog.Error("schema creation failed", "error", err)
		os.Exit(1)
	}

	return bunDB
}

func createSchema(ctx context.Context, db *bun.DB) error {
	// Create series table first (posts references it)
	if _, err := db.NewCreateTable().Model((*Series)(nil)).IfNotExists().Exec(ctx); err != nil {
		return fmt.Errorf("create series table: %w", err)
	}

	// Create posts table
	if _, err := db.NewCreateTable().Model((*Post)(nil)).IfNotExists().Exec(ctx); err != nil {
		return fmt.Errorf("create posts table: %w", err)
	}

	// Create rss_subscribers table
	if _, err := db.NewCreateTable().Model((*RSSSubscriber)(nil)).IfNotExists().Exec(ctx); err != nil {
		return fmt.Errorf("create rss_subscribers table: %w", err)
	}

	// Run migrations for existing databases
	if err := runMigrations(ctx, db); err != nil {
		return fmt.Errorf("migrations: %w", err)
	}

	// Setup FTS
	if err := setupFTS(ctx, db); err != nil {
		return fmt.Errorf("fts setup: %w", err)
	}

	return nil
}

type Migration struct {
	bun.BaseModel `bun:"table:migrations,alias:m"`

	Version     int       `bun:"version,pk"`
	Description string    `bun:"description,notnull"`
	AppliedAt   time.Time `bun:"applied_at,notnull"`
}

type migrationEntry struct {
	version     int
	description string
	sql         string
}

var migrations = []migrationEntry{
	{1, "add view_count to posts", "ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0"},
	{2, "add series_id to posts", "ALTER TABLE posts ADD COLUMN series_id TEXT"},
	{3, "add series_order to posts", "ALTER TABLE posts ADD COLUMN series_order INTEGER DEFAULT 0"},
}

func runMigrations(ctx context.Context, db *bun.DB) error {
	// Create migrations table
	if _, err := db.NewCreateTable().Model((*Migration)(nil)).IfNotExists().Exec(ctx); err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	// Get current version
	var current int
	err := db.NewSelect().Model((*Migration)(nil)).ColumnExpr("COALESCE(MAX(version), 0)").Scan(ctx, &current)
	if err != nil {
		current = 0
	}

	// Apply pending migrations
	applied := 0
	for _, m := range migrations {
		if m.version <= current {
			continue
		}

		if _, err := db.ExecContext(ctx, m.sql); err != nil {
			errMsg := err.Error()
			// Skip if column already exists (idempotent)
			if strings.Contains(errMsg, "duplicate column") ||
				strings.Contains(errMsg, "already exists") ||
				strings.Contains(errMsg, "duplicate column name") {
				// Still record the migration as applied
			} else {
				return fmt.Errorf("migration %d (%s): %w", m.version, m.description, err)
			}
		}

		record := Migration{
			Version:     m.version,
			Description: m.description,
			AppliedAt:   time.Now(),
		}
		if _, err := db.NewInsert().Model(&record).Exec(ctx); err != nil {
			return fmt.Errorf("record migration %d: %w", m.version, err)
		}

		applied++
	}

	if applied > 0 {
		slog.Info("applied migrations", "count", applied, "current_version", migrations[len(migrations)-1].version)
	}

	return nil
}

func setupFTS(ctx context.Context, db *bun.DB) error {
	if dbDialect == "sqlite" {
		return setupSQLiteFTS(ctx, db)
	}
	return setupPostgresFTS(ctx, db)
}

func setupSQLiteFTS(ctx context.Context, db *bun.DB) error {
	// Create FTS5 virtual table
	_, err := db.ExecContext(ctx, `
		CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
			title, excerpt, content,
			content='posts',
			content_rowid='rowid'
		)
	`)
	if err != nil {
		return fmt.Errorf("create fts table: %w", err)
	}

	// Create sync triggers
	triggers := []string{
		`CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
			INSERT INTO posts_fts(rowid, title, excerpt, content) VALUES (new.rowid, new.title, new.excerpt, new.content);
		END`,
		`CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
			INSERT INTO posts_fts(posts_fts, rowid, title, excerpt, content) VALUES('delete', old.rowid, old.title, old.excerpt, old.content);
		END`,
		`CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
			INSERT INTO posts_fts(posts_fts, rowid, title, excerpt, content) VALUES('delete', old.rowid, old.title, old.excerpt, old.content);
			INSERT INTO posts_fts(rowid, title, excerpt, content) VALUES (new.rowid, new.title, new.excerpt, new.content);
		END`,
	}

	for _, t := range triggers {
		if _, err := db.ExecContext(ctx, t); err != nil {
			return fmt.Errorf("create trigger: %w", err)
		}
	}

	// Rebuild FTS index
	_, _ = db.ExecContext(ctx, "INSERT INTO posts_fts(posts_fts) VALUES('rebuild')")

	return nil
}

func setupPostgresFTS(ctx context.Context, db *bun.DB) error {
	stmts := []string{
		// Add tsvector column
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector`,

		// Create GIN index
		`CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING gin(search_vector)`,

		// Create trigger function
		`CREATE OR REPLACE FUNCTION posts_search_update() RETURNS trigger AS $$
		BEGIN
			NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
				setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
				setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,

		// Create trigger
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'posts_search_trigger') THEN
				CREATE TRIGGER posts_search_trigger BEFORE INSERT OR UPDATE ON posts
				FOR EACH ROW EXECUTE FUNCTION posts_search_update();
			END IF;
		END $$`,

		// Backfill existing posts
		`UPDATE posts SET search_vector =
			setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
			setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
			setweight(to_tsvector('english', COALESCE(content, '')), 'C')
		WHERE search_vector IS NULL`,
	}

	for _, s := range stmts {
		if _, err := db.ExecContext(ctx, s); err != nil {
			return fmt.Errorf("postgres fts setup: %w", err)
		}
	}

	return nil
}

// searchPostsFTS performs full-text search using the appropriate engine.
func searchPostsFTS(ctx context.Context, query string) ([]SearchResult, error) {
	if dbDialect == "postgres" {
		return searchPostsPostgres(ctx, query)
	}
	return searchPostsSQLite(ctx, query)
}

func searchPostsSQLite(ctx context.Context, query string) ([]SearchResult, error) {
	// Sanitize for FTS5: wrap each term in double quotes
	terms := strings.Fields(query)
	for i, t := range terms {
		t = strings.ReplaceAll(t, `"`, `""`)
		terms[i] = `"` + t + `"`
	}
	ftsQuery := strings.Join(terms, " ")

	var results []SearchResult
	err := db.NewRaw(`
		SELECT p.id, p.slug, p.title, p.excerpt, p.tags, p.created_at,
			snippet(posts_fts, 2, '<mark>', '</mark>', '...', 32) AS snippet,
			rank
		FROM posts_fts
		JOIN posts p ON p.rowid = posts_fts.rowid
		WHERE posts_fts MATCH ?
		AND p.published = 1
		ORDER BY rank
		LIMIT 20
	`, ftsQuery).Scan(ctx, &results)

	if err != nil {
		return nil, err
	}
	if results == nil {
		results = []SearchResult{}
	}
	return results, nil
}

func searchPostsPostgres(ctx context.Context, query string) ([]SearchResult, error) {
	var results []SearchResult
	err := db.NewRaw(`
		SELECT p.id, p.slug, p.title, p.excerpt, p.tags, p.created_at,
			ts_headline('english', p.content, plainto_tsquery('english', ?),
				'StartSel=<mark>,StopSel=</mark>,MaxWords=35,MinWords=15') AS snippet,
			ts_rank(p.search_vector, plainto_tsquery('english', ?)) AS rank
		FROM posts p
		WHERE p.published = true
		AND p.search_vector @@ plainto_tsquery('english', ?)
		ORDER BY rank DESC
		LIMIT 20
	`, query, query, query).Scan(ctx, &results)

	if err != nil {
		return nil, err
	}
	if results == nil {
		results = []SearchResult{}
	}
	return results, nil
}

