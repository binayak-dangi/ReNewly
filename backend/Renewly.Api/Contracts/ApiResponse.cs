namespace Renewly.Api.Contracts;

/// <summary>
/// Envelope returned by every endpoint so the mobile client parses success and failure uniformly.
/// <code>
/// { "success": true,  "data": {...}, "message": null, "error": null, "traceId": "..." }
/// { "success": false, "data": null, "message": null, "error": { "code": "VALIDATION_FAILED", "message": "...", "details": { "price": ["..."] } }, "traceId": "..." }
/// </code>
/// </summary>
public sealed record ApiResponse<T>(bool Success, T? Data, string? Message, ApiError? Error, string? TraceId);

public sealed record ApiError(string Code, string Message, IDictionary<string, string[]>? Details = null);

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string? message = null, string? traceId = null) =>
        new(true, data, message, null, traceId);

    public static ApiResponse<object> Ok(string? message = null, string? traceId = null) => new(true, null, message, null, traceId);

    public static ApiResponse<object> Fail(ApiError error, string? traceId) => new(false, null, null, error, traceId);
}
