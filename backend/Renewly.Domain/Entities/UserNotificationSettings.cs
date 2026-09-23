using Renewly.Domain.Common;

namespace Renewly.Domain.Entities;

/// <summary>Account-wide notification preferences (one row per user).</summary>
public class UserNotificationSettings : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public bool PushEnabled { get; set; } = true;

    public bool EmailEnabled { get; set; } = true;

    /// <summary>Defaults applied to new subscriptions.</summary>
    public List<int> DefaultReminderDaysBefore { get; set; } = [3];

    /// <summary>Local time of day at which reminders are delivered.</summary>
    public TimeOnly ReminderTimeOfDay { get; set; } = new(9, 0);

    public bool ProductUpdatesEmailEnabled { get; set; }
}
