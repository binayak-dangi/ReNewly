using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Plans;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Entitlements;

/// <summary>What the user's current plan allows. Resolved from data so new plans need no code.</summary>
public sealed record UserEntitlements(
    string PlanCode,
    string PlanName,
    PlanTier Tier,
    int? MaxSubscriptions,
    int MaxRemindersPerSubscription,
    bool EmailReminders,
    bool AdvancedAnalytics,
    bool ReceiptStorage,
    bool CloudSync,
    bool Ads,
    DateTime? ExpiresAtUtc)
{
    public bool IsPro => Tier == PlanTier.Pro;

    /// <summary>Used when the FREE plan row has not been loaded yet (ScriptTracker/001 not applied).</summary>
    public static UserEntitlements BuiltInFree { get; } =
        new(PlanCodes.Free, "Free", PlanTier.Free, 5, 1, false, false, false, false, true, null);

    public static UserEntitlements From(SubscriptionPlan plan, DateTime? expiresAtUtc) => new(
        plan.Code,
        plan.Name,
        plan.Tier,
        plan.MaxSubscriptions,
        plan.MaxRemindersPerSubscription,
        plan.EmailRemindersEnabled,
        plan.AdvancedAnalyticsEnabled,
        plan.ReceiptStorageEnabled,
        plan.CloudSyncEnabled,
        plan.AdsEnabled,
        expiresAtUtc);
}

public interface IUserPlanRepository : IRepository<UserPlan>
{
    /// <summary>Current (active or grace-period, not expired) plans, including their SubscriptionPlan.</summary>
    Task<IReadOnlyList<UserPlan>> ListCurrentAsync(Guid userId, DateTime utcNow, CancellationToken cancellationToken = default);
}

public interface IEntitlementService
{
    Task<UserEntitlements> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Throws PLAN_LIMIT_REACHED when adding one more active subscription would exceed the plan.</summary>
    Task EnsureCanAddSubscriptionAsync(Guid userId, int currentActiveCount, CancellationToken cancellationToken = default);
}

/// <summary>
/// Resolves entitlements: the best current <see cref="UserPlan"/> (e.g. a Pro purchase), otherwise the FREE plan.
/// Google Play Billing will create/extend UserPlans; nothing else needs to change.
/// </summary>
internal sealed class EntitlementService(
    IUserPlanRepository userPlans,
    Plans.ISubscriptionPlanRepository plans,
    TimeProvider timeProvider) : IEntitlementService
{
    public async Task<UserEntitlements> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var current = await userPlans.ListCurrentAsync(userId, timeProvider.GetUtcNow().UtcDateTime, cancellationToken);
        var best = current
            .Where(p => p.SubscriptionPlan is not null)
            .OrderByDescending(p => p.SubscriptionPlan!.Tier)
            .ThenByDescending(p => p.ExpiresAtUtc ?? DateTime.MaxValue)
            .FirstOrDefault();

        if (best is not null)
        {
            return UserEntitlements.From(best.SubscriptionPlan!, best.ExpiresAtUtc);
        }

        var free = await plans.GetByCodeAsync(PlanCodes.Free, cancellationToken);
        return free is null ? UserEntitlements.BuiltInFree : UserEntitlements.From(free, null);
    }

    public async Task EnsureCanAddSubscriptionAsync(Guid userId, int currentActiveCount, CancellationToken cancellationToken = default)
    {
        var entitlements = await GetAsync(userId, cancellationToken);
        if (entitlements.MaxSubscriptions is { } max && currentActiveCount >= max)
        {
            throw new BusinessRuleException(
                ErrorCodes.PlanLimitReached,
                $"The {entitlements.PlanName} plan tracks up to {max} active subscriptions. Upgrade to Pro for unlimited subscriptions.");
        }
    }
}
