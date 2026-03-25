package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"embed"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"hash/crc32"
	"html"
	"io/fs"
	"log/slog"
	"math"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

//go:embed all:frontend/dist
var embeddedFrontend embed.FS

var db *bun.DB

func main() {
	// Setup structured logging
	var handler slog.Handler
	if os.Getenv("LOG_FORMAT") == "text" {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	}
	slog.SetDefault(slog.New(handler))

	db = setupDB()
	defer db.Close()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /healthz", handleHealthCheck)

	// Public API routes
	mux.HandleFunc("GET /api/posts", handleGetPosts)
	mux.HandleFunc("GET /api/posts/search", handleSearchPosts)
	mux.HandleFunc("GET /api/posts/{slug}", handleGetPost)
	mux.HandleFunc("GET /api/tags", handleGetTags)
	mux.HandleFunc("GET /api/series", handleGetSeries)
	mux.HandleFunc("GET /api/series/{slug}", handleGetSeriesBySlug)

	// Admin API routes (API key protected)
	mux.HandleFunc("POST /api/admin/posts", adminAuth(handleCreatePost))
	mux.HandleFunc("PUT /api/admin/posts/{id}", adminAuth(handleUpdatePost))
	mux.HandleFunc("DELETE /api/admin/posts/{id}", adminAuth(handleDeletePost))
	mux.HandleFunc("POST /api/admin/series", adminAuth(handleCreateSeries))
	mux.HandleFunc("PUT /api/admin/series/{id}", adminAuth(handleUpdateSeries))
	mux.HandleFunc("DELETE /api/admin/series/{id}", adminAuth(handleDeleteSeries))

	// RSS feed
	mux.HandleFunc("GET /feed.xml", handleRSSFeed)

	// Sitemap
	mux.HandleFunc("GET /sitemap.xml", handleSitemap)

	// Serve frontend
	var frontendFS fs.FS
	if dir := os.Getenv("FRONTEND_DIR"); dir != "" {
		slog.Info("serving frontend from filesystem", "dir", dir)
		frontendFS = os.DirFS(dir)
	} else {
		sub, err := fs.Sub(embeddedFrontend, "frontend/dist")
		if err != nil {
			slog.Error("failed to access embedded frontend", "error", err)
			os.Exit(1)
		}
		slog.Info("serving frontend from embedded filesystem")
		frontendFS = sub
	}
	mux.Handle("/", spaHandler(frontendFS))

	// Build middleware chain: outermost → innermost
	rl := newRateLimiter()
	var h http.Handler = mux
	h = rateLimitMiddleware(rl, h)
	h = etagMiddleware(h)
	h = gzipMiddleware(h)
	h = corsMiddleware(h)
	h = requestIDMiddleware(h)
	h = requestLoggerMiddleware(h)

	addr := ":5467"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      h,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		slog.Info("shutdown signal received", "signal", sig.String())

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			slog.Error("shutdown error", "error", err)
		}
	}()

	slog.Info("server starting", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}

// ============================================================================
// Middleware
// ============================================================================

// --- Request Logger ---

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func requestLoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", clientIP(r),
			"request_id", r.Header.Get("X-Request-ID"),
		)
	})
}

// --- Request ID ---

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = uuid.New().String()[:8]
			r.Header.Set("X-Request-ID", id)
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r)
	})
}

// --- CORS ---

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := os.Getenv("CORS_ORIGINS") // comma-separated, empty = same-origin only

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowedOrigins != "" {
			for _, allowed := range strings.Split(allowedOrigins, ",") {
				allowed = strings.TrimSpace(allowed)
				if allowed == "*" || allowed == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-Request-ID")
					w.Header().Set("Access-Control-Max-Age", "86400")
					break
				}
			}
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// --- Gzip Compression ---

type gzipResponseWriter struct {
	http.ResponseWriter
	writer *gzip.Writer
}

func (g *gzipResponseWriter) Write(b []byte) (int, error) {
	return g.writer.Write(b)
}

var compressibleTypes = map[string]bool{
	"application/json":    true,
	"text/html":           true,
	"text/css":            true,
	"application/javascript": true,
	"application/xml":     true,
	"text/xml":            true,
	"application/rss+xml": true,
	"text/plain":          true,
}

func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only compress API, feed, and sitemap responses — let FileServer handle static files
		path := r.URL.Path
		shouldCompress := strings.HasPrefix(path, "/api/") ||
			path == "/feed.xml" ||
			path == "/sitemap.xml" ||
			path == "/healthz"

		if !shouldCompress || !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gz, _ := gzip.NewWriterLevel(w, gzip.BestSpeed)
		defer gz.Close()

		gzw := &gzipResponseWriter{ResponseWriter: w, writer: gz}
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Del("Content-Length")
		w.Header().Set("Vary", "Accept-Encoding")

		next.ServeHTTP(gzw, r)
	})
}

