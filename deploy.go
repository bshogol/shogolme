package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

// PostTemplate is the YAML structure for authoring a blog post.
type PostTemplate struct {
	Slug        string   `yaml:"slug"`
	Title       string   `yaml:"title"`
	Excerpt     string   `yaml:"excerpt"`
	Tags        []string `yaml:"tags"`
	Published   bool     `yaml:"published"`
	SeriesSlug  string   `yaml:"series_slug,omitempty"`
	SeriesOrder int      `yaml:"series_order,omitempty"`
	Content     string   `yaml:"content"`
}

const templateExample = `# Blog Post Template
# Fill in the fields below and deploy with:
#   shogolme deploy <this-file>.yaml

slug: "my-post-slug"
title: "My Post Title"
excerpt: "A short summary of the post."
tags:
  - "go"
  - "cloudflare"
published: false

# Optional: assign to a series
# series_slug: "go-essentials"
# series_order: 1

content: |
  # My Post Title

  Write your markdown content here.

  ## Section

  Regular **markdown** with all the usual features:

  - Lists
  - **Bold** and *italic*
  - [Links](https://example.com)

  ` + "```go" + `
  fmt.Println("code blocks work too")
  ` + "```" + `
`

func cmdTemplate(outputPath string) {
	if outputPath == "" {
		outputPath = "blog-template.yaml"
	}

	if err := os.WriteFile(outputPath, []byte(templateExample), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Template written to %s\n", outputPath)
}

func cmdDeploy(filePath string) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", filePath, err)
		os.Exit(1)
	}

	var tmpl PostTemplate
	if err := yaml.Unmarshal(data, &tmpl); err != nil {
		fmt.Fprintf(os.Stderr, "error parsing yaml: %v\n", err)
		os.Exit(1)
	}

	if err := validateTemplate(&tmpl); err != nil {
		fmt.Fprintf(os.Stderr, "validation error: %v\n", err)
		os.Exit(1)
	}

	db = setupDB(cfg.DatabaseURL)
	defer db.Close()

	ctx := context.Background()

	// Resolve series if provided
	var seriesID *string
	if tmpl.SeriesSlug != "" {
		var series Series
		err := db.NewSelect().Model(&series).Where("slug = ?", tmpl.SeriesSlug).Scan(ctx)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: series %q not found\n", tmpl.SeriesSlug)
			os.Exit(1)
		}
		seriesID = &series.ID
	}

	// Check if post with this slug already exists (update vs insert)
	var existing Post
	err = db.NewSelect().Model(&existing).Where("slug = ?", tmpl.Slug).Scan(ctx)
	now := time.Now()

	if err == nil {
		// Update existing post
		existing.Title = tmpl.Title
		existing.Excerpt = tmpl.Excerpt
		existing.Content = tmpl.Content
		existing.Tags = tmpl.Tags
		existing.Published = tmpl.Published
		existing.SeriesID = seriesID
		existing.SeriesOrder = tmpl.SeriesOrder
		existing.UpdatedAt = now

		if _, err := db.NewUpdate().Model(&existing).WherePK().Exec(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "error updating post: %v\n", err)
			os.Exit(1)
		}
		slog.Info("post updated", "slug", tmpl.Slug, "published", tmpl.Published)
	} else {
		// Insert new post
		post := Post{
			ID:          uuid.New().String(),
			Slug:        tmpl.Slug,
			Title:       tmpl.Title,
			Excerpt:     tmpl.Excerpt,
			Content:     tmpl.Content,
			Tags:        tmpl.Tags,
			Published:   tmpl.Published,
			SeriesID:    seriesID,
			SeriesOrder: tmpl.SeriesOrder,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if _, err := db.NewInsert().Model(&post).Exec(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "error creating post: %v\n", err)
			os.Exit(1)
		}
		slog.Info("post created", "slug", tmpl.Slug, "published", tmpl.Published)
	}
}

func validateTemplate(t *PostTemplate) error {
	var errs []string
	if t.Slug == "" {
		errs = append(errs, "slug is required")
	}
	if t.Title == "" {
		errs = append(errs, "title is required")
	}
	if t.Content == "" {
		errs = append(errs, "content is required")
	}
	if len(errs) > 0 {
		return fmt.Errorf("%s", strings.Join(errs, "; "))
	}
	return nil
}
