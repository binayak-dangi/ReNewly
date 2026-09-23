namespace Renewly.Domain.Services;

/// <summary>
/// Guards against users typing sensitive payment data into the free-text payment label.
/// Renewly must never store full card numbers, CVVs or PINs.
/// </summary>
public static class PaymentLabelPolicy
{
    public const int MaxLength = 40;

    /// <summary>Longest run of digits allowed; enough for "last 4" but never a card number, CVV+last4, etc.</summary>
    public const int MaxConsecutiveDigits = 4;

    /// <summary>Most digits allowed in the whole label, so "4111 1111 1111 1111" split by spaces is rejected.</summary>
    public const int MaxTotalDigits = 4;

    public static bool IsSafe(string? label)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            return true;
        }

        var totalDigits = 0;
        var run = 0;
        foreach (var ch in label)
        {
            if (char.IsDigit(ch))
            {
                totalDigits++;
                run++;
                if (run > MaxConsecutiveDigits || totalDigits > MaxTotalDigits)
                {
                    return false;
                }
            }
            else
            {
                run = 0;
            }
        }

        return true;
    }
}
