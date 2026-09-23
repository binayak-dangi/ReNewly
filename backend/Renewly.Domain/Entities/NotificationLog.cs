using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>
/// History of every notification Renewly attempted to deliver, shown in the in-app notification centre.
/// </summary>
public class NotificationLog : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public Guid? UserSubscriptionId { get; set; }

    public UserSubscription? UserSubscription { get; set; }

    public Guid? SubscriptionReminderId { get; set; }

    public SubscriptionReminder? SubscriptionReminder { get; set; }

    public NotificationType Type { get; set; }

    public NotificationChannel Channel { get; set; }

    public required string Title { get; set; }

    public required string Body { get; set; }

    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    public DateTime? SentAtUtc { get; set; }

    public string? FailureReason { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAtUtc { get; set; }

    public void MarkSent(DateTime utcNow)
    {
        Status = NotificationStatus.Sent;
        SentAtUtc = utcNow;
        FailureReason = null;
    }

    public void MarkFailed(string reason)
    {
        Status = NotificationStatus.Failed;
        FailureReason = reason.Length > 1000 ? reason[..1000] : reason;
    }

    public void MarkRead(DateTime utcNow)
    {
        if (IsRead)
        {
            return;
        }

        IsRead = true;
        ReadAtUtc = utcNow;
    }
}
