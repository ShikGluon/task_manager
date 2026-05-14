# Task Manager — Claude Context

Full-stack task management app built as a take-home interview exercise.

## Stack

| Layer | Tech |
|-------|------|
| API | .NET 10, ASP.NET Core Minimal API, EF Core, SQLite |
| Auth | JWT Bearer (HS256), BCrypt passwords |
| Validation | FluentValidation |
| Logging | Serilog — Console + rolling file (`api/TaskManager.Api/logs/`) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Axios |
| Unit tests | xUnit + Moq + EF InMemory (backend); Vitest + Testing Library (frontend) |
| E2E tests | Playwright |
| DevOps | Docker Compose, multi-stage builds |

## Running locally

```bash
make dev          # API on :5208, frontend on :5173
make test         # backend + frontend unit tests
make test-e2e     # Playwright (requires make dev running first)
make docker-up    # full Docker stack (:5001 API, :3000 frontend)
```

## Project layout

```
api/
  TaskManager.Api/
    Domain/         # User, TodoTask entities; TaskStatus, Priority enums
    Infrastructure/ # AppDbContext, JwtService
    Features/
      Auth/         # Register + Login endpoints, DTOs, validators
      Tasks/        # CRUD endpoints, TaskService, DTOs, validators
    Middleware/     # ExceptionMiddleware — RFC 7807 Problem Details
    Program.cs      # Composition root
  TaskManager.Tests/
    TaskServiceTests.cs   # 4 xUnit tests
frontend/
  src/
    api/client.ts         # Axios instance; JWT request interceptor; 401 redirect
    context/AuthContext.tsx
    hooks/useTasks.ts     # useReducer + optimistic updates
    pages/                # Login, Register, Dashboard
    components/           # TaskCard, TaskSkeleton
    __tests__/            # 18 Vitest tests
  e2e/
    auth.spec.ts          # 8 Playwright tests
    tasks.spec.ts         # 15 Playwright tests
    helpers.ts            # register(), login(), createTask() helpers
deployment/
  docker-compose.yml
```

## Key decisions & gotchas

- **`MapInboundClaims = false`** in JWT options — required so the `sub` claim isn't remapped to `ClaimTypes.NameIdentifier`. `GetUserId()` in `TaskEndpoints.cs` reads `JwtRegisteredClaimNames.Sub` directly.
- **`JsonStringEnumConverter`** registered in `Program.cs` — lets the API accept `"Medium"` instead of `1` for enum fields.
- **Soft delete** — `TodoTask.IsDeleted`; EF Core global query filter `!IsDeleted` makes deleted rows invisible to all normal queries. Unit tests use `IgnoreQueryFilters()` to assert the row still exists.
- **Data isolation** — every `TaskService` method filters by `userId`. A user can never read or modify another user's tasks.
- **Swashbuckle 6.9.0** — do not upgrade to 10.x; the API surface changed and it breaks the project.
- **API port** — dev server runs on **5208** (from `launchSettings.json`), not the default 5000/5001. Vite proxies `/api` → `http://localhost:5208`.
- **Docker API port** — mapped to **5001:5000** on the host (5000 conflicts with macOS AirPlay).
- **Tailwind CSS v4** — CSS-first config (`@import "tailwindcss"` in `index.css`), `@tailwindcss/vite` plugin. No `tailwind.config.js`.

## Playwright notes

- `createTask()` helper waits for the task title to be visible before returning — necessary because tasks are sorted newest-first and checkbox index depends on the full list being rendered.
- `getByText('Delete', { exact: true })` — exact match required; without it, Playwright's case-insensitive partial matching hits task titles containing "delete".
- 401 interceptor in `client.ts` only redirects to `/login` when a token already exists in localStorage, so login failures show an error toast instead of navigating away.
