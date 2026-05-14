using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Domain.Entities;
using TaskManager.Api.Domain.Enums;
using TaskManager.Api.Features.Tasks;
using TaskManager.Api.Infrastructure.Data;

namespace TaskManager.Tests;

/// <summary>
/// Unit tests for <see cref="TaskService"/> using the EF Core InMemory provider.
/// Each test creates an isolated in-memory database to avoid state leaking between cases.
/// </summary>
public class TaskServiceTests
{
    /// <summary>Creates a fresh in-memory <see cref="AppDbContext"/> for a single test.</summary>
    private static AppDbContext CreateDb()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(opts);
    }

    /// <summary>
    /// Verifies that <see cref="TaskService.GetTasksAsync"/> returns only the tasks belonging
    /// to the requesting user and never exposes another user's data.
    /// </summary>
    [Fact]
    public async Task GetTasks_ReturnsOnlyCurrentUserTasks()
    {
        var db = CreateDb();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();

        db.Tasks.AddRange(
            new TodoTask { UserId = userA, Title = "Task A1" },
            new TodoTask { UserId = userA, Title = "Task A2" },
            new TodoTask { UserId = userB, Title = "Task B1" }
        );
        await db.SaveChangesAsync();

        var svc = new TaskService(db);
        var results = await svc.GetTasksAsync(userA, null, null);

        Assert.Equal(2, results.Count);
        Assert.All(results, t => Assert.Contains("A", t.Title));
    }

    /// <summary>
    /// Verifies that fetching a task by ID as a different user throws <see cref="KeyNotFoundException"/>,
    /// ensuring cross-user data access is blocked at the service layer.
    /// </summary>
    [Fact]
    public async Task GetTaskById_ThrowsIfWrongUser()
    {
        var db = CreateDb();
        var owner = Guid.NewGuid();
        var stranger = Guid.NewGuid();

        var task = new TodoTask { UserId = owner, Title = "Owner task" };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var svc = new TaskService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => svc.GetTaskByIdAsync(stranger, task.Id));
    }

    /// <summary>
    /// Verifies that <see cref="TaskService.DeleteTaskAsync"/> performs a soft delete —
    /// the database row is retained with <c>IsDeleted = true</c> rather than being removed.
    /// </summary>
    [Fact]
    public async Task DeleteTask_SetsIsDeletedTrue_DoesNotHardDelete()
    {
        var db = CreateDb();
        var userId = Guid.NewGuid();

        var task = new TodoTask { UserId = userId, Title = "To delete" };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var svc = new TaskService(db);
        await svc.DeleteTaskAsync(userId, task.Id);

        // Bypass the global query filter to confirm the row still exists.
        var raw = await db.Tasks.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == task.Id);
        Assert.NotNull(raw);
        Assert.True(raw!.IsDeleted);
    }

    /// <summary>
    /// Verifies that <see cref="TaskService.CreateTaskAsync"/> correctly sets <c>UserId</c>
    /// on the persisted entity from the caller's identity, not from the request body.
    /// </summary>
    [Fact]
    public async Task CreateTask_SetsCorrectUserId()
    {
        var db = CreateDb();
        var userId = Guid.NewGuid();

        var svc = new TaskService(db);
        var result = await svc.CreateTaskAsync(userId, new CreateTaskRequest(
            "New task", "desc", Priority.High, null));

        var stored = await db.Tasks.FirstAsync(t => t.Id == result.Id);
        Assert.Equal(userId, stored.UserId);
    }
}
