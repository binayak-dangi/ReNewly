using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Plans;

public sealed record SubscriptionPlanDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    PlanTier Tier,
    decimal Price,
    string Currency,
    BillingCycle? BillingCycle,
    int? MaxSubscriptions,
    int MaxRemindersPerSubscription,
    bool EmailRemindersEnabled,
    bool AdvancedAnalyticsEnabled,
    bool ReceiptStorageEnabled,
    bool CloudSyncEnabled,
    bool AdsEnabled,
    string? GooglePlayProductId)
{
    public static SubscriptionPlanDto From(SubscriptionPlan p) => new(
        p.Id,
        p.Code,
        p.Name,
        p.Description,
        p.Tier,
        p.Price,
        p.Currency,
        p.BillingCycle,
        p.MaxSubscriptions,
        p.MaxRemindersPerSubscription,
        p.EmailRemindersEnabled,
        p.AdvancedAnalyticsEnabled,
        p.ReceiptStorageEnabled,
        p.CloudSyncEnabled,
        p.AdsEnabled,
        p.GooglePlayProductId);
}
