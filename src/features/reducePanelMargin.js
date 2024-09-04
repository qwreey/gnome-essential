
import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class ReducePanelMargin {
	constructor () {}

	async enable() {
		Main.uiGroup.add_style_class_name("QE-reduce-panel-margin")
	}

	async disable() {
		Main.uiGroup.remove_style_class_name("QE-reduce-panel-margin")
	}
}
