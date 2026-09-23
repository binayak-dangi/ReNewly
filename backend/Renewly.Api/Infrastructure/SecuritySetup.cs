using System.Diagnostics;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Renewly.Api.Contracts;
using Renewly.Application.Common.Exceptions;
using Renewly.Infrastructure.Security;

namespace Renewly.Api.Infrastructure;

internal static class SecuritySetup
{
    /// <summary>Requires a verified email address. Applied to all user-data endpoints.</summary>
    public const string VerifiedEmailPolicy = "VerifiedEmail";

    /// <summary>Strict per-IP limit for credential and code endpoints.</summary>
    public const string AuthRateLimitPolicy = "auth";

    public static IServiceCollection AddRenewlySecurity(this IServiceCollection services, IConfiguration configuration)
    {
        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false; // Keep "sub", "email" etc. as-is.
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = JwtSigningKey.Create(jwt.SigningKey),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "name",
                };
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        var expired = context.AuthenticateFailure is SecurityTokenExpiredException;
                        await WriteErrorAsync(
                            context.HttpContext,
                            StatusCodes.Status401Unauthorized,
                            expired ? "TOKEN_EXPIRED" : ErrorCodes.Unauthorized,
                            expired ? "Your session has expired." : "Authentication is required.");
                    },
                    OnForbidden = context => WriteErrorAsync(
                        context.HttpContext,
                        StatusCodes.Status403Forbidden,
                        ErrorCodes.EmailNotVerified,
                        "Please verify your email address to continue."),
                };
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(VerifiedEmailPolicy, policy => policy
                .RequireAuthenticatedUser()
                .RequireClaim(RenewlyClaimTypes.EmailVerified, "true"));

        services.AddRateLimiter(options =>
        {
            options.AddPolicy(AuthRateLimitPolicy, httpContext => RateLimitPartition.GetFixedWindowLimiter(
                httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));

            options.OnRejected = (context, cancellationToken) => new ValueTask(WriteErrorAsync(
                context.HttpContext,
                StatusCodes.Status429TooManyRequests,
                ErrorCodes.RateLimited,
                "Too many attempts. Please wait a minute and try again.",
                cancellationToken));
        });

        return services;
    }

    private static Task WriteErrorAsync(HttpContext httpContext, int status, string code, string message, CancellationToken cancellationToken = default)
    {
        httpContext.Response.StatusCode = status;
        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        return httpContext.Response.WriteAsJsonAsync(ApiResponse.Fail(new ApiError(code, message), traceId), cancellationToken);
    }
}
