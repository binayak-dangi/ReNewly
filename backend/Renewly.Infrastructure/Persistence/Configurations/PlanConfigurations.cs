using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Persistence.Configurations;

internal sealed class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> builder)
    {
        builder.ToTable("SubscriptionPlans");

        builder.Property(p => p.Code).HasMaxLength(32).IsUnicode(false).IsRequired();
        builder.Property(p => p.Name).HasMaxLength(64).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(500);
        builder.Property(p => p.Currency).HasMaxLength(3).IsFixedLength().IsUnicode(false).IsRequired();
        builder.Property(p => p.GooglePlayProductId).HasMaxLength(100).IsUnicode(false);

        builder.HasIndex(p => p.Code).IsUnique();
    }
}

internal sealed class UserPlanConfiguration : IEntityTypeConfiguration<UserPlan>
{
    public void Configure(EntityTypeBuilder<UserPlan> builder)
    {
        builder.ToTable("UserPlans");

        builder.Property(p => p.ExternalPurchaseToken).HasMaxLength(512).IsUnicode(false);

        builder.HasIndex(p => new { p.UserId, p.Status });

        builder.HasOne(p => p.User)
            .WithMany(u => u.Plans)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.SubscriptionPlan)
            .WithMany()
            .HasForeignKey(p => p.SubscriptionPlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.ToTable("PaymentTransactions");

        builder.Property(t => t.ExternalTransactionId).HasMaxLength(128).IsUnicode(false);
        builder.Property(t => t.PurchaseToken).HasMaxLength(512).IsUnicode(false);
        builder.Property(t => t.ProductId).HasMaxLength(100).IsUnicode(false);
        builder.Property(t => t.Currency).HasMaxLength(3).IsFixedLength().IsUnicode(false).IsRequired();
        builder.Property(t => t.FailureReason).HasMaxLength(1000);

        builder.HasIndex(t => t.ExternalTransactionId).IsUnique().HasFilter("[ExternalTransactionId] IS NOT NULL");
        builder.HasIndex(t => new { t.UserId, t.CreatedAtUtc });

        // Financial records are retained: users are soft-deleted, so never cascade here.
        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.UserPlan)
            .WithMany(p => p.Transactions)
            .HasForeignKey(t => t.UserPlanId)
            .OnDelete(DeleteBehavior.ClientSetNull);
    }
}
