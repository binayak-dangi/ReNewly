using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasQueryFilter(u => !u.IsDeleted);

        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.Property(u => u.NormalizedEmail).HasMaxLength(256).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(512).IsRequired();
        builder.Property(u => u.FullName).HasMaxLength(120).IsRequired();
        builder.Property(u => u.PreferredCurrency).HasMaxLength(3).IsFixedLength().IsUnicode(false);
        builder.Property(u => u.TimeZoneId).HasMaxLength(64).IsUnicode(false);
        builder.Property(u => u.Language).HasMaxLength(16).IsUnicode(false);
        builder.Property(u => u.SecurityStamp).HasMaxLength(64).IsUnicode(false);

        // A deleted account frees its email for re-registration.
        builder.HasIndex(u => u.NormalizedEmail).IsUnique().HasFilter("[IsDeleted] = 0");

        builder.HasOne(u => u.NotificationSettings)
            .WithOne(s => s.User)
            .HasForeignKey<UserNotificationSettings>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class UserNotificationSettingsConfiguration : IEntityTypeConfiguration<UserNotificationSettings>
{
    public void Configure(EntityTypeBuilder<UserNotificationSettings> builder)
    {
        builder.ToTable("UserNotificationSettings");
        builder.HasIndex(s => s.UserId).IsUnique();
        builder.PrimitiveCollection(s => s.DefaultReminderDaysBefore).HasMaxLength(64);
    }
}

internal sealed class UserDeviceConfiguration : IEntityTypeConfiguration<UserDevice>
{
    public void Configure(EntityTypeBuilder<UserDevice> builder)
    {
        builder.ToTable("UserDevices");

        builder.Property(d => d.FcmToken).HasMaxLength(512).IsUnicode(false).IsRequired();
        builder.Property(d => d.DeviceName).HasMaxLength(100);
        builder.Property(d => d.AppVersion).HasMaxLength(32).IsUnicode(false);

        // An FCM token identifies one app install; it moves between users on re-login.
        builder.HasIndex(d => d.FcmToken).IsUnique();
        builder.HasIndex(d => new { d.UserId, d.IsActive });

        builder.HasOne(d => d.User)
            .WithMany(u => u.Devices)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.Property(t => t.TokenHash).HasMaxLength(128).IsUnicode(false).IsRequired();
        builder.Property(t => t.RevokedReason).HasMaxLength(100);
        builder.Property(t => t.CreatedByIp).HasMaxLength(64).IsUnicode(false);
        builder.Property(t => t.DeviceName).HasMaxLength(100);

        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => t.FamilyId);
        builder.HasIndex(t => new { t.UserId, t.ExpiresAtUtc });

        builder.HasOne(t => t.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class UserTokenConfiguration : IEntityTypeConfiguration<UserToken>
{
    public void Configure(EntityTypeBuilder<UserToken> builder)
    {
        builder.ToTable("UserTokens");

        // Short numeric codes can repeat for the same user over time, so the hash is not unique;
        // lookups always go through (UserId, Purpose).
        builder.Property(t => t.TokenHash).HasMaxLength(128).IsUnicode(false).IsRequired();
        builder.HasIndex(t => new { t.UserId, t.Purpose });

        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        // Deliberately no FK to Users: audit history must survive account deletion.
        builder.Property(a => a.Action).HasMaxLength(64).IsUnicode(false).IsRequired();
        builder.Property(a => a.EntityName).HasMaxLength(64).IsUnicode(false);
        builder.Property(a => a.EntityId).HasMaxLength(64).IsUnicode(false);
        builder.Property(a => a.IpAddress).HasMaxLength(64).IsUnicode(false);
        builder.Property(a => a.UserAgent).HasMaxLength(512);
        builder.Property(a => a.Details).HasMaxLength(4000);

        builder.HasIndex(a => new { a.UserId, a.CreatedAtUtc });
        builder.HasIndex(a => a.Action);
    }
}
