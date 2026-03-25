package main

import (
	"time"

	"github.com/uptrace/bun"
)

type Post struct {
	bun.BaseModel `bun:"table:posts,alias:p"`

	ID          string    `bun:"id,pk"               json:"id"`
	Slug        string    `bun:"slug,unique,notnull"  json:"slug"`
	Title       string    `bun:"title,notnull"        json:"title"`
	Excerpt     string    `bun:"excerpt"              json:"excerpt"`
	Content     string    `bun:"content,notnull"      json:"content"`
	Tags        []string  `bun:"tags,array"           json:"tags"`
	Published   bool      `bun:"published"            json:"published"`
	ViewCount   int64     `bun:"view_count,default:0" json:"view_count"`
	SeriesID    *string   `bun:"series_id"            json:"series_id,omitempty"`
	SeriesOrder int       `bun:"series_order,default:0" json:"series_order,omitempty"`
	CreatedAt   time.Time `bun:"created_at,notnull"   json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,notnull"   json:"updated_at"`
}

type Series struct {
	bun.BaseModel `bun:"table:series,alias:s"`

	ID          string    `bun:"id,pk"               json:"id"`
	Slug        string    `bun:"slug,unique,notnull"  json:"slug"`
	Name        string    `bun:"name,notnull"         json:"name"`
	Description string    `bun:"description"          json:"description"`
	CreatedAt   time.Time `bun:"created_at,notnull"   json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,notnull"   json:"updated_at"`
}

type RSSSubscriber struct {
	bun.BaseModel `bun:"table:rss_subscribers,alias:rs"`

	ID        string    `bun:"id,pk"`
	UserAgent string    `bun:"user_agent,unique,notnull"`
	LastSeen  time.Time `bun:"last_seen,notnull"`
}

// SeriesWithPosts is returned by the series detail API.
type SeriesWithPosts struct {
	Series
	Posts []SeriesPostItem `json:"posts"`
}

// SeriesPostItem is a slim post representation for series navigation.
type SeriesPostItem struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	SeriesOrder int    `json:"series_order"`
}

// PostWithSeries is the response for a single post that includes series context.
type PostWithSeries struct {
	Post
	SeriesInfo *PostSeriesInfo `json:"series,omitempty"`
}

type PostSeriesInfo struct {
	ID    string           `json:"id"`
	Slug  string           `json:"slug"`
	Name  string           `json:"name"`
	Posts []SeriesPostItem `json:"posts"`
}

// SearchResult is a post with a highlighted snippet.
type SearchResult struct {
	ID        string   `json:"id"`
	Slug      string   `json:"slug"`
	Title     string   `json:"title"`
	Excerpt   string   `json:"excerpt"`
	Tags      []string `json:"tags"`
	CreatedAt string   `json:"created_at"`
	Snippet   string   `json:"snippet"`
	Rank      float64  `json:"rank"`
}
