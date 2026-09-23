namespace Renewly.Application.Common.Validation;

/// <summary>ISO 4217 currencies Renewly accepts for subscriptions and display.</summary>
public static class Currencies
{
    private static readonly HashSet<string> Supported = new(StringComparer.Ordinal)
    {
        "USD", "EUR", "GBP", "INR", "NPR", "AUD", "CAD", "NZD", "SGD", "HKD", "JPY", "CNY", "KRW",
        "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
        "TRY", "ZAR", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "IDR", "MYR", "THB", "PHP", "VND",
        "PKR", "BDT", "LKR", "EGP", "NGN", "KES", "ILS", "RUB", "UAH", "TWD",
    };

    public static IReadOnlyCollection<string> All => Supported;

    public static bool IsSupported(string code) => Supported.Contains(code);
}
