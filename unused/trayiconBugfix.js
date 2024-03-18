const { Meta } = imports.gi
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { WindowInitedHandler } = Me.imports.libs.utility

var TrayiconBugfix = class TrayiconBugfix {
    constructor() {}
    isIcon(window) {
        return (
            window.skip_taskbar == true
            && window.window_type == Meta.WindowType.OVERRIDE_OTHER
            && window.wm_class == "Gnome-shell"
            && window.title == "gnome-shell"
            && window.allows_move() == false
            && window.resizeable == false
            && window.can_minimize() == false
            && window.can_maximize() == false
            && window.can_close() == false
            && window.can_shade() == false
        )
    }

    initWindow(window) {
        window.get_compositor_private().scale_x = 0
    }

    uninitWindow(window) {
        window.get_compositor_private().scale_x = 1
    }

    enable() {
        this.windowInitedHandler = new WindowInitedHandler()
			.setInitWindowHandler(this.initWindow.bind(this))
			.setUninitWindowHandler(this.uninitWindow.bind(this))
			.setFilter(window=>this.isIcon(window))
            .useMap()
			.init()
    }
    disable() {
        this.windowInitedHandler.dispose()
    }
}
