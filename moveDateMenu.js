
const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu

var MoveDateMenu = class MoveDateMenu {
	constructor() {}
	#dateMenuActor

	enable() {
		this.#dateMenuActor = Main.panel.statusArea.dateMenu.get_parent()
		this.#dateMenuActor.get_parent().remove_child(this.#dateMenuActor)
		Main.panel.get_children()[0].insert_child_at_index(this.#dateMenuActor,1)
	}

	disable() {
		this.#dateMenuActor.get_parent().remove_child(this.#dateMenuActor)
		Main.panel.get_children()[1].insert_child_at_index(this.#dateMenuActor,0)
		this.#dateMenuActor = null
	}
}
