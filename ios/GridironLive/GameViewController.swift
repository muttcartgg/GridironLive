import UIKit
import WebKit

/// Hosts the game (web/index.html, bundled in the app) full-screen in a WKWebView.
/// The dynasty save is kept in UserDefaults through a tiny JS bridge:
///   - on launch the saved JSON is injected as `window.__NATIVE_SAVE__`
///   - the game calls `webkit.messageHandlers.store.postMessage(json)` to save
final class GameViewController: UIViewController, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let saveKey = "gridiron.dynasty.v1"

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let content = WKUserContentController()
        let saved = UserDefaults.standard.string(forKey: saveKey) ?? ""
        content.addUserScript(WKUserScript(source: "window.__NATIVE_SAVE__ = \(Self.jsString(saved));",
                                           injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        content.add(WeakScriptHandler(self), name: "store")
        config.userContentController = content

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.04, green: 0.05, blue: 0.08, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            webView.loadHTMLString("<h1 style='color:white;font-family:sans-serif'>Game files missing from the app bundle.</h1>", baseURL: nil)
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "store", let json = message.body as? String else { return }
        if json.isEmpty {
            UserDefaults.standard.removeObject(forKey: saveKey)
        } else {
            UserDefaults.standard.set(json, forKey: saveKey)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    /// Encodes a Swift string as a JavaScript string literal.
    private static func jsString(_ s: String) -> String {
        guard let data = try? JSONEncoder().encode(s), let lit = String(data: data, encoding: .utf8) else { return "\"\"" }
        return lit
            .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
            .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }
}

/// Avoids a retain cycle between WKUserContentController and the view controller.
private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}
