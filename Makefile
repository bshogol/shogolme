.PHONY: dev dev-frontend dev-backend build build-frontend build-backend clean docker docker-up docker-down deploy logs help

DROPLET ?= deploy@shogol.me

.DEFAULT_GOAL := help

# Show available targets
help:
	@awk '/^#/{desc=substr($$0,3)} /^[a-zA-Z_-]+:/{if(desc){printf "  \033[36m%-18s\033[0m %s\n", $$1, desc; desc=""}}' $(MAKEFILE_LIST)

# Development - hot reload for both frontend and backend
dev:
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-frontend & \
	$(MAKE) dev-backend & \
	wait

# Frontend dev server with HMR
dev-frontend:
	cd frontend && npm run dev -- --port 5173

# Backend with hot reload via air
dev-backend:
	air

# Build frontend assets
build-frontend:
	cd frontend && npm install && npm run build

# Build everything for production
build: build-frontend build-backend

# Build backend binary
build-backend:
	go build -o bin/shogolme .

# Docker build image
docker:
	docker build -t shogolme .

# Docker compose up
docker-up:
	docker compose up -d

# Docker compose down
docker-down:
	docker compose down

# Deploy to production
deploy:
	ssh $(DROPLET) 'bash /opt/shogol/deploy/deploy.sh'

# View production logs
logs:
	ssh $(DROPLET) 'cd /opt/shogol && docker compose logs -f --tail 100'

# Clean build artifacts
clean:
	rm -rf frontend/dist bin/ shogolme.db shogolme.db-wal shogolme.db-shm tmp/
