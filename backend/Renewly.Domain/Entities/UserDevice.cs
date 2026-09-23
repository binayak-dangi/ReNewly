using Renewly.Domain.Common;
using Renewly.Domain.Enums;

namespace Renewly.Domain.Entities;

/// <summary>A device registered for push notifications via Firebase Cloud Messaging.</summary>
public class UserDevice : BaseEntity
{
    public Guid UserId { get; set; }

    public User? User { get; set; }

    public required string FcmToken { get; set; }

    public DevicePlatform Platform { get; set; }

    public string? DeviceName { get; set; }

    public string? AppVersion { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime LastSeenAtUtc { get; set; }
}