// --- ETag ---

type bufferedResponseWriter struct {
	http.ResponseWriter
	buf    bytes.Buffer
	status int
}

func (b *bufferedResponseWriter) Write(data []byte) (int, error) {
	return b.buf.Write(data)
}

func (b *bufferedResponseWriter) WriteHeader(code int) {
	b.status = code
}

func etagMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only apply ETag to API responses — static files have their own caching
		if r.Method != http.MethodGet || !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		buf := &bufferedResponseWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(buf, r)

		body := buf.buf.Bytes()

		// Skip ETag for large responses
		if len(body) > 1<<20 {
			w.WriteHeader(buf.status)
			w.Write(body)
			return
		}

		etag := fmt.Sprintf(`"%08x"`, crc32.ChecksumIEEE(body))
		w.Header().Set("ETag", etag)

		if r.Header.Get("If-None-Match") == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}

		// Copy buffered headers
		w.WriteHeader(buf.status)
		w.Write(body)
	})
}

// --- Rate Limiting ---

type visitor struct {
	tokens   float64
	lastSeen time.Time
	mu       sync.Mutex
}

type rateLimiter struct {
	visitors sync.Map
	rate     float64 // tokens per second
	burst    float64 // max tokens
}

func newRateLimiter() *rateLimiter {
	rate := 10.0
	burst := 20.0
	if v := os.Getenv("RATE_LIMIT_RPS"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			rate = f
		}
	}
	if v := os.Getenv("RATE_LIMIT_BURST"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			burst = f
		}
	}

	rl := &rateLimiter{rate: rate, burst: burst}

	// Cleanup goroutine
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			rl.visitors.Range(func(key, value any) bool {
				v := value.(*visitor)
				v.mu.Lock()
				if time.Since(v.lastSeen) > 10*time.Minute {
					rl.visitors.Delete(key)
				}
				v.mu.Unlock()
				return true
			})
		}
	}()

	return rl
}

func (rl *rateLimiter) allow(ip string) bool {
	val, _ := rl.visitors.LoadOrStore(ip, &visitor{tokens: rl.burst, lastSeen: time.Now()})
	v := val.(*visitor)

	v.mu.Lock()
	defer v.mu.Unlock()

	elapsed := time.Since(v.lastSeen).Seconds()
	v.lastSeen = time.Now()
	v.tokens = math.Min(rl.burst, v.tokens+elapsed*rl.rate)

	if v.tokens < 1 {
		return false
	}
	v.tokens--
	return true
}

