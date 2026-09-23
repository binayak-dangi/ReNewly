using Renewly.Application.Common.Email;
using Renewly.Application.Common.Interfaces;

namespace Renewly.Application.Features.Auth;

/// <summary>Transactional emails for account security.</summary>
internal static class AuthEmailTemplates
{
    public static EmailMessage VerificationCode(string toEmail, string name, string code, int validMinutes) => EmailLayout.Build(
        toEmail,
        name,
        subject: $"{code} is your Renewly verification code",
        heading: "Verify your email",
        lines: ["Enter this code in the Renewly app to verify your email address:"],
        highlight: code,
        footer: $"The code expires in {Describe(validMinutes)}. If you didn't create a Renewly account, you can ignore this email.");

    public static EmailMessage PasswordResetCode(string toEmail, string name, string code, int validMinutes) => EmailLayout.Build(
        toEmail,
        name,
        subject: $"{code} is your Renewly password reset code",
        heading: "Reset your password",
        lines: ["Enter this code in the Renewly app to choose a new password:"],
        highlight: code,
        footer: $"The code expires in {Describe(validMinutes)}. If you didn't request a reset, you can ignore this email; your password stays the same.");

    public static EmailMessage PasswordChanged(string toEmail, string name) => EmailLayout.Build(
        toEmail,
        name,
        subject: "Your Renewly password was changed",
        heading: "Password changed",
        lines: ["The password for your Renewly account was just changed and all other devices were signed out."],
        highlight: null,
        footer: "If this wasn't you, reset your password immediately from the Renewly app and contact support.");

    private static string Describe(int minutes) =>
        minutes % (60 * 24) == 0 ? $"{minutes / (60 * 24)} day(s)"
        : minutes % 60 == 0 ? $"{minutes / 60} hour(s)"
        : $"{minutes} minutes";
}
