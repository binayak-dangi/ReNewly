using Renewly.Domain.Common;
using Renewly.Domain.Enums;
using Renewly.Domain.Services;

namespace Renewly.Domain.Entities;

/// <summary>
/// A subscription the user tracks. Stores only a masked payment label, never card data.
/// </summary>
public class UserSubscription : BaseEntity, ISoftDeletable
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    /// <summary>Null for custom subscriptions that are not in the catalog.</summary>
    public Guid? SubscriptionServiceId { get; set; }

    public SubscriptionService? SubscriptionService { get; set; }

    /// <summary>Display name; copied from the catalog or entered by the user.</summary>
    public required string ServiceName { get; set; }

    public string? PlanName { get; set; }

    public SubscriptionCategory Category { get; set; }

    public decimal Price { get; set; }

    /// <summary>ISO 4217 code.</summary>
    public required string Currency { get; set; }

    public BillingCycle BillingCycle { get; set; }

    public DateOnly NextRenewalDate { get; set; }

    /// <summary>Masked label only, e.g. "Visa ****4521". Validated to never contain a full card number.</summary>
    public string? PaymentMethodLabel { get; set; }

    public string? Notes { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public DateTime? CancelledAtUtc { get; set; }

    /// <summary>Days before renewal at which reminders fire, e.g. [7, 3, 1].</summary>
    public List<int> ReminderDaysBefore { get; set; } = [3];

    public bool PushReminderEnabled { get; set; } = true;

    public bool EmailReminderEnabled { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public ICollection<SubscriptionReminder> Reminders { get; set; } = [];

    public ICollection<NotificationLog> NotificationLogs { get; set; } = [];

    public ICollection<SubscriptionReceipt> Receipts { get; set; } = [];

    public bool IsActive => Status == SubscriptionStatus.Active;

    public decimal MonthlyCost => BillingCalculator.ToMonthlyAmount(Price, BillingCycle);

    public decimal YearlyCost => BillingCalculator.ToYearlyAmount(Price, BillingCycle);

    public void MarkCancelled(DateTime utcNow)
    {
        Status = SubscriptionStatus.Cancelled;
        CancelledAtUtc = utcNow;
    }

    public void Reactivate()
    {
        Status = SubscriptionStatus.Active;
        CancelledAtUtc = null;
    }

    /// <summary>
    /// Rolls the renewal date forward past <paramref name="today"/> once a renewal has happened.
    /// Returns true if the date changed.
    /// </summary>
    public bool RollRenewalForward(DateOnly today)
    {
        var next = BillingCalculator.NextRenewalOnOrAfter(NextRenewalDate, BillingCycle, today);
        if (next == NextRenewalDate)
        {
            return false;
        }

        NextRenewalDate = next;
        return true;
    }
}
