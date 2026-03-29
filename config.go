package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type config struct {
	Port         string
	DatabaseURL  string
	LogFormat    string
	LogLevel     string
	BaseURL      string
	CORSOrigins  string
	FrontendDir  string
	RateLimitRPS float64
	RateBurst    float64

	// Subcommand state
	command    string // "serve" or "deploy"
	deployFile string
}

const usage = `Usage: shogolme <command> [flags]

Commands:
  serve       Start the blog server (default)
  template    Generate a blog post template YAML file
  deploy      Deploy a blog post from a YAML file

Run 'shogolme <command> -h' for command-specific help.
`

func parseConfig() config {
	cfg := config{}

	serveFlags := flag.NewFlagSet("serve", flag.ExitOnError)
	serveFlags.StringVar(&cfg.Port, "port", envStr("PORT", "5467"), "server port")
	serveFlags.StringVar(&cfg.DatabaseURL, "db", envStr("DATABASE_URL", ""), "database URL (postgres://... or sqlite path, default: file:blog.db)")
	serveFlags.StringVar(&cfg.LogFormat, "log-format", envStr("LOG_FORMAT", "json"), "log format: json or text")
	serveFlags.StringVar(&cfg.LogLevel, "log-level", envStr("LOG_LEVEL", "info"), "log level: debug, info, warn, error")
	serveFlags.StringVar(&cfg.BaseURL, "base-url", envStr("BASE_URL", ""), "public base URL for feeds and sitemap")
	serveFlags.StringVar(&cfg.CORSOrigins, "cors-origins", envStr("CORS_ORIGINS", ""), "allowed CORS origins (comma-separated)")
	serveFlags.StringVar(&cfg.FrontendDir, "frontend-dir", envStr("FRONTEND_DIR", ""), "serve frontend from directory instead of embedded")
	serveFlags.Float64Var(&cfg.RateLimitRPS, "rate-limit", envFloat("RATE_LIMIT_RPS", 10), "API rate limit requests per second")
	serveFlags.Float64Var(&cfg.RateBurst, "rate-burst", envFloat("RATE_LIMIT_BURST", 20), "API rate limit burst size")

	// Determine subcommand
	if len(os.Args) < 2 {
		serveFlags.Parse(os.Args[1:])
		return cfg
	}

	switch os.Args[1] {
	case "serve":
		serveFlags.Parse(os.Args[2:])

	case "template":
		out := ""
		if len(os.Args) > 2 {
			out = os.Args[2]
		}
		cmdTemplate(out)
		os.Exit(0)

	case "deploy":
		deployFlags := flag.NewFlagSet("deploy", flag.ExitOnError)
		deployFlags.StringVar(&cfg.DatabaseURL, "db", envStr("DATABASE_URL", ""), "database URL")
		deployFlags.StringVar(&cfg.LogFormat, "log-format", envStr("LOG_FORMAT", "json"), "log format: json or text")
		deployFlags.StringVar(&cfg.LogLevel, "log-level", envStr("LOG_LEVEL", "info"), "log level: debug, info, warn, error")

		// Find the YAML file and separate it from flags
		var file string
		var flagArgs []string
		for _, arg := range os.Args[2:] {
			if strings.HasSuffix(arg, ".yaml") || strings.HasSuffix(arg, ".yml") {
				file = arg
			} else {
				flagArgs = append(flagArgs, arg)
			}
		}
		deployFlags.Parse(flagArgs)

		if file == "" {
			fmt.Fprintln(os.Stderr, "error: deploy requires a YAML file path")
			fmt.Fprintln(os.Stderr, "usage: shogolme deploy <file.yaml> [--db <url>]")
			os.Exit(1)
		}
		cfg.command = "deploy"
		cfg.deployFile = file
		return cfg

	case "-h", "--help", "help":
		fmt.Fprint(os.Stderr, usage)
		os.Exit(0)

	default:
		// No subcommand — treat as serve flags
		serveFlags.Parse(os.Args[1:])
	}

	return cfg
}

func setupLogging(cfg config) {
	var logLevel slog.Level
	switch cfg.LogLevel {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	var handler slog.Handler
	if cfg.LogFormat == "text" {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})
	} else {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})
	}
	slog.SetDefault(slog.New(handler))
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}
