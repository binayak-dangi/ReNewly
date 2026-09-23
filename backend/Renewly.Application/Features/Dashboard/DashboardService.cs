using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Models;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Notifications;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Dashboard;

public sealed record UpcomingRenewalDto(
    Guid SubscriptionId,
    string ServiceName,
    string? ServiceSlug,
    string? BrandColor,
    string? PlanName,
    decimal Price,
    string Currency,
    BillingCycle BillingCycle,
    DateOnly RenewalDate,
    int DaysRemaining);

public sealed record PlanUsageDto(string PlanCode, string PlanName, PlanTier Tier, int ActiveSubscriptions, int? MaxSubscriptions)
{
    public bool LimitReached => MaxSubscriptions is { } max && ActiveSubscriptions >= max;
}

/// <summary>Everything the home screen needs in one request, ordered by what the user must see first.</summary>
public sealed record DashboardDto(
    UpcomingRenewalDto? NextRenewal,
    IReadOnlyList<UpcomingRenewalDto> UpcomingRenewals,
    int ActiveSubscriptions,
    IReadOnlyList<MoneyDto> MonthlySpend,
    IReadOnlyList<MoneyDto> YearlySpend,
    IReadOnlyList<MoneyDto> DueNext7Days,
    IReadOnlyList<NotificationDto> RecentNotifications,
    int UnreadNotifications,
    PlanUsageDto Plan,
    string PreferredCurrency,
    DateOnly Today);

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default);
}

internal sealed class DashboardService(
    IUserRepository users,
    IUserSubscriptionRepository subscriptions,
    INotificationLogRepository notifications,
    IEntitlementService entitlementService,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IDashboardService
{
    private const int UpcomingWindowDays = 30;
    private const int UpcomingMaxItems = 10;
    private const int RecentNotificationCount = 5;

    public async Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequiredUserId;
        var user = await users.GetByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");

        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        var active = await subscriptions.ListActiveForUserAsync(userId, cancellationToken: cancellationToken);
        var entitlements = await entitlementService.GetAsync(userId, cancellationToken);
        var recent = await notifications.ListRecentAsync(userId, RecentNotificationCount, cancellationToken);
        var unread = await notifications.CountUnreadAsync(userId, cancellationToken);

        var projected = active
            .Select(s => ToUpcoming(s, RenewalProjection.NextRenewal(s, today), today))
            .OrderBy(u => u.RenewalDate)
            .ThenByDescending(u => u.Price)
            .ToList();
        var upcoming = projected.Where(u => u.DaysRemaining <= UpcomingWindowDays).ToList();

        // The single most important fact: the next renewal, even if it is beyond the 30-day window.
        var next = projected.FirstOrDefault();

        var dueNext7 = RenewalProjection.Between(active, today, today.AddDays(7), today).ToList();

        return new DashboardDto(
            next,
            upcoming.Take(UpcomingMaxItems).ToList(),
            active.Count,
            MoneyTotals.Sum(active, s => s.Currency, s => s.MonthlyCost, user.PreferredCurrency),
            MoneyTotals.Sum(active, s => s.Currency, s => s.YearlyCost, user.PreferredCurrency),
            MoneyTotals.Sum(dueNext7, o => o.Subscription.Currency, o => o.Subscription.Price, user.PreferredCurrency),
            recent.Select(NotificationDto.From).ToList(),
            unread,
            new PlanUsageDto(entitlements.PlanCode, entitlements.PlanName, entitlements.Tier, active.Count, entitlements.MaxSubscriptions),
            user.PreferredCurrency,
            today);
    }

    private static UpcomingRenewalDto ToUpcoming(Domain.Entities.UserSubscription s, DateOnly date, DateOnly today) => new(
        s.Id,
        s.ServiceName,
        s.SubscriptionService?.Slug,
        s.SubscriptionService?.BrandColor,
        s.PlanName,
        s.Price,
        s.Currency,
        s.BillingCycle,
        date,
        date.DayNumber - today.DayNumber);
}
