namespace Renewly.Application.Common.Exceptions;

/// <summary>
/// Base for expected, client-facing failures. The API maps each subtype to an HTTP status and
/// returns <see cref="ErrorCode"/> so the mobile app can react without parsing messages.
/// </summary>
public abstract class AppException(string errorCode, string message) : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}

/// <summary>404 — the resource does not exist or does not belong to the caller.</summary>
public sealed class NotFoundException(string resource, object? key = null)
    : AppException(ErrorCodes.NotFound, key is null ? $"{resource} was not found." : $"{resource} '{key}' was not found.");

/// <summary>409 — the request conflicts with current state (e.g. email already registered).</summary>
public sealed class ConflictException(string errorCode, string message) : AppException(errorCode, message);

/// <summary>422 — a business rule prevents the operation (e.g. free plan subscription limit).</summary>
public sealed class BusinessRuleException(string errorCode, string message) : AppException(errorCode, message);

/// <summary>401 — credentials or tokens are invalid.</summary>
public sealed class UnauthorizedException(string errorCode, string message) : AppException(errorCode, message);

/// <summary>403 — authenticated but not allowed (e.g. Pro-only feature).</summary>
public sealed class ForbiddenException(string errorCode, string message) : AppException(errorCode, message);
