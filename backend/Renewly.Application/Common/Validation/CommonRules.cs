using FluentValidation;

namespace Renewly.Application.Common.Validation;

/// <summary>Reusable FluentValidation rules shared by several request validators.</summary>
public static class CommonRules
{
    public const int PasswordMinLength = 8;
    public const int PasswordMaxLength = 128;

    public static IRuleBuilderOptions<T, string> ValidEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Email is required.")
            .MaximumLength(256)
            .EmailAddress().WithMessage("Enter a valid email address.");

    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Password is required.")
            .MinimumLength(PasswordMinLength).WithMessage($"Password must be at least {PasswordMinLength} characters.")
            .MaximumLength(PasswordMaxLength)
            .Must(p => p.Any(char.IsLetter) && p.Any(char.IsDigit))
            .WithMessage("Password must contain at least one letter and one number.");

    public static IRuleBuilderOptions<T, string?> ValidCurrency<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(c => c is null || Currencies.IsSupported(c))
            .WithMessage("Currency must be a supported 3-letter ISO 4217 code, e.g. USD.");

    public static IRuleBuilderOptions<T, string?> ValidTimeZone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(tz => tz is null || TimeZoneInfo.TryFindSystemTimeZoneById(tz, out _))
            .WithMessage("Time zone must be a valid IANA id, e.g. Asia/Kathmandu.");

    public static IRuleBuilderOptions<T, string> OneTimeCode<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Code is required.")
            .Matches("^[0-9]{6}$").WithMessage("Enter the 6-digit code from your email.");
}
