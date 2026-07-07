import SwiftUI
import UIKit
import WebKit

struct WebGameView: UIViewRepresentable {
    private static let fallbackURL = URL(string: "https://super-cube-rho.vercel.app")!

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.installStatusOverlay(on: webView)

        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            let webDirectoryURL = indexURL.deletingLastPathComponent()
            context.coordinator.startLoading(message: "正在加载本地 SuperCube...")
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
        private var revealTimer: Timer?
        private var timeoutTimer: Timer?
        private var didLoadFallback = false
        private weak var loadingView: UIActivityIndicatorView?
        private weak var statusLabel: UILabel?
        private weak var errorLabel: UILabel?
        private weak var retryButton: UIButton?
        private weak var webView: WKWebView?

        func installStatusOverlay(on webView: WKWebView) {
            self.webView = webView

            let loadingView = UIActivityIndicatorView(style: .large)
            loadingView.translatesAutoresizingMaskIntoConstraints = false
            loadingView.color = .white
            loadingView.startAnimating()
            webView.addSubview(loadingView)

            let statusLabel = UILabel()
            statusLabel.translatesAutoresizingMaskIntoConstraints = false
            statusLabel.textColor = UIColor.white.withAlphaComponent(0.82)
            statusLabel.font = .systemFont(ofSize: 14, weight: .medium)
            statusLabel.numberOfLines = 0
            statusLabel.textAlignment = .center
            webView.addSubview(statusLabel)

            let errorLabel = UILabel()
            errorLabel.translatesAutoresizingMaskIntoConstraints = false
            errorLabel.textColor = .white
            errorLabel.font = .systemFont(ofSize: 14, weight: .medium)
            errorLabel.numberOfLines = 0
            errorLabel.textAlignment = .center
            errorLabel.isHidden = true
            webView.addSubview(errorLabel)

            let retryButton = UIButton(type: .system)
            retryButton.translatesAutoresizingMaskIntoConstraints = false
            retryButton.setTitle("重新加载", for: .normal)
            retryButton.setTitleColor(.white, for: .normal)
            retryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
            retryButton.backgroundColor = UIColor.white.withAlphaComponent(0.18)
            retryButton.layer.cornerRadius = 12
            retryButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 18, bottom: 10, right: 18)
            retryButton.isHidden = true
            retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
            webView.addSubview(retryButton)

            NSLayoutConstraint.activate([
                loadingView.centerXAnchor.constraint(equalTo: webView.centerXAnchor),
                loadingView.centerYAnchor.constraint(equalTo: webView.centerYAnchor),

                statusLabel.topAnchor.constraint(equalTo: loadingView.bottomAnchor, constant: 18),
                statusLabel.leadingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.leadingAnchor, constant: 24),
                statusLabel.trailingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.trailingAnchor, constant: -24),

                errorLabel.leadingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.leadingAnchor, constant: 24),
                errorLabel.trailingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.trailingAnchor, constant: -24),
                errorLabel.centerYAnchor.constraint(equalTo: webView.centerYAnchor),

                retryButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 18),
                retryButton.centerXAnchor.constraint(equalTo: webView.centerXAnchor)
            ])

            self.loadingView = loadingView
            self.statusLabel = statusLabel
            self.errorLabel = errorLabel
            self.retryButton = retryButton
        }

        func startLoading(message: String) {
            revealTimer?.invalidate()
            timeoutTimer?.invalidate()
            errorLabel?.isHidden = true
            retryButton?.isHidden = true
            statusLabel?.text = message
            statusLabel?.isHidden = false
            loadingView?.startAnimating()

            revealTimer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: false) { [weak self] _ in
                self?.hideLoadingOverlay()
            }

            timeoutTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { [weak self] _ in
                self?.showTimeoutIfNeeded()
            }
        }

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
            startLoading(message: "正在加载在线 SuperCube...")
            var request = URLRequest(url: WebGameView.fallbackURL)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.timeoutInterval = 15
            webView.load(request)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            fallbackTimer?.invalidate()
            fallbackTimer = nil
            revealTimer?.invalidate()
            timeoutTimer?.invalidate()
            hideLoadingOverlay()
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            if didLoadFallback {
                showMessage("SuperCube 加载失败\n\(error.localizedDescription)")
            } else {
                loadFallback(in: webView)
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            showMessage("SuperCube 加载失败\n\(error.localizedDescription)")
        }

        private func hideLoadingOverlay() {
            loadingView?.stopAnimating()
            statusLabel?.isHidden = true
        }

        private func showTimeoutIfNeeded() {
            guard let webView else { return }
            webView.evaluateJavaScript("document.readyState") { [weak self] result, _ in
                guard let self else { return }
                let readyState = result as? String ?? "unknown"
                if readyState == "complete" || readyState == "interactive" {
                    self.hideLoadingOverlay()
                    return
                }
                self.showMessage("SuperCube 加载超时\n网页没有完成渲染。\nreadyState: \(readyState)")
            }
        }

        private func showMessage(_ message: String) {
            fallbackTimer?.invalidate()
            revealTimer?.invalidate()
            timeoutTimer?.invalidate()
            loadingView?.stopAnimating()
            statusLabel?.isHidden = true
            errorLabel?.text = message
            errorLabel?.isHidden = false
            retryButton?.isHidden = false
        }

        @objc private func retryTapped() {
            guard let webView else { return }
            didLoadFallback = false
            webView.stopLoading()
            if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
                let webDirectoryURL = indexURL.deletingLastPathComponent()
                startLoading(message: "正在加载本地 SuperCube...")
                startLocalLoadTimeout(for: webView)
                webView.loadFileURL(indexURL, allowingReadAccessTo: webDirectoryURL)
            } else {
                loadFallback(in: webView)
            }
        }
    }
}
