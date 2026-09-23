using Renewly.Application.Common.Models;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.UnitTests.Application;

public class ReminderPlannerTests
{
    private static readonly UserEntitlements Pro = UserEntitlements.BuiltInFree with
    {
        PlanCode = "PRO_MONTHLY",
        Tier = PlanTier.Pro,
        MaxSubscriptions = null,
        MaxRemindersPerSubscription = 3,
        EmailReminders = true,
    };

    private static UserSubscription Subscription(params int[] days) => new()
    {
        ServiceName = "Netflix",
        Currency = "USD",
        Price = 15.99m,
        BillingCycle = BillingCycle.Monthly,
        NextRenewalDate = new DateOnly(2026, 10, 10),
        ReminderDaysBefore = [.. days],
        PushReminderEnabled = true,
        EmailReminderEnabled = true,
    };

    private static ReminderContext Context(UserEntitlements entitlements, string tz = "UTC", bool emailConfirmed = true) =>
        new(tz, new TimeOnly(9, 0), PushEnabled: true, EmailEnabled: true, EmailConfirmed: emailConfirmed, entitlements);

    private static readonly DateTime Now = new(2026, 9, 23, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Pro_gets_every_offset_on_both_channels_at_local_reminder_time()
    {
        var plan = ReminderPlanner.Plan(Subscription(7, 3, 1), new DateOnly(2026, 10, 10), Context(Pro), Now);

        Assert.Equal(6, plan.Count);
        Assert.Contains(plan, p => p.DaysBefore == 7 && p.Channel == NotificationChannel.Email && p.ScheduledForUtc == new DateTime(2026, 10, 3, 9, 0, 0));
        Assert.Contains(plan, p => p.DaysBefore == 1 && p.Channel == NotificationChannel.Push && p.ScheduledForUtc == new DateTime(2026, 10, 9, 9, 0, 0));
    }

    [Fact]
    public void Free_plan_gets_one_push_reminder_and_no_email()
    {
        var plan = ReminderPlanner.Plan(Subscription(3, 1), new DateOnly(2026, 10, 10), Context(UserEntitlements.BuiltInFree), Now);

        var reminder = Assert.Single(plan);
        Assert.Equal(3, reminder.DaysBefore);
        Assert.Equal(NotificationChannel.Push, reminder.Channel);
    }

    [Fact]
    public void Reminder_time_is_converted_from_the_users_time_zone()
    {
        // Kathmandu is UTC+05:45, so 09:00 local on Oct 7 is 03:15 UTC.
        var plan = ReminderPlanner.Plan(Subscription(3), new DateOnly(2026, 10, 10), Context(UserEntitlements.BuiltInFree, "Asia/Kathmandu"), Now);

        Assert.Equal(new DateTime(2026, 10, 7, 3, 15, 0), Assert.Single(plan).ScheduledForUtc);
    }

    [Fact]
    public void Offsets_already_in_the_past_are_skipped()
    {
        var plan = ReminderPlanner.Plan(Subscription(7, 3, 1), new DateOnly(2026, 9, 26), Context(Pro), Now);

        Assert.All(plan, p => Assert.True(p.ScheduledForUtc > Now));
        Assert.DoesNotContain(plan, p => p.DaysBefore == 7);
    }

    [Fact]
    public void Email_needs_a_verified_address()
    {
        var plan = ReminderPlanner.Plan(Subscription(3), new DateOnly(2026, 10, 10), Context(Pro, emailConfirmed: false), Now);

        Assert.All(plan, p => Assert.Equal(NotificationChannel.Push, p.Channel));
    }

    [Fact]
    public void Cancelled_subscriptions_get_no_reminders()
    {
        var subscription = Subscription(3);
        subscription.MarkCancelled(Now);

        Assert.Empty(ReminderPlanner.Plan(subscription, new DateOnly(2026, 10, 10), Context(Pro), Now));
    }
}

public class RenewalProjectionTests
{
    [Fact]
    public void Projects_every_renewal_in_range_without_month_end_drift()
    {
        var subscription = new UserSubscription
        {
            ServiceName = "Gym",
            Currency = "USD",
            BillingCycle = BillingCycle.Monthly,
            NextRenewalDate = new DateOnly(2027, 1, 31),
        };

        var dates = RenewalProjection.Between([subscription], new DateOnly(2027, 1, 1), new DateOnly(2027, 4, 30), new DateOnly(2027, 1, 1))
            .Select(o => o.Date)
            .ToList();

        Assert.Equal([new(2027, 1, 31), new(2027, 2, 28), new(2027, 3, 31), new(2027, 4, 30)], dates);
    }

    [Fact]
    public void Stale_renewal_dates_are_projected_from_today()
    {
        var subscription = new UserSubscription
        {
            ServiceName = "Spotify",
            Currency = "USD",
            BillingCycle = BillingCycle.Monthly,
            NextRenewalDate = new DateOnly(2026, 8, 5),
        };

        Assert.Equal(new DateOnly(2026, 10, 5), RenewalProjection.NextRenewal(subscription, new DateOnly(2026, 9, 23)));
    }
}

public class MoneyTotalsTests
{
    [Fact]
    public void Totals_are_per_currency_with_preferred_first()
    {
        var items = new[] { ("USD", 10m), ("NPR", 1200m), ("USD", 5.555m) };

        var totals = MoneyTotals.Sum(items, i => i.Item1, i => i.Item2, preferredCurrency: "NPR");

        Assert.Equal([new MoneyDto(1200m, "NPR"), new MoneyDto(15.56m, "USD")], totals);
    }

    [Fact]
    public void Preferred_currency_is_present_even_when_zero()
    {
        var totals = MoneyTotals.Sum(Array.Empty<(string, decimal)>(), i => i.Item1, i => i.Item2, preferredCurrency: "EUR");

        Assert.Equal([new MoneyDto(0m, "EUR")], totals);
    }
}
