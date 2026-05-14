using TaskManager.Api.Domain.Enums;

namespace TaskManager.Api.Domain.Entities;

/// <summary>
/// Represents a task owned by a user. Deletions are soft — the row is never physically removed;
/// <see cref="IsDeleted"/> is set to <c>true</c> instead, and an EF Core global query filter
/// keeps deleted rows invisible to all normal queries.
/// </summary>
public class TodoTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Enums.TaskStatus Status { get; set; } = Enums.TaskStatus.Pending;
    public Priority Priority { get; set; } = Priority.Medium;
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When <c>true</c>, the task has been soft-deleted and is excluded from all normal queries
    /// via the EF Core global query filter. Use <c>IgnoreQueryFilters()</c> to bypass.
    /// </summary>
    public bool IsDeleted { get; set; }

    public User User { get; set; } = null!;
}
