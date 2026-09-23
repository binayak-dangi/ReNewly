using System.Net;
using Renewly.Application.Common.Interfaces;

namespace Renewly.Application.Common.Email;

/// <summary>Shared, brand-consistent layout for every transactional email.</summary>
public static class EmailLayout
{
    public const string BrandColor = "#0F766E";
    public const string Tagline = "Know before you're charged. Cancel before you renew.";

    /// <param name="lines">Body paragraphs (plain text; HTML-encoded here).</param>
    /// <param name="highlight">Large emphasised text, e.g. a one-time code or an amount.</param>
    /// <param name="action">Optional button (label, absolute https URL).</param>
    public static EmailMessage Build(
        string toEmail,
        string name,
        string subject,
        string heading,
        IReadOnlyList<string> lines,
        string? highlight,
        string footer,
        (string Label, string Url)? action = null)
    {
        static string e(string? value) => WebUtility.HtmlEncode(value) ?? string.Empty;
        var paragraphs = string.Concat(lines.Select(l => $"""<p style="margin:0 0 8px">{e(l)}</p>"""));
        var highlightBlock = highlight is null
            ? string.Empty
            : $"""<p style="font-size:32px;font-weight:700;letter-spacing:4px;color:{BrandColor};margin:20px 0">{e(highlight)}</p>""";
        var actionBlock = action is { } a
            ? $"""<p style="margin:20px 0 4px"><a href="{e(a.Url)}" style="display:inline-block;background:{BrandColor};color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">{e(a.Label)}</a></p>"""
            : string.Empty;

        var html = $"""
            <!doctype html>
            <html><body style="margin:0;background:#F8FAFC;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0F172A">
              <div style="max-width:480px;margin:0 auto;padding:32px 24px">
                <p style="font-size:20px;font-weight:700;color:{BrandColor};margin:0 0 24px">Renewly</p>
                <div style="background:#FFFFFF;border-radius:16px;padding:28px;border:1px solid #E2E8F0">
                  <h1 style="font-size:20px;margin:0 0 12px">{e(heading)}</h1>
                  <p style="margin:0 0 8px">Hi {e(name)},</p>
                  {paragraphs}
                  {highlightBlock}
                  {actionBlock}
                  <p style="font-size:13px;color:#475569;margin:16px 0 0">{e(footer)}</p>
                </div>
                <p style="font-size:12px;color:#64748B;margin:24px 0 0">{Tagline}<br/>Renewly by BYNQORA Technologies</p>
              </div>
            </body></html>
            """;

        var text = string.Join(
            "\n\n",
            new[] { $"Hi {name},", string.Join("\n", lines), highlight, action is { } t ? $"{t.Label}: {t.Url}" : null, footer, "Renewly by BYNQORA Technologies" }
                .Where(p => !string.IsNullOrEmpty(p)));

        return new EmailMessage(toEmail, name, subject, html, text);
    }
}
