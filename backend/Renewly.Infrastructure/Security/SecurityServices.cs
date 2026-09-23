using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Renewly.Application.Common.Interfaces;
using Renewly.Domain.Entities;

namespace Renewly.Infrastructure.Security;

/// <summary>ASP.NET Core Identity's PBKDF2 hasher (HMAC-SHA512, 100k iterations, per-hash salt).</summary>
internal sealed class IdentityPasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<User> _inner = new();

    public string Hash(User user, string password) => _inner.HashPassword(user, password);

    public PasswordVerification Verify(User user, string hashedPassword, string providedPassword) =>
        _inner.VerifyHashedPassword(user, hashedPassword, providedPassword) switch
        {
            PasswordVerificationResult.Success => PasswordVerification.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordVerification.SuccessRehashNeeded,
            _ => PasswordVerification.Failed,
        };
}

internal sealed class SecureTokenGenerator : ISecureTokenGenerator
{
    public string CreateOpaqueToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public string CreateNumericCode(int digits = 6)
    {
        var max = (int)Math.Pow(10, digits);
        return RandomNumberGenerator.GetInt32(0, max).ToString($"D{digits}");
    }

    public string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
