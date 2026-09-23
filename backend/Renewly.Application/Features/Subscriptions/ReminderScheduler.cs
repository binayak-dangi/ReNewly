using Renewly.Application.Features.Entitlements;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Subscriptions;

public interface IReminderScheduler
{
    /// <summary>
    /// Brings the stored reminder rows for the subscription's next renewal in line with the plan.
    /// Changes are tracked only; the caller commits them.
    /// </summary>
    Task RescheduleAsync(UserSubscription subscription, ReminderContext context, CancellationToken cancellationToken = default);

    /// <summary>Cancels every reminder that has not been sent yet (subscription cancelled or deleted).</summary>
    Task CancelPendingAsync(UserSubscription subscription, CancellationToken cancellationToken = default);
}

internal sealed class ReminderScheduler(ISubscriptionReminderRepository reminders, TimeProvider timeProvider) : IReminderScheduler
{
    public async Task RescheduleAsync(UserSubscription subscription, ReminderContext context, CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var renewalDate = subscription.NextRenewalDate;
        var desired = ReminderPlanner.Plan(subscription, renewalDate, context, now);
        var existing = await reminders.ListForSchedulingAsync(subscription.Id, renewalDate, cancellationToken);

        foreach (var plan in desired)
        {
            var match = existing.Find(r => r.RenewalDate == plan.RenewalDate && r.DaysBefore == plan.DaysBefore && r.Channel == plan.Channel);
            if (match is null)
            {
                reminders.Add(new SubscriptionReminder
                {
                    UserSubscriptionId = subscription.Id,
                    RenewalDate = plan.RenewalDate,
                    DaysBefore = plan.DaysBefore,
                    Channel = plan.Channel,
                    ScheduledForUtc = plan.ScheduledForUtc,
                });
                continue;
            }

            switch (match.Status)
            {
                case ReminderStatus.Scheduled:
                    match.ScheduledForUtc = plan.ScheduledForUtc;
                    break;
                case ReminderStatus.Cancelled or ReminderStatus.Skipped:
                    // Re-arm a reminder that was switched off earlier (unique key per renewal/offset/channel).
                    match.Status = ReminderStatus.Scheduled;
                    match.ScheduledForUtc = plan.ScheduledForUtc;
                    match.AttemptCount = 0;
                    match.LastError = null;
                    match.ProcessedAtUtc = null;
                    break;
                default:
                    break; // Already sent / failed / in flight for this renewal: never send twice.
            }
        }

        foreach (var stale in existing.Where(r => r.Status == ReminderStatus.Scheduled))
        {
            var stillWanted = desired.Any(p => p.RenewalDate == stale.RenewalDate && p.DaysBefore == stale.DaysBefore && p.Channel == stale.Channel);
            if (!stillWanted)
            {
                stale.Status = ReminderStatus.Cancelled;
                stale.ProcessedAtUtc = now;
            }
        }
    }

    public async Task CancelPendingAsync(UserSubscription subscription, CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var existing = await reminders.ListForSchedulingAsync(subscription.Id, subscription.NextRenewalDate, cancellationToken);
        foreach (var reminder in existing.Where(r => r.Status == ReminderStatus.Scheduled))
        {
            reminder.Status = ReminderStatus.Cancelled;
            reminder.ProcessedAtUtc = now;
        }
    }
}
