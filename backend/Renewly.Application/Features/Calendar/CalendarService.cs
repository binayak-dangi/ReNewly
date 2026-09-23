using FluentValidation;
using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Common.Models;
using Renewly.Application.Common.Time;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Enums;

namespace Renewly.Application.Features.Calendar;

public sealed record CalendarQuery(DateOnly From, DateOnly To);

public sealed record CalendarEventDto(
    DateOnly Date,
    Guid SubscriptionId,
    string ServiceName,
    string? ServiceSlug,
    string? BrandColor,
    string? PlanName,
    decimal Price,
    string Currency,
    BillingCycle BillingCycle);

public sealed record CalendarDto(DateOnly From, DateOnly To, DateOnly Today, IReadOnlyList<CalendarEventDto> Events, IReadOnlyList<MoneyDto> Totals);

internal sealed class CalendarQueryValidator : AbstractValidator<CalendarQuery>
{
    public const int MaxRangeDays = 366;

    public CalendarQueryValidator()
    {
        RuleFor(x => x.From).NotEmpty().WithMessage("'from' is required (yyyy-MM-dd).");
        RuleFor(x => x.To).NotEmpty().WithMessage("'to' is required (yyyy-MM-dd).")
            .GreaterThanOrEqualTo(x => x.From).WithMessage("'to' must be on or after 'from'.");
        RuleFor(x => x).Must(x => x.To.DayNumber - x.From.DayNumber <= MaxRangeDays)
            .WithName("to")
            .WithMessage($"The date range can be at most {MaxRangeDays} days.");
    }
}

public interface ICalendarService
{
    Task<CalendarDto> GetAsync(CalendarQuery query, CancellationToken cancellationToken = default);
}

internal sealed class CalendarService(
    IUserRepository users,
    IUserSubscriptionRepository subscriptions,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : ICalendarService
{
    public async Task<CalendarDto> GetAsync(CalendarQuery query, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(currentUser.RequiredUserId, cancellationToken)
            ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Your session is no longer valid. Please sign in again.");
        var today = UserClock.Today(timeProvider, user.TimeZoneId);
        var active = await subscriptions.ListActiveForUserAsync(user.Id, cancellationToken: cancellationToken);

        var occurrences = RenewalProjection.Between(active, query.From, query.To, today)
            .OrderBy(o => o.Date)
            .ThenBy(o => o.Subscription.ServiceName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var events = occurrences.Select(o => new CalendarEventDto(
            o.Date,
            o.Subscription.Id,
            o.Subscription.ServiceName,
            o.Subscription.SubscriptionService?.Slug,
            o.Subscription.SubscriptionService?.BrandColor,
            o.Subscription.PlanName,
            o.Subscription.Price,
            o.Subscription.Currency,
            o.Subscription.BillingCycle)).ToList();

        var totals = MoneyTotals.Sum(occurrences, o => o.Subscription.Currency, o => o.Subscription.Price, user.PreferredCurrency);
        return new CalendarDto(query.From, query.To, today, events, totals);
    }
}
