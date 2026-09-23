using System.ComponentModel.DataAnnotations;

namespace Renewly.Infrastructure.Security;

/// <summary>Bound from the "Jwt" configuration section. The signing key must come from a secret store.</summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = "renewly-api";

    [Required]
    public string Audience { get; set; } = "renewly-mobile";

    /// <summary>HMAC-SHA256 key, at least 32 characters. Set via user-secrets or the Jwt__SigningKey env variable.</summary>
    [Required]
    [MinLength(32, ErrorMessage = "Jwt:SigningKey must be at least 32 characters.")]
    public string SigningKey { get; set; } = string.Empty;

    [Range(1, 120)]
    public int AccessTokenMinutes { get; set; } = 15;
}
