using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Renewly.Api.Contracts;

namespace Renewly.Api.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected const string ApiPrefix = "api/v1";

    private string TraceId => Activity.Current?.Id ?? HttpContext.TraceIdentifier;

    protected ActionResult<ApiResponse<T>> Success<T>(T data, string? message = null) =>
        Ok(ApiResponse.Ok(data, message, TraceId));

    protected ActionResult<ApiResponse<T>> Created<T>(string? location, T data, string? message = null) =>
        base.Created(location, ApiResponse.Ok(data, message, TraceId));

    protected ActionResult<ApiResponse<object>> Success(string? message = null) =>
        Ok(ApiResponse.Ok(message, TraceId));
}
