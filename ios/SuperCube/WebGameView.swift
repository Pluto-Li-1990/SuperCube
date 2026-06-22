import SwiftUI
import WebKit

struct WebGameView: UIViewRepresentable {
    private static let fallbackURL = URL(string: "https://super-cube-rho.vercel.app")!

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = true
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            let webDirectoryURL = indexURL.deletingLastPathComponent()
            context.coordinator.startLocalLoadTimeout(for: webView)
            webView.loadFileURL(indexURL, allowingReadAccessTo: webDirectoryURL)
        } else {
            assertionFailure("Missing Web/index.html in app bundle.")
            context.coordinator.loadFallback(in: webView)
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private var fallbackTimer: Timer?
        private var didLoadFallback = false

        func startLocalLoadTimeout(for webView: WKWebView) {
            fallbackTimer?.invalidate()
            fallbackTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { [weak self, weak webView] _ in
                guard let self, let webView else { return }
                self.loadFallback(in: webView)
            }
        }

        func loadFallback(in webView: WKWebView) {
            guard !didLoadFallback else { return }
            didLoadFallback = true
            fallbackTimer?.invalidate()
            fallbackTimer = nil
            webView.load(URLRequest(url: WebGameView.fallbackURL))
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            fallbackTimer?.invalidate()
            fallbackTimer = nil
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            loadFallback(in: webView)
        }
    }
}
