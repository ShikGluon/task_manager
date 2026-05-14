using TaskManager.Api.Domain.Enums;

namespace TaskManager.Api.Features.Tasks;

/// <summary>Request body for <c>POST /api/tasks</c>.</summary>
public record CreateTaskRequest(
    string Title,
    string? Description,
    Priority Priority,
    DateTime? DueDate);

/// <summary>Request body for <c>PUT /api/tasks/{id}</c>.</summary>
public record UpdateTaskRequest(
    string Title,
    string? Description,
    Domain.Enums.TaskStatus Status,
    Priority Priority,
    DateTime? DueDate);

/// <summary>
/// Read model returned by all task endpoints. Enum values are serialised as strings
/// (<c>"Pending"</c>, <c>"High"</c>, etc.) via <c>JsonStringEnumConverter</c>.
/// </summary>
public record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    string Priority,
    DateTime? DueDate,
    DateTime CreatedAt);
