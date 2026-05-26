.PHONY: docker-up docker-down docker-logs docker-ps docker-build env

env:
	@test -f .env || cp .env.docker.example .env
	@echo "Created .env from .env.docker.example — edit before starting."

docker-up: env
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-ps:
	docker compose ps

docker-build:
	docker compose build --no-cache

docker-n8n-admin: env
	NGINX_CONF=./nginx/nginx.with-n8n-admin.conf docker compose up -d --build
