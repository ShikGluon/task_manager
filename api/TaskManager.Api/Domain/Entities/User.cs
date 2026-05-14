namespace TaskManager.Api.Domain.Entities;

/// <summary>
/// Represents a registered application user.
/// </summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    /// <summary>BCrypt hash of the user's password.</summary>
    public string PasswordHash { get; set; } = string.Empty;
    public ICollection<TodoTask> Tasks { get; set; } = [];
}
