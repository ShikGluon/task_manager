# API — Architecture & Code Walkthrough

Built with .NET 10 Minimal API using a **vertical slice** layout — code is grouped by
*feature* rather than by *layer*. Each feature folder owns its endpoints, DTOs, validators,
and service logic. Shared infrastructure lives in `Infrastructure/`.

---

## Directory structure

```
TaskManager.Api/
├── Domain/
│   ├── Entities/       # User, TodoTask — plain C# classes, no framework dependencies
│   └── Enums/          # Priority, TaskStatus
├── Infrastructure/
│   ├── Data/           # AppDbContext (EF Core + SQLite)
│   └── Services/       # JwtService
├── Features/
│   ├── Auth/           # Register, Login, Me endpoints + DTOs + validators
│   └── Tasks/          # CRUD endpoints, TaskService, DTOs, validators
├── Middleware/         # ExceptionMiddleware (RFC 7807 error responses)
└── Program.cs          # Composition root — DI registration + middleware pipeline
```

---

## Entry point — `Program.cs`

This is where the whole app is wired up. It runs top-to-bottom at startup and does four things:

1. **Registers services** into the DI container — EF Core, JWT, FluentValidation, Serilog
2. **Builds the app** (`builder.Build()`)
3. **Configures the middleware pipeline** — the ordered chain every request passes through
4. **Maps endpoints** by calling `MapAuthEndpoints()` and `MapTaskEndpoints()`

Nothing else touches `Program.cs`. Adding a new feature means registering its services here and calling its map method here — that's it.

---

## Request lifecycle

Every HTTP request flows through this pipeline in order:

```
Request
  → ExceptionMiddleware       catches unhandled exceptions → RFC 7807 JSON
  → Serilog request logging   logs method, path, status, duration
  → CORS
  → Authentication            validates JWT signature, populates ClaimsPrincipal
  → Authorization             enforces RequireAuthorization() on route groups
  → Endpoint handler          your actual code
  → Response
```

Order matters — authentication must run before authorization, and `ExceptionMiddleware`
must wrap everything so it can catch errors from any layer below it.

---

## Domain — `Domain/`

Plain C# classes with no external dependencies. These are the core concepts of the system.

| Type | Description |
|------|-------------|
| `User` | Id, Email, PasswordHash, navigation collection to Tasks |
| `TodoTask` | All task fields; `IsDeleted` is the soft-delete flag |
| `Priority` | `Low / Medium / High` enum |
| `TaskStatus` | `Pending / Completed` enum |

---

## Infrastructure — `Infrastructure/`

Plumbing that connects the domain to external systems.

### `AppDbContext`
The EF Core gateway to SQLite. Two important things happen here:

- Sets up the schema — indexes, foreign keys, relationships
- Applies a **global query filter** `!t.IsDeleted` to `TodoTask`. This is a permanent WHERE
  clause EF Core silently appends to *every* query on that table — you never have to remember
  to filter deleted tasks manually. Unit tests use `IgnoreQueryFilters()` to bypass it when
  verifying a soft-deleted row still physically exists.

### `JwtService`
One method: `GenerateToken()`. Reads the secret, issuer, and audience from configuration,
builds a `JwtSecurityToken` with the user's ID in the `sub` claim, signs it with HS256, and
returns the compact string. The `sub` claim is how the API identifies *which user* is making
a request on every subsequent call.

---

## Features — `Features/`

Each feature folder is self-contained.

### Auth (`Features/Auth/`)

| File | Purpose |
|------|---------|
| `AuthDtos.cs` | `RegisterRequest`, `LoginRequest`, `AuthResponse` record types |
| `AuthValidator.cs` | FluentValidation rules — email format, password minimum length |
| `AuthEndpoints.cs` | Three routes: `POST /register`, `POST /login`, `GET /me` |

`GET /me` exists specifically to validate a stored token against the database. If the DB is
reset while a user holds a valid JWT, `/me` returns 401 (user row is gone) and the frontend
clears the session.

### Tasks (`Features/Tasks/`)

| File | Purpose |
|------|---------|
| `TaskDtos.cs` | `CreateTaskRequest`, `UpdateTaskRequest`, `TaskResponse` records |
| `TaskValidator.cs` | FluentValidation rules — title length, enum membership |
| `TaskEndpoints.cs` | Five CRUD routes; extracts user ID from JWT on every request |
| `TaskService.cs` | All database logic; enforces per-user data isolation |

`TaskResponse` uses `string` for `Status` and `Priority` — the `JsonStringEnumConverter`
registered in `Program.cs` handles enum-to-string serialisation automatically, so the frontend
receives `"Pending"` and `"High"` instead of `0` and `2`.

---

## Data isolation

Every method in `TaskService` starts with `.Where(t => t.UserId == userId)`. This single
filter is the data isolation guarantee — a user physically cannot read or modify another
user's tasks, regardless of how the endpoint is called. The `userId` is always sourced from
the validated JWT claim, never from the request body.

---

## End-to-end example — `POST /api/tasks`

```
1. ExceptionMiddleware wraps the request
2. JWT middleware validates the Bearer token → ClaimsPrincipal populated
3. Authorization check passes (route group requires auth)
4. ASP.NET Core deserialises the JSON body → CreateTaskRequest
5. IValidator<CreateTaskRequest> runs FluentValidation rules
     → invalid? return 400 ValidationProblem immediately
6. GetUserId() parses the Guid from ClaimsPrincipal "sub" claim
7. TaskService.CreateTaskAsync(userId, req)
     → builds TodoTask entity with UserId set
     → SaveChangesAsync() persists to SQLite
8. Entity mapped to TaskResponse → returned as 201 Created
```

If anything throws at any step, `ExceptionMiddleware` catches it and maps it to the
appropriate HTTP status (`KeyNotFoundException` → 404, unhandled → 500).

---

## Dependency injection

ASP.NET Core's DI container wires everything together automatically. When an endpoint handler
declares parameters like `TaskService svc` or `IValidator<CreateTaskRequest> validator`, the
framework constructs and injects them. Key registrations:

| Service | Lifetime | Registered via |
|---------|----------|----------------|
| `AppDbContext` | Scoped (per request) | `AddDbContext<>` |
| `JwtService` | Scoped | `AddScoped<>` |
| All `AbstractValidator<T>` subclasses | Scoped | `AddValidatorsFromAssemblyContaining<>` |
