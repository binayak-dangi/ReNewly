namespace Renewly.Domain.Entities;

/// <summary>Append-only record of security-relevant and data-changing actions.</summary>
public class AuditLog
{
    public long Id { get; set; }

    public Guid? UserId { get; set; }

    /// <summary>E.g. "auth.login", "subscription.deleted".</summary>
    public required string Action { get; set; }

    public string? EntityName { get; set; }

    public string? EntityId { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    /// <summary>Optional JSON with extra context. Must never contain secrets.</summary>
    public string? Details { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
