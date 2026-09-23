using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);

    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);

    Task<AuthResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);

    Task ResendVerificationAsync(CancellationToken cancellationToken = default);

    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);

    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);

    Task<AuthResponse> ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default);

    Task<UserDto> GetCurrentUserAsync(CancellationToken cancellationToken = default);
}

internal sealed class AuthService(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IUserTokenRepository userTokens,
    IUnitOfWork unitOfWork,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokens,
    ISecureTokenGenerator tokenGenerator,
    IEmailSender emailSender,
    IAuditLogger audit,
    ICurrentUser currentUser,
    TimeProvider timeProvider,
    IOptions<AuthOptions> options,
    ILogger<AuthService> logger) : IAuthService
{
    private const string RevokedRotated = "Rotated";
    private const string RevokedLogout = "Logout";
    private const string RevokedReuse = "ReuseDetected";
    private const string RevokedPasswordChange = "PasswordChanged";
    private const string RevokedAccountUnavailable = "AccountUnavailable";

    private readonly AuthOptions _options = options.Value;

    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();
        var normalizedEmail = Normalize(email);

        if (await users.ExistsByNormalizedEmailAsync(normalizedEmail, cancellationToken))
        {
            throw new ConflictException(ErrorCodes.EmailAlreadyRegistered, "An account with this email already exists.");
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = string.Empty,
            TimeZoneId = request.TimeZoneId ?? "UTC",
            PreferredCurrency = request.PreferredCurrency ?? "USD",
            LastLoginAtUtc = UtcNow,
            NotificationSettings = new UserNotificationSettings(),
        };
        user.PasswordHash = passwordHasher.Hash(user, request.Password);
        users.Add(user);

        var code = IssueCode(user, UserTokenPurpose.EmailVerification, _options.EmailVerificationCodeMinutes);
        var response = IssueSession(user, familyId: Guid.NewGuid(), request.DeviceName);
        audit.Log("auth.register", user.Id, nameof(User), user.Id.ToString());

        await unitOfWork.SaveChangesAsync(cancellationToken);

        await TrySendAsync(
            AuthEmailTemplates.VerificationCode(user.Email, user.FullName, code, _options.EmailVerificationCodeMinutes),
            cancellationToken);

        return response with { User = UserDto.From(user) };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByNormalizedEmailAsync(Normalize(request.Email), cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw InvalidCredentials();
        }

        var now = UtcNow;
        if (user.LockoutEndUtc > now)
        {
            throw new UnauthorizedException(
                ErrorCodes.AccountLocked,
                "Too many failed attempts. Try again later or reset your password.");
        }

        var verification = passwordHasher.Verify(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerification.Failed)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= _options.MaxFailedLoginAttempts)
            {
                user.LockoutEndUtc = now.AddMinutes(_options.LockoutMinutes);
                user.AccessFailedCount = 0;
                audit.Log("auth.lockout", user.Id);
            }

            audit.Log("auth.login_failed", user.Id);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            throw InvalidCredentials();
        }

        if (verification == PasswordVerification.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.Hash(user, request.Password);
        }

        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAtUtc = now;

        var response = IssueSession(user, familyId: Guid.NewGuid(), request.DeviceName);
        audit.Log("auth.login", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var now = UtcNow;
        var existing = await refreshTokens.GetByHashAsync(tokenGenerator.Hash(request.RefreshToken), cancellationToken)
            ?? throw InvalidRefreshToken();

        if (existing.RevokedAtUtc is not null)
        {
            // A rotated token was presented again: it was probably stolen. Kill the whole session family.
            if (existing.RevokedReason == RevokedRotated)
            {
                await refreshTokens.RevokeFamilyAsync(existing.FamilyId, RevokedReuse, now, cancellationToken);
                audit.Log("auth.refresh_reuse_detected", existing.UserId, nameof(RefreshToken), existing.FamilyId.ToString());
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            throw InvalidRefreshToken();
        }

        if (existing.ExpiresAtUtc <= now)
        {
            throw InvalidRefreshToken();
        }

        var user = existing.User;
        if (user is null || user.IsDeleted || !user.IsActive)
        {
            await refreshTokens.RevokeFamilyAsync(existing.FamilyId, RevokedAccountUnavailable, now, cancellationToken);
            throw InvalidRefreshToken();
        }

        var response = IssueSession(user, existing.FamilyId, existing.DeviceName, out var replacement);
        existing.RevokedAtUtc = now;
        existing.RevokedReason = RevokedRotated;
        existing.ReplacedByTokenId = replacement.Id;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await refreshTokens.GetByHashAsync(tokenGenerator.Hash(request.RefreshToken), cancellationToken);
        if (existing is null)
        {
            return; // Idempotent: nothing to revoke.
        }

        await refreshTokens.RevokeFamilyAsync(existing.FamilyId, RevokedLogout, UtcNow, cancellationToken);
        audit.Log("auth.logout", existing.UserId);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuthResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);

        if (!user.EmailConfirmed)
        {
            await ConsumeCodeAsync(user, UserTokenPurpose.EmailVerification, request.Code, cancellationToken);
            user.EmailConfirmed = true;
            user.EmailConfirmedAtUtc = UtcNow;
            audit.Log("auth.email_verified", user.Id);
        }

        // Start a fresh session so the new access token carries email_verified=true.
        var response = IssueSession(user, familyId: Guid.NewGuid(), deviceName: null);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task ResendVerificationAsync(CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);
        if (user.EmailConfirmed)
        {
            return;
        }

        await EnsureCooldownElapsedAsync(user.Id, UserTokenPurpose.EmailVerification, throwIfTooSoon: true, cancellationToken);
        await userTokens.InvalidateAllAsync(user.Id, UserTokenPurpose.EmailVerification, UtcNow, cancellationToken);
        var code = IssueCode(user, UserTokenPurpose.EmailVerification, _options.EmailVerificationCodeMinutes);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await TrySendAsync(
            AuthEmailTemplates.VerificationCode(user.Email, user.FullName, code, _options.EmailVerificationCodeMinutes),
            cancellationToken);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        // Always succeed silently so the endpoint cannot be used to discover registered emails.
        var user = await users.GetByNormalizedEmailAsync(Normalize(request.Email), cancellationToken);
        if (user is null || !user.IsActive)
        {
            return;
        }

        if (!await EnsureCooldownElapsedAsync(user.Id, UserTokenPurpose.PasswordReset, throwIfTooSoon: false, cancellationToken))
        {
            return;
        }

        await userTokens.InvalidateAllAsync(user.Id, UserTokenPurpose.PasswordReset, UtcNow, cancellationToken);
        var code = IssueCode(user, UserTokenPurpose.PasswordReset, _options.PasswordResetCodeMinutes);
        audit.Log("auth.password_reset_requested", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await TrySendAsync(
            AuthEmailTemplates.PasswordResetCode(user.Email, user.FullName, code, _options.PasswordResetCodeMinutes),
            cancellationToken);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByNormalizedEmailAsync(Normalize(request.Email), cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw InvalidCode();
        }

        await ConsumeCodeAsync(user, UserTokenPurpose.PasswordReset, request.Code, cancellationToken);

        var now = UtcNow;
        SetNewPassword(user, request.NewPassword);
        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;

        // Receiving the code proves ownership of the inbox.
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            user.EmailConfirmedAtUtc = now;
        }

        await refreshTokens.RevokeAllForUserAsync(user.Id, RevokedPasswordChange, now, cancellationToken);
        audit.Log("auth.password_reset", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await TrySendAsync(AuthEmailTemplates.PasswordChanged(user.Email, user.FullName), cancellationToken);
    }

    public async Task<AuthResponse> ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);

        // 422 rather than 401: a wrong current password must not look like an expired session to the app.
        if (passwordHasher.Verify(user, user.PasswordHash, request.CurrentPassword) == PasswordVerification.Failed)
        {
            throw new BusinessRuleException(ErrorCodes.InvalidCredentials, "Your current password is incorrect.");
        }

        SetNewPassword(user, request.NewPassword);
        await refreshTokens.RevokeAllForUserAsync(user.Id, RevokedPasswordChange, UtcNow, cancellationToken);
        var response = IssueSession(user, familyId: Guid.NewGuid(), deviceName: null);
        audit.Log("auth.password_changed", user.Id);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await TrySendAsync(AuthEmailTemplates.PasswordChanged(user.Email, user.FullName), cancellationToken);
        return response;
    }

    public async Task<UserDto> GetCurrentUserAsync(CancellationToken cancellationToken = default) =>
        UserDto.From(await GetCurrentUserEntityAsync(cancellationToken));

    private async Task<User> GetCurrentUserEntityAsync(CancellationToken cancellationToken) =>
        await users.GetByIdAsync(currentUser.RequiredUserId, cancellationToken)
        ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");

    private AuthResponse IssueSession(User user, Guid familyId, string? deviceName) =>
        IssueSession(user, familyId, deviceName, out _);

    private AuthResponse IssueSession(User user, Guid familyId, string? deviceName, out RefreshToken refreshToken)
    {
        var now = UtcNow;
        var rawRefreshToken = tokenGenerator.CreateOpaqueToken();
        refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenGenerator.Hash(rawRefreshToken),
            FamilyId = familyId,
            ExpiresAtUtc = now.AddDays(_options.RefreshTokenDays),
            CreatedByIp = currentUser.IpAddress,
            DeviceName = deviceName,
        };
        refreshTokens.Add(refreshToken);

        var accessToken = jwtTokens.CreateAccessToken(user);
        return new AuthResponse(
            accessToken.Token,
            accessToken.ExpiresAtUtc,
            rawRefreshToken,
            refreshToken.ExpiresAtUtc,
            UserDto.From(user));
    }

    private string IssueCode(User user, UserTokenPurpose purpose, int validMinutes)
    {
        var code = tokenGenerator.CreateNumericCode();
        userTokens.Add(new UserToken
        {
            UserId = user.Id,
            Purpose = purpose,
            TokenHash = HashCode(user.Id, purpose, code),
            ExpiresAtUtc = UtcNow.AddMinutes(validMinutes),
        });
        return code;
    }

    private async Task ConsumeCodeAsync(User user, UserTokenPurpose purpose, string code, CancellationToken cancellationToken)
    {
        var now = UtcNow;
        var token = await userTokens.GetLatestUsableAsync(user.Id, purpose, now, cancellationToken)
            ?? throw InvalidCode();

        if (!string.Equals(token.TokenHash, HashCode(user.Id, purpose, code), StringComparison.Ordinal))
        {
            token.FailedAttempts++;
            if (token.FailedAttempts >= _options.MaxCodeAttempts)
            {
                token.ConsumedAtUtc = now; // Burn the code after too many guesses.
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);
            throw InvalidCode();
        }

        token.ConsumedAtUtc = now;
    }

    /// <returns>True when a new code may be sent.</returns>
    private async Task<bool> EnsureCooldownElapsedAsync(Guid userId, UserTokenPurpose purpose, bool throwIfTooSoon, CancellationToken cancellationToken)
    {
        var latest = await userTokens.GetLatestAsync(userId, purpose, cancellationToken);
        var tooSoon = latest is not null && latest.CreatedAtUtc > UtcNow.AddSeconds(-_options.CodeResendCooldownSeconds);
        if (tooSoon && throwIfTooSoon)
        {
            throw new BusinessRuleException(ErrorCodes.RateLimited, "Please wait a minute before requesting another code.");
        }

        return !tooSoon;
    }

    private void SetNewPassword(User user, string newPassword)
    {
        user.PasswordHash = passwordHasher.Hash(user, newPassword);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
    }

    private string HashCode(Guid userId, UserTokenPurpose purpose, string code) =>
        tokenGenerator.Hash($"{userId:N}:{(int)purpose}:{code}");

    private async Task TrySendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        try
        {
            await emailSender.SendAsync(message, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // The account change is already committed; the user can request the email again.
            logger.LogError(ex, "Failed to send '{Subject}' email", message.Subject);
        }
    }

    private static string Normalize(string email) => email.Trim().ToUpperInvariant();

    private static UnauthorizedException InvalidCredentials() =>
        new(ErrorCodes.InvalidCredentials, "Incorrect email or password.");

    private static UnauthorizedException InvalidRefreshToken() =>
        new(ErrorCodes.InvalidToken, "Your session has expired. Please sign in again.");

    private static BusinessRuleException InvalidCode() =>
        new(ErrorCodes.InvalidToken, "This code is invalid or has expired. Request a new one and try again.");
}
