using Renewly.Domain.Entities;
using Renewly.Domain.Services;

namespace Renewly.Application.Features.Subscriptions;

public sealed record RenewalOccurrence(UserSubscription Subscription, DateOnly Date);

/// <summary>Projects future renewal dates of active subscriptions (calendar, upcoming totals, forecasts).</summary>
public static class RenewalProjection
{
    /// <summary>Renewals falling in [from, to], never before <paramref name="today"/>.</summary>
    public static IEnumerable<RenewalOccurrence> Between(
        IEnumerable<UserSubscription> subscriptions,
        DateOnly from,
        DateOnly to,
        DateOnly today)
    {
        var start = from < today ? today : from;
        foreach (var subscription in subscriptions.Where(s => s.IsActive))
        {
            var date = BillingCalculator.NextRenewalOnOrAfter(subscription.NextRenewalDate, subscription.BillingCycle, start);
            while (date <= to)
            {
                yield return new RenewalOccurrence(subscription, date);
                // Anchor on the stored date to avoid month-end drift (Jan 31 → Feb 28 → Mar 31).
                date = BillingCalculator.NextRenewalOnOrAfter(subscription.NextRenewalDate, subscription.BillingCycle, date.AddDays(1));
            }
        }
    }

    public static DateOnly NextRenewal(UserSubscription subscription, DateOnly today) =>
        BillingCalculator.NextRenewalOnOrAfter(subscription.NextRenewalDate, subscription.BillingCycle, today);
}
