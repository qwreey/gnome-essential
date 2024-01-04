const { GLib, St, Clutter, Pango } = imports.gi
const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils

var PanelDateFormat = class PanelDateFormat {
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

		// FIXME: Set this.settings first time to make it visible in dconf Editor
		// if (!this.settings.get_string('format')) {
			// this.settings.set_string('format', '%Y.%m.%d %H:%M')
			// this.settings.set_string('format', '%m/%d %H:%M')
		// }

		this.originalClockDisplay.hide()
		this.originalClockDisplay.get_parent().insert_child_below(this.formatClockDisplay, this.originalClockDisplay)
		this.timeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, ()=>{
			this.tick(this)
			return GLib.SOURCE_REMOVE
		})
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
