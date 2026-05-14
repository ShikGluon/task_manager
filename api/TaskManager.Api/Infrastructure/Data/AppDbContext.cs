using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Domain.Entities;

namespace TaskManager.Api.Infrastructure.Data;

/// <summary>
/// EF Core database context. Configures entity mappings, indexes, relationships, and a global
/// soft-delete query filter that automatically excludes <see cref="TodoTask"/> rows where
/// <c>IsDeleted == true</c>.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    /// <summary>
    /// Task set with a global <c>!IsDeleted</c> filter active on all queries.
    /// Use <c>IgnoreQueryFilters()</c> to bypass it.
    /// </summary>
    public DbSet<TodoTask> Tasks => Set<TodoTask>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<TodoTask>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasQueryFilter(t => !t.IsDeleted);
            e.HasOne(t => t.User)
             .WithMany(u => u.Tasks)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
