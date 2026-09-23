using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>A purchase of a Renewly plan (not of third-party subscriptions).</summary>
public class PaymentTransaction : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public Guid? UserPlanId { get; set; }

    public UserPlan? UserPlan { get; set; }

    public PaymentProvider Provider { get; set; }

    /// <summary>Store order id, e.g. "GPA.1234-5678-9012-34567".</summary>
    public string? ExternalTransactionId { get; set; }

    public string? PurchaseToken { get; set; }

    public string? ProductId { get; set; }

    public decimal Amount { get; set; }

    public required string Currency { get; set; }

    public PaymentTransactionStatus Status { get; set; } = PaymentTransactionStatus.Pending;

    public DateTime? ProcessedAtUtc { get; set; }

    public string? FailureReason { get; set; }
}
