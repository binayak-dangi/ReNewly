namespace Renewly.Domain.Enums;

// Enum values are persisted as integers; never renumber existing members.

public enum BillingCycle
{
    Weekly = 1,
    Monthly = 2,
    Quarterly = 3,
    SemiAnnually = 4,
    Yearly = 5,
}

public enum SubscriptionCategory
{
    Other = 0,
    Entertainment = 1,
    Music = 2,
    Productivity = 3,
    AiTools = 4,
    Shopping = 5,
    CloudStorage = 6,
    Education = 7,
    News = 8,
    Fitness = 9,
    Gaming = 10,
    Utilities = 11,
    Design = 12,
    Finance = 13,
}

public enum SubscriptionStatus
{
    Active = 1,
    Cancelled = 2,
    Paused = 3,
}

public enum NotificationChannel
{
    Push = 1,
    Email = 2,
}

public enum NotificationType
{
    RenewalReminder = 1,
    Account = 2,
    System = 3,
    Billing = 4,
}

public enum NotificationStatus
{
    Pending = 1,
    Sent = 2,
    Failed = 3,
}

public enum ReminderStatus
{
    Scheduled = 1,
    Processing = 2,
    Sent = 3,
    Failed = 4,
    Skipped = 5,
    Cancelled = 6,
}

public enum DevicePlatform
{
    Android = 1,
    Ios = 2,
}

public enum PlanTier
{
    Free = 1,
    Pro = 2,
}

public enum UserPlanStatus
{
    Active = 1,
    GracePeriod = 2,
    Cancelled = 3,
    Expired = 4,
}

public enum PaymentProvider
{
    GooglePlay = 1,
    AppleAppStore = 2,
    Manual = 3,
}

public enum PaymentTransactionStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 3,
    Refunded = 4,
    Cancelled = 5,
}

public enum UserTokenPurpose
{
    EmailVerification = 1,
    PasswordReset = 2,
}
