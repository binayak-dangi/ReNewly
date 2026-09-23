using Renewly.Domain.Common;

namespace Renewly.Domain.Entities;

/// <summary>Receipt file attached to a subscription (Pro feature). The file itself lives in blob storage.</summary>
public class SubscriptionReceipt : BaseEntity
{
    public Guid UserSubscriptionId { get; set; }

    public UserSubscription? UserSubscription { get; set; }

    public required string FileName { get; set; }

    public required string ContentType { get; set; }

    public long SizeBytes { get; set; }

    /// <summary>Opaque key in the storage provider.</summary>
    public required string StorageKey { get; set; }

    public decimal? Amount { get; set; }

    public string? Currency { get; set; }

    public DateOnly? ReceiptDate { get; set; }
}
