package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/driver/sqliteshim"
)

var dbDialect string // "sqlite" or "postgres"

func setupDB() *bun.DB {
	dsn := os.Getenv("DATABASE_URL")

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

	if err := seedIfEmpty(ctx, bunDB); err != nil {
		slog.Error("seeding failed", "error", err)
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

func seedIfEmpty(ctx context.Context, db *bun.DB) error {
	count, err := db.NewSelect().Model((*Post)(nil)).Count(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	slog.Info("seeding database with sample data")

	// Create a series for the Go posts
	goSeries := Series{
		ID:          uuid.New().String(),
		Slug:        "go-essentials",
		Name:        "Go Essentials",
		Description: "A practical series covering Go fundamentals — from CLI tools to concurrency patterns and error handling.",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if _, err := db.NewInsert().Model(&goSeries).Exec(ctx); err != nil {
		return fmt.Errorf("seed series: %w", err)
	}

	seriesID := goSeries.ID

	posts := []Post{
		{
			ID:    uuid.New().String(),
			Slug:  "hello-world",
			Title: "Hello, World!",
			Excerpt: "Welcome to my terminal blog. Built with Go and React.",
			Content: `# Hello, World!

Welcome to my personal blog. This is a **terminal-themed** blog built with Go and React.

## Why a terminal theme?

Because terminals are beautiful. Clean, minimal, and focused on content.

### Tech Stack

- **Backend:** Go with Bun ORM
- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Database:** SQLite (Postgres ready)

## Code Example

Here's a simple Go HTTP handler:

` + "```go" + `
func handleGetPosts(w http.ResponseWriter, r *http.Request) {
    posts, err := getAllPosts(r.Context())
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    json.NewEncoder(w).Encode(posts)
}
` + "```" + `

## Architecture Diagram

` + "```mermaid" + `
graph TD
    A[Browser] -->|HTTP| B[Go Server]
    B -->|Bun ORM| C[(SQLite/Postgres)]
    B -->|Serves| D[React SPA]
    D -->|API calls| B
` + "```" + `

## What's Next

I'll be writing about:

- Systems programming
- Web development
- DevOps and infrastructure
- Open source projects

> "The best way to learn is to build something." — Every developer ever

Stay tuned for more posts!
`,
			Tags:      []string{"meta", "golang", "react"},
			Published: true,
			CreatedAt: time.Now().Add(-96 * time.Hour),
			UpdatedAt: time.Now().Add(-96 * time.Hour),
		},
		{
			ID:          uuid.New().String(),
			Slug:        "building-cli-tools-in-go",
			Title:       "Building CLI Tools in Go",
			Excerpt:     "A practical guide to building command-line tools with Go's standard library and cobra.",
			SeriesID:    &seriesID,
			SeriesOrder: 1,
			Content: `# Building CLI Tools in Go

Go is one of the best languages for building CLI tools. Single binary, fast startup, great standard library.

## Why Go for CLI?

1. **Single binary** — no runtime dependencies
2. **Fast compilation** — quick iteration
3. **Cross-compilation** — build for any OS/arch
4. **Great stdlib** — ` + "`flag`" + `, ` + "`os`" + `, ` + "`io`" + ` packages

## Basic Structure

` + "```go" + `
package main

import (
    "flag"
    "fmt"
    "os"
)

func main() {
    verbose := flag.Bool("v", false, "verbose output")
    flag.Parse()

    args := flag.Args()
    if len(args) == 0 {
        fmt.Fprintln(os.Stderr, "error: no arguments provided")
        os.Exit(1)
    }

    if *verbose {
        fmt.Printf("Processing %d arguments\n", len(args))
    }

    for _, arg := range args {
        process(arg)
    }
}
` + "```" + `

## Handling stdin

A good CLI tool should handle piped input:

` + "```go" + `
func readInput() ([]byte, error) {
    stat, _ := os.Stdin.Stat()
    if (stat.Mode() & os.ModeCharDevice) == 0 {
        return io.ReadAll(os.Stdin)
    }
    return nil, fmt.Errorf("no input")
}
` + "```" + `

## Error Handling

Always exit with proper codes:

| Code | Meaning |
|------|---------|
| 0    | Success |
| 1    | General error |
| 2    | Usage error |
| 126  | Permission denied |
| 127  | Command not found |

## Conclusion

Go makes CLI development a joy. Start with the standard library, reach for ` + "`cobra`" + ` when you need subcommands.
`,
			Tags:      []string{"golang", "cli", "tutorial"},
			Published: true,
			CreatedAt: time.Now().Add(-72 * time.Hour),
			UpdatedAt: time.Now().Add(-72 * time.Hour),
		},
		{
			ID:          uuid.New().String(),
			Slug:        "go-concurrency-patterns",
			Title:       "Go Concurrency Patterns That Actually Matter",
			Excerpt:     "Practical goroutine and channel patterns beyond the basics — fan-out/fan-in, errgroup, context cancellation, and rate limiting.",
			SeriesID:    &seriesID,
			SeriesOrder: 2,
			Content: `# Go Concurrency Patterns That Actually Matter

Go's concurrency primitives are simple — goroutines and channels. But combining them effectively takes practice. Here are the patterns I reach for most often in production code.

## 1. The Worker Pool

The most common pattern. You have N jobs and want to limit concurrency:

` + "```go" + `
func processItems(items []Item, workers int) []Result {
    jobs := make(chan Item, len(items))
    results := make(chan Result, len(items))

    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for item := range jobs {
                results <- process(item)
            }
        }()
    }

    for _, item := range items {
        jobs <- item
    }
    close(jobs)

    go func() {
        wg.Wait()
        close(results)
    }()

    var out []Result
    for r := range results {
        out = append(out, r)
    }
    return out
}
` + "```" + `

## 2. errgroup — The Better WaitGroup

` + "```go" + `
func fetchAll(ctx context.Context, urls []string) ([]Response, error) {
    g, ctx := errgroup.WithContext(ctx)
    responses := make([]Response, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetchURL(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            responses[i] = resp
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return responses, nil
}
` + "```" + `

## 3. Context Cancellation Done Right

` + "```go" + `
func pollUntilReady(ctx context.Context, id string) error {
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            status, err := checkStatus(ctx, id)
            if err != nil {
                return err
            }
            if status == "ready" {
                return nil
            }
        }
    }
}
` + "```" + `

## 4. Rate Limiting with a Semaphore

` + "```go" + `
type RateLimiter struct {
    sem chan struct{}
}

func NewRateLimiter(maxConcurrent int) *RateLimiter {
    return &RateLimiter{sem: make(chan struct{}, maxConcurrent)}
}

func (r *RateLimiter) Do(ctx context.Context, fn func() error) error {
    select {
    case r.sem <- struct{}{}:
        defer func() { <-r.sem }()
        return fn()
    case <-ctx.Done():
        return ctx.Err()
    }
}
` + "```" + `

## Rules of Thumb

| Rule | Why |
|------|-----|
| Always pass context | Cancellation must propagate |
| Goroutines need exit paths | Leaked goroutines = leaked memory |
| Close channels from sender | Receivers should never close |

> Concurrency is not parallelism. — Rob Pike
`,
			Tags:      []string{"golang", "concurrency", "patterns"},
			Published: true,
			CreatedAt: time.Now().Add(-48 * time.Hour),
			UpdatedAt: time.Now().Add(-48 * time.Hour),
		},
		{
			ID:          uuid.New().String(),
			Slug:        "go-error-handling",
			Title:       "Idiomatic Error Handling in Go",
			Excerpt:     "Beyond if err != nil — sentinel errors, custom types, wrapping, and the errors.Is/As pattern.",
			SeriesID:    &seriesID,
			SeriesOrder: 3,
			Content: `# Idiomatic Error Handling in Go

Yes, Go has a lot of ` + "`if err != nil`" + `. But there's more nuance to error handling than just checking and returning.

## Sentinel Errors

` + "```go" + `
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
)

func GetUser(id string) (*User, error) {
    user, err := db.Find(id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}
` + "```" + `

## Custom Error Types

` + "```go" + `
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}
` + "```" + `

## Error Wrapping

` + "```go" + `
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config from %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }
    return &cfg, nil
}
` + "```" + `

## errors.Is vs errors.As

` + "```go" + `
// Check value
if errors.Is(err, ErrNotFound) { ... }

// Extract typed error
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    log.Printf("path: %s", pathErr.Path)
}
` + "```" + `

## Error Flow Diagram

` + "```mermaid" + `
graph LR
    A[Function Call] --> B{err != nil?}
    B -->|Yes| C{Sentinel?}
    B -->|No| D[Continue]
    C -->|Yes| E[Handle specifically]
    C -->|No| F[Wrap with context]
    F --> G[Return to caller]
` + "```" + `

## Anti-Patterns

` + "```go" + `
// BAD: swallowing errors
result, _ := doSomething()

// BAD: logging and returning
if err != nil {
    log.Printf("error: %v", err)
    return err
}

// GOOD: wrap with what YOU were doing
return fmt.Errorf("fetch user %s: %w", id, err)
` + "```" + `

| Pattern | When to Use |
|---------|------------|
| Sentinel errors | Match specific conditions |
| Custom types | Error carries structured data |
| ` + "`fmt.Errorf(%w)`" + ` | Add context, preserve chain |
| ` + "`errors.Is`" + ` | Check specific error values |
| ` + "`errors.As`" + ` | Extract typed error details |

> Handle errors at the right level.
`,
			Tags:      []string{"golang", "errors", "patterns"},
			Published: true,
			CreatedAt: time.Now().Add(-24 * time.Hour),
			UpdatedAt: time.Now().Add(-24 * time.Hour),
		},
		{
			ID:    uuid.New().String(),
			Slug:  "vim-workflow",
			Title: "My Vim Workflow in 2024",
			Excerpt: "How I use Neovim as my primary editor for everything.",
			Content: `# My Vim Workflow in 2024

I've been using Vim (now Neovim) for over 5 years. Here's my current setup.

## Core Plugins

- **telescope.nvim** — fuzzy finder for everything
- **treesitter** — syntax highlighting and code navigation
- **LSP** — language server protocol for autocompletion
- **oil.nvim** — file explorer that feels like a buffer

## Key Mappings

` + "```vim" + `
let mapleader = " "
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>
nnoremap <leader>ff :Telescope find_files<CR>
nnoremap <leader>fg :Telescope live_grep<CR>
` + "```" + `

## Plugin Architecture

` + "```mermaid" + `
graph TD
    A[init.lua] --> B[lazy.nvim]
    B --> C[telescope.nvim]
    B --> D[treesitter]
    B --> E[nvim-lspconfig]
    B --> F[oil.nvim]
    E --> G[gopls]
    E --> H[typescript-language-server]
    E --> I[lua-language-server]
` + "```" + `

## Directory Structure

` + "```" + `
~/.config/nvim/
├── init.lua
├── lua/
│   ├── plugins/
│   │   ├── telescope.lua
│   │   ├── treesitter.lua
│   │   └── lsp.lua
│   └── config/
│       ├── keymaps.lua
│       └── options.lua
└── after/
    └── ftplugin/
        ├── go.lua
        └── typescript.lua
` + "```" + `

> The best editor is the one you know well.
`,
			Tags:      []string{"vim", "tools", "productivity"},
			Published: true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, p := range posts {
		if _, err := db.NewInsert().Model(&p).Exec(ctx); err != nil {
			return fmt.Errorf("seed post %s: %w", p.Slug, err)
		}
	}

	slog.Info("seeded database", "posts", len(posts), "series", 1)
	return nil
}
