using Renewly.Domain.Common;

namespace Renewly.Domain.Entities;

public class User : BaseEntity, ISoftDeletable
{
    public required string Email { get; set; }

    /// <summary>Upper-cased email used for unique lookups.</summary>
    public required string NormalizedEmail { get; set; }

    public required string PasswordHash { get; set; }

    public required string FullName { get; set; }

    public bool EmailConfirmed { get; set; }

    public DateTime? EmailConfirmedAtUtc { get; set; }

    /// <summary>ISO 4217 code used for dashboard totals, e.g. "USD".</summary>
    public string PreferredCurrency { get; set; } = "USD";

    /// <summary>IANA time zone id, e.g. "Asia/Kathmandu". Reminders are scheduled in this zone.</summary>
    public string TimeZoneId { get; set; } = "UTC";

    /// <summary>BCP 47 language tag, e.g. "en".</summary>
    public string Language { get; set; } = "en";

    public bool IsActive { get; set; } = true;

    public int AccessFailedCount { get; set; }

    public DateTime? LockoutEndUtc { get; set; }

    /// <summary>Rotated on password change so that outstanding tokens can be invalidated.</summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime? LastLoginAtUtc { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public ICollection<UserSubscription> Subscriptions { get; set; } = [];

    public ICollection<UserDevice> Devices { get; set; } = [];

    public UserNotificationSettings? NotificationSettings { get; set; }

    public ICollection<UserPlan> Plans { get; set; } = [];

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];

    public ICollection<NotificationLog> Notifications { get; set; } = [];
}
