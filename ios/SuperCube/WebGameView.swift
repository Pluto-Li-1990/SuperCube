import SwiftUI
import WebKit

struct WebGameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
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
            webView.loadFileURL(indexURL, allowingReadAccessTo: webDirectoryURL)
        } else {
            assertionFailure("Missing Web/index.html in app bundle.")
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
