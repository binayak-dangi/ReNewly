using Renewly.Domain.Entities;
using Renewly.Domain.Enums;
using Renewly.Domain.Services;

namespace Renewly.Application.Features.Subscriptions;

/// <summary>Create and update share one shape; the mobile form sends the full subscription.</summary>
public sealed record SaveSubscriptionRequest(
    Guid? ServiceId,
    string? ServiceName,
    string? PlanName,
    SubscriptionCategory? Category,
    decimal Price,
    string Currency,
    BillingCycle BillingCycle,
    DateOnly NextRenewalDate,
    string? PaymentMethodLabel,
    string? Notes,
    IReadOnlyList<int>? ReminderDaysBefore,
    bool PushReminderEnabled = true,
    bool EmailReminderEnabled = false);

public enum SubscriptionStatusFilter
{
    Active = 1,
    Cancelled = 2,
    All = 3,
}

public enum SubscriptionSort
{
    RenewalDate = 1,
    PriceHighToLow = 2,
    Name = 3,
}

public sealed record SubscriptionListQuery(
    SubscriptionStatusFilter Status = SubscriptionStatusFilter.Active,
    string? Search = null,
    SubscriptionSort Sort = SubscriptionSort.RenewalDate);

public sealed record SubscriptionDto(
    Guid Id,
    Guid? ServiceId,
    string? ServiceSlug,
    string ServiceName,
    string? PlanName,
    SubscriptionCategory Category,
    string? BrandColor,
    decimal Price,
    string Currency,
    BillingCycle BillingCycle,
    DateOnly NextRenewalDate,
    int DaysUntilRenewal,
    decimal MonthlyCost,
    decimal YearlyCost,
    string? PaymentMethodLabel,
    string? Notes,
    SubscriptionStatus Status,
    DateTime? CancelledAtUtc,
    IReadOnlyList<int> ReminderDaysBefore,
    bool PushReminderEnabled,
    bool EmailReminderEnabled,
    bool HasOfficialCancellationPage,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc)
{
    /// <param name="today">The user's local date; stale renewal dates are projected forward from it.</param>
    public static SubscriptionDto From(UserSubscription s, DateOnly today)
    {
        var next = s.IsActive ? BillingCalculator.NextRenewalOnOrAfter(s.NextRenewalDate, s.BillingCycle, today) : s.NextRenewalDate;
        return new SubscriptionDto(
            s.Id,
            s.SubscriptionServiceId,
            s.SubscriptionService?.Slug,
            s.ServiceName,
            s.PlanName,
            s.Category,
            s.SubscriptionService?.BrandColor,
            s.Price,
            s.Currency,
            s.BillingCycle,
            next,
            next.DayNumber - today.DayNumber,
            BillingCalculator.RoundMoney(s.MonthlyCost),
            BillingCalculator.RoundMoney(s.YearlyCost),
            s.PaymentMethodLabel,
            s.Notes,
            s.Status,
            s.CancelledAtUtc,
            s.ReminderDaysBefore,
            s.PushReminderEnabled,
            s.EmailReminderEnabled,
            !string.IsNullOrEmpty(s.SubscriptionService?.CancellationUrl),
            s.CreatedAtUtc,
            s.UpdatedAtUtc);
    }
}

public sealed record ReminderDto(Guid Id, DateOnly RenewalDate, int DaysBefore, NotificationChannel Channel, DateTime ScheduledForUtc, ReminderStatus Status)
{
    public static ReminderDto From(SubscriptionReminder r) => new(r.Id, r.RenewalDate, r.DaysBefore, r.Channel, r.ScheduledForUtc, r.Status);
}

public sealed record SubscriptionDetailDto(SubscriptionDto Subscription, IReadOnlyList<ReminderDto> ReminderSchedule);
