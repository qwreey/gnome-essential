const Main = imports.ui.main

var RemoveAppMenu = class RemoveAppMenu {
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
