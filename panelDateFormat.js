import GLib from "gi://GLib"
import St from "gi://St"
import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class PanelDateFormat {
	constructor() {}

	/**
	 * Enable, called when extension is enabled or when screen is unlocked.
	 */
	enable() {
		this.originalClockDisplay = Main.panel.statusArea.dateMenu._clockDisplay
		this.formatClockDisplay = new St.Label({ style_class: 'clock' })
		this.formatClockDisplay.clutter_text.y_align = Clutter.ActorAlign.CENTER
		this.formatClockDisplay.clutter_text.ellipsize = Pango.EllipsizeMode.NONE
		// this.settings = ExtensionUtils.getSettings()

		this.originalClockDisplay.hide()
		this.originalClockDisplay.get_parent().insert_child_below(this.formatClockDisplay, this.originalClockDisplay)
		const timer = ()=>{
			this.tick(this)
			this.timeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, timer)
			return GLib.SOURCE_REMOVE
		}
		timer()
	}

	/**
	 * Disable, called when extension is disabled or when screen is locked.
	 */
	disable() {
		GLib.Source.remove(this.timeoutID)
		this.timeoutID = 0
		this.originalClockDisplay.get_parent().remove_child(this.formatClockDisplay)
		this.originalClockDisplay.show()
		this.settings = null
		this.formatClockDisplay = null
	}

	/**
	 * It runs every time we need to update clock.
	 * @return {boolean} Always returns true to loop.
	 */
	tick() {
		const format = "%m/%d %H:%M"
		// const format = this.settings.get_string('format')
		this.formatClockDisplay.set_text(new Date().toLocaleFormat(format))

		return true
	}
}
