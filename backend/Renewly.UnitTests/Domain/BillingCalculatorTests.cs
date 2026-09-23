using Renewly.Domain.Enums;
using Renewly.Domain.Services;

namespace Renewly.UnitTests.Domain;

public class BillingCalculatorTests
{
    [Theory]
    [InlineData("2026-09-25", BillingCycle.Monthly, "2026-09-23", "2026-09-25")] // future date unchanged
    [InlineData("2026-09-23", BillingCycle.Monthly, "2026-09-23", "2026-09-23")] // renews today
    [InlineData("2026-08-15", BillingCycle.Monthly, "2026-09-23", "2026-10-15")]
    [InlineData("2026-01-31", BillingCycle.Monthly, "2026-03-01", "2026-03-31")] // month-end anchor preserved
    [InlineData("2026-01-31", BillingCycle.Monthly, "2026-02-10", "2026-02-28")] // clamped in short month
    [InlineData("2025-02-10", BillingCycle.Yearly, "2026-09-23", "2027-02-10")]
    [InlineData("2026-01-10", BillingCycle.Quarterly, "2026-09-23", "2026-10-10")]
    [InlineData("2026-01-10", BillingCycle.SemiAnnually, "2026-09-23", "2027-01-10")]
    [InlineData("2026-09-01", BillingCycle.Weekly, "2026-09-23", "2026-09-29")]
    [InlineData("2026-09-02", BillingCycle.Weekly, "2026-09-23", "2026-09-23")]
    public void NextRenewalOnOrAfter_returns_first_date_not_before_today(string anchor, BillingCycle cycle, string today, string expected)
    {
        var result = BillingCalculator.NextRenewalOnOrAfter(DateOnly.Parse(anchor), cycle, DateOnly.Parse(today));

        Assert.Equal(DateOnly.Parse(expected), result);
    }

    [Theory]
    [InlineData(BillingCycle.Weekly, 10, 43.33)]
    [InlineData(BillingCycle.Monthly, 15.99, 15.99)]
    [InlineData(BillingCycle.Quarterly, 30, 10)]
    [InlineData(BillingCycle.SemiAnnually, 60, 10)]
    [InlineData(BillingCycle.Yearly, 119.88, 9.99)]
    public void ToMonthlyAmount_normalises_to_month(BillingCycle cycle, decimal price, decimal expectedMonthly)
    {
        var monthly = BillingCalculator.RoundMoney(BillingCalculator.ToMonthlyAmount(price, cycle));

        Assert.Equal(expectedMonthly, monthly);
    }

    [Theory]
    [InlineData(BillingCycle.Weekly, 10, 520)]
    [InlineData(BillingCycle.Monthly, 15.99, 191.88)]
    [InlineData(BillingCycle.Quarterly, 30, 120)]
    [InlineData(BillingCycle.SemiAnnually, 60, 120)]
    [InlineData(BillingCycle.Yearly, 99, 99)]
    public void ToYearlyAmount_normalises_to_year(BillingCycle cycle, decimal price, decimal expectedYearly)
    {
        Assert.Equal(expectedYearly, BillingCalculator.ToYearlyAmount(price, cycle));
    }

    [Fact]
    public void NextAfter_advances_exactly_one_cycle()
    {
        Assert.Equal(new DateOnly(2026, 10, 25), BillingCalculator.NextAfter(new DateOnly(2026, 9, 25), BillingCycle.Monthly));
        Assert.Equal(new DateOnly(2026, 10, 2), BillingCalculator.NextAfter(new DateOnly(2026, 9, 25), BillingCycle.Weekly));
    }
}
