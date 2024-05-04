import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class MoveDateMenu {
	constructor() {}
	#dateMenuActor

	enable() {
		this.#dateMenuActor = Main.panel.statusArea.dateMenu.get_parent()
		Main.panel.get_children()[1].remove_child(this.#dateMenuActor)
		Main.panel.get_children()[0].insert_child_at_index(this.#dateMenuActor,1)
	}

	disable() {
		Main.panel.get_children()[0].remove_child(this.#dateMenuActor)
		Main.panel.get_children()[1].insert_child_at_index(this.#dateMenuActor,0)
		this.#dateMenuActor = null
	}
}