func rateLimitMiddleware(rl *rateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only rate limit API paths
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		ip := clientIP(r)
		if !rl.allow(ip) {
			w.Header().Set("Retry-After", "1")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	// Strip port from RemoteAddr
	addr := r.RemoteAddr
	if i := strings.LastIndex(addr, ":"); i > 0 {
		return addr[:i]
	}
	return addr
}

// ============================================================================
// Handlers
// ============================================================================

func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	dbStatus := "connected"
	code := http.StatusOK

	if err := db.PingContext(r.Context()); err != nil {
		status = "error"
		dbStatus = "disconnected"
		code = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{
		"status":    status,
		"db":        dbStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// --- Posts ---

func handleGetPosts(w http.ResponseWriter, r *http.Request) {
	tag := r.URL.Query().Get("tag")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var posts []Post
	q := db.NewSelect().Model(&posts).
		Column("id", "slug", "title", "excerpt", "tags", "published", "created_at", "view_count", "series_id", "series_order").
		Where("published = ?", true).
		OrderExpr("created_at DESC").
		Limit(limit).
		Offset(offset)

	if tag != "" {
		q = q.Where(tagFilterSQL(), tag)
	}

	if err := q.Scan(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if posts == nil {
		posts = []Post{}
	}

	writeJSON(w, posts)
}

func handleGetPost(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	var post Post
	err := db.NewSelect().Model(&post).
		Where("slug = ?", slug).
		Where("published = ?", true).
		Scan(r.Context())

	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	// Increment view count async
	go func() {
		_, _ = db.NewUpdate().Model((*Post)(nil)).
			Set("view_count = view_count + 1").
			Where("id = ?", post.ID).
			Exec(context.Background())
	}()

	// Build response with series info if applicable
	result := PostWithSeries{Post: post}

	if post.SeriesID != nil {
		var series Series
		if err := db.NewSelect().Model(&series).Where("id = ?", *post.SeriesID).Scan(r.Context()); err == nil {
			var seriesPosts []Post
			_ = db.NewSelect().Model(&seriesPosts).
				Column("id", "slug", "title", "series_order").
				Where("series_id = ?", series.ID).
				Where("published = ?", true).
				OrderExpr("series_order ASC").
				Scan(r.Context())

			items := make([]SeriesPostItem, len(seriesPosts))
			for i, sp := range seriesPosts {
				items[i] = SeriesPostItem{
					ID: sp.ID, Slug: sp.Slug, Title: sp.Title, SeriesOrder: sp.SeriesOrder,
				}
			}

			result.SeriesInfo = &PostSeriesInfo{
				ID: series.ID, Slug: series.Slug, Name: series.Name, Posts: items,
			}
		}
	}

	writeJSON(w, result)
}

func handleSearchPosts(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, []SearchResult{})
		return
	}

	results, err := searchPostsFTS(r.Context(), q)
	if err != nil {
		slog.Error("search failed", "query", q, "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, results)
}

func handleGetTags(w http.ResponseWriter, r *http.Request) {
	counts := r.URL.Query().Get("counts")

	if counts == "true" {
		type TagCount struct {
			Name  string `json:"name"`
			Count int    `json:"count"`
		}
		var tags []TagCount
		err := db.NewRaw(tagCountSQL()).Scan(context.Background(), &tags)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if tags == nil {
			tags = []TagCount{}
		}
		writeJSON(w, tags)
		return
	}

	var tags []string
	err := db.NewRaw(tagListSQL()).Scan(context.Background(), &tags)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if tags == nil {
		tags = []string{}
	}

	writeJSON(w, tags)
}

// --- Series ---

func handleGetSeries(w http.ResponseWriter, r *http.Request) {
	var series []Series
	err := db.NewSelect().Model(&series).
		OrderExpr("created_at DESC").
		Scan(r.Context())

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if series == nil {
		series = []Series{}
	}

	writeJSON(w, series)
}

func handleGetSeriesBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	var series Series
	if err := db.NewSelect().Model(&series).Where("slug = ?", slug).Scan(r.Context()); err != nil {
		http.Error(w, "series not found", http.StatusNotFound)
		return
	}

	var posts []Post
	_ = db.NewSelect().Model(&posts).
		Column("id", "slug", "title", "series_order", "excerpt", "created_at", "tags").
		Where("series_id = ?", series.ID).
		Where("published = ?", true).
		OrderExpr("series_order ASC").
		Scan(r.Context())

	items := make([]SeriesPostItem, len(posts))
	for i, p := range posts {
		items[i] = SeriesPostItem{
			ID: p.ID, Slug: p.Slug, Title: p.Title, SeriesOrder: p.SeriesOrder,
		}
	}

	writeJSON(w, SeriesWithPosts{Series: series, Posts: items})
}

// --- Admin handlers ---

func adminAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := os.Getenv("ADMIN_API_KEY")
		if apiKey == "" {
			apiKey = "changeme"
		}

		key := r.Header.Get("X-API-Key")
		if key == "" {
			key = r.URL.Query().Get("api_key")
		}

		if key != apiKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func handleCreatePost(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Slug        string   `json:"slug"`
		Title       string   `json:"title"`
		Excerpt     string   `json:"excerpt"`
		Content     string   `json:"content"`
		Tags        []string `json:"tags"`
		Published   bool     `json:"published"`
		SeriesID    *string  `json:"series_id"`
		SeriesOrder int      `json:"series_order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if input.Slug == "" || input.Title == "" {
		http.Error(w, "slug and title are required", http.StatusBadRequest)
		return
	}

	post := Post{
		ID:          uuid.New().String(),
		Slug:        input.Slug,
		Title:       input.Title,
		Excerpt:     input.Excerpt,
		Content:     input.Content,
		Tags:        input.Tags,
		Published:   input.Published,
		SeriesID:    input.SeriesID,
		SeriesOrder: input.SeriesOrder,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if _, err := db.NewInsert().Model(&post).Exec(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, post)
}

func handleUpdatePost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var post Post
	if err := db.NewSelect().Model(&post).Where("id = ?", id).Scan(r.Context()); err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	var input struct {
		Slug        *string  `json:"slug"`
		Title       *string  `json:"title"`
		Excerpt     *string  `json:"excerpt"`
		Content     *string  `json:"content"`
		Tags        []string `json:"tags"`
		Published   *bool    `json:"published"`
		SeriesID    *string  `json:"series_id"`
		SeriesOrder *int     `json:"series_order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if input.Slug != nil {
		post.Slug = *input.Slug
	}
	if input.Title != nil {
		post.Title = *input.Title
	}
	if input.Excerpt != nil {
		post.Excerpt = *input.Excerpt
	}
	if input.Content != nil {
		post.Content = *input.Content
	}
	if input.Tags != nil {
		post.Tags = input.Tags
	}
	if input.Published != nil {
		post.Published = *input.Published
	}
	if input.SeriesID != nil {
		post.SeriesID = input.SeriesID
	}
	if input.SeriesOrder != nil {
		post.SeriesOrder = *input.SeriesOrder
	}
	post.UpdatedAt = time.Now()

	if _, err := db.NewUpdate().Model(&post).WherePK().Exec(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, post)
}

func handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	res, err := db.NewDelete().Model((*Post)(nil)).Where("id = ?", id).Exec(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleCreateSeries(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if input.Slug == "" || input.Name == "" {
		http.Error(w, "slug and name are required", http.StatusBadRequest)
		return
	}

	s := Series{
		ID:          uuid.New().String(),
		Slug:        input.Slug,
		Name:        input.Name,
		Description: input.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if _, err := db.NewInsert().Model(&s).Exec(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, s)
}

func handleUpdateSeries(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var s Series
	if err := db.NewSelect().Model(&s).Where("id = ?", id).Scan(r.Context()); err != nil {
		http.Error(w, "series not found", http.StatusNotFound)
		return
	}

	var input struct {
		Slug        *string `json:"slug"`
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if input.Slug != nil {
		s.Slug = *input.Slug
	}
	if input.Name != nil {
		s.Name = *input.Name
	}
	if input.Description != nil {
		s.Description = *input.Description
	}
	s.UpdatedAt = time.Now()

	if _, err := db.NewUpdate().Model(&s).WherePK().Exec(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, s)
}

func handleDeleteSeries(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	res, err := db.NewDelete().Model((*Series)(nil)).Where("id = ?", id).Exec(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "series not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- RSS Feed ---

type RSS struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel RSSChannel `xml:"channel"`
}

type RSSChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Items       []RSSItem `xml:"item"`
}

type RSSItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
}

func handleRSSFeed(w http.ResponseWriter, r *http.Request) {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = fmt.Sprintf("http://%s", r.Host)
	}

	var posts []Post
	err := db.NewSelect().Model(&posts).
		Where("published = ?", true).
		OrderExpr("created_at DESC").
		Limit(20).
		Scan(r.Context())

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Track RSS subscriber async
	go func() {
		ua := r.UserAgent()
		if ua == "" {
			return
		}
		sub := RSSSubscriber{
			ID:        uuid.New().String(),
			UserAgent: ua,
			LastSeen:  time.Now(),
		}
		_, _ = db.NewInsert().Model(&sub).
			On("CONFLICT (user_agent) DO UPDATE").
			Set("last_seen = EXCLUDED.last_seen").
			Exec(context.Background())
	}()

	items := make([]RSSItem, len(posts))
	for i, p := range posts {
		items[i] = RSSItem{
			Title:       p.Title,
			Link:        fmt.Sprintf("%s/post/%s", baseURL, p.Slug),
			Description: p.Excerpt,
			PubDate:     p.CreatedAt.Format(time.RFC1123Z),
			GUID:        p.ID,
		}
	}

	rss := RSS{
		Version: "2.0",
		Channel: RSSChannel{
			Title:       "~/blog",
			Link:        baseURL,
			Description: "A terminal-themed personal blog",
			Items:       items,
		},
	}

	w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
	xml.NewEncoder(w).Encode(rss)
}

// --- Sitemap ---

type URLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []SitemapURL `xml:"url"`
}

type SitemapURL struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}

func handleSitemap(w http.ResponseWriter, r *http.Request) {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = fmt.Sprintf("http://%s", r.Host)
	}

	urls := []SitemapURL{
		{Loc: baseURL + "/"},
		{Loc: baseURL + "/tags"},
	}

	var posts []Post
	err := db.NewSelect().Model(&posts).
		Column("slug", "updated_at").
		Where("published = ?", true).
		Scan(r.Context())

	if err == nil {
		for _, p := range posts {
			urls = append(urls, SitemapURL{
				Loc:     fmt.Sprintf("%s/post/%s", baseURL, p.Slug),
				LastMod: p.UpdatedAt.Format("2006-01-02"),
			})
		}
	}

	urlSet := URLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Write([]byte(xml.Header))
	xml.NewEncoder(w).Encode(urlSet)
}

