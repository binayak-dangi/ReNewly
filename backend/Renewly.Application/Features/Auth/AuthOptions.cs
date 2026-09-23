using System.ComponentModel.DataAnnotations;

namespace Renewly.Application.Features.Auth;

/// <summary>Session and account-security settings. Bound from the "Auth" configuration section.</summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    [Range(1, 365)]
    public int RefreshTokenDays { get; set; } = 30;

    [Range(5, 10080)]
    public int EmailVerificationCodeMinutes { get; set; } = 60 * 24;

    [Range(5, 120)]
    public int PasswordResetCodeMinutes { get; set; } = 15;

    /// <summary>Wrong guesses allowed per one-time code before it is burned.</summary>
    [Range(1, 20)]
    public int MaxCodeAttempts { get; set; } = 5;

    /// <summary>Minimum seconds between two emails of the same kind to the same user.</summary>
    [Range(0, 3600)]
    public int CodeResendCooldownSeconds { get; set; } = 60;

    [Range(1, 50)]
    public int MaxFailedLoginAttempts { get; set; } = 5;

    [Range(1, 1440)]
    public int LockoutMinutes { get; set; } = 15;
}
