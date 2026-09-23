using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Renewly.Application.Common.Interfaces;
using Renewly.Application.Features.Account;
using Renewly.Application.Features.Auth;
using Renewly.Application.Features.Catalog;
using Renewly.Application.Features.Devices;
using Renewly.Application.Features.Entitlements;
using Renewly.Application.Features.Notifications;
using Renewly.Application.Features.Plans;
using Renewly.Application.Features.Reminders;
using Renewly.Application.Features.Subscriptions;
using Renewly.Infrastructure.BackgroundJobs;
using Renewly.Infrastructure.Email;
using Renewly.Infrastructure.Notifications;
using Renewly.Infrastructure.Persistence;
using Renewly.Infrastructure.Persistence.Interceptors;
using Renewly.Infrastructure.Persistence.Repositories;
using Renewly.Infrastructure.Security;

namespace Renewly.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "DefaultConnection";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(TimeProvider.System);

        AddPersistence(services, configuration);
        AddSecurity(services);
        AddEmail(services, configuration);
        AddNotifications(services, configuration);

        return services;
    }

    private static void AddPersistence(IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is not configured. " +
                $"Set ConnectionStrings__{ConnectionStringName} or add it to appsettings.");
        }

        services.AddScoped<AuditableEntityInterceptor>();

        services.AddDbContext<RenewlyDbContext>((sp, options) =>
        {
            options.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(typeof(RenewlyDbContext).Assembly.FullName);
                sql.EnableRetryOnFailure(maxRetryCount: 5);
            });
            options.AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>());
            // Reference data is NOT seeded from code. It lives in versioned SQL scripts under
            // backend/Database/ScriptTracker and is applied manually per environment.

            // Users/subscriptions are soft-deleted via query filters; dependents are only ever
            // loaded through their (visible) owner, so this warning does not apply.
            options.ConfigureWarnings(w => w.Ignore(CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning));
        });

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<RenewlyDbContext>());
        services.AddScoped<IAuditLogger, AuditLogger>();

        services.AddScoped<ISubscriptionServiceRepository, SubscriptionServiceRepository>();
        services.AddScoped<ISubscriptionPlanRepository, SubscriptionPlanRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUserTokenRepository, UserTokenRepository>();
        services.AddScoped<IUserSubscriptionRepository, UserSubscriptionRepository>();
        services.AddScoped<ISubscriptionReminderRepository, SubscriptionReminderRepository>();
        services.AddScoped<INotificationLogRepository, NotificationLogRepository>();
        services.AddScoped<IUserPlanRepository, UserPlanRepository>();
        services.AddScoped<IUserDeviceRepository, UserDeviceRepository>();
        services.AddScoped<IUserDataEraser, UserDataEraser>();
        services.AddScoped<IReminderDispatchRepository, ReminderDispatchRepository>();

        services.AddHealthChecks().AddDbContextCheck<RenewlyDbContext>("database", tags: ["ready"]);
    }

    private static void AddSecurity(IServiceCollection services)
    {
        services.AddOptions<JwtOptions>()
            .BindConfiguration(JwtOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, IdentityPasswordHasher>();
        services.AddSingleton<ISecureTokenGenerator, SecureTokenGenerator>();
    }

    private static void AddEmail(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<EmailOptions>()
            .BindConfiguration(EmailOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(
                o => !string.Equals(o.Provider, "Smtp", StringComparison.OrdinalIgnoreCase) || !string.IsNullOrWhiteSpace(o.Smtp.Host),
                "Email:Smtp:Host is required when Email:Provider is 'Smtp'.")
            .ValidateOnStart();

        var provider = configuration[$"{EmailOptions.SectionName}:{nameof(EmailOptions.Provider)}"];
        if (string.Equals(provider, "Smtp", StringComparison.OrdinalIgnoreCase))
        {
            services.AddTransient<IEmailSender, SmtpEmailSender>();
        }
        else
        {
            services.AddTransient<IEmailSender, LoggingEmailSender>();
        }
    }

    private static void AddNotifications(IServiceCollection services, IConfiguration configuration)
    {
        var firebase = configuration.GetSection(FirebaseOptions.SectionName).Get<FirebaseOptions>() ?? new FirebaseOptions();
        services.AddSingleton(firebase);

        if (firebase.IsConfigured)
        {
            services.AddSingleton(_ =>
            {
                var credential = string.IsNullOrWhiteSpace(firebase.CredentialsJson)
                    ? CredentialFactory.FromFile<ServiceAccountCredential>(firebase.CredentialsPath!).ToGoogleCredential()
                    : CredentialFactory.FromJson<ServiceAccountCredential>(firebase.CredentialsJson).ToGoogleCredential();
                var app = FirebaseApp.DefaultInstance ?? FirebaseApp.Create(new AppOptions
                {
                    Credential = credential,
                    ProjectId = firebase.ProjectId,
                });
                return FirebaseMessaging.GetMessaging(app);
            });
            services.AddSingleton<IPushSender, FcmPushSender>();
        }
        else
        {
            services.AddSingleton<IPushSender, LoggingPushSender>();
        }

        services.AddHostedService<ReminderWorker>();
    }
}
