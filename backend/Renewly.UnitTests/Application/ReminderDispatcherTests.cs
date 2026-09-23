using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Reminders;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.UnitTests.Application;

public class ReminderDispatcherTests
{
    private static readonly DateTime Now = new(2026, 9, 23, 9, 0, 30, DateTimeKind.Utc);

    private readonly IReminderDispatchRepository _repository = Substitute.For<IReminderDispatchRepository>();
    private readonly IEntitlementService _entitlements = Substitute.For<IEntitlementService>();
    private readonly IPushSender _push = Substitute.For<IPushSender>();
    private readonly IEmailSender _email = Substitute.For<IEmailSender>();
    private readonly List<NotificationLog> _logs = [];

    public ReminderDispatcherTests()
    {
        _entitlements.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(UserEntitlements.BuiltInFree);
        _repository.ListActiveDeviceTokensAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(["token-a", "token-b"]);
        _repository.When(r => r.AddLog(Arg.Any<NotificationLog>())).Do(c => _logs.Add(c.Arg<NotificationLog>()));
    }

    private ReminderDispatcher CreateDispatcher() => new(
        _repository,
        _entitlements,
        _push,
        _email,
        Substitute.For<IUnitOfWork>(),
        new FixedTimeProvider(Now),
        Options.Create(new ReminderOptions { MaxAttempts = 3, RetryBaseDelayMinutes = 5 }),
        NullLogger<ReminderDispatcher>.Instance);

