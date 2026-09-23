using Microsoft.EntityFrameworkCore;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Persistence;

public sealed class RenewlyDbContext(DbContextOptions<RenewlyDbContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<User> Users => Set<User>();

    public DbSet<SubscriptionService> SubscriptionServices => Set<SubscriptionService>();

    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();

    public DbSet<SubscriptionReminder> SubscriptionReminders => Set<SubscriptionReminder>();

    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    public DbSet<UserDevice> UserDevices => Set<UserDevice>();

    public DbSet<UserNotificationSettings> UserNotificationSettings => Set<UserNotificationSettings>();

    public DbSet<SubscriptionReceipt> SubscriptionReceipts => Set<SubscriptionReceipt>();

    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();

    public DbSet<UserPlan> UserPlans => Set<UserPlan>();

    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<UserToken> UserTokens => Set<UserToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RenewlyDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Money columns default to decimal(18,2); plain strings default to a bounded nvarchar.
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
        configurationBuilder.Properties<string>().HaveMaxLength(256);
    }
}
