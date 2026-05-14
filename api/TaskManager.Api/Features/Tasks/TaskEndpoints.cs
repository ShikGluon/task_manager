using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;

namespace TaskManager.Api.Features.Tasks;

/// <summary>
/// Maps task CRUD endpoints under <c>/api/tasks</c>.
/// All routes require a valid JWT Bearer token; user identity is derived from the token's
/// <c>sub</c> claim and passed into <see cref="TaskService"/> to enforce per-user data isolation.
/// </summary>
public static class TaskEndpoints
{
    /// <summary>Registers all task routes on the application's endpoint route builder.</summary>
    /// <param name="app">The <see cref="IEndpointRouteBuilder"/> to add routes to.</param>
    public static void MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tasks")
            .WithTags("Tasks")
            .RequireAuthorization();

        group.MapGet("/", GetAll);
        group.MapGet("/{id:guid}", GetById);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);
    }

    /// <summary>Extracts the authenticated user's ID from the JWT <c>sub</c> claim.</summary>
    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);

    /// <summary>
    /// Returns all non-deleted tasks for the authenticated user.
    /// Supports optional <paramref name="status"/> filtering and <paramref name="sort"/> by due date.
    /// </summary>
    private static async Task<IResult> GetAll(
        ClaimsPrincipal user,
        TaskService svc,
        string? status = null,
        string? sort = null)
    {
        var tasks = await svc.GetTasksAsync(GetUserId(user), status, sort);
        return Results.Ok(tasks);
    }

    /// <summary>
    /// Returns a single task by ID. Returns 404 if the task does not exist or belongs to another user.
    /// </summary>
    private static async Task<IResult> GetById(Guid id, ClaimsPrincipal user, TaskService svc)
    {
        var task = await svc.GetTaskByIdAsync(GetUserId(user), id);
        return Results.Ok(task);
    }

    /// <summary>
    /// Creates a new task for the authenticated user. Returns 201 Created with the new task.
    /// </summary>
    private static async Task<IResult> Create(
        CreateTaskRequest req,
        ClaimsPrincipal user,
        TaskService svc,
        IValidator<CreateTaskRequest> validator)
    {
        var validation = await validator.ValidateAsync(req);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var task = await svc.CreateTaskAsync(GetUserId(user), req);
        return Results.Created($"/api/tasks/{task.Id}", task);
    }

    /// <summary>
    /// Updates an existing task. Returns 404 if the task does not exist or belongs to another user.
    /// </summary>
    private static async Task<IResult> Update(
        Guid id,
        UpdateTaskRequest req,
        ClaimsPrincipal user,
        TaskService svc,
        IValidator<UpdateTaskRequest> validator)
    {
        var validation = await validator.ValidateAsync(req);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var task = await svc.UpdateTaskAsync(GetUserId(user), id, req);
        return Results.Ok(task);
    }

    /// <summary>
    /// Soft-deletes a task by setting <c>IsDeleted = true</c>.
    /// Returns 204 No Content on success, or 404 if the task does not exist or belongs to another user.
    /// </summary>
    private static async Task<IResult> Delete(Guid id, ClaimsPrincipal user, TaskService svc)
    {
        await svc.DeleteTaskAsync(GetUserId(user), id);
        return Results.NoContent();
    }
}
