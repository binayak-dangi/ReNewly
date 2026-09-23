using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Subscriptions;

public interface IUserSubscriptionRepository : IRepository<UserSubscription>
{
    /// <summary>Tracked, with its catalog service. Returns null if it does not exist or belongs to someone else.</summary>
    Task<UserSubscription?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Read-only list with catalog services, filtered and sorted in the database where possible.</summary>
    Task<IReadOnlyList<UserSubscription>> ListForUserAsync(Guid userId, SubscriptionListQuery query, CancellationToken cancellationToken = default);

    /// <summary>All active subscriptions with catalog services.</summary>
    Task<IReadOnlyList<UserSubscription>> ListActiveForUserAsync(Guid userId, bool track = false, CancellationToken cancellationToken = default);

    Task<int> CountActiveAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface ISubscriptionReminderRepository : IRepository<SubscriptionReminder>
{
    /// <summary>
    /// Tracked reminders the scheduler may touch: every still-scheduled reminder plus any reminder
    /// (in any status) for <paramref name="renewalDate"/>, so unique keys can be reused.
    /// </summary>
    Task<List<SubscriptionReminder>> ListForSchedulingAsync(Guid subscriptionId, DateOnly renewalDate, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SubscriptionReminder>> ListForRenewalAsync(Guid subscriptionId, DateOnly renewalDate, CancellationToken cancellationToken = default);
}
