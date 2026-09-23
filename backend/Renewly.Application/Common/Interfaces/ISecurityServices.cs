using Renewly.Domain.Entities;

namespace Renewly.Application.Common.Interfaces;

/// <summary>The authenticated caller and request metadata, resolved from the HTTP context.</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }

    /// <summary>Throws <see cref="Exceptions.UnauthorizedException"/> when the request is anonymous.</summary>
    Guid RequiredUserId { get; }

    string? IpAddress { get; }

    string? UserAgent { get; }
}

public interface IPasswordHasher
{
    string Hash(User user, string password);

    PasswordVerification Verify(User user, string hashedPassword, string providedPassword);
}

public enum PasswordVerification
{
    Failed,
    Success,
    /// <summary>Correct, but hashed with outdated parameters; the caller should re-hash and save.</summary>
    SuccessRehashNeeded,
}

public sealed record AccessToken(string Token, DateTime ExpiresAtUtc);

public interface IJwtTokenService
{
    AccessToken CreateAccessToken(User user);
}

/// <summary>Cryptographically secure opaque tokens and one-time codes, plus the hashes we persist.</summary>
public interface ISecureTokenGenerator
{
    /// <summary>URL-safe random token (256 bits) for refresh tokens.</summary>
    string CreateOpaqueToken();

    /// <summary>Numeric one-time code, e.g. "482913", for email verification / password reset.</summary>
    string CreateNumericCode(int digits = 6);

    /// <summary>SHA-256 hex digest. Only hashes are stored; raw tokens never touch the database.</summary>
    string Hash(string value);
}

public interface IAuditLogger
{
    /// <summary>Queues an audit record; it is persisted with the next unit-of-work commit.</summary>
    void Log(string action, Guid? userId, string? entityName = null, string? entityId = null, string? details = null);
}
