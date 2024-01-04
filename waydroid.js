const Main = imports.ui.main
const { Meta } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { WindowInitedHandler, Unresizabler } = Me.imports.libs.utility

var Waydroid = class Waydroid {
	constructor() {}

	initWindow(window) {
		window._noAnimation_size = true
		window._unresizabler = true
		{
			const rect = window.get_frame_rect()
			window.savedX = rect.x
			window.savedY = rect.y
			window.savedWidth = rect.width
			window.savedHeight = rect.height
		}
		window._unresizabler_positionsave = window.connect("position-changed",()=>{
			const rect = window.get_frame_rect()
			if (rect.width != window.savedWidth || rect.height != window.savedHeight) return
			window.savedX = rect.x
			window.savedY = rect.y
		})
		window._unresizabler_resizer = window.connect("size-changed",()=>{
			if (window._unresizabler_change) return
			const rect = window.get_frame_rect()
			if (rect.width == window.savedWidth && rect.height == window.savedHeight) {
				window.savedX = rect.x
				window.savedY = rect.y
				return
			}
			window._unresizabler_change = true
			if (window.get_maximized()) window.unmaximize(Meta.MaximizeFlags.BOTH)
			window.move_resize_frame(false, window.savedX ?? rect.x, window.savedY ?? rect.y, window.savedWidth, window.savedHeight)
			window.maximize(Meta.MaximizeFlags.BOTH)
			window.unmaximize(Meta.MaximizeFlags.BOTH)
			window._unresizabler_change = false
		})
		window._globalGrabBeginConnection = global.display.connect('grab-op-begin', (d, win, op) => {
			if (window != win) return
			if (!Unresizabler.resizeOps.includes(op)) return
			window._unresizabler_freeze = true
			window.freeze()
		})
		window._globalGrabBeginConnection = global.display.connect('grab-op-end', (d, win, op) => {
			if (window != win) return
			if (!window._unresizabler_freeze) return
			window._unresizabler_freeze = null
			window.thaw()
		})
	}

	uninitWindow(window) {
		window._unresizabler_freeze = null
		global.display.disconnect(window._globalGrabConnection)
		window._globalGrabBeginConnection = null
		window._noAnimation_size = null
		let resizer = window._unresizabler_resizer
		if (resizer) window.disconnect(resizer)
		let positionsave = window._unresizabler_positionsave
		if (positionsave) window.disconnect(positionsave)
		window._unresizabler_change = null
		window._unresizabler = null
	}

	enable() {
		this.windowInitedHandler = new WindowInitedHandler("Waydroid")
			.setInitWindowHandler(this.initWindow.bind(this))
			.setUninitWindowHandler(this.uninitWindow.bind(this))
			.setFilter(window=>window.get_wm_class() == "Weston Compositor")
			.init()
	}

	disable() {
		this.windowInitedHandler.dispose()
	}
}
