import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class RemoveAppMenu {
	constructor () {}
	#container
	#signalShow

	enable() {
		this.#container = Main.panel.statusArea.appMenu
		this.#signalShow = this.#container.connect("show",this.#container.hide.bind(this.#container))
		this.#container.hide()
	}

	disable() {
		this.#container.disconnect(this.#signalShow)
		this.#container.show()
		this.#container = this.#signalShow = null
	}
}
