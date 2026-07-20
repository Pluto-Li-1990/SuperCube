import UIKit
import WebKit

final class SuperCubeViewController: UIViewController, WKNavigationDelegate {
    private let remoteURL = URL(string: "https://super-cube-rho.vercel.app")!
    private var webView: WKWebView!
    private let loadingView = UIActivityIndicatorView(style: .large)
    private let statusLabel = UILabel()
    private let errorLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private var hardTimeoutWorkItem: DispatchWorkItem?
    private var renderCheckWorkItem: DispatchWorkItem?
    private var loadID = 0
    private var loadingLocalWeb = false

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
        if let indexURL = bundledIndexURL() {
            let webRootURL = indexURL.deletingLastPathComponent()
            prepareForLoad(message: "正在加载本地 SuperCube...", loadingLocalWeb: true)
            print("SuperCube loading local: \(indexURL.absoluteString)")
            webView.loadFileURL(indexURL, allowingReadAccessTo: webRootURL)
            scheduleTimeout(seconds: 6)
            return
        }

        loadRemote(reason: "Local Web bundle missing")
    }

    private func bundledIndexURL() -> URL? {
        if let nestedURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            return nestedURL
        }
        return Bundle.main.url(forResource: "index", withExtension: "html")
    }

    private func loadRemote(reason: String) {
        prepareForLoad(message: "正在加载在线 SuperCube...", loadingLocalWeb: false)
        print("SuperCube loading remote: \(remoteURL.absoluteString), reason: \(reason)")

        var request = URLRequest(url: remoteURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 20
        webView.load(request)
        scheduleTimeout(seconds: 15)
    }

    private func prepareForLoad(message: String, loadingLocalWeb: Bool) {
        loadID += 1
        hardTimeoutWorkItem?.cancel()
        renderCheckWorkItem?.cancel()
        self.loadingLocalWeb = loadingLocalWeb
        errorLabel.isHidden = true
        retryButton.isHidden = true
        statusLabel.text = message
        statusLabel.isHidden = false
        loadingView.startAnimating()
    }

    private func scheduleTimeout(seconds: TimeInterval) {
        let currentLoadID = loadID
        let hardTimeout = DispatchWorkItem { [weak self] in
            guard let self, self.loadID == currentLoadID else { return }
            self.webView.evaluateJavaScript("document.readyState") { [weak self] result, _ in
                guard let self, self.loadID == currentLoadID else { return }
                let readyState = result as? String ?? "unknown"
                if readyState == "complete" || readyState == "interactive" {
                    self.checkRenderedPage(loadID: currentLoadID)
                    return
                }
                if self.loadingLocalWeb {
                    self.loadRemote(reason: "Local Web timeout, readyState: \(readyState)")
                } else {
                    self.showMessage("SuperCube 加载超时\n当前网络可以访问 App，但在线页面没有完成渲染。\nreadyState: \(readyState)")
                }
            }
        }
        hardTimeoutWorkItem = hardTimeout
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: hardTimeout)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        hardTimeoutWorkItem?.cancel()
        let currentLoadID = loadID
        let renderCheck = DispatchWorkItem { [weak self] in
            self?.checkRenderedPage(loadID: currentLoadID)
        }
        renderCheckWorkItem = renderCheck
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: renderCheck)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    private func show(_ error: Error) {
        hardTimeoutWorkItem?.cancel()
        renderCheckWorkItem?.cancel()
        if loadingLocalWeb {
            loadRemote(reason: "Local Web failed: \(error.localizedDescription)")
        } else {
            showMessage("SuperCube failed to load\n\(error.localizedDescription)")
        }
    }

    private func checkRenderedPage(loadID currentLoadID: Int) {
        guard loadID == currentLoadID else { return }
        let script = """
        (() => {
          const app = document.getElementById('app');
          return Boolean(app && app.childNodes && app.childNodes.length > 0);
        })()
        """
        webView.evaluateJavaScript(script) { [weak self] result, _ in
            guard let self, self.loadID == currentLoadID else { return }
            let rendered = result as? Bool ?? false
            if rendered {
                self.loadingView.stopAnimating()
                self.statusLabel.isHidden = true
                self.errorLabel.isHidden = true
                self.retryButton.isHidden = true
                print("SuperCube rendered: \(self.loadingLocalWeb ? "local" : "remote")")
                return
            }

            if self.loadingLocalWeb {
                self.loadRemote(reason: "Local Web finished but app root is empty")
            } else {
                self.showMessage("SuperCube 页面已加载，但没有渲染内容。\n请检查网络，或稍后点击重新加载。")
            }
        }
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
