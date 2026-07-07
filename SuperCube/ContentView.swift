import UIKit
import WebKit

final class SuperCubeViewController: UIViewController, WKNavigationDelegate {
    private let url = URL(string: "https://super-cube-rho.vercel.app")!
    private var webView: WKWebView!
    private let loadingView = UIActivityIndicatorView(style: .large)
    private let statusLabel = UILabel()
    private let errorLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private var softRevealWorkItem: DispatchWorkItem?
    private var hardTimeoutWorkItem: DispatchWorkItem?
    private var loadID = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.backgroundColor = .black
        webView.isOpaque = false
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        view.addSubview(webView)
        self.webView = webView

        loadingView.translatesAutoresizingMaskIntoConstraints = false
        loadingView.color = .white
        loadingView.startAnimating()
        view.addSubview(loadingView)

        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.text = "正在加载 SuperCube..."
        statusLabel.textColor = UIColor.white.withAlphaComponent(0.8)
        statusLabel.font = .systemFont(ofSize: 14, weight: .medium)
        statusLabel.textAlignment = .center
        view.addSubview(statusLabel)

        errorLabel.translatesAutoresizingMaskIntoConstraints = false
        errorLabel.textColor = .white
        errorLabel.font = .systemFont(ofSize: 14, weight: .medium)
        errorLabel.numberOfLines = 0
        errorLabel.textAlignment = .center
        errorLabel.isHidden = true
        view.addSubview(errorLabel)

        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.setTitle("重新加载", for: .normal)
        retryButton.setTitleColor(.white, for: .normal)
        retryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        retryButton.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        retryButton.layer.cornerRadius = 12
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 18, bottom: 10, right: 18)
        retryButton.isHidden = true
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        view.addSubview(retryButton)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            loadingView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingView.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            statusLabel.topAnchor.constraint(equalTo: loadingView.bottomAnchor, constant: 18),
            statusLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),

            errorLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            errorLabel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            errorLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),

            retryButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 18),
            retryButton.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])

        loadGame()
    }

    private func loadGame() {
        loadID += 1
        let currentLoadID = loadID
        softRevealWorkItem?.cancel()
        hardTimeoutWorkItem?.cancel()
        errorLabel.isHidden = true
        retryButton.isHidden = true
        statusLabel.isHidden = false
        loadingView.startAnimating()
        print("SuperCube loading: \(url.absoluteString)")

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 15
        webView.load(request)

        let softReveal = DispatchWorkItem { [weak self] in
            guard let self, self.loadID == currentLoadID else { return }
            self.loadingView.stopAnimating()
            self.statusLabel.isHidden = true
        }
        softRevealWorkItem = softReveal
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: softReveal)

        let hardTimeout = DispatchWorkItem { [weak self] in
            guard let self, self.loadID == currentLoadID else { return }
            self.webView.evaluateJavaScript("document.readyState") { result, _ in
                let readyState = result as? String ?? "unknown"
                if readyState == "complete" || readyState == "interactive" {
                    self.loadingView.stopAnimating()
                    self.statusLabel.isHidden = true
                    return
                }
                self.showMessage("SuperCube 加载超时\n当前网络可以访问 App，但网页没有完成渲染。\nreadyState: \(readyState)")
            }
        }
        hardTimeoutWorkItem = hardTimeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: hardTimeout)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        softRevealWorkItem?.cancel()
        hardTimeoutWorkItem?.cancel()
        loadingView.stopAnimating()
        statusLabel.isHidden = true
        errorLabel.isHidden = true
        retryButton.isHidden = true
        print("SuperCube loaded")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    private func show(_ error: Error) {
        softRevealWorkItem?.cancel()
        hardTimeoutWorkItem?.cancel()
        showMessage("SuperCube failed to load\n\(error.localizedDescription)")
    }

    private func showMessage(_ message: String) {
        loadingView.stopAnimating()
        statusLabel.isHidden = true
        errorLabel.text = message
        errorLabel.isHidden = false
        retryButton.isHidden = false
    }

    @objc private func retryTapped() {
        webView.stopLoading()
        loadGame()
    }
}
