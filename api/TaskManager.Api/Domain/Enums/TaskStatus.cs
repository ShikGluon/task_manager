namespace TaskManager.Api.Domain.Enums;

/// <summary>
/// Represents the completion status of a task.
/// </summary>
public enum TaskStatus
{
    /// <summary>The task has not been completed yet. This is the default for new tasks.</summary>
    Pending = 0,

    /// <summary>The task has been marked as completed by the user.</summary>
    Completed = 1
}
