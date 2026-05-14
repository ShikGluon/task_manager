using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace TaskManager.Api.Middleware;

/// <summary>
/// ASP.NET Core middleware that catches all unhandled exceptions and converts them to
/// RFC 7807 <see href="https://www.rfc-editor.org/rfc/rfc7807">Problem Details</see> JSON responses.
/// This prevents stack traces from leaking to clients while still returning structured error payloads.
/// </summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    /// <summary>
    /// Invokes the next middleware in the pipeline and catches any unhandled exception.
    /// </summary>
    /// <param name="ctx">The current HTTP context.</param>
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await WriteProblemDetails(ctx, ex);
        }
    }

    /// <summary>
    /// Writes an RFC 7807 Problem Details response based on the exception type.
    /// </summary>
    private static Task WriteProblemDetails(HttpContext ctx, Exception ex)
    {
        var (status, title) = ex switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Access denied"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Bad request"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = ex.Message,
            Instance = ctx.Request.Path
        };

        ctx.Response.ContentType = "application/problem+json";
        ctx.Response.StatusCode = status;

        return ctx.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
