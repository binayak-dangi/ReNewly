using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Auth;

public sealed record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string? TimeZoneId,
    string? PreferredCurrency,
    string? DeviceName);

public sealed record LoginRequest(string Email, string Password, string? DeviceName);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record LogoutRequest(string RefreshToken);

public sealed record VerifyEmailRequest(string Code);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Email, string Code, string NewPassword);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record UserDto(
    Guid Id,
    string Email,
    string FullName,
    bool EmailConfirmed,
    string PreferredCurrency,
    string TimeZoneId,
    string Language,
    DateTime CreatedAtUtc)
{
    public static UserDto From(User u) =>
        new(u.Id, u.Email, u.FullName, u.EmailConfirmed, u.PreferredCurrency, u.TimeZoneId, u.Language, u.CreatedAtUtc);
}

/// <summary>Returned by register, login, refresh and verify-email.</summary>
public sealed record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    UserDto User);
