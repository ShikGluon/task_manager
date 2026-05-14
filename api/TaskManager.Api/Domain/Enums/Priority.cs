namespace TaskManager.Api.Domain.Enums;

/// <summary>
/// Represents the priority level of a task.
/// </summary>
public enum Priority
{
    /// <summary>Low urgency — can be addressed when convenient.</summary>
    Low = 0,

    /// <summary>Standard urgency — the default for new tasks.</summary>
    Medium = 1,

    /// <summary>High urgency — should be addressed promptly.</summary>
    High = 2
}
