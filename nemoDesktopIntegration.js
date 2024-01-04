const Main = imports.ui.main
const { Gio, Meta, Shell, GLib } = imports.gi
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { WindowInitedHandler } = Me.imports.libs.utility

var NemoDesktopIntegration = class NemoDesktopIntegration {
	constructor() {}
	#nemo
	#settings
	#osdIcon
	#timeoutID
	#focus

	isShown() {
		return this.#nemo.get_string("desktop-layout") != "false::false"
	}

	show() {
		this.#nemo.set_string("desktop-layout","true::false")
		Main.osdWindowManager.show(
			-1,this.#osdIcon,
			'Desktop icon enabled',
			null,null,null
		)
	}
	hide() {
		this.#nemo.set_string("desktop-layout","false::false")
		Main.osdWindowManager.show(
			-1,this.#osdIcon,
			'Desktop icon disabled',
			null,null,null
		)
	}

	enable() {
		this.#nemo = new Gio.Settings({ schema: 'org.nemo.desktop' })
		this.#settings = ExtensionUtils.getSettings()
		Main.wm.addKeybinding(
			'qe-backgroundicon',
			this.#settings,
			Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => {
				if (this.#timeoutID) {
					GLib.source_remove(this.#timeoutID)
					this.#timeoutID = null
				}
				if (this.isShown()) {
					this.hide()
				} else {
					this.show()
					this.#timeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 15000, ()=>{
						this.hide()
						this.#timeoutID = null
						return GLib.SOURCE_REMOVE
					})
				}
			}
		)

		this.#focus = global.display.connect("notify::focus-window",()=>{
			const window = global.display.focus_window
			if (!window) return
			if (window.wm_class === "Nemo-desktop") {
				if (!this.#timeoutID) return
				if (!this.isShown()) return
				GLib.source_remove(this.#timeoutID)
				this.#timeoutID = null
			} else {
				if (this.#timeoutID) return
				if (!this.isShown()) return
				this.#timeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 12000, ()=>{
					this.hide()
					this.#timeoutID = null
					return GLib.SOURCE_REMOVE
				})
			}
		})

		this.#nemo.set_string("desktop-layout","false::false")
		this.#osdIcon = Gio.icon_new_for_string("user-desktop-symbolic")
	}

	disable() {
		if (this.#timeoutID) {
			GLib.source_remove(this.#timeoutID)
			this.#timeoutID = null
		}

		global.display.disconnect(this.#focus)
		this.#focus = null

		this.#osdIcon.run_dispose()
		this.#osdIcon = null

		this.#nemo.run_dispose()
		this.#nemo = null
		
		this.#settings.run_dispose()
		this.#settings = null

		Main.wm.removeKeybinding('qe-backgroundicon')
	}
}
