using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Persistence.Configurations;

internal sealed class SubscriptionServiceConfiguration : IEntityTypeConfiguration<SubscriptionService>
{
    public void Configure(EntityTypeBuilder<SubscriptionService> builder)
    {
        builder.ToTable("SubscriptionServices");

        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.Property(s => s.Slug).HasMaxLength(64).IsUnicode(false).IsRequired();
        builder.Property(s => s.WebsiteUrl).HasMaxLength(500);
        builder.Property(s => s.LogoUrl).HasMaxLength(500);
        builder.Property(s => s.BrandColor).HasMaxLength(9).IsUnicode(false);
        builder.Property(s => s.CancellationUrl).HasMaxLength(500);
        builder.PrimitiveCollection(s => s.CancellationSteps).HasMaxLength(4000);
        builder.PrimitiveCollection(s => s.SuggestedPlans).HasMaxLength(1000);

        builder.HasIndex(s => s.Slug).IsUnique();
        builder.HasIndex(s => new { s.IsActive, s.SortOrder });
    }
}

internal sealed class UserSubscriptionConfiguration : IEntityTypeConfiguration<UserSubscription>
{
    public void Configure(EntityTypeBuilder<UserSubscription> builder)
    {
        builder.ToTable("UserSubscriptions");
        builder.HasQueryFilter(s => !s.IsDeleted);

        builder.Property(s => s.ServiceName).HasMaxLength(100).IsRequired();
        builder.Property(s => s.PlanName).HasMaxLength(100);
        builder.Property(s => s.Currency).HasMaxLength(3).IsFixedLength().IsUnicode(false).IsRequired();
        builder.Property(s => s.PaymentMethodLabel).HasMaxLength(40);
        builder.Property(s => s.Notes).HasMaxLength(1000);
        builder.PrimitiveCollection(s => s.ReminderDaysBefore).HasMaxLength(64);

        builder.Ignore(s => s.IsActive);
        builder.Ignore(s => s.MonthlyCost);
        builder.Ignore(s => s.YearlyCost);

        // Dashboard / calendar queries: a user's active subscriptions ordered by renewal date.
        builder.HasIndex(s => new { s.UserId, s.Status, s.NextRenewalDate });

        builder.HasOne(s => s.User)
            .WithMany(u => u.Subscriptions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Catalog rows are deactivated, never deleted.
        builder.HasOne(s => s.SubscriptionService)
            .WithMany()
            .HasForeignKey(s => s.SubscriptionServiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class SubscriptionReminderConfiguration : IEntityTypeConfiguration<SubscriptionReminder>
{
    public void Configure(EntityTypeBuilder<SubscriptionReminder> builder)
    {
        builder.ToTable("SubscriptionReminders");

        builder.Property(r => r.LastError).HasMaxLength(1000);

        // Background dispatcher polls due reminders by status and time.
        builder.HasIndex(r => new { r.Status, r.ScheduledForUtc });
        builder.HasIndex(r => new { r.UserSubscriptionId, r.RenewalDate, r.DaysBefore, r.Channel }).IsUnique();

        builder.HasOne(r => r.UserSubscription)
            .WithMany(s => s.Reminders)
            .HasForeignKey(r => r.UserSubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("NotificationLogs");

        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Body).HasMaxLength(1000).IsRequired();
        builder.Property(n => n.FailureReason).HasMaxLength(1000);

        builder.HasIndex(n => new { n.UserId, n.CreatedAtUtc });
        builder.HasIndex(n => new { n.UserId, n.IsRead });

        builder.HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SQL Server forbids multiple cascade paths (User → Subscription → Log and User → Log),
        // so these two links are not cascaded. Subscriptions are soft-deleted, and only unsent
        // reminders are ever removed, so the references stay valid.
        builder.HasOne(n => n.UserSubscription)
            .WithMany(s => s.NotificationLogs)
            .HasForeignKey(n => n.UserSubscriptionId)
            .OnDelete(DeleteBehavior.ClientSetNull);

        builder.HasOne(n => n.SubscriptionReminder)
            .WithMany()
            .HasForeignKey(n => n.SubscriptionReminderId)
            .OnDelete(DeleteBehavior.ClientSetNull);
    }
}

internal sealed class SubscriptionReceiptConfiguration : IEntityTypeConfiguration<SubscriptionReceipt>
{
    public void Configure(EntityTypeBuilder<SubscriptionReceipt> builder)
    {
        builder.ToTable("SubscriptionReceipts");

        builder.Property(r => r.FileName).HasMaxLength(255).IsRequired();
        builder.Property(r => r.ContentType).HasMaxLength(100).IsUnicode(false).IsRequired();
        builder.Property(r => r.StorageKey).HasMaxLength(500).IsRequired();
        builder.Property(r => r.Currency).HasMaxLength(3).IsFixedLength().IsUnicode(false);

        builder.HasOne(r => r.UserSubscription)
            .WithMany(s => s.Receipts)
            .HasForeignKey(r => r.UserSubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
