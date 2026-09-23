using Microsoft.EntityFrameworkCore;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal sealed class UserSubscriptionRepository(RenewlyDbContext db) : Repository<UserSubscription>(db), IUserSubscriptionRepository
{
    public Task<UserSubscription?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken = default) =>
        Set.Include(s => s.SubscriptionService)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<UserSubscription>> ListForUserAsync(
        Guid userId,
        SubscriptionListQuery query,
        CancellationToken cancellationToken = default)
    {
        var q = Set.AsNoTracking().Include(s => s.SubscriptionService).Where(s => s.UserId == userId);

        q = query.Status switch
        {
            SubscriptionStatusFilter.Active => q.Where(s => s.Status == SubscriptionStatus.Active),
            SubscriptionStatusFilter.Cancelled => q.Where(s => s.Status == SubscriptionStatus.Cancelled),
            _ => q,
        };

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(s => s.ServiceName.Contains(term) || (s.PlanName != null && s.PlanName.Contains(term)));
        }

        return await q.ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserSubscription>> ListActiveForUserAsync(Guid userId, bool track = false, CancellationToken cancellationToken = default)
    {
        var q = Set.Include(s => s.SubscriptionService)
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);
        return await (track ? q : q.AsNoTracking()).ToListAsync(cancellationToken);
    }

    public Task<int> CountActiveAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Set.CountAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active, cancellationToken);
}

internal sealed class SubscriptionReminderRepository(RenewlyDbContext db) : Repository<SubscriptionReminder>(db), ISubscriptionReminderRepository
{
    public Task<List<SubscriptionReminder>> ListForSchedulingAsync(Guid subscriptionId, DateOnly renewalDate, CancellationToken cancellationToken = default) =>
        Set.Where(r => r.UserSubscriptionId == subscriptionId
                       && (r.Status == ReminderStatus.Scheduled || r.RenewalDate == renewalDate))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SubscriptionReminder>> ListForRenewalAsync(Guid subscriptionId, DateOnly renewalDate, CancellationToken cancellationToken = default) =>
        await Set.AsNoTracking()
            .Where(r => r.UserSubscriptionId == subscriptionId && r.RenewalDate == renewalDate)
            .OrderBy(r => r.ScheduledForUtc)
            .ThenBy(r => r.Channel)
            .ToListAsync(cancellationToken);
}
