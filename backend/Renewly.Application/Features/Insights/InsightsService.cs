using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Models;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;
using Renewly.Domain.Services;

namespace Renewly.Application.Features.Insights;

public sealed record CategorySpendDto(SubscriptionCategory Category, string Currency, decimal MonthlyAmount, int SubscriptionCount, decimal SharePercent);

public sealed record MonthForecastDto(int Year, int Month, int RenewalCount, IReadOnlyList<MoneyDto> Totals);

public sealed record TopSubscriptionDto(Guid SubscriptionId, string ServiceName, string? BrandColor, decimal MonthlyCost, string Currency, decimal SharePercent);

public sealed record BillingCycleMixDto(BillingCycle BillingCycle, int SubscriptionCount);

/// <summary>Pro-only analytics.</summary>
public sealed record AdvancedInsightsDto(
    IReadOnlyList<MonthForecastDto> TwelveMonthForecast,
    IReadOnlyList<TopSubscriptionDto> TopSubscriptions,
    IReadOnlyList<BillingCycleMixDto> BillingCycleMix);

public sealed record InsightsDto(
    int ActiveSubscriptions,
    IReadOnlyList<MoneyDto> MonthlySpend,
    IReadOnlyList<MoneyDto> YearlySpend,
    int UpcomingRenewalCount30Days,
    IReadOnlyList<MoneyDto> UpcomingRenewalAmount30Days,
    IReadOnlyList<CategorySpendDto> SpendingByCategory,
    bool AdvancedAnalyticsAvailable,
    AdvancedInsightsDto? Advanced,
    string PreferredCurrency);

public interface IInsightsService
{
    Task<InsightsDto> GetAsync(CancellationToken cancellationToken = default);
}

internal sealed class InsightsService(
    IUserRepository users,
    IUserSubscriptionRepository subscriptions,
    IEntitlementService entitlementService,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IInsightsService
{
    private const int TopCount = 5;

    public async Task<InsightsDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(currentUser.RequiredUserId, cancellationToken)
            ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");
        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        var active = await subscriptions.ListActiveForUserAsync(user.Id, cancellationToken: cancellationToken);
        var entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);
        var currency = user.PreferredCurrency;

        var next30 = RenewalProjection.Between(active, today, today.AddDays(30), today).ToList();

        return new InsightsDto(
            active.Count,
            MoneyTotals.Sum(active, s => s.Currency, s => s.MonthlyCost, currency),
            MoneyTotals.Sum(active, s => s.Currency, s => s.YearlyCost, currency),
            next30.Count,
            MoneyTotals.Sum(next30, o => o.Subscription.Currency, o => o.Subscription.Price, currency),
            ByCategory(active, currency),
            entitlements.AdvancedAnalytics,
            entitlements.AdvancedAnalytics ? Advanced(active, today, currency) : null,
            currency);
    }

    private static List<CategorySpendDto> ByCategory(IReadOnlyList<UserSubscription> active, string preferredCurrency)
    {
        var totalsByCurrency = active.GroupBy(s => s.Currency).ToDictionary(g => g.Key, g => g.Sum(s => s.MonthlyCost));

        return active
            .GroupBy(s => (s.Category, s.Currency))
            .Select(g =>
            {
                var amount = g.Sum(s => s.MonthlyCost);
                var total = totalsByCurrency[g.Key.Currency];
                return new CategorySpendDto(
                    g.Key.Category,
                    g.Key.Currency,
                    BillingCalculator.RoundMoney(amount),
                    g.Count(),
                    total == 0 ? 0 : Math.Round(amount / total * 100m, 1));
            })
            .OrderByDescending(c => c.Currency == preferredCurrency)
            .ThenBy(c => c.Currency, StringComparer.Ordinal)
            .ThenByDescending(c => c.MonthlyAmount)
            .ToList();
    }

    private static AdvancedInsightsDto Advanced(IReadOnlyList<UserSubscription> active, DateOnly today, string preferredCurrency)
    {
        var firstOfMonth = new DateOnly(today.Year, today.Month, 1);
        var forecast = Enumerable.Range(0, 12).Select(i =>
        {
            var start = firstOfMonth.AddMonths(i);
            var end = start.AddMonths(1).AddDays(-1);
            var renewals = RenewalProjection.Between(active, start, end, today).ToList();
            return new MonthForecastDto(
                start.Year,
                start.Month,
                renewals.Count,
                MoneyTotals.Sum(renewals, o => o.Subscription.Currency, o => o.Subscription.Price, preferredCurrency));
        }).ToList();

        var totalsByCurrency = active.GroupBy(s => s.Currency).ToDictionary(g => g.Key, g => g.Sum(s => s.MonthlyCost));
        var top = active
            .OrderByDescending(s => s.Currency == preferredCurrency)
            .ThenByDescending(s => s.MonthlyCost)
            .Take(TopCount)
            .Select(s => new TopSubscriptionDto(
                s.Id,
                s.ServiceName,
                s.SubscriptionService?.BrandColor,
                BillingCalculator.RoundMoney(s.MonthlyCost),
                s.Currency,
                totalsByCurrency[s.Currency] == 0 ? 0 : Math.Round(s.MonthlyCost / totalsByCurrency[s.Currency] * 100m, 1)))
            .ToList();

        var mix = active
            .GroupBy(s => s.BillingCycle)
            .Select(g => new BillingCycleMixDto(g.Key, g.Count()))
            .OrderBy(m => m.BillingCycle)
            .ToList();

        return new AdvancedInsightsDto(forecast, top, mix);
    }
}
