# Go Backend: Performance, Security & Observability Middleware Stack

Apply this middleware and infrastructure pattern to any Go HTTP server. All stdlib — no external dependencies for middleware.

## Middleware Chain Order

Outermost to innermost:

```
requestLogger → requestID → CORS → gzip → etag → rateLimit → mux
```

## 1. Structured JSON Logging (`log/slog`)

Replace all `log.Printf`/`log.Fatal` with `log/slog`:

```go
var handler slog.Handler
if os.Getenv("LOG_FORMAT") == "text" {
    handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
} else {
    handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
}
slog.SetDefault(slog.New(handler))
```

## 2. Request Logger Middleware

Wrap `http.ResponseWriter` with a `statusRecorder` to capture status code:

```go
type statusRecorder struct {
    http.ResponseWriter
    status int
}

func (r *statusRecorder) WriteHeader(code int) {
    r.status = code
    r.ResponseWriter.WriteHeader(code)
}
```

Log: method, path, status, duration_ms, ip, request_id on every request.

## 3. Request ID Middleware

Generate a short unique ID per request. Check `X-Request-ID` header first (from upstream proxy), generate if missing. Set on both request header (for downstream handlers/logs) and response header:

```go
id := r.Header.Get("X-Request-ID")
if id == "" {
    id = uuid.New().String()[:8]
    r.Header.Set("X-Request-ID", id)
}
w.Header().Set("X-Request-ID", id)
```

## 4. CORS Middleware

Configurable via `CORS_ORIGINS` env var (comma-separated, or `*`):

- Check `Origin` header against allowed list
- Set `Access-Control-Allow-Origin`, `Allow-Methods`, `Allow-Headers`, `Max-Age`
- Handle `OPTIONS` preflight with `204 No Content`
- If `CORS_ORIGINS` is empty, no CORS headers are set (same-origin only)

## 5. Gzip Compression Middleware

- Only compress specific paths (`/api/`, `/feed.xml`, etc.) — **do not** compress static files served by `http.FileServer` (it handles its own caching/content negotiation)
- Check `Accept-Encoding: gzip`
- Use `compress/gzip` with `gzip.BestSpeed`
- Wrap `http.ResponseWriter` with a `gzipResponseWriter` that redirects `Write` to the gzip writer
- Set `Content-Encoding: gzip`, delete `Content-Length`, set `Vary: Accept-Encoding`

## 6. ETag Middleware

- Only apply to `GET` requests on API paths — skip static files
- Buffer the response body in a `bufferedResponseWriter`
- Compute CRC32 hash: `fmt.Sprintf('"%08x"', crc32.ChecksumIEEE(body))`
- Set `ETag` header (quoted per HTTP spec)
- Check `If-None-Match` — return `304 Not Modified` if matches
- Skip for responses >1MB

## 7. Rate Limiting Middleware

In-memory token bucket per client IP:

```go
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
```

- Configured via `RATE_LIMIT_RPS` (default 10) and `RATE_LIMIT_BURST` (default 20) env vars
- Only apply to `/api/` paths — skip static files and `/healthz`
- Extract client IP from `X-Forwarded-For` header, fall back to `RemoteAddr` (strip port)
- Cleanup goroutine every 5 minutes, evict visitors not seen in 10 minutes
- Return `429 Too Many Requests` with `Retry-After: 1` header and JSON error body

## 8. Health Check Endpoint

`GET /healthz`:

```go
func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
    if err := db.PingContext(r.Context()); err != nil {
        // return 503 {"status":"error","db":"disconnected"}
    }
    // return 200 {"status":"ok","db":"connected","timestamp":"..."}
}
```

## 9. Graceful Shutdown

```go
srv := &http.Server{
    Addr:         addr,
    Handler:      h,
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 30 * time.Second,
    IdleTimeout:  60 * time.Second,
}

go func() {
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    <-sigCh
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}()

srv.ListenAndServe()
```

## 10. Static Asset Cache Headers

For embedded or filesystem-served frontends, intercept `http.FileServer` responses:

- `assets/*.js`, `assets/*.css` (hashed filenames) → `Cache-Control: public, max-age=31536000, immutable`
- `.svg`, `.png`, `.ico`, `.woff2` → `Cache-Control: public, max-age=86400`
- `index.html` → `Cache-Control: no-cache`

Use a `WriteHeader`/`Write` interceptor since `http.FileServer` sets its own headers:

```go
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
```

## 11. OG Meta Tag Injection (SPA)

For post URLs (`/post/:slug`), the SPA handler queries the DB and injects `<meta>` tags into `index.html` before serving:

```go
ogTags := fmt.Sprintf(`
    <meta property="og:type" content="article" />
    <meta property="og:title" content="%s" />
    <meta property="og:description" content="%s" />
    <meta property="og:url" content="%s/post/%s" />
    <meta name="description" content="%s" />
    <title>%s | Blog</title>`,
    html.EscapeString(post.Title),
    html.EscapeString(post.Excerpt),
    baseURL, post.Slug,
    html.EscapeString(post.Excerpt),
    html.EscapeString(post.Title),
)

return bytes.Replace(htmlBytes, []byte("</head>"), []byte(ogTags+"\n  </head>"), 1)
```

Always use `html.EscapeString` to prevent XSS.

## 12. Admin API Key Auth

Simple middleware wrapper for admin endpoints:

- Check `X-API-Key` header first, fall back to `api_key` query param
- Compare against `ADMIN_API_KEY` env var (default: `changeme`)
- Return `401 Unauthorized` if mismatch

## Frontend Performance Rules (Chrome scroll jank prevention)

- **No `rgba()` borders** — use solid hex colors (e.g., `#1a1a2e` instead of `rgba(255,255,255,0.08)`)
- **No `transition-all`** — use `transition-colors` or specific properties only
- **No `backdrop-blur`** — expensive gaussian blur kills scroll perf
- **No `scrollbar-color` with rgba** — Chrome repaints scrollbar every frame
- **No `transform` on scroll-container parents** — breaks `position: fixed` children in Chrome
- **Scroll progress bars** — use `transform: scaleX()` (GPU composited), not `width` (triggers layout). Manipulate DOM directly via ref, not React state
- **No Framer Motion page wrappers** — `motion.div` with transforms around fixed-position elements breaks Chrome compositing

## Environment Variables Summary

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `5467` | Server port |
| `LOG_FORMAT` | `json` | Set to `text` for human-readable dev logs |
| `ADMIN_API_KEY` | `changeme` | API key for admin endpoints |
| `CORS_ORIGINS` | (empty) | Comma-separated allowed origins, or `*` |
| `RATE_LIMIT_RPS` | `10` | Requests per second per IP |
| `RATE_LIMIT_BURST` | `20` | Max burst tokens per IP |
| `BASE_URL` | (from Host header) | For OG tags, RSS, sitemap URLs |
| `FRONTEND_DIR` | (embedded) | Set to serve frontend from disk in dev |
| `DATABASE_URL` | `file:blog.db` | SQLite path or `postgres://` DSN |
