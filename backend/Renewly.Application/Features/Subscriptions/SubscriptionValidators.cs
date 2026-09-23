using FluentValidation;
using Renewly.Application.Common.Validation;
using Renewly.Domain.Services;

namespace Renewly.Application.Features.Subscriptions;

internal sealed class SaveSubscriptionRequestValidator : AbstractValidator<SaveSubscriptionRequest>
{
    public const decimal MaxPrice = 1_000_000m;

    public SaveSubscriptionRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(x => x.ServiceName)
            .NotEmpty().When(x => x.ServiceId is null).WithMessage("Service name is required.")
            .MaximumLength(100);

        RuleFor(x => x.PlanName).MaximumLength(100);
        RuleFor(x => x.Category).IsInEnum();

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Price cannot be negative.")
            .LessThanOrEqualTo(MaxPrice)
            .Must(p => decimal.Round(p, 2) == p).WithMessage("Price can have at most 2 decimal places.");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required.")
            .Must(Currencies.IsSupported).WithMessage("Currency must be a supported 3-letter ISO code, e.g. USD.");

        RuleFor(x => x.BillingCycle).IsInEnum();

        // Past dates are accepted (they are rolled forward), but not absurdly old or far-future ones.
        RuleFor(x => x.NextRenewalDate)
            .Must(d =>
            {
                var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
                return d >= today.AddYears(-1) && d <= today.AddYears(5);
            })
            .WithMessage("Renewal date must be within the last year or the next 5 years.");

        RuleFor(x => x.PaymentMethodLabel)
            .MaximumLength(PaymentLabelPolicy.MaxLength)
            .Must(PaymentLabelPolicy.IsSafe)
            .WithMessage("For your security, enter only a label and the last 4 digits (e.g. \"Visa ****4521\"). Never enter a full card number, CVV or PIN.");

        RuleFor(x => x.Notes).MaximumLength(1000);

        RuleFor(x => x.ReminderDaysBefore)
            .Must(d => d is null || d.Distinct().Count() == d.Count).WithMessage("Reminder days must not repeat.")
            .Must(d => d is null || d.All(ReminderPlanner.AllowedDaysBefore.Contains))
            .WithMessage($"Reminders can be set {string.Join(", ", ReminderPlanner.AllowedDaysBefore)} days before renewal.");
    }
}
