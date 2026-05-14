using System.Security.Claims;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Domain.Entities;
using TaskManager.Api.Infrastructure.Data;
using TaskManager.Api.Infrastructure.Services;

namespace TaskManager.Api.Features.Auth;

/// <summary>
/// Maps authentication-related endpoints under <c>/api/auth</c>.
/// </summary>
public static class AuthEndpoints
{
    /// <summary>Registers all auth routes on the application's endpoint route builder.</summary>
    /// <param name="app">The <see cref="IEndpointRouteBuilder"/> to add routes to.</param>
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapGet("/me", Me).RequireAuthorization();
    }

    /// <summary>
    /// Returns the currently authenticated user's profile, or 401 if the user
    /// no longer exists in the database (e.g. after a data reset).
    /// </summary>
    private static async Task<IResult> Me(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user is null ? Results.Unauthorized() : Results.Ok(new { email = user.Email });
    }

    /// <summary>
    /// Creates a new user account and returns a JWT on success.
    /// Returns 409 Conflict if the email is already registered.
    /// </summary>
    private static async Task<IResult> Register(
        RegisterRequest req,
        AppDbContext db,
        JwtService jwt,
        IValidator<RegisterRequest> validator)
    {
        var validation = await validator.ValidateAsync(req);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Results.Conflict(new { message = "Email already in use" });

        var user = new User
        {
            Email = req.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Results.Ok(new AuthResponse(jwt.GenerateToken(user.Id, user.Email), user.Email));
    }

    /// <summary>
    /// Validates credentials and returns a JWT on success.
    /// Returns 401 Unauthorized for any invalid email/password combination.
    /// </summary>
    private static async Task<IResult> Login(
        LoginRequest req,
        AppDbContext db,
        JwtService jwt,
        IValidator<LoginRequest> validator)
    {
        var validation = await validator.ValidateAsync(req);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLowerInvariant());
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Results.Unauthorized();

        return Results.Ok(new AuthResponse(jwt.GenerateToken(user.Id, user.Email), user.Email));
    }
}
