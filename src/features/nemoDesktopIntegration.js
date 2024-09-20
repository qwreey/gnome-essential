import Meta from "gi://Meta"
import GLib from "gi://GLib"
import Shell from "gi://Shell"
import Gio from "gi://Gio"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

import {
	delay,
	EmptyDelay,
	Maid
} from "../libs/utility.js"

export class NemoDesktopIntegration {
	constructor() { }
	#maid
	#nemo
	#settings
	#osdIcon
	#timeout

	isShown() {
		return this.#nemo.get_string("desktop-layout") != "false::false"
	}

	show(noOsd) {
		this.#nemo.set_string("desktop-layout", "true::false")
		if (noOsd) return
		Main.osdWindowManager.show(
			-1, this.#osdIcon,
			'Desktop icon enabled',
			null, null, null
		)
	}

	hide(noOsd) {
		this.#nemo.set_string("desktop-layout", "false::false")
		if (noOsd) return
		Main.osdWindowManager.show(
			-1, this.#osdIcon,
			'Desktop icon disabled',
			null, null, null
		)
	}

	enable(extension) {
		const maid = this.#maid = new Maid()
		this.#timeout = EmptyDelay
		this.#nemo = new Gio.Settings({ schema: 'org.nemo.desktop' })
		this.#settings = extension.getSettings()
		this.#osdIcon = Gio.icon_new_for_string("user-desktop-symbolic")
		maid.runDisposeJob(this.#nemo)
		maid.runDisposeJob(this.#settings)
		maid.runDisposeJob(this.#osdIcon)

		// Spawn nemo desktop
		this.hide(true)
		const spawn = delay(3000, () => {
			GLib.spawn_async(null, ['nemo-desktop'], null, GLib.SpawnFlags.SEARCH_PATH, null)
		})
		maid.functionJob(spawn.stop.bind(spawn))

		// Add keybinding
		Main.wm.addKeybinding(
			'qe-backgroundicon',
			this.#settings,
			Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => {
				this.#timeout.stop()
				if (this.isShown()) {
					this.hide()
				} else {
					this.show()
					this.#timeout = delay(15000, this.hide.bind(this))
				}
			}
		)

		// Create timeout when focus another window
		maid.connectJob(global.display, "notify::focus-window", () => {
			const window = global.display.focus_window
			if (!window) return
			if (window.wm_class === "Nemo-desktop") {
				this.#timeout.stop()
			} else {
				if (!this.#timeout.isOngoing()) return
				if (!this.isShown()) return
				this.#timeout = delay(12000, this.hide.bind(this))
			}
		})
	}

	disable() {
		this.#maid.destroy()
		this.#timeout.stop()

		this.#settings = this.#nemo = this.#osdIcon = this.#maid = this.#timeout = null

		Main.wm.removeKeybinding('qe-backgroundicon')
	}
}
