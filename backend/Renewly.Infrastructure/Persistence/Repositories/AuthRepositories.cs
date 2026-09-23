using Microsoft.EntityFrameworkCore;
using Renewly.Application.Features.Auth;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Infrastructure.Persistence.Repositories;

internal sealed class UserRepository(RenewlyDbContext db) : Repository<User>(db), IUserRepository
{
    public Task<User?> GetByNormalizedEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

    public Task<bool> ExistsByNormalizedEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        Set.AnyAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

    public Task<User?> GetWithSettingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Set.Include(u => u.NotificationSettings).FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
}

internal sealed class RefreshTokenRepository(RenewlyDbContext db) : Repository<RefreshToken>(db), IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        Set.IgnoreQueryFilters()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public Task<int> RevokeFamilyAsync(Guid familyId, string reason, DateTime utcNow, CancellationToken cancellationToken = default) =>
        Set.Where(t => t.FamilyId == familyId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.RevokedAtUtc, utcNow)
                      .SetProperty(t => t.RevokedReason, reason)
                      .SetProperty(t => t.UpdatedAtUtc, utcNow),
                cancellationToken);

    public Task<int> RevokeAllForUserAsync(Guid userId, string reason, DateTime utcNow, CancellationToken cancellationToken = default) =>
        Set.Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.RevokedAtUtc, utcNow)
                      .SetProperty(t => t.RevokedReason, reason)
                      .SetProperty(t => t.UpdatedAtUtc, utcNow),
                cancellationToken);
}

internal sealed class UserTokenRepository(RenewlyDbContext db) : Repository<UserToken>(db), IUserTokenRepository
{
    public Task<UserToken?> GetLatestUsableAsync(Guid userId, UserTokenPurpose purpose, DateTime utcNow, CancellationToken cancellationToken = default) =>
        Set.Where(t => t.UserId == userId && t.Purpose == purpose && t.ConsumedAtUtc == null && t.ExpiresAtUtc > utcNow)
            .OrderByDescending(t => t.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<UserToken?> GetLatestAsync(Guid userId, UserTokenPurpose purpose, CancellationToken cancellationToken = default) =>
        Set.AsNoTracking()
            .Where(t => t.UserId == userId && t.Purpose == purpose)
            .OrderByDescending(t => t.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<int> InvalidateAllAsync(Guid userId, UserTokenPurpose purpose, DateTime utcNow, CancellationToken cancellationToken = default) =>
        Set.Where(t => t.UserId == userId && t.Purpose == purpose && t.ConsumedAtUtc == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.ConsumedAtUtc, utcNow)
                      .SetProperty(t => t.UpdatedAtUtc, utcNow),
                cancellationToken);
}
