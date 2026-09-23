using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Security;

public static class RenewlyClaimTypes
{
    public const string EmailVerified = "email_verified";
    public const string SecurityStamp = "sst";
}

public static class JwtSigningKey
{
    public static SymmetricSecurityKey Create(string key) => new(Encoding.UTF8.GetBytes(key));
}

internal sealed class JwtTokenService(IOptions<JwtOptions> options, TimeProvider timeProvider) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken CreateAccessToken(User user)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(_options.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            SigningCredentials = new SigningCredentials(JwtSigningKey.Create(_options.SigningKey), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.FullName),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
                // Serialized as a JSON boolean; after validation the claim value is "true"/"false",
                // which the VerifiedEmail policy matches (covered by JwtTokenServiceTests).
                new Claim(RenewlyClaimTypes.EmailVerified, user.EmailConfirmed ? "true" : "false"),
                new Claim(RenewlyClaimTypes.SecurityStamp, user.SecurityStamp),
            ]),
        };

        return new AccessToken(_handler.CreateToken(descriptor), expires);
    }
}
