using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Renewly.Application.Features.Account;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Calendar;
using Renewly.Application.Features.Catalog;
using Renewly.Application.Features.Dashboard;
using Renewly.Application.Features.Devices;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Insights;
using Renewly.Application.Features.Notifications;
using Renewly.Application.Features.Plans;
using Renewly.Application.Features.Reminders;
using Renewly.Application.Features.Subscriptions;

namespace Renewly.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly, includeInternalTypes: true);

        services.AddOptions<AuthOptions>()
            .BindConfiguration(AuthOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<ReminderOptions>()
            .BindConfiguration(ReminderOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<IPlanService, PlanService>();
        services.AddScoped<IEntitlementService, EntitlementService>();
        services.AddScoped<IUserSubscriptionService, UserSubscriptionService>();
        services.AddScoped<IReminderScheduler, ReminderScheduler>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ICalendarService, CalendarService>();
        services.AddScoped<IInsightsService, InsightsService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IDeviceService, DeviceService>();
        services.AddScoped<IReminderDispatcher, ReminderDispatcher>();
        services.AddScoped<IRenewalRolloverService, RenewalRolloverService>();

        return services;
    }
}
