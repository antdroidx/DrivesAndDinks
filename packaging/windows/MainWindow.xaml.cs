using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace DrivesAndDinks.Windows;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadCareerAsync();
    }

    private async Task LoadCareerAsync()
    {
        await Browser.EnsureCoreWebView2Async();
        var webRoot = Path.Combine(AppContext.BaseDirectory, "www");
        Browser.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "app.local",
            webRoot,
            CoreWebView2HostResourceAccessKind.DenyCors);
        Browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
        Browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        Browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
        Browser.Source = new Uri("https://app.local/career-mode/index.html");
    }
}