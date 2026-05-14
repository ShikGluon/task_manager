# Task Manager

A full-stack task management application with JWT authentication, built as a take-home exercise.

## Quick Start

```bash
make docker-up JWT_SECRET=your_secret_here_at_least_32_chars
```

- **Frontend**: http://localhost:3000
- **API + Swagger**: http://localhost:5001/swagger

For local development without Docker:

```bash
make dev        # starts API + frontend in parallel
# API  → http://localhost:5208
# Frontend → http://localhost:5173
```

## Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Backend    | .NET 10, ASP.NET Core Minimal API                   |
| Database   | SQLite via EF Core                                  |
| Auth       | JWT Bearer (HS256)                                  |
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS v4         |
| Logging    | Serilog (Console + rolling File)                    |
| Validation | FluentValidation                                    |
| Testing    | xUnit, Moq, EF Core InMemory, Vitest, Playwright    |
| DevOps     | Docker Compose, multi-stage builds                  |

## Architecture

### Backend — Vertical Slice / Feature-based

The API is organized by feature rather than by layer. Each feature folder (`Features/Auth`, `Features/Tasks`) owns its endpoints, DTOs, validators, and service logic. Shared infrastructure (EF Core context, JWT service) lives in `Infrastructure/`.

```
api/TaskManager.Api/
├── Domain/         # Entities (User, TodoTask) and Enums
├── Infrastructure/ # AppDbContext, JwtService
├── Features/
│   ├── Auth/       # Register, Login endpoints + validators
│   └── Tasks/      # CRUD endpoints, TaskService, validators
├── Middleware/     # Global exception handler (RFC 7807)
└── Program.cs      # Composition root
```

This keeps related code together and makes features easy to find, change, or delete independently.

### Frontend — Context + useReducer

Auth state is managed via Context API and persisted to `localStorage`. Task state uses `useReducer` inside the `useTasks` hook, with optimistic updates on toggle and delete (roll-back on failure). Axios intercepts all requests to inject the JWT and redirects to `/login` on 401.

### Security

- Passwords are hashed with BCrypt (work factor 11).
- All task endpoints require a valid JWT (`[Authorize]`).
- Every DB query inside `TaskService` is filtered by the authenticated user's ID — a user cannot read or modify another user's tasks.
- The global `ExceptionMiddleware` returns [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) Problem Details for all unhandled errors.

## Trade-offs & Assumptions

**SQLite vs. SQL Server**
SQLite was chosen for portability — no server process, single-file database, zero infrastructure to run locally or in CI. The trade-off is concurrency: SQLite uses file-level locks, so write-heavy workloads or horizontal API scaling would require a switch to PostgreSQL or SQL Server.

**Soft delete**
Tasks are never physically removed (`IsDeleted = true`). This makes accidental-delete recovery easy and preserves audit history. EF Core's global query filter (`!IsDeleted`) keeps soft-deleted rows invisible to all normal queries automatically.

**In-memory database for tests**
xUnit tests use EF Core's InMemory provider. This avoids SQLite file I/O in CI and keeps tests fast. The trade-off is that InMemory doesn't enforce FK constraints or some DB-specific behaviours. For a production service, tests against a real SQLite (or Testcontainers PostgreSQL) would be more faithful.

**JWT stored in localStorage**
Simple and works across browser tabs. The trade-off is XSS exposure. For higher security, short-lived tokens + HttpOnly refresh-cookie rotation would be the right move.

**No refresh tokens**
Tokens expire in 24 hours. Re-login is required after expiry. Refresh tokens were skipped to keep scope focused.

## What I Would Add Next

### Backend & Infrastructure

| Concern | Implementation |
|---------|----------------|
| Caching | Redis for hot task lists, invalidated on write |
| Observability | OpenTelemetry traces + metrics → Jaeger / Grafana |
| Auth upgrade | OIDC via Auth0 or Azure AD (swap JWT service, keep guards) |
| Real-time | SignalR hub to push task updates across browser tabs |
| Scale | Swap SQLite → PostgreSQL; run 2+ API replicas behind a load balancer |
| Security | HttpOnly refresh-cookie rotation, CSRF protection, rate limiting |

### Usability & Features

| Feature | Description |
|---------|-------------|
| Task sharing | Invite collaborators to a task or project board; per-task permission levels (view / edit) |
| Expanded task detail | Full-page task view with rich-text description, file attachments, activity log, and comment thread |
| Nested tasks | Subtask hierarchy — break a task into steps, track parent progress from child completion |
| Labels & tags | Freeform tagging for cross-project filtering beyond the Pending / Completed status axis |
| Due date reminders | Email or push notifications before a task's due date; configurable lead time |
| Recurring tasks | Repeat on a schedule (daily, weekly, custom cron) with auto-reset on completion |
| Drag-and-drop ordering | Manual sort within a list; reorder by dragging cards |

## Running Tests

All test commands are available via `make`:

```bash
make test          # Backend unit tests + frontend unit tests
make test-api      # xUnit backend tests only
make test-frontend # Vitest frontend unit tests only
make test-e2e      # Playwright integration tests (requires make dev running)
make test-e2e-ui   # Playwright UI mode (interactive)
```

### Backend unit tests (xUnit)

4 tests covering:
- Data isolation (user A cannot see user B's tasks)
- Authorization guard on single-task fetch
- Soft-delete behaviour
- UserId assignment on create

### Frontend unit tests (Vitest)

18 tests covering the Dashboard component: rendering states, task creation, toggle, delete, filtering, and sorting.

### Integration tests (Playwright)

23 end-to-end tests across two suites:

**Authentication** (8 tests) — unauthenticated redirect, register, duplicate email, password validation, login, wrong password, logout, authenticated redirect.

**Task management** (15 tests) — empty state, create, form reset, default status, toggle complete, toggle back to pending, delete, multiple tasks, status filters, priority badge, sort toggle, cancel form, user data isolation.
