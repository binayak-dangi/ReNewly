using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Models;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Notifications;

public sealed record NotificationDto(
    Guid Id,
    NotificationType Type,
    NotificationChannel Channel,
    string Title,
    string Body,
    NotificationStatus Status,
    bool IsRead,
    Guid? SubscriptionId,
    DateTime CreatedAtUtc,
    DateTime? SentAtUtc)
{
    public static NotificationDto From(NotificationLog n) =>
        new(n.Id, n.Type, n.Channel, n.Title, n.Body, n.Status, n.IsRead, n.UserSubscriptionId, n.CreatedAtUtc, n.SentAtUtc);
}

public sealed record NotificationListQuery(
    int Page = 1,
    int PageSize = 20,
    NotificationStatus? Status = null,
    bool UnreadOnly = false,
    NotificationChannel? Channel = null);

public sealed record UnreadCountDto(int Unread);

public interface INotificationLogRepository : IRepository<NotificationLog>
{
    Task<PagedResult<NotificationLog>> ListAsync(Guid userId, NotificationListQuery query, CancellationToken cancellationToken = default);

    /// <summary>In-app feed items (push channel or channel-agnostic), newest first.</summary>
    Task<IReadOnlyList<NotificationLog>> ListRecentAsync(Guid userId, int take, CancellationToken cancellationToken = default);

    Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<NotificationLog?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<int> MarkAllReadAsync(Guid userId, DateTime utcNow, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task<PagedResult<NotificationDto>> ListAsync(NotificationListQuery query, CancellationToken cancellationToken = default);

    Task<UnreadCountDto> GetUnreadCountAsync(CancellationToken cancellationToken = default);

    Task MarkReadAsync(Guid id, CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(CancellationToken cancellationToken = default);
}

internal sealed class NotificationService(
    INotificationLogRepository notifications,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : INotificationService
{
    public const int MaxPageSize = 50;

    public async Task<PagedResult<NotificationDto>> ListAsync(NotificationListQuery query, CancellationToken cancellationToken = default)
    {
        var normalized = query with
        {
            Page = Math.Max(1, query.Page),
            PageSize = Math.Clamp(query.PageSize, 1, MaxPageSize),
        };
        var page = await notifications.ListAsync(currentUser.RequiredUserId, normalized, cancellationToken);
        return new PagedResult<NotificationDto>(page.Items.Select(NotificationDto.From).ToList(), page.Page, page.PageSize, page.TotalCount);
    }

    public async Task<UnreadCountDto> GetUnreadCountAsync(CancellationToken cancellationToken = default) =>
        new(await notifications.CountUnreadAsync(currentUser.RequiredUserId, cancellationToken));

    public async Task MarkReadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await notifications.GetForUserAsync(id, currentUser.RequiredUserId, cancellationToken)
            ?? throw new NotFoundException("Notification", id);
        notification.MarkRead(timeProvider.GetUtcNow().UtcDateTime);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public Task MarkAllReadAsync(CancellationToken cancellationToken = default) =>
        notifications.MarkAllReadAsync(currentUser.RequiredUserId, timeProvider.GetUtcNow().UtcDateTime, cancellationToken);
}
