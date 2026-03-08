.PHONY: help build up down restart logs clean

help:
	@echo "Claw Admin Docker Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - View logs"
	@echo "  make clean     - Remove containers and volumes"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

clean:
	docker-compose down -v
	rm -rf backend/claw_admin.db

# Development commands
dev:
	docker-compose up

dev-build:
	docker-compose build --no-cache
