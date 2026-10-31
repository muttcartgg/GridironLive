import UIKit
import WebKit
import GameController

/// Hosts the game (web/index.html, bundled in the app) full-screen in a WKWebView.
/// Saves live in UserDefaults through a small key-value bridge:
///   - on launch the small keys and the last-played slot are injected as `window.__NATIVE_KV__ = { key: value, ... }`;
///     every other saved key is only listed by name in `window.__NATIVE_KV_LAZY__` and served on demand:
///     `webkit.messageHandlers.kvget.postMessage({ id, keys })` is answered with `window.__kvReply(id, { key: value })`
///   - the game calls `webkit.messageHandlers.kv.postMessage({ k, v })` to write (empty v deletes)
/// Also: `window.__DEVICE__` (model identifier, screen size, safe areas) for the camera fit, `export` (Back up to Files),
/// `haptic`, and a GameController bridge that forwards controller state as `window.__NATIVE_PAD__`.
final class GameViewController: UIViewController, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let prefix = "gl.kv."
    private let legacyKey = "gridiron.dynasty.v1"
    /// Values up to this many UTF-16 units are injected at launch; bigger ones (other slots, backups, clips, roster packs) load on demand.
    private let eagerLimit = 16_384
    private var padTimer: Timer?
    private var lastPad = ""
    private var lastSize = CGSize.zero

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Stop iOS from treating a held finger as text selection: no loupe / magnifier
        // ("Liquid Glass" bubble), no callout menu, no link previews while you hold mid-play.
        if #available(iOS 14.5, *) { config.preferences.isTextInteractionEnabled = false }
        config.preferences.isFraudulentWebsiteWarningEnabled = false

        let content = WKUserContentController()
        content.addUserScript(WKUserScript(source: bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        content.add(WeakScriptHandler(self), name: "kv")
        content.add(WeakScriptHandler(self), name: "kvget")
        content.add(WeakScriptHandler(self), name: "haptic")
        content.add(WeakScriptHandler(self), name: "export")
        content.add(WeakScriptHandler(self), name: "device")
        let noSelect = "var s=document.createElement('style');s.textContent='html,body,canvas,div,span,button{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}input,textarea,select{-webkit-user-select:text!important;user-select:text!important}';document.documentElement.appendChild(s);document.addEventListener('contextmenu',function(e){e.preventDefault()},true);document.addEventListener('selectstart',function(e){var t=e.target;if(!(t&&t.closest&&t.closest('input,textarea')))e.preventDefault()},true);"
        content.addUserScript(WKUserScript(source: noSelect, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        config.userContentController = content

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.035, green: 0.047, blue: 0.07, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view = webView
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        disableLongPress(in: webView)
    }

    /// WKWebView installs long-press recognizers for selection, the magnifier and context menus.
    /// The game handles every touch itself, so turn them off.
    private func disableLongPress(in root: UIView) {
        for v in [root] + root.subviews + root.subviews.flatMap({ $0.subviews }) {
            for g in v.gestureRecognizers ?? [] where g is UILongPressGestureRecognizer {
                g.isEnabled = false
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            for v in self.webView.scrollView.subviews.flatMap({ [$0] + $0.subviews }) {
                for g in v.gestureRecognizers ?? [] where g is UILongPressGestureRecognizer { g.isEnabled = false }
            }
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        pushDeviceInfo()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if view.bounds.size != lastSize {
            lastSize = view.bounds.size
            pushDeviceInfo()
        }
    }

    /// Current size and safe-area insets (points) for the camera fit; the game re-fits on the resize event.
    private func pushDeviceInfo() {
        guard let webView = webView else { return }
        let i = view.safeAreaInsets
        let s = view.bounds.size
        let js = "window.__DEVICE__=Object.assign(window.__DEVICE__||{},{w:\(Int(s.width)),h:\(Int(s.height)),safe:{t:\(Int(i.top)),r:\(Int(i.right)),b:\(Int(i.bottom)),l:\(Int(i.left))}});window.dispatchEvent(new Event('resize'));"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        startPadBridge()
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            webView.loadHTMLString("<h1 style='color:white;font-family:sans-serif'>Game files missing from the app bundle.</h1>", baseURL: nil)
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    private func bootstrapScript() -> String {
        let defaults = UserDefaults.standard
        // The last-played slot (gl3.meta's "last") is injected in full so Continue opens instantly.
        var lastSlot = ""
        if let metaRaw = defaults.string(forKey: prefix + "gl3.meta"),
           let metaData = metaRaw.data(using: .utf8),
           let meta = (try? JSONSerialization.jsonObject(with: metaData, options: [])) as? [String: Any] {
            if let n = meta["last"] as? Int {
                lastSlot = String(n)
            } else if let t = meta["last"] as? String {
                lastSlot = t
            }
        }
        let eager: Set<String> = lastSlot.isEmpty ? [] : ["gl3.slot" + lastSlot, "gl3.live" + lastSlot]
        var store: [String: String] = [:]
        var lazy: [String] = []
        for (key, value) in defaults.dictionaryRepresentation() where key.hasPrefix(prefix) {
            guard let s = value as? String else { continue }
            let k = String(key.dropFirst(prefix.count))
            if s.utf16.count <= eagerLimit || eager.contains(k) {
                store[k] = s
            } else {
                lazy.append(k)
            }
        }
        var js = "window.__NATIVE_KV__ = \(Self.json(store, fallback: "{}"));"
        js += "window.__NATIVE_KV_LAZY__ = \(Self.json(lazy, fallback: "[]"));"
        js += "window.__DEVICE__ = \(Self.json(deviceInfo(), fallback: "{}"));"
        if let legacy = defaults.string(forKey: legacyKey), !legacy.isEmpty {
            js += "window.__NATIVE_SAVE__ = \(Self.jsString(legacy));"
        }
        return js
    }

    private func deviceInfo() -> DeviceInfo {
        let screen = UIScreen.main
        let size = screen.bounds.size
        return DeviceInfo(id: Self.machineId(), model: UIDevice.current.model, system: UIDevice.current.systemVersion,
                          w: Double(size.width), h: Double(size.height), scale: Double(screen.scale),
                          isPad: UIDevice.current.userInterfaceIdiom == .pad)
    }

    /// Hardware model identifier, e.g. "iPhone17,1" (the simulator reports the model it emulates).
    private static func machineId() -> String {
        if let sim = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"], !sim.isEmpty { return sim }
        var info = utsname()
        uname(&info)
        var id = ""
        for child in Mirror(reflecting: info.machine).children {
            if let value = child.value as? Int8, value != 0 {
                id.append(Character(UnicodeScalar(UInt8(bitPattern: value))))
            }
        }
        return id
    }

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let notify = UINotificationFeedbackGenerator()

    /// Taptic feedback requested by the game: light, medium, heavy, success, error.
    private func playHaptic(_ kind: String) {
        switch kind {
        case "heavy": heavy.impactOccurred()
        case "medium": medium.impactOccurred()
        case "success": notify.notificationOccurred(.success)
        case "error": notify.notificationOccurred(.error)
        default: light.impactOccurred()
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "haptic":
            playHaptic(message.body as? String ?? "light")
        case "kvget":
            answerKV(message.body)
        case "export":
            if let body = message.body as? [String: Any], let name = body["name"] as? String, let text = body["data"] as? String {
                exportFile(name: name, text: text)
            }
        case "device":
            pushDeviceInfo()
        case "kv":
            guard let body = message.body as? [String: Any], let key = body["k"] as? String else { return }
            let value = body["v"] as? String ?? ""
            if value.isEmpty {
                UserDefaults.standard.removeObject(forKey: prefix + key)
            } else {
                UserDefaults.standard.set(value, forKey: prefix + key)
            }
        default:
            break
        }
    }

    /// Saves that were not injected at launch, on request: { id, keys: [...] } → window.__kvReply(id, { key: value }).
    private func answerKV(_ body: Any) {
        guard let req = body as? [String: Any], let keys = req["keys"] as? [String] else { return }
        let id = (req["id"] as? Int) ?? 0
        var out: [String: String] = [:]
        for k in keys {
            out[k] = UserDefaults.standard.string(forKey: prefix + k) ?? ""
        }
        webView.evaluateJavaScript("window.__kvReply&&window.__kvReply(\(id),\(Self.json(out, fallback: "{}")))", completionHandler: nil)
    }

    /// Back up to Files: write the text to a temp file and open the system export sheet (iCloud Drive, On My iPhone...).
    private func exportFile(name: String, text: String) {
        var fileName = name.components(separatedBy: CharacterSet(charactersIn: "/:")).joined(separator: "-")
        if fileName.isEmpty { fileName = "GridironLive-backup.json" }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        do {
            try text.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            webView.evaluateJavaScript("window.toast&&toast('The backup file could not be written')", completionHandler: nil)
            return
        }
        let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
        picker.modalPresentationStyle = .formSheet
        (presentedViewController ?? self).present(picker, animated: true, completion: nil)
    }

    // MARK: - Game controllers (forwarded in case the web view does not expose the Gamepad API)

    private func startPadBridge() {
        NotificationCenter.default.addObserver(self, selector: #selector(padsChanged), name: .GCControllerDidConnect, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(padsChanged), name: .GCControllerDidDisconnect, object: nil)
        padsChanged()
    }

    @objc private func padsChanged() {
        let connected = GCController.controllers().contains { $0.extendedGamepad != nil }
        if connected && padTimer == nil {
            padTimer = Timer.scheduledTimer(timeInterval: 1.0 / 60.0, target: self, selector: #selector(pollPad), userInfo: nil, repeats: true)
        } else if !connected, let timer = padTimer {
            timer.invalidate()
            padTimer = nil
            lastPad = ""
            webView?.evaluateJavaScript("window.__NATIVE_PAD__=null", completionHandler: nil)
        }
    }

    /// Buttons in the Web Gamepad "standard" order (A B X Y LB RB LT RT select start L3 R3 up down left right home), sticks with y down.
    @objc private func pollPad() {
        guard let pad = GCController.controllers().first(where: { $0.extendedGamepad != nil })?.extendedGamepad else { return }
        func bit(_ b: GCControllerButtonInput?) -> String { return (b?.isPressed ?? false) ? "1" : "0" }
        let buttons: [String] = [bit(pad.buttonA), bit(pad.buttonB), bit(pad.buttonX), bit(pad.buttonY),
                                 bit(pad.leftShoulder), bit(pad.rightShoulder), bit(pad.leftTrigger), bit(pad.rightTrigger),
                                 bit(pad.buttonOptions), bit(pad.buttonMenu), bit(pad.leftThumbstickButton), bit(pad.rightThumbstickButton),
                                 bit(pad.dpad.up), bit(pad.dpad.down), bit(pad.dpad.left), bit(pad.dpad.right), bit(pad.buttonHome)]
        let sticks: [Float] = [pad.leftThumbstick.xAxis.value, -pad.leftThumbstick.yAxis.value,
                               pad.rightThumbstick.xAxis.value, -pad.rightThumbstick.yAxis.value]
        let axes: [String] = sticks.map { String(format: "%.2f", Double($0)) }
        let state = "{b:[" + buttons.joined(separator: ",") + "],a:[" + axes.joined(separator: ",") + "]}"
        if state == lastPad { return }
        lastPad = state
        webView?.evaluateJavaScript("window.__NATIVE_PAD__=" + state, completionHandler: nil)
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    private static func jsString(_ s: String) -> String {
        guard let data = try? JSONEncoder().encode(s), let lit = String(data: data, encoding: .utf8) else { return "\"\"" }
        return lit.replacingOccurrences(of: "\u{2028}", with: "\\u2028").replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }

    private static func json<T: Encodable>(_ value: T, fallback: String) -> String {
        guard let data = try? JSONEncoder().encode(value), let lit = String(data: data, encoding: .utf8) else { return fallback }
        return lit.replacingOccurrences(of: "\u{2028}", with: "\\u2028").replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }
}

/// What the camera fit needs to know about this device (window.__DEVICE__).
private struct DeviceInfo: Encodable {
    let id: String
    let model: String
    let system: String
    let w: Double
    let h: Double
    let scale: Double
    let isPad: Bool
}

/// Avoids a retain cycle between WKUserContentController and the view controller.
private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}
