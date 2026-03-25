.PHONY: dev dev-frontend dev-backend build build-frontend build-backend clean seed docker docker-up docker-down

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
	go build -o bin/blog .

# Reset database with fresh seed data
seed:
	rm -f blog.db blog.db-wal blog.db-shm
	@echo "Database reset. Seed data will be created on next startup."

# Docker
docker:
	docker build -t blog .

docker-up:
	docker compose up -d

docker-down:
	docker compose down

# Clean build artifacts
clean:
	rm -rf frontend/dist bin/ blog.db blog.db-wal blog.db-shm tmp/
