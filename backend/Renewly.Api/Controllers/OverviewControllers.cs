using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Renewly.Api.Contracts;
using Renewly.Api.Infrastructure;
using Renewly.Application.Common.Models;
using Renewly.Application.Features.Calendar;
using Renewly.Application.Features.Dashboard;
using Renewly.Application.Features.Insights;
using Renewly.Application.Features.Notifications;

namespace Renewly.Api.Controllers;

[Authorize(Policy = SecuritySetup.VerifiedEmailPolicy)]
[Route(ApiPrefix + "/dashboard")]
public sealed class DashboardController(IDashboardService dashboard) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> Get(CancellationToken cancellationToken) =>
        Success(await dashboard.GetAsync(cancellationToken));
}

[Authorize(Policy = SecuritySetup.VerifiedEmailPolicy)]
[Route(ApiPrefix + "/calendar")]
public sealed class CalendarController(ICalendarService calendar) : ApiControllerBase
{
    /// <summary>Upcoming renewals between two dates (inclusive), e.g. <c>?from=2026-09-01&amp;to=2026-09-30</c>.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<CalendarDto>>> Get([FromQuery] CalendarQuery query, CancellationToken cancellationToken) =>
        Success(await calendar.GetAsync(query, cancellationToken));
}

[Authorize(Policy = SecuritySetup.VerifiedEmailPolicy)]
[Route(ApiPrefix + "/insights")]
public sealed class InsightsController(IInsightsService insights) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<InsightsDto>>> Get(CancellationToken cancellationToken) =>
        Success(await insights.GetAsync(cancellationToken));
}

[Authorize(Policy = SecuritySetup.VerifiedEmailPolicy)]
[Route(ApiPrefix + "/notifications")]
public sealed class NotificationsController(INotificationService notifications) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<NotificationDto>>>> List(
        [FromQuery] NotificationListQuery query,
        CancellationToken cancellationToken) =>
        Success(await notifications.ListAsync(query, cancellationToken));

    [HttpGet("unread-count")]
    public async Task<ActionResult<ApiResponse<UnreadCountDto>>> UnreadCount(CancellationToken cancellationToken) =>
        Success(await notifications.GetUnreadCountAsync(cancellationToken));

    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        await notifications.MarkReadAsync(id, cancellationToken);
        return Success();
    }

    [HttpPost("read-all")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAllRead(CancellationToken cancellationToken)
    {
        await notifications.MarkAllReadAsync(cancellationToken);
        return Success();
    }
}
