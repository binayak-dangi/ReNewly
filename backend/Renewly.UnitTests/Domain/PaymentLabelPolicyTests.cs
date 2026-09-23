using Renewly.Domain.Services;

namespace Renewly.UnitTests.Domain;

public class PaymentLabelPolicyTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Visa ****4521")]
    [InlineData("Mastercard ending 0042")]
    [InlineData("PayPal")]
    [InlineData("Google Play balance")]
    public void Safe_labels_are_accepted(string? label) => Assert.True(PaymentLabelPolicy.IsSafe(label));

    [Theory]
    [InlineData("4111111111111111")]          // full card number
    [InlineData("4111 1111 1111 1111")]       // spaced card number
    [InlineData("4111-1111-1111-1111")]       // dashed card number
    [InlineData("Visa 4521 cvv 123")]         // last4 + CVV
    [InlineData("12345")]                     // more than 4 consecutive digits
    public void Labels_with_sensitive_digits_are_rejected(string label) => Assert.False(PaymentLabelPolicy.IsSafe(label));
}
