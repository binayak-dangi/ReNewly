using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Renewly.Domain.Entities;
using Renewly.Infrastructure.Security;

namespace Renewly.UnitTests.Infrastructure;

public class JwtTokenServiceTests
{
    private static readonly JwtOptions Options = new()
    {
        Issuer = "renewly-api",
        Audience = "renewly-mobile",
        SigningKey = new string('k', 48),
        AccessTokenMinutes = 15,
    };

    [Theory]
    [InlineData(true, "true")]
    [InlineData(false, "false")]
    public async Task Email_verified_claim_round_trips_as_the_value_the_policy_expects(bool confirmed, string expected)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "asha@example.com",
            NormalizedEmail = "ASHA@EXAMPLE.COM",
            FullName = "Asha",
            PasswordHash = "x",
            EmailConfirmed = confirmed,
        };
        var token = new JwtTokenService(Microsoft.Extensions.Options.Options.Create(Options), TimeProvider.System).CreateAccessToken(user);

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token.Token, new TokenValidationParameters
        {
            ValidIssuer = Options.Issuer,
            ValidAudience = Options.Audience,
            IssuerSigningKey = JwtSigningKey.Create(Options.SigningKey),
        });

        Assert.True(result.IsValid, result.Exception?.Message);
        Assert.Equal(expected, result.ClaimsIdentity.FindFirst(RenewlyClaimTypes.EmailVerified)?.Value);
        Assert.Equal(user.Id.ToString(), result.ClaimsIdentity.FindFirst(JwtRegisteredClaimNames.Sub)?.Value);
    }
}