// ============================================================================
// Helpers
// ============================================================================

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// spaHandler serves static files from an fs.FS and falls back to index.html.
// It injects OG meta tags for post URLs and sets cache headers on assets.
func spaHandler(fsys fs.FS) http.Handler {
	indexHTML, err := fs.ReadFile(fsys, "index.html")
	if err != nil {
		slog.Warn("index.html not found in frontend FS", "error", err)
		indexHTML = []byte("Frontend not built. Run: make build-frontend")
	}

	fileServer := http.FileServerFS(fsys)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Serve static files with cache headers
		if _, err := fs.Stat(fsys, path); err == nil {
			ext := filepath.Ext(path)
			// Hashed assets get long cache; others get short cache
			if strings.HasPrefix(path, "assets/") && (ext == ".js" || ext == ".css") {
				cacheWriter := &cacheHeaderWriter{ResponseWriter: w, cacheControl: "public, max-age=31536000, immutable"}
				fileServer.ServeHTTP(cacheWriter, r)
			} else if ext == ".svg" || ext == ".png" || ext == ".ico" || ext == ".woff2" {
				cacheWriter := &cacheHeaderWriter{ResponseWriter: w, cacheControl: "public, max-age=86400"}
				fileServer.ServeHTTP(cacheWriter, r)
			} else {
				fileServer.ServeHTTP(w, r)
			}
			return
		}

		// SPA fallback — inject OG tags for post URLs
		out := indexHTML
		if strings.HasPrefix(r.URL.Path, "/post/") {
			slug := strings.TrimPrefix(r.URL.Path, "/post/")
			if slug != "" {
				out = injectOGTags(out, slug, r)
			}
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Write(out)
	})
}

