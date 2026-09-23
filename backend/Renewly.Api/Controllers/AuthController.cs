using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Renewly.Api.Contracts;
using Renewly.Api.Infrastructure;
using Renewly.Application.Features.Auth;

namespace Renewly.Api.Controllers;

[Route(ApiPrefix + "/auth")]
public sealed class AuthController(IAuthService auth) : ApiControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(RegisterRequest request, CancellationToken cancellationToken) =>
        Success(await auth.RegisterAsync(request, cancellationToken), "Account created. Check your email for a verification code.");

    [AllowAnonymous]
    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request, CancellationToken cancellationToken) =>
        Success(await auth.LoginAsync(request, cancellationToken));

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Refresh(RefreshTokenRequest request, CancellationToken cancellationToken) =>
        Success(await auth.RefreshAsync(request, cancellationToken));

    /// <summary>Revokes the session that owns this refresh token. Works even if the access token has expired.</summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout(LogoutRequest request, CancellationToken cancellationToken)
    {
        await auth.LogoutAsync(request, cancellationToken);
        return Success("Signed out.");
    }

    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("verify-email")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> VerifyEmail(VerifyEmailRequest request, CancellationToken cancellationToken) =>
        Success(await auth.VerifyEmailAsync(request, cancellationToken), "Email verified.");

    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("resend-verification")]
    public async Task<ActionResult<ApiResponse<object>>> ResendVerification(CancellationToken cancellationToken)
    {
        await auth.ResendVerificationAsync(cancellationToken);
        return Success("If your email is not yet verified, a new code has been sent.");
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await auth.ForgotPasswordAsync(request, cancellationToken);
        return Success("If an account exists for this email, a reset code has been sent.");
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await auth.ResetPasswordAsync(request, cancellationToken);
        return Success("Password updated. Please sign in with your new password.");
    }

    [EnableRateLimiting(SecuritySetup.AuthRateLimitPolicy)]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken) =>
        Success(await auth.ChangePasswordAsync(request, cancellationToken), "Password changed. Other devices have been signed out.");
}
