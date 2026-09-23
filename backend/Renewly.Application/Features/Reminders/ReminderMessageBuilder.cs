using System.Globalization;
using Renewly.Application.Common.Email;
using Renewly.Application.Common.Formatting;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Application.Features.Reminders;

public sealed record ReminderText(string Title, string Body);

/// <summary>
/// Builds the reminder wording, e.g.
/// <code>
/// Netflix renews in 3 days
/// Amount: $15.99
/// Renewal date: September 25
/// </code>
/// </summary>
public static class ReminderMessageBuilder
{
    private static readonly CultureInfo DateCulture = CultureInfo.GetCultureInfo("en-US");

    public static ReminderText Build(UserSubscription subscription, DateOnly renewalDate, DateOnly today)
    {
        var title = $"{subscription.ServiceName} renews {When(renewalDate, today)}";
        var body =
            $"Amount: {MoneyFormatter.Format(subscription.Price, subscription.Currency)}\n" +
            $"Renewal date: {FormatDate(renewalDate, today)}";
        return new ReminderText(title, body);
    }

    public static EmailMessage BuildEmail(User user, UserSubscription subscription, DateOnly renewalDate, DateOnly today)
    {
        var text = Build(subscription, renewalDate, today);
        var cancellationUrl = subscription.SubscriptionService?.CancellationUrl;
        var plan = string.IsNullOrWhiteSpace(subscription.PlanName) ? string.Empty : $" ({subscription.PlanName})";

        return EmailLayout.Build(
            user.Email,
            user.FullName,
            subject: text.Title,
            heading: text.Title,
            lines:
            [
                $"Your {subscription.ServiceName}{plan} subscription renews on {FormatDate(renewalDate, today)}.",
                "Amount:",
            ],
            highlight: MoneyFormatter.Format(subscription.Price, subscription.Currency),
            footer: "Still using it? No action needed. Don't need it any more? Cancel with the provider before the renewal date. " +
                    "Renewly does not cancel subscriptions for you. You can manage reminders in the app under Profile → Notifications.",
            action: cancellationUrl is null ? null : ("Open official cancellation page", cancellationUrl));
    }

    public static string When(DateOnly renewalDate, DateOnly today) => (renewalDate.DayNumber - today.DayNumber) switch
    {
        <= 0 => "today",
        1 => "tomorrow",
        var days => $"in {days} days",
    };

    private static string FormatDate(DateOnly date, DateOnly today) =>
        date.ToString(date.Year == today.Year ? "MMMM d" : "MMMM d, yyyy", DateCulture);
}
