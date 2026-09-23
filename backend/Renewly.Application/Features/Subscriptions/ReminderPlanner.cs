using Renewly.Application.Common.Time;
using Renewly.Application.Features.Entitlements;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Subscriptions;

public sealed record PlannedReminder(DateOnly RenewalDate, int DaysBefore, NotificationChannel Channel, DateTime ScheduledForUtc);

/// <summary>Everything besides the subscription that decides when and how a user is reminded.</summary>
public sealed record ReminderContext(
    string TimeZoneId,
    TimeOnly TimeOfDay,
    bool PushEnabled,
    bool EmailEnabled,
    bool EmailConfirmed,
    UserEntitlements Entitlements)
{
    public static ReminderContext For(User user, UserEntitlements entitlements)
    {
        var settings = user.NotificationSettings ?? new UserNotificationSettings();
        return new ReminderContext(
            user.TimeZoneId,
            settings.ReminderTimeOfDay,
            settings.PushEnabled,
            settings.EmailEnabled,
            user.EmailConfirmed,
            entitlements);
    }
}

/// <summary>Pure calculation of the reminders a subscription should have for its next renewal.</summary>
public static class ReminderPlanner
{
    /// <summary>Offsets offered in the app: 7, 3 and 1 day(s) before renewal.</summary>
    public static readonly IReadOnlyList<int> AllowedDaysBefore = [7, 3, 1];

    public static IReadOnlyList<PlannedReminder> Plan(
        UserSubscription subscription,
        DateOnly renewalDate,
        ReminderContext context,
        DateTime utcNow)
    {
        if (!subscription.IsActive)
        {
            return [];
        }

        var channels = new List<NotificationChannel>(2);
        if (context.PushEnabled && subscription.PushReminderEnabled)
        {
            channels.Add(NotificationChannel.Push);
        }

        if (context.EmailEnabled && subscription.EmailReminderEnabled && context.EmailConfirmed && context.Entitlements.EmailReminders)
        {
            channels.Add(NotificationChannel.Email);
        }

        if (channels.Count == 0)
        {
            return [];
        }

        var offsets = subscription.ReminderDaysBefore
            .Where(AllowedDaysBefore.Contains)
            .Distinct()
            .Take(context.Entitlements.MaxRemindersPerSubscription);

        var planned = new List<PlannedReminder>();
        foreach (var days in offsets)
        {
            var scheduledForUtc = UserClock.ToUtc(renewalDate.AddDays(-days), context.TimeOfDay, context.TimeZoneId);
            if (scheduledForUtc <= utcNow)
            {
                continue; // Too late for this offset; the next one (or the renewal itself) still applies.
            }

            planned.AddRange(channels.Select(channel => new PlannedReminder(renewalDate, days, channel, scheduledForUtc)));
        }

        return planned.OrderBy(p => p.ScheduledForUtc).ThenBy(p => p.Channel).ToList();
    }
}
