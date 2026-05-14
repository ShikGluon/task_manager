.PHONY: dev dev-api dev-frontend \
        test test-api test-frontend test-e2e test-e2e-ui \
        docker-up docker-build docker-down docker-logs \
        build-api build-frontend \
        lint lint-api lint-frontend \
        fmt fmt-api fmt-frontend

# ── Development servers ────────────────────────────────────────────────────────

dev: ## Start both API and frontend in parallel (Ctrl-C kills both)
	@trap 'kill 0' INT; \
	$(MAKE) dev-api & \
	$(MAKE) dev-frontend & \
	wait

dev-api: ## Start the .NET API (http://localhost:5208, Swagger: /swagger)
	cd api/TaskManager.Api && dotnet run

dev-frontend: ## Start the Vite dev server (http://localhost:5173)
	cd frontend && npm run dev

# ── Tests ──────────────────────────────────────────────────────────────────────

test: test-api test-frontend ## Run all unit tests

test-api: ## Run xUnit backend tests
	dotnet test api/TaskManager.Tests

test-frontend: ## Run Vitest unit tests
	cd frontend && npm test

test-e2e: ## Run Playwright integration tests (requires make dev running)
	cd frontend && npm run test:e2e

test-e2e-ui: ## Open Playwright UI mode
	cd frontend && npm run test:e2e:ui

# ── Lint & format ──────────────────────────────────────────────────────────────

lint: lint-api lint-frontend ## Check linting + formatting across the whole project

lint-api: ## Check C# style (fails if any violation or format diff exists)
	dotnet format api/TaskManager.Api --verify-no-changes
	dotnet format api/TaskManager.Tests --verify-no-changes

lint-frontend: ## Check ESLint + Prettier (fails if any issue exists)
	cd frontend && npm run lint
	cd frontend && npm run format:check

fmt: fmt-api fmt-frontend ## Auto-fix formatting across the whole project

fmt-api: ## Auto-fix C# formatting
	dotnet format api/TaskManager.Api
	dotnet format api/TaskManager.Tests

fmt-frontend: ## Auto-fix Prettier formatting
	cd frontend && npm run format

# ── Build ──────────────────────────────────────────────────────────────────────

build-api: ## Release-build the .NET API
	dotnet publish api/TaskManager.Api -c Release -o api/publish

build-frontend: ## Production build of the React app (output: frontend/dist)
	cd frontend && npm run build

# ── Docker ─────────────────────────────────────────────────────────────────────

docker-up: ## Start all services (detached)
	cd deployment && docker compose up -d

docker-build: ## Build images and start all services (detached)
	cd deployment && docker compose up --build -d

docker-down: ## Stop and remove containers (volumes are preserved)
	cd deployment && docker compose down

docker-logs: ## Tail logs from all containers
	cd deployment && docker compose logs -f

# ── Help ───────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
