using Renewly.Domain.Services;

namespace Renewly.Application.Common.Models;

public sealed record MoneyDto(decimal Amount, string Currency);

/// <summary>
/// Renewly does not convert currencies (no FX rates), so totals are reported per currency.
/// The user's preferred currency always comes first; others follow by amount.
/// </summary>
public static class MoneyTotals
{
    public static IReadOnlyList<MoneyDto> Sum<T>(
        IEnumerable<T> items,
        Func<T, string> currency,
        Func<T, decimal> amount,
        string preferredCurrency,
        bool alwaysIncludePreferred = true)
    {
        var totals = items
            .GroupBy(currency)
            .Select(g => new MoneyDto(BillingCalculator.RoundMoney(g.Sum(amount)), g.Key))
            .ToList();

        if (alwaysIncludePreferred && totals.TrueForAll(t => t.Currency != preferredCurrency))
        {
            totals.Add(new MoneyDto(0m, preferredCurrency));
        }

        return totals
            .OrderByDescending(t => t.Currency == preferredCurrency)
            .ThenByDescending(t => t.Amount)
            .ThenBy(t => t.Currency, StringComparer.Ordinal)
            .ToList();
    }
}
