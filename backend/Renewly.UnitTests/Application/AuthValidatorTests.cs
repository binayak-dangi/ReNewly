using Renewly.Application.Features.Auth;
using Renewly.Infrastructure.Security;

namespace Renewly.UnitTests.Application;

public class AuthValidatorTests
{
    [Fact]
    public void Register_accepts_valid_request()
    {
        var result = new RegisterRequestValidator().Validate(
            new RegisterRequest("Asha Sharma", "asha@example.com", "Passw0rd!", "Asia/Kathmandu", "NPR", "Pixel 8"));

        Assert.True(result.IsValid, string.Join("; ", result.Errors));
    }

    [Theory]
    [InlineData("password", "no digit")]
    [InlineData("12345678", "no letter")]
    [InlineData("Ab1", "too short")]
    public void Register_rejects_weak_passwords(string password, string reason)
    {
        var result = new RegisterRequestValidator().Validate(
            new RegisterRequest("Asha Sharma", "asha@example.com", password, null, null, null));

        Assert.False(result.IsValid, reason);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RegisterRequest.Password));
    }

    [Fact]
    public void Register_rejects_unknown_time_zone_and_currency()
    {
        var result = new RegisterRequestValidator().Validate(
            new RegisterRequest("Asha Sharma", "asha@example.com", "Passw0rd!", "Mars/Olympus", "XYZ", null));

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RegisterRequest.TimeZoneId));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RegisterRequest.PreferredCurrency));
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("abcdef")]
    [InlineData("1234567")]
    public void VerifyEmail_requires_six_digits(string code) =>
        Assert.False(new VerifyEmailRequestValidator().Validate(new VerifyEmailRequest(code)).IsValid);

    [Fact]
    public void ChangePassword_rejects_same_password() =>
        Assert.False(new ChangePasswordRequestValidator().Validate(new ChangePasswordRequest("Passw0rd!", "Passw0rd!")).IsValid);
}

public class SecureTokenGeneratorTests
{
    private readonly SecureTokenGenerator _generator = new();

    [Fact]
    public void Numeric_codes_are_six_digits_with_leading_zeros()
    {
        for (var i = 0; i < 500; i++)
        {
            Assert.Matches("^[0-9]{6}$", _generator.CreateNumericCode());
        }
    }

    [Fact]
    public void Opaque_tokens_are_unique_and_url_safe()
    {
        var tokens = Enumerable.Range(0, 200).Select(_ => _generator.CreateOpaqueToken()).ToList();

        Assert.Equal(tokens.Count, tokens.Distinct().Count());
        Assert.All(tokens, t => Assert.Matches("^[A-Za-z0-9_-]{43}$", t));
    }

    [Fact]
    public void Hash_is_deterministic_and_not_the_input()
    {
        Assert.Equal(_generator.Hash("abc"), _generator.Hash("abc"));
        Assert.NotEqual("abc", _generator.Hash("abc"));
        Assert.Equal(64, _generator.Hash("abc").Length);
    }
}
