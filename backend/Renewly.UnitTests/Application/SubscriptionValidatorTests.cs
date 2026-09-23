using Renewly.Application.Features.Subscriptions;
using Renewly.Domain.Enums;

namespace Renewly.UnitTests.Application;

public class SubscriptionValidatorTests
{
    private readonly SaveSubscriptionRequestValidator _validator = new(TimeProvider.System);

    private static SaveSubscriptionRequest Valid() => new(
        ServiceId: null,
        ServiceName: "Netflix",
        PlanName: "Standard",
        Category: SubscriptionCategory.Entertainment,
        Price: 15.99m,
        Currency: "USD",
        BillingCycle: BillingCycle.Monthly,
        NextRenewalDate: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3),
        PaymentMethodLabel: "Visa ****4521",
        Notes: null,
        ReminderDaysBefore: [3]);

    [Fact]
    public void Accepts_valid_request() => Assert.True(_validator.Validate(Valid()).IsValid);

    [Theory]
    [InlineData("4111 1111 1111 1111")]
    [InlineData("Visa 4521 CVV 123")]
    public void Rejects_card_numbers_in_payment_label(string label)
    {
        var result = _validator.Validate(Valid() with { PaymentMethodLabel = label });

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(SaveSubscriptionRequest.PaymentMethodLabel));
    }

    [Fact]
    public void Requires_service_name_for_custom_subscriptions()
    {
        var result = _validator.Validate(Valid() with { ServiceName = " " });

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(SaveSubscriptionRequest.ServiceName));
    }

    [Fact]
    public void Allows_missing_name_when_a_catalog_service_is_chosen() =>
        Assert.True(_validator.Validate(Valid() with { ServiceId = Guid.NewGuid(), ServiceName = null }).IsValid);

    [Theory]
    [InlineData(-1)]
    [InlineData(10.999)]
    public void Rejects_invalid_prices(decimal price) =>
        Assert.False(_validator.Validate(Valid() with { Price = price }).IsValid);

    [Fact]
    public void Rejects_unsupported_reminder_offsets() =>
        Assert.False(_validator.Validate(Valid() with { ReminderDaysBefore = [2] }).IsValid);

    [Fact]
    public void Rejects_unknown_currency() =>
        Assert.False(_validator.Validate(Valid() with { Currency = "ABC" }).IsValid);
}