// cacheHeaderWriter overrides Cache-Control before the first write.
type cacheHeaderWriter struct {
	http.ResponseWriter
	cacheControl string
	wroteHeader  bool
}

func (c *cacheHeaderWriter) WriteHeader(code int) {
	if !c.wroteHeader {
		c.wroteHeader = true
		c.ResponseWriter.Header().Set("Cache-Control", c.cacheControl)
	}
	c.ResponseWriter.WriteHeader(code)
}

func (c *cacheHeaderWriter) Write(b []byte) (int, error) {
	if !c.wroteHeader {
		c.wroteHeader = true
		c.ResponseWriter.Header().Set("Cache-Control", c.cacheControl)
	}
	return c.ResponseWriter.Write(b)
}

// injectOGTags fetches post data and injects og: meta tags into the HTML.
func injectOGTags(htmlBytes []byte, slug string, r *http.Request) []byte {
	var post Post
	err := db.NewSelect().Model(&post).
		Column("title", "excerpt", "slug").
		Where("slug = ?", slug).
		Where("published = ?", true).
		Scan(r.Context())

	if err != nil {
		return htmlBytes
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = fmt.Sprintf("http://%s", r.Host)
	}

	ogTags := fmt.Sprintf(`
    <meta property="og:type" content="article" />
    <meta property="og:title" content="%s" />
    <meta property="og:description" content="%s" />
    <meta property="og:url" content="%s/post/%s" />
    <meta name="description" content="%s" />
    <title>%s | ~/blog</title>`,
		html.EscapeString(post.Title),
		html.EscapeString(post.Excerpt),
		baseURL,
		post.Slug,
		html.EscapeString(post.Excerpt),
		html.EscapeString(post.Title),
	)

	return bytes.Replace(htmlBytes, []byte("</head>"), []byte(ogTags+"\n  </head>"), 1)
}

// --- DB-dialect-aware SQL helpers ---

func tagFilterSQL() string {
	if dbDialect == "postgres" {
		return "EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.tags) t WHERE t = ?)"
	}
	return "EXISTS (SELECT 1 FROM json_each(p.tags) WHERE json_each.value = ?)"
}

func tagCountSQL() string {
	if dbDialect == "postgres" {
		return `SELECT t AS name, COUNT(*) AS count
			FROM posts p, jsonb_array_elements_text(p.tags) t
			WHERE p.published = true
			GROUP BY t
			ORDER BY count DESC, name ASC`
	}
	return `SELECT json_each.value AS name, COUNT(*) AS count
		FROM posts p, json_each(p.tags)
		WHERE p.published = 1
		GROUP BY json_each.value
		ORDER BY count DESC, name ASC`
}

func tagListSQL() string {
	if dbDialect == "postgres" {
		return `SELECT DISTINCT t
			FROM posts p, jsonb_array_elements_text(p.tags) t
			WHERE p.published = true
			ORDER BY t`
	}
	return `SELECT DISTINCT json_each.value
		FROM posts p, json_each(p.tags)
		WHERE p.published = 1
		ORDER BY json_each.value`
}
