using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Entitlements;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Reminders;

public sealed record DispatchSummary(int Released, int Claimed, int Sent, int Skipped, int Retrying, int Failed);

public interface IReminderDispatcher
{
    /// <summary>Delivers every reminder that is due now. Safe to run concurrently on several instances.</summary>
    Task<DispatchSummary> ProcessDueAsync(CancellationToken cancellationToken = default);
}

internal sealed class ReminderDispatcher(
    IReminderDispatchRepository repository,
    IEntitlementService entitlementService,
    IPushSender pushSender,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IOptions<ReminderOptions> options,
    ILogger<ReminderDispatcher> logger) : IReminderDispatcher
{
    private enum Outcome
    {
        Sent,
        Skipped,
        Retrying,
        Failed,
    }

    private readonly ReminderOptions _options = options.Value;

    public async Task<DispatchSummary> ProcessDueAsync(CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var released = await repository.ReleaseStaleClaimsAsync(now.AddMinutes(-_options.StaleClaimMinutes), cancellationToken);
        var batch = await repository.ClaimDueAsync(now, _options.BatchSize, cancellationToken);

        var counts = new Dictionary<Outcome, int>();
        var entitlementsByUser = new Dictionary<Guid, UserEntitlements>();

        foreach (var reminder in batch)
        {
            Outcome outcome;
            try
            {
                outcome = await ProcessAsync(reminder, entitlementsByUser, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Reminder {ReminderId} failed unexpectedly", reminder.Id);
                outcome = ScheduleRetryOrFail(reminder, log: null, ex.Message);
            }

            // Commit per reminder so one bad row never undoes the others.
            await unitOfWork.SaveChangesAsync(cancellationToken);
            counts[outcome] = counts.GetValueOrDefault(outcome) + 1;
        }

        var summary = new DispatchSummary(
            released,
            batch.Count,
            counts.GetValueOrDefault(Outcome.Sent),
            counts.GetValueOrDefault(Outcome.Skipped),
            counts.GetValueOrDefault(Outcome.Retrying),
            counts.GetValueOrDefault(Outcome.Failed));

        if (batch.Count > 0 || released > 0)
        {
            logger.LogInformation("Reminder dispatch: {@Summary}", summary);
        }

        return summary;
    }

    private async Task<Outcome> ProcessAsync(
        SubscriptionReminder reminder,
        Dictionary<Guid, UserEntitlements> entitlementsByUser,
        CancellationToken cancellationToken)
    {
        // Counted up front so an unexpected exception can never cause endless retries.
        reminder.AttemptCount++;

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var subscription = reminder.UserSubscription;
        var user = subscription?.User;

        if (subscription is null || subscription.IsDeleted)
        {
            return Skip(reminder, "Subscription was deleted.");
        }

        if (!subscription.IsActive)
        {
            return Skip(reminder, "Subscription is marked as cancelled.");
        }

        if (user is null || user.IsDeleted || !user.IsActive)
        {
            return Skip(reminder, "Account is no longer active.");
        }

        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        if (reminder.RenewalDate != subscription.NextRenewalDate)
        {
            return Skip(reminder, "Renewal date changed.");
        }

        if (reminder.RenewalDate < today)
        {
            return Skip(reminder, "Renewal date has already passed.");
        }

        if (now - reminder.ScheduledForUtc > TimeSpan.FromHours(_options.MaxLatenessHours))
        {
            return Skip(reminder, "Reminder is too late to be useful.");
        }

        if (!entitlementsByUser.TryGetValue(user.Id, out var entitlements))
        {
            entitlements = await entitlementService.GetAsync(user.Id, cancellationToken);
            entitlementsByUser[user.Id] = entitlements;
        }

        if (!ChannelEnabled(reminder.Channel, user, subscription, entitlements))
        {
            return Skip(reminder, "Channel is turned off.");
        }

        var text = ReminderMessageBuilder.Build(subscription, reminder.RenewalDate, today);
        var log = await repository.GetLogForReminderAsync(reminder.Id, cancellationToken);
        if (log is null)
        {
            log = new NotificationLog
            {
                UserId = user.Id,
                UserSubscriptionId = subscription.Id,
                SubscriptionReminderId = reminder.Id,
                Type = NotificationType.RenewalReminder,
                Channel = reminder.Channel,
                Title = text.Title,
                Body = text.Body,
            };
            repository.AddLog(log);
        }
        else
        {
            // Retry: refresh the wording ("in 3 days" may now be "in 2 days").
            log.Title = text.Title;
            log.Body = text.Body;
        }

        return reminder.Channel == NotificationChannel.Push
            ? await SendPushAsync(reminder, log, user, subscription, cancellationToken)
            : await SendEmailAsync(reminder, log, user, subscription, today, cancellationToken);
    }

    private async Task<Outcome> SendPushAsync(
        SubscriptionReminder reminder,
        NotificationLog log,
        User user,
        UserSubscription subscription,
        CancellationToken cancellationToken)
    {
        var tokens = await repository.ListActiveDeviceTokensAsync(user.Id, cancellationToken);
        if (tokens.Count == 0)
        {
            // Nothing to retry; the reminder still appears in the in-app notification centre.
            return Fail(reminder, log, "No device is registered for push notifications.");
        }

        var result = await pushSender.SendAsync(
            new PushMessage(
                tokens,
                log.Title,
                log.Body,
                new Dictionary<string, string>
                {
                    ["type"] = "renewal_reminder",
                    ["notificationId"] = log.Id.ToString(),
                    ["subscriptionId"] = subscription.Id.ToString(),
                    ["renewalDate"] = reminder.RenewalDate.ToString("yyyy-MM-dd"),
                    ["deepLink"] = $"renewly://subscriptions/{subscription.Id}",
                }),
            cancellationToken);

        var invalid = result.InvalidTokens.ToList();
        if (invalid.Count > 0)
        {
            await repository.RemoveDeviceTokensAsync(invalid, cancellationToken);
        }

        if (result.DeliveredCount > 0)
        {
            return Sent(reminder, log);
        }

        var transient = result.Results.Any(r => r.Outcome == PushTokenOutcome.TransientFailure);
        return transient
            ? ScheduleRetryOrFail(reminder, log, result.FirstError ?? "Push delivery failed.")
            : Fail(reminder, log, "No valid device tokens; the app may have been uninstalled.");
    }

    private async Task<Outcome> SendEmailAsync(
        SubscriptionReminder reminder,
        NotificationLog log,
        User user,
        UserSubscription subscription,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        try
        {
            await emailSender.SendAsync(ReminderMessageBuilder.BuildEmail(user, subscription, reminder.RenewalDate, today), cancellationToken);
            return Sent(reminder, log);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Email reminder {ReminderId} failed", reminder.Id);
            return ScheduleRetryOrFail(reminder, log, ex.Message);
        }
    }

    private static bool ChannelEnabled(NotificationChannel channel, User user, UserSubscription subscription, UserEntitlements entitlements)
    {
        var settings = user.NotificationSettings ?? new UserNotificationSettings();
        return channel switch
        {
            NotificationChannel.Push => settings.PushEnabled && subscription.PushReminderEnabled,
            NotificationChannel.Email => settings.EmailEnabled && subscription.EmailReminderEnabled
                                         && user.EmailConfirmed && entitlements.EmailReminders,
            _ => false,
        };
    }

    private Outcome Sent(SubscriptionReminder reminder, NotificationLog log)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        reminder.Status = ReminderStatus.Sent;
        reminder.ProcessedAtUtc = now;
        reminder.LastError = null;
        log.MarkSent(now);
        return Outcome.Sent;
    }

    private Outcome Skip(SubscriptionReminder reminder, string reason)
    {
        reminder.Status = ReminderStatus.Skipped;
        reminder.ProcessedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        reminder.LastError = reason;
        return Outcome.Skipped;
    }

    private Outcome Fail(SubscriptionReminder reminder, NotificationLog? log, string reason)
    {
        reminder.Status = ReminderStatus.Failed;
        reminder.ProcessedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        reminder.LastError = Truncate(reason);
        log?.MarkFailed(reason);
        return Outcome.Failed;
    }

    private Outcome ScheduleRetryOrFail(SubscriptionReminder reminder, NotificationLog? log, string reason)
    {
        if (reminder.AttemptCount >= _options.MaxAttempts)
        {
            return Fail(reminder, log, reason);
        }

        // Exponential back-off: 5, 10, 20 ... minutes.
        var delay = TimeSpan.FromMinutes(_options.RetryBaseDelayMinutes * Math.Pow(2, Math.Max(0, reminder.AttemptCount - 1)));
        reminder.Status = ReminderStatus.Scheduled;
        reminder.ScheduledForUtc = timeProvider.GetUtcNow().UtcDateTime.Add(delay);
        reminder.ProcessedAtUtc = null;
        reminder.LastError = Truncate(reason);
        if (log is not null)
        {
            log.FailureReason = Truncate(reason);
        }

        return Outcome.Retrying;
    }

    private static string Truncate(string value) => value.Length > 1000 ? value[..1000] : value;
}