    private static SubscriptionReminder Reminder(NotificationChannel channel = NotificationChannel.Push, int attempts = 0)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "asha@example.com",
            NormalizedEmail = "ASHA@EXAMPLE.COM",
            FullName = "Asha",
            PasswordHash = "x",
            EmailConfirmed = true,
            TimeZoneId = "UTC",
            NotificationSettings = new UserNotificationSettings(),
        };
        var subscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            User = user,
            UserId = user.Id,
            ServiceName = "Netflix",
            Price = 15.99m,
            Currency = "USD",
            BillingCycle = BillingCycle.Monthly,
            NextRenewalDate = new DateOnly(2026, 9, 26),
            PushReminderEnabled = true,
            EmailReminderEnabled = true,
        };
        return new SubscriptionReminder
        {
            Id = Guid.NewGuid(),
            UserSubscription = subscription,
            UserSubscriptionId = subscription.Id,
            RenewalDate = subscription.NextRenewalDate,
            DaysBefore = 3,
            Channel = channel,
            ScheduledForUtc = Now.AddSeconds(-30),
            Status = ReminderStatus.Processing,
            AttemptCount = attempts,
        };
    }

    private void Claim(params SubscriptionReminder[] reminders) =>
        _repository.ClaimDueAsync(Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns(reminders);

    private void PushReturns(params PushTokenOutcome[] outcomes) =>
        _push.SendAsync(Arg.Any<PushMessage>(), Arg.Any<CancellationToken>()).Returns(c =>
            new PushSendResult(c.Arg<PushMessage>().DeviceTokens.Select((t, i) => new PushTokenResult(t, outcomes[i], outcomes[i] == PushTokenOutcome.Delivered ? null : "error")).ToList()));

    [Fact]
    public async Task Delivered_push_marks_reminder_and_log_sent_with_expected_wording()
    {
        var reminder = Reminder();
        Claim(reminder);
        PushReturns(PushTokenOutcome.Delivered, PushTokenOutcome.Delivered);

        var summary = await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(1, summary.Sent);
        Assert.Equal(ReminderStatus.Sent, reminder.Status);
        var log = Assert.Single(_logs);
        Assert.Equal(NotificationStatus.Sent, log.Status);
        Assert.Equal("Netflix renews in 3 days", log.Title);
        Assert.Equal("Amount: $15.99\nRenewal date: September 26", log.Body);
        await _push.Received(1).SendAsync(
            Arg.Is<PushMessage>(m => m.Data["subscriptionId"] == reminder.UserSubscriptionId.ToString() && m.DeviceTokens.Count == 2),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Invalid_tokens_are_removed_and_remaining_delivery_counts()
    {
        Claim(Reminder());
        PushReturns(PushTokenOutcome.InvalidToken, PushTokenOutcome.Delivered);

        var summary = await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(1, summary.Sent);
        await _repository.Received(1).RemoveDeviceTokensAsync(
            Arg.Is<IEnumerable<string>>(t => t.SequenceEqual(new[] { "token-a" })), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Transient_failure_is_retried_with_backoff()
    {
        var reminder = Reminder();
        Claim(reminder);
        PushReturns(PushTokenOutcome.TransientFailure, PushTokenOutcome.TransientFailure);

        var summary = await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(1, summary.Retrying);
        Assert.Equal(ReminderStatus.Scheduled, reminder.Status);
        Assert.Equal(Now.AddMinutes(5), reminder.ScheduledForUtc);
        Assert.Equal(NotificationStatus.Pending, Assert.Single(_logs).Status);
    }

    [Fact]
    public async Task Transient_failure_on_last_attempt_fails()
    {
        var reminder = Reminder(attempts: 2);
        Claim(reminder);
        PushReturns(PushTokenOutcome.TransientFailure, PushTokenOutcome.TransientFailure);

        var summary = await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(1, summary.Failed);
        Assert.Equal(ReminderStatus.Failed, reminder.Status);
        Assert.Equal(NotificationStatus.Failed, Assert.Single(_logs).Status);
    }

    [Fact]
    public async Task No_registered_device_fails_but_keeps_in_app_notification()
    {
        var reminder = Reminder();
        Claim(reminder);
        _repository.ListActiveDeviceTokensAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns([]);

        await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(ReminderStatus.Failed, reminder.Status);
        Assert.Equal(NotificationStatus.Failed, Assert.Single(_logs).Status);
        await _push.DidNotReceiveWithAnyArgs().SendAsync(default!, default);
    }

    [Fact]
    public async Task Cancelled_subscription_is_skipped_without_sending()
    {
        var reminder = Reminder();
        reminder.UserSubscription!.MarkCancelled(Now);
        Claim(reminder);

        var summary = await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(1, summary.Skipped);
        Assert.Equal(ReminderStatus.Skipped, reminder.Status);
        Assert.Empty(_logs);
        await _push.DidNotReceiveWithAnyArgs().SendAsync(default!, default);
    }

    [Fact]
    public async Task Changed_renewal_date_is_skipped()
    {
        var reminder = Reminder();
        reminder.UserSubscription!.NextRenewalDate = new DateOnly(2026, 10, 26);
        Claim(reminder);

        await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(ReminderStatus.Skipped, reminder.Status);
        Assert.Equal("Renewal date changed.", reminder.LastError);
    }

    [Fact]
    public async Task Email_reminder_is_skipped_on_free_plan()
    {
        var reminder = Reminder(NotificationChannel.Email);
        Claim(reminder);

        await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(ReminderStatus.Skipped, reminder.Status);
        await _email.DidNotReceiveWithAnyArgs().SendAsync(default!, default);
    }

    [Fact]
    public async Task Email_reminder_is_sent_on_pro_plan()
    {
        _entitlements.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(UserEntitlements.BuiltInFree with { Tier = PlanTier.Pro, EmailReminders = true, MaxRemindersPerSubscription = 3 });
        var reminder = Reminder(NotificationChannel.Email);
        Claim(reminder);

        await CreateDispatcher().ProcessDueAsync();

        Assert.Equal(ReminderStatus.Sent, reminder.Status);
        await _email.Received(1).SendAsync(
            Arg.Is<EmailMessage>(m => m.Subject == "Netflix renews in 3 days" && m.TextBody.Contains("$15.99")),
            Arg.Any<CancellationToken>());
    }

    private sealed class FixedTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }
}

public class ReminderMessageBuilderTests
{
    private static readonly UserSubscription Netflix = new()
    {
        ServiceName = "Netflix",
        Price = 15.99m,
        Currency = "USD",
        BillingCycle = BillingCycle.Monthly,
    };

    [Theory]
    [InlineData(0, "Netflix renews today")]
    [InlineData(1, "Netflix renews tomorrow")]
    [InlineData(7, "Netflix renews in 7 days")]
    public void Title_describes_when(int days, string expected)
    {
        var today = new DateOnly(2026, 9, 23);

        Assert.Equal(expected, ReminderMessageBuilder.Build(Netflix, today.AddDays(days), today).Title);
    }

    [Fact]
    public void Body_includes_year_when_renewal_is_next_year()
    {
        var text = ReminderMessageBuilder.Build(Netflix, new DateOnly(2027, 1, 2), new DateOnly(2026, 12, 30));

        Assert.Equal("Amount: $15.99\nRenewal date: January 2, 2027", text.Body);
    }

    [Theory]
    [InlineData(15.99, "USD", "$15.99")]
    [InlineData(1200, "NPR", "NPR 1,200.00")]
    [InlineData(1500, "JPY", "¥1,500")]
    [InlineData(9.5, "EUR", "€9.50")]
    public void Money_is_formatted_for_people(decimal amount, string currency, string expected) =>
        Assert.Equal(expected, Renewly.Application.Common.Formatting.MoneyFormatter.Format(amount, currency));
}
