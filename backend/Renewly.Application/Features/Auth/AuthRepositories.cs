using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Auth;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByNormalizedEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    Task<bool> ExistsByNormalizedEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    /// <summary>Tracked user including notification settings.</summary>
    Task<User?> GetWithSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    /// <summary>Loads the token with its user (query filters bypassed so deleted users are detected, not ignored).</summary>
    Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    Task<int> RevokeFamilyAsync(Guid familyId, string reason, DateTime utcNow, CancellationToken cancellationToken = default);

    Task<int> RevokeAllForUserAsync(Guid userId, string reason, DateTime utcNow, CancellationToken cancellationToken = default);
}

public interface IUserTokenRepository : IRepository<UserToken>
{
    Task<UserToken?> GetLatestUsableAsync(Guid userId, UserTokenPurpose purpose, DateTime utcNow, CancellationToken cancellationToken = default);

    Task<UserToken?> GetLatestAsync(Guid userId, UserTokenPurpose purpose, CancellationToken cancellationToken = default);

    /// <summary>Marks every outstanding token of this purpose as consumed, so only the newest code works.</summary>
    Task<int> InvalidateAllAsync(Guid userId, UserTokenPurpose purpose, DateTime utcNow, CancellationToken cancellationToken = default);
}
