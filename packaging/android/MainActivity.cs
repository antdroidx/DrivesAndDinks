using Android.App;
using Android.Content.PM;
using Android.Graphics;
using Android.OS;
using Android.Views;
using Android.Webkit;

namespace DrivesAndDinks.Android;

[Activity(
    Label = "@string/app_name",
    MainLauncher = true,
    Exported = true,
    Theme = "@android:style/Theme.Material.NoActionBar",
    ConfigurationChanges = ConfigChanges.Orientation | ConfigChanges.ScreenSize | ConfigChanges.UiMode)]
public class MainActivity : Activity
{
    private WebView? webView;

    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        Window?.SetStatusBarColor(Color.ParseColor("#0E1620"));
        Window?.SetNavigationBarColor(Color.ParseColor("#0E1620"));
        Window?.AddFlags(WindowManagerFlags.KeepScreenOn);

        webView = new WebView(this);
        webView.SetWebViewClient(new LocalContentClient(this));
        webView.SetBackgroundColor(Color.ParseColor("#0E1620"));
        var settings = webView.Settings;
        settings.JavaScriptEnabled = true;
        settings.DomStorageEnabled = true;
        settings.DatabaseEnabled = true;
        settings.AllowFileAccess = false;
        settings.AllowContentAccess = false;
        settings.MediaPlaybackRequiresUserGesture = false;
        settings.CacheMode = CacheModes.Default;
        WebView.SetWebContentsDebuggingEnabled(false);
        SetContentView(webView);
        webView.LoadUrl("https://appassets.local/career-mode/index.html");
    }

    public override void OnBackPressed()
    {
        if (webView?.CanGoBack() == true) webView.GoBack();
        else base.OnBackPressed();
    }

    protected override void OnDestroy()
    {
        webView?.Destroy();
        webView = null;
        base.OnDestroy();
    }
}

internal sealed class LocalContentClient : WebViewClient
{
    private readonly global::Android.Content.Context context;

    public LocalContentClient(global::Android.Content.Context context)
    {
        this.context = context;
    }

    public override WebResourceResponse? ShouldInterceptRequest(WebView? view, IWebResourceRequest? request)
    {
        var uri = request?.Url;
        if (uri is null || !string.Equals(uri.Host, "appassets.local", StringComparison.OrdinalIgnoreCase))
            return base.ShouldInterceptRequest(view, request);

        var requestedPath = global::System.Uri.UnescapeDataString(uri.Path ?? string.Empty).TrimStart('/');
        if (string.IsNullOrWhiteSpace(requestedPath)) requestedPath = "career-mode/index.html";
        requestedPath = requestedPath.Replace("..", string.Empty, StringComparison.Ordinal);
        var assetPath = "www/" + requestedPath;
        try
        {
            var stream = context.Assets?.Open(assetPath);
            if (stream is null) return NotFound();
            return new WebResourceResponse(MimeType(requestedPath), "UTF-8", stream);
        }
        catch
        {
            return NotFound();
        }
    }

    private static WebResourceResponse NotFound()
    {
        return new WebResourceResponse("text/plain", "UTF-8", new MemoryStream(Array.Empty<byte>()));
    }

    private static string MimeType(string requestedPath)
    {
        return global::System.IO.Path.GetExtension(requestedPath).ToLowerInvariant() switch
        {
            ".html" => "text/html",
            ".css" => "text/css",
            ".js" or ".mjs" => "text/javascript",
            ".json" or ".webmanifest" => "application/json",
            ".png" => "image/png",
            ".svg" => "image/svg+xml",
            ".ico" => "image/x-icon",
            _ => "application/octet-stream"
        };
    }
}