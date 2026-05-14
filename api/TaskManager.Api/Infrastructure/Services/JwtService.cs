using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TaskManager.Api.Infrastructure.Services;

/// <summary>
/// Generates signed HS256 JWT Bearer tokens for authenticated users.
/// Token parameters (secret, issuer, audience, expiry) are read from <c>appsettings.json</c>
/// under the <c>Jwt</c> section.
/// </summary>
public class JwtService(IConfiguration config)
{
    /// <summary>
    /// Creates and returns a signed JWT for the given user.
    /// </summary>
    /// <param name="userId">The user's unique identifier, stored in the <c>sub</c> claim.</param>
    /// <param name="email">The user's email address, stored in the <c>email</c> claim.</param>
    /// <returns>A compact serialised JWT string ready to use as a Bearer token.</returns>
    /// <exception cref="InvalidOperationException">Thrown if <c>Jwt:Secret</c> is not configured.</exception>
    public string GenerateToken(Guid userId, string email)
    {
        var secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiry = int.Parse(config["Jwt:ExpiryHours"] ?? "24", CultureInfo.InvariantCulture);
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiry),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
