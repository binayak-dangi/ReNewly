using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>A user's entitlement to a Renewly plan over a period of time.</summary>
public class UserPlan : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public Guid SubscriptionPlanId { get; set; }

    public SubscriptionPlan? SubscriptionPlan { get; set; }

    public UserPlanStatus Status { get; set; } = UserPlanStatus.Active;

    public DateTime StartsAtUtc { get; set; }

    /// <summary>Null for the free plan, which never expires.</summary>
    public DateTime? ExpiresAtUtc { get; set; }

    public bool AutoRenewing { get; set; }

    /// <summary>Google Play purchase token (or equivalent), set when billing is integrated.</summary>
    public string? ExternalPurchaseToken { get; set; }

    public DateTime? CancelledAtUtc { get; set; }

    public ICollection<PaymentTransaction> Transactions { get; set; } = [];

    public bool IsCurrent(DateTime utcNow) =>
        Status is UserPlanStatus.Active or UserPlanStatus.GracePeriod
        && StartsAtUtc <= utcNow
        && (ExpiresAtUtc is null || ExpiresAtUtc > utcNow);
}
