
import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class TransparentPanel {
	constructor () {}

	enable() {
		Main.panel.add_style_class_name("QE-transparent-panel")
	}

	disable() {
		Main.panel.remove_style_class_name("QE-transparent-panel")
	}
}
