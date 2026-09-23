using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>
/// A Renewly plan (Free, Pro monthly, Pro yearly). Feature flags live here so that
/// entitlement checks are data-driven and new plans need no code changes.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    /// <summary>Stable code, e.g. "FREE", "PRO_MONTHLY".</summary>
    public required string Code { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public PlanTier Tier { get; set; }

    public decimal Price { get; set; }

    public required string Currency { get; set; }

    /// <summary>Null for the free plan.</summary>
    public BillingCycle? BillingCycle { get; set; }

    /// <summary>Null means unlimited.</summary>
    public int? MaxSubscriptions { get; set; }

    /// <summary>Maximum reminder offsets per subscription (e.g. 1 on Free, 3 on Pro).</summary>
    public int MaxRemindersPerSubscription { get; set; } = 1;

    public bool EmailRemindersEnabled { get; set; }

    public bool AdvancedAnalyticsEnabled { get; set; }

    public bool ReceiptStorageEnabled { get; set; }

    public bool CloudSyncEnabled { get; set; }

    public bool AdsEnabled { get; set; }

    /// <summary>Product id in Google Play Console, used when billing is integrated.</summary>
    public string? GooglePlayProductId { get; set; }

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }
}
