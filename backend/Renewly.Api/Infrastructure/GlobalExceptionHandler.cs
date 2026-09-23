using System.Diagnostics;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Renewly.Api.Contracts;
using Renewly.Application.Common.Exceptions;

namespace Renewly.Api.Infrastructure;

/// <summary>Converts every unhandled exception into the standard <see cref="ApiResponse{T}"/> envelope.</summary>
internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment environment)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, error) = Map(exception);

        if (status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            logger.LogInformation("Request failed with {Status} {Code}: {Message}", status, error.Code, error.Message);
        }

        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(ApiResponse.Fail(error, traceId), cancellationToken);
        return true;
    }

    private (int Status, ApiError Error) Map(Exception exception) => exception switch
    {
        ValidationException validation => (
            StatusCodes.Status400BadRequest,
            new ApiError(
                ErrorCodes.ValidationFailed,
                "One or more fields are invalid.",
                validation.Errors
                    .GroupBy(e => ToCamelCase(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray()))),
        NotFoundException e => (StatusCodes.Status404NotFound, new ApiError(e.ErrorCode, e.Message)),
        ConflictException e => (StatusCodes.Status409Conflict, new ApiError(e.ErrorCode, e.Message)),
        BusinessRuleException e => (StatusCodes.Status422UnprocessableEntity, new ApiError(e.ErrorCode, e.Message)),
        UnauthorizedException e => (StatusCodes.Status401Unauthorized, new ApiError(e.ErrorCode, e.Message)),
        ForbiddenException e => (StatusCodes.Status403Forbidden, new ApiError(e.ErrorCode, e.Message)),
        BadHttpRequestException e => (e.StatusCode, new ApiError(ErrorCodes.ValidationFailed, "The request could not be read.")),
        OperationCanceledException => (499, new ApiError("REQUEST_CANCELLED", "The request was cancelled.")),
        _ => (
            StatusCodes.Status500InternalServerError,
            new ApiError(
                ErrorCodes.InternalError,
                environment.IsDevelopment() ? exception.Message : "Something went wrong. Please try again later.")),
    };

    internal static string ToCamelCase(string name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return name;
        }

        // "Items[0].Price" → "items[0].price"
        var parts = name.Split('.');
        for (var i = 0; i < parts.Length; i++)
        {
            if (parts[i].Length > 0)
            {
                parts[i] = char.ToLowerInvariant(parts[i][0]) + parts[i][1..];
            }
        }

        return string.Join('.', parts);
    }
}
