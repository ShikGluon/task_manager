using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Domain.Entities;
using TaskManager.Api.Domain.Enums;
using TaskManager.Api.Infrastructure.Data;

namespace TaskManager.Api.Features.Tasks;

/// <summary>
/// Encapsulates all task data-access logic. Every method accepts a <paramref name="userId"/>
/// and filters queries by it, ensuring a user can never read or modify another user's tasks.
/// </summary>
public class TaskService(AppDbContext db)
{
    /// <summary>
    /// Returns all non-deleted tasks for <paramref name="userId"/>, with optional status filtering
    /// and sorting by due date. Defaults to ordering by creation date descending (newest first).
    /// </summary>
    /// <param name="userId">The ID of the authenticated user.</param>
    /// <param name="status">Optional status filter (e.g. <c>"Pending"</c> or <c>"Completed"</c>).</param>
    /// <param name="sort">Pass <c>"dueDate"</c> to sort ascending by due date; otherwise newest-first.</param>
    public async Task<List<TaskResponse>> GetTasksAsync(Guid userId, string? status, string? sort)
    {
        var query = db.Tasks.Where(t => t.UserId == userId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<Domain.Enums.TaskStatus>(status, true, out var parsedStatus))
            query = query.Where(t => t.Status == parsedStatus);

        query = string.Equals(sort, "duedate", StringComparison.OrdinalIgnoreCase)
            ? query.OrderBy(t => t.DueDate)
            : query.OrderByDescending(t => t.CreatedAt);

        return await query.Select(t => ToResponse(t)).ToListAsync();
    }

    /// <summary>
    /// Returns a single task by ID. Throws <see cref="KeyNotFoundException"/> if the task
    /// does not exist or belongs to a different user.
    /// </summary>
    /// <param name="userId">The ID of the authenticated user.</param>
    /// <param name="taskId">The ID of the task to retrieve.</param>
    /// <exception cref="KeyNotFoundException">Thrown when the task is not found for this user.</exception>
    public async Task<TaskResponse> GetTaskByIdAsync(Guid userId, Guid taskId)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId)
            ?? throw new KeyNotFoundException($"Task {taskId} not found");
        return ToResponse(task);
    }

    /// <summary>
    /// Creates a new task owned by <paramref name="userId"/> and persists it to the database.
    /// </summary>
    /// <param name="userId">The ID of the authenticated user who owns the new task.</param>
    /// <param name="req">The creation request containing title, description, priority, and due date.</param>
    /// <returns>The newly created task as a <see cref="TaskResponse"/>.</returns>
    public async Task<TaskResponse> CreateTaskAsync(Guid userId, CreateTaskRequest req)
    {
        var task = new TodoTask
        {
            UserId = userId,
            Title = req.Title,
            Description = req.Description,
            Priority = req.Priority,
            DueDate = req.DueDate
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync();
        return ToResponse(task);
    }

    /// <summary>
    /// Updates an existing task. Throws <see cref="KeyNotFoundException"/> if the task
    /// does not exist or belongs to a different user.
    /// </summary>
    /// <param name="userId">The ID of the authenticated user.</param>
    /// <param name="taskId">The ID of the task to update.</param>
    /// <param name="req">The update request containing the new field values.</param>
    /// <exception cref="KeyNotFoundException">Thrown when the task is not found for this user.</exception>
    public async Task<TaskResponse> UpdateTaskAsync(Guid userId, Guid taskId, UpdateTaskRequest req)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId)
            ?? throw new KeyNotFoundException($"Task {taskId} not found");

        task.Title = req.Title;
        task.Description = req.Description;
        task.Status = req.Status;
        task.Priority = req.Priority;
        task.DueDate = req.DueDate;

        await db.SaveChangesAsync();
        return ToResponse(task);
    }

    /// <summary>
    /// Soft-deletes a task by setting <see cref="TodoTask.IsDeleted"/> to <c>true</c>.
    /// The row is retained in the database for audit purposes.
    /// Throws <see cref="KeyNotFoundException"/> if the task does not exist or belongs to a different user.
    /// </summary>
    /// <param name="userId">The ID of the authenticated user.</param>
    /// <param name="taskId">The ID of the task to delete.</param>
    /// <exception cref="KeyNotFoundException">Thrown when the task is not found for this user.</exception>
    public async Task DeleteTaskAsync(Guid userId, Guid taskId)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId)
            ?? throw new KeyNotFoundException($"Task {taskId} not found");

        task.IsDeleted = true;
        await db.SaveChangesAsync();
    }

    /// <summary>Maps a <see cref="TodoTask"/> entity to its <see cref="TaskResponse"/> read model.</summary>
    private static TaskResponse ToResponse(TodoTask t) => new(
        t.Id,
        t.Title,
        t.Description,
        t.Status.ToString(),
        t.Priority.ToString(),
        t.DueDate,
        t.CreatedAt);
}
