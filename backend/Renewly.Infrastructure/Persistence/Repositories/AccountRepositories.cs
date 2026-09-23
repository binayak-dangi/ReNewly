using Microsoft.EntityFrameworkCore;
using Renewly.Application.Common.Models;
using Renewly.Application.Features.Devices;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Notifications;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal sealed class NotificationLogRepository(RenewlyDbContext db) : Repository<NotificationLog>(db), INotificationLogRepository
{
    public async Task<PagedResult<NotificationLog>> ListAsync(Guid userId, NotificationListQuery query, CancellationToken cancellationToken = default)
    {
        var q = Set.AsNoTracking().Where(n => n.UserId == userId);

        if (query.Status is { } status)
        {
            q = q.Where(n => n.Status == status);
        }

        if (query.Channel is { } channel)
        {
            q = q.Where(n => n.Channel == channel);
        }

        if (query.UnreadOnly)
        {
            q = q.Where(n => !n.IsRead);
        }

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderByDescending(n => n.CreatedAtUtc)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<NotificationLog>(items, query.Page, query.PageSize, total);
    }

    public async Task<IReadOnlyList<NotificationLog>> ListRecentAsync(Guid userId, int take, CancellationToken cancellationToken = default) =>
        await Set.AsNoTracking()
            .Where(n => n.UserId == userId && n.Channel == NotificationChannel.Push)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Set.CountAsync(n => n.UserId == userId && n.Channel == NotificationChannel.Push && !n.IsRead, cancellationToken);

    public Task<NotificationLog?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

    public Task<int> MarkAllReadAsync(Guid userId, DateTime utcNow, CancellationToken cancellationToken = default) =>
        Set.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(
                s => s.SetProperty(n => n.IsRead, true)
                      .SetProperty(n => n.ReadAtUtc, utcNow)
                      .SetProperty(n => n.UpdatedAtUtc, utcNow),
                cancellationToken);
}

internal sealed class UserPlanRepository(RenewlyDbContext db) : Repository<UserPlan>(db), IUserPlanRepository
{
    public async Task<IReadOnlyList<UserPlan>> ListCurrentAsync(Guid userId, DateTime utcNow, CancellationToken cancellationToken = default) =>
        await Set.AsNoTracking()
            .Include(p => p.SubscriptionPlan)
            .Where(p => p.UserId == userId
                        && (p.Status == UserPlanStatus.Active || p.Status == UserPlanStatus.GracePeriod)
                        && p.StartsAtUtc <= utcNow
                        && (p.ExpiresAtUtc == null || p.ExpiresAtUtc > utcNow))
            .ToListAsync(cancellationToken);
}

internal sealed class UserDeviceRepository(RenewlyDbContext db) : Repository<UserDevice>(db), IUserDeviceRepository
{
    public Task<UserDevice?> GetByTokenAsync(string fcmToken, CancellationToken cancellationToken = default) =>
        Set.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.FcmToken == fcmToken, cancellationToken);

    public async Task<IReadOnlyList<UserDevice>> ListActiveForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await Set.AsNoTracking().Where(d => d.UserId == userId && d.IsActive).ToListAsync(cancellationToken);
}
