using System.Globalization;

namespace Renewly.Application.Common.Formatting;

/// <summary>Formats amounts for people, e.g. "$15.99", "€9.99", "NPR 1,200.00".</summary>
public static class MoneyFormatter
{
    // Symbols that are unambiguous enough to show on their own; everything else uses the ISO code.
    private static readonly Dictionary<string, string> Symbols = new(StringComparer.Ordinal)
    {
        ["USD"] = "$",
        ["EUR"] = "€",
        ["GBP"] = "£",
        ["INR"] = "₹",
        ["JPY"] = "¥",
        ["KRW"] = "₩",
        ["TRY"] = "₺",
        ["ILS"] = "₪",
        ["VND"] = "₫",
        ["PHP"] = "₱",
        ["UAH"] = "₴",
    };

    private static readonly HashSet<string> ZeroDecimalCurrencies = new(StringComparer.Ordinal) { "JPY", "KRW", "VND", "CLP" };

    public static string Format(decimal amount, string currency)
    {
        var digits = ZeroDecimalCurrencies.Contains(currency) ? 0 : 2;
        var number = amount.ToString("N" + digits, CultureInfo.InvariantCulture);
        return Symbols.TryGetValue(currency, out var symbol) ? symbol + number : $"{currency} {number}";
    }
}
