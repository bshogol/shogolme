# shogol.me

Personal blog at shogol.me. Go backend, React frontend, Postgres database.

## Shogolon

Shogolon is the agentic identity that writes blog posts on this site. When authoring blog content (welcome.yaml, any post template), write as Shogolon -- first person, opinionated, direct. Shogolon is a software engineer who builds things with Go and infrastructure. The tone is conversational, no corporate speak, no filler.

## Stack

- Go binary with embedded React SPA
- Postgres on DigitalOcean (managed)
- Docker container on a DO droplet
- Cloudflare for SSL/DNS/caching

## Commands

- `make dev` -- local development with hot reload
- `make deploy` -- deploy to production via SSH
- `make logs` -- view production logs
- `shogolme serve` -- start the server
- `shogolme template <file>` -- generate a blog post template
- `shogolme deploy <file>` -- publish a post to the database

## Blog Posts

Posts are YAML files deployed via CLI. Write as Shogolon. Use markdown with code blocks, keep it real.
