using Microsoft.EntityFrameworkCore;
using Renewly.Application.Features.Account;

namespace Renewly.Infrastructure.Persistence;

/// <summary>
/// Hard-deletes a user's personal data in one transaction. Bulk deletes bypass the soft-delete
/// interceptor on purpose: account deletion must actually remove the data.
/// </summary>
internal sealed class UserDataEraser(RenewlyDbContext db, TimeProvider timeProvider) : IUserDataEraser
{
    public async Task EraseAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async ct =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var now = timeProvider.GetUtcNow().UtcDateTime;

            // Notification logs first: they reference subscriptions/reminders without cascade.
            await db.NotificationLogs.IgnoreQueryFilters().Where(n => n.UserId == userId).ExecuteDeleteAsync(ct);
            // Reminders and receipts cascade from subscriptions in the database.
            await db.UserSubscriptions.IgnoreQueryFilters().Where(s => s.UserId == userId).ExecuteDeleteAsync(ct);
            await db.UserDevices.Where(d => d.UserId == userId).ExecuteDeleteAsync(ct);
            await db.RefreshTokens.Where(t => t.UserId == userId).ExecuteDeleteAsync(ct);
            await db.UserTokens.Where(t => t.UserId == userId).ExecuteDeleteAsync(ct);
            await db.UserNotificationSettings.Where(s => s.UserId == userId).ExecuteDeleteAsync(ct);

            // Keep the row (plans/payments reference it) but strip everything personal.
            var anonymousEmail = $"deleted-{userId:N}@deleted.invalid";
            var normalizedEmail = anonymousEmail.ToUpperInvariant();
            var securityStamp = Guid.NewGuid().ToString("N");
            await db.Users.IgnoreQueryFilters().Where(u => u.Id == userId).ExecuteUpdateAsync(
                s => s.SetProperty(u => u.Email, anonymousEmail)
                      .SetProperty(u => u.NormalizedEmail, normalizedEmail)
                      .SetProperty(u => u.FullName, "Deleted user")
                      .SetProperty(u => u.PasswordHash, string.Empty)
                      .SetProperty(u => u.SecurityStamp, securityStamp)
                      .SetProperty(u => u.IsActive, false)
                      .SetProperty(u => u.IsDeleted, true)
                      .SetProperty(u => u.DeletedAtUtc, now)
                      .SetProperty(u => u.UpdatedAtUtc, now),
                ct);

            await transaction.CommitAsync(ct);
        }, cancellationToken);
    }
}
