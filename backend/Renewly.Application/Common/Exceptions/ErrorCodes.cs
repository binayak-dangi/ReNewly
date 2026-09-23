namespace Renewly.Application.Common.Exceptions;

/// <summary>Stable, machine-readable error codes shared with the mobile client.</summary>
public static class ErrorCodes
{
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string NotFound = "NOT_FOUND";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string Conflict = "CONFLICT";
    public const string RateLimited = "RATE_LIMITED";
    public const string InternalError = "INTERNAL_ERROR";

    // Auth
    public const string EmailAlreadyRegistered = "EMAIL_ALREADY_REGISTERED";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string AccountLocked = "ACCOUNT_LOCKED";
    public const string EmailNotVerified = "EMAIL_NOT_VERIFIED";
    public const string InvalidToken = "INVALID_TOKEN";

    // Plans / entitlements
    public const string PlanLimitReached = "PLAN_LIMIT_REACHED";
    public const string ProFeatureRequired = "PRO_FEATURE_REQUIRED";
}
