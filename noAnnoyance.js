const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils

class StealMyFocus {
	constructor() {
		this._windowDemandsAttentionId = global.display.connect('window-demands-attention', this._onWindowDemandsAttention.bind(this))
		this._windowMarkedUrgentId = global.display.connect('window-marked-urgent', this._onWindowDemandsAttention.bind(this))
	}

	_onWindowDemandsAttention(display, window) {
		if (!window || window.has_focus() || window.is_skip_taskbar()) return
	}

	destroy() {
		global.display.disconnect(this._windowDemandsAttentionId)
		global.display.disconnect(this._windowMarkedUrgentId)
	}
}

var NoAnnoyance = class NoAnnoyance {
	constructor() {}

	enable() {
		global.display.disconnect(Main.windowAttentionHandler._windowDemandsAttentionId)
		global.display.disconnect(Main.windowAttentionHandler._windowMarkedUrgentId)
		this.oldHandler = Main.windowAttentionHandler
		
		this.stealmyfocus = new StealMyFocus()
		
		Main.windowAttentionHandler = this.stealmyfocus
	}
	
	disable() {
		this.stealmyfocus.destroy()
		this.stealmyfocus = null

		this.oldHandler._windowDemandsAttentionId = global.display.connect('window-demands-attention', this.oldHandler._onWindowDemandsAttention.bind(this.oldHandler))
		this.oldHandler._windowMarkedUrgentId = global.display.connect('window-marked-urgent', this.oldHandler._onWindowDemandsAttention.bind(this.oldHandler))

		Main.windowAttentionHandler = this.oldHandler
	}
}
