using Renewly.Domain.Common;

namespace Renewly.Domain.Entities;

/// <summary>
/// Long-lived session token. Only a SHA-256 hash is stored. Tokens rotate on every use;
/// reuse of a revoked token revokes the whole family (theft detection).
/// </summary>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public required string TokenHash { get; set; }

    /// <summary>All tokens descending from one login share a family id.</summary>
    public Guid FamilyId { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? RevokedAtUtc { get; set; }

    public string? RevokedReason { get; set; }

    public Guid? ReplacedByTokenId { get; set; }

    public string? CreatedByIp { get; set; }

    public string? DeviceName { get; set; }

    public bool IsActive(DateTime utcNow) => RevokedAtUtc is null && ExpiresAtUtc > utcNow;
}
