using System.IdentityModel.Tokens.Jwt;
using Renewly.Application.Common.Exceptions;
using Renewly.Application.Common.Interfaces;

namespace Renewly.Api.Infrastructure;

internal sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private HttpContext? Context => accessor.HttpContext;

    public Guid? UserId =>
        Guid.TryParse(Context?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : null;

    public Guid RequiredUserId =>
        UserId ?? throw new UnauthorizedException(ErrorCodes.Unauthorized, "Authentication is required.");

    public string? IpAddress => Context?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent => Context?.Request.Headers.UserAgent.ToString();
}
