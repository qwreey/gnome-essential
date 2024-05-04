
import {
	Pannel,
	Maid,
} from "./libs/utility.js"

import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class ReorderPannel {
	constructor() {}
	/** @type { Maid } */
	#maid

	enable() {
		const maid = this.#maid = new Maid()

		// left pannel
		maid.functionJob(
			Pannel.add(
				(item)=>item.first_child.style_class == "panel-button space-bar",
				Pannel.Left,
				3,
				"spacebar"
			)
		)
		maid.functionJob(
			Pannel.add(
				Main.panel.statusArea.dateMenu.container,
				Pannel.Left,
				4,
				"datemenu"
			)
		)
		maid.functionJob(
			Pannel.add(
				(item)=>item.first_child.constructor.name == "TopHatContainer",
				Pannel.Left,
				5,
				"tophat"
			)
		)
		Pannel.reorder()
	}

	disable() {
		this.#maid.clean()
		this.#maid = null
	}
}
