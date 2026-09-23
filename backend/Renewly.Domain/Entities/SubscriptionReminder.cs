using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>
/// One scheduled reminder for a specific renewal date and channel.
/// Rows are regenerated whenever the subscription's renewal date or reminder preferences change.
/// </summary>
public class SubscriptionReminder : BaseEntity
{
    public Guid UserSubscriptionId { get; set; }

    public UserSubscription? UserSubscription { get; set; }

    /// <summary>The renewal this reminder is about.</summary>
    public DateOnly RenewalDate { get; set; }

    public int DaysBefore { get; set; }

    public NotificationChannel Channel { get; set; }

    /// <summary>Moment the reminder is due, already converted from the user's local time zone.</summary>
    public DateTime ScheduledForUtc { get; set; }

    public ReminderStatus Status { get; set; } = ReminderStatus.Scheduled;

    public int AttemptCount { get; set; }

    public DateTime? ProcessedAtUtc { get; set; }

    public string? LastError { get; set; }
}
