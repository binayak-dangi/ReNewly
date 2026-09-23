using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Renewly.Application.Features.Reminders;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal sealed class ReminderDispatchRepository(RenewlyDbContext db) : IReminderDispatchRepository
{
    public Task<int> ReleaseStaleClaimsAsync(DateTime claimedBeforeUtc, CancellationToken cancellationToken = default) =>
        db.SubscriptionReminders
            .Where(r => r.Status == ReminderStatus.Processing && r.ProcessedAtUtc < claimedBeforeUtc)
            .ExecuteUpdateAsync(
                s => s.SetProperty(r => r.Status, ReminderStatus.Scheduled)
                      .SetProperty(r => r.ProcessedAtUtc, (DateTime?)null),
                cancellationToken);

    public async Task<IReadOnlyList<SubscriptionReminder>> ClaimDueAsync(DateTime utcNow, int batchSize, CancellationToken cancellationToken = default)
    {
        var candidateIds = await db.SubscriptionReminders
            .Where(r => r.Status == ReminderStatus.Scheduled && r.ScheduledForUtc <= utcNow)
            .OrderBy(r => r.ScheduledForUtc)
            .Select(r => r.Id)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        if (candidateIds.Count == 0)
        {
            return [];
        }

        // The UPDATE only succeeds for rows still Scheduled, so concurrent workers never claim the same row.
        // A per-claim timestamp (datetime2 has 100 ns precision) identifies the rows this worker won.
        var claimStamp = utcNow.AddTicks(RandomNumberGenerator.GetInt32(1, 10_000));
        await db.SubscriptionReminders
            .Where(r => candidateIds.Contains(r.Id) && r.Status == ReminderStatus.Scheduled)
            .ExecuteUpdateAsync(
                s => s.SetProperty(r => r.Status, ReminderStatus.Processing)
                      .SetProperty(r => r.ProcessedAtUtc, claimStamp),
                cancellationToken);

        return await db.SubscriptionReminders
            .IgnoreQueryFilters()
            .Include(r => r.UserSubscription!).ThenInclude(s => s.User!).ThenInclude(u => u.NotificationSettings)
            .Include(r => r.UserSubscription!).ThenInclude(s => s.SubscriptionService)
            .Where(r => candidateIds.Contains(r.Id) && r.Status == ReminderStatus.Processing && r.ProcessedAtUtc == claimStamp)
            .OrderBy(r => r.ScheduledForUtc)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);
    }

    public Task<NotificationLog?> GetLogForReminderAsync(Guid reminderId, CancellationToken cancellationToken = default) =>
        db.NotificationLogs.FirstOrDefaultAsync(n => n.SubscriptionReminderId == reminderId, cancellationToken);

    public void AddLog(NotificationLog log) => db.NotificationLogs.Add(log);

    public async Task<IReadOnlyList<string>> ListActiveDeviceTokensAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await db.UserDevices
            .Where(d => d.UserId == userId && d.IsActive)
            .OrderByDescending(d => d.LastSeenAtUtc)
            .Select(d => d.FcmToken)
            .ToListAsync(cancellationToken);

    public Task<int> RemoveDeviceTokensAsync(IEnumerable<string> tokens, CancellationToken cancellationToken = default)
    {
        var list = tokens.ToList();
        return db.UserDevices.Where(d => list.Contains(d.FcmToken)).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserSubscription>> ListDueForRolloverAsync(DateOnly beforeDate, int batchSize, CancellationToken cancellationToken = default) =>
        await db.UserSubscriptions
            .Include(s => s.User!).ThenInclude(u => u.NotificationSettings)
            .Where(s => s.Status == SubscriptionStatus.Active && s.NextRenewalDate < beforeDate)
            .OrderBy(s => s.NextRenewalDate)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
}
