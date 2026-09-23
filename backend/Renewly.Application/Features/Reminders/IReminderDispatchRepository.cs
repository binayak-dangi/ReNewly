using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Reminders;

/// <summary>Persistence operations used by the background reminder worker.</summary>
public interface IReminderDispatchRepository
{
    /// <summary>Returns reminders stuck in Processing since before <paramref name="claimedBeforeUtc"/> to Scheduled.</summary>
    Task<int> ReleaseStaleClaimsAsync(DateTime claimedBeforeUtc, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically claims up to <paramref name="batchSize"/> due reminders (Scheduled → Processing), so several API
    /// instances can run the worker without double-sending. Returns them tracked, with subscription, catalog service,
    /// user and notification settings loaded (soft-delete filters ignored so deleted data is detected and skipped).
    /// </summary>
    Task<IReadOnlyList<SubscriptionReminder>> ClaimDueAsync(DateTime utcNow, int batchSize, CancellationToken cancellationToken = default);

    /// <summary>The in-app log row for a reminder, if an earlier attempt already created one.</summary>
    Task<NotificationLog?> GetLogForReminderAsync(Guid reminderId, CancellationToken cancellationToken = default);

    void AddLog(NotificationLog log);

    Task<IReadOnlyList<string>> ListActiveDeviceTokensAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<int> RemoveDeviceTokensAsync(IEnumerable<string> tokens, CancellationToken cancellationToken = default);

    /// <summary>Active subscriptions whose stored renewal date is before <paramref name="beforeDate"/> (tracked, with user and settings).</summary>
    Task<IReadOnlyList<UserSubscription>> ListDueForRolloverAsync(DateOnly beforeDate, int batchSize, CancellationToken cancellationToken = default);
}
