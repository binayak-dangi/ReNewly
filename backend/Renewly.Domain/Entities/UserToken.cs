using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>Single-use token for email verification or password reset. Only a hash is stored.</summary>
public class UserToken : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public UserTokenPurpose Purpose { get; set; }

    public required string TokenHash { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? ConsumedAtUtc { get; set; }

    public int FailedAttempts { get; set; }

    public bool IsUsable(DateTime utcNow) => ConsumedAtUtc is null && ExpiresAtUtc > utcNow;
}
