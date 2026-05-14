namespace TaskManager.Api.Features.Auth;

/// <summary>Request body for <c>POST /api/auth/register</c>.</summary>
public record RegisterRequest(string Email, string Password);

/// <summary>Request body for <c>POST /api/auth/login</c>.</summary>
public record LoginRequest(string Email, string Password);

/// <summary>
/// Response returned on successful register or login.
/// <paramref name="Token"/> is a signed JWT Bearer token for subsequent API requests.
/// </summary>
public record AuthResponse(string Token, string Email);
