using FluentValidation;
using Renewly.Application.Common.Validation;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Account;

public sealed record UpdateProfileRequest(string FullName, string PreferredCurrency, string TimeZoneId, string Language);

public sealed record NotificationSettingsDto(
    bool PushEnabled,
    bool EmailEnabled,
    IReadOnlyList<int> DefaultReminderDaysBefore,
    TimeOnly ReminderTimeOfDay,
    bool ProductUpdatesEmailEnabled)
{
    public static NotificationSettingsDto From(UserNotificationSettings s) =>
        new(s.PushEnabled, s.EmailEnabled, s.DefaultReminderDaysBefore, s.ReminderTimeOfDay, s.ProductUpdatesEmailEnabled);
}

public sealed record UpdateNotificationSettingsRequest(
    bool PushEnabled,
    bool EmailEnabled,
    IReadOnlyList<int> DefaultReminderDaysBefore,
    TimeOnly ReminderTimeOfDay,
    bool ProductUpdatesEmailEnabled);

public sealed record MyPlanDto(UserEntitlements Entitlements, int ActiveSubscriptions)
{
    public int? RemainingSubscriptions => Entitlements.MaxSubscriptions is { } max ? Math.Max(0, max - ActiveSubscriptions) : null;
}

public sealed record DeleteAccountRequest(string Password);

public static class Languages
{
    /// <summary>Languages the user can pick. The app falls back to English for untranslated strings.</summary>
    public static readonly IReadOnlyList<string> Supported = ["en", "ne", "hi", "es", "fr", "de"];
}

internal sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Name is required.").MinimumLength(2).MaximumLength(120);
        RuleFor(x => x.PreferredCurrency).NotEmpty().ValidCurrency();
        RuleFor(x => x.TimeZoneId).NotEmpty().ValidTimeZone();
        RuleFor(x => x.Language).NotEmpty().Must(Languages.Supported.Contains)
            .WithMessage($"Language must be one of: {string.Join(", ", Languages.Supported)}.");
    }
}

internal sealed class UpdateNotificationSettingsRequestValidator : AbstractValidator<UpdateNotificationSettingsRequest>
{
    public UpdateNotificationSettingsRequestValidator()
    {
        RuleFor(x => x.DefaultReminderDaysBefore)
            .NotNull()
            .Must(d => d.Distinct().Count() == d.Count).WithMessage("Reminder days must not repeat.")
            .Must(d => d.All(ReminderPlanner.AllowedDaysBefore.Contains))
            .WithMessage($"Reminders can be set {string.Join(", ", ReminderPlanner.AllowedDaysBefore)} days before renewal.");
    }
}

internal sealed class DeleteAccountRequestValidator : AbstractValidator<DeleteAccountRequest>
{
    public DeleteAccountRequestValidator() =>
        RuleFor(x => x.Password).NotEmpty().WithMessage("Enter your password to confirm.");
}
