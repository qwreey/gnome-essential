
const Main = imports.ui.main

var TransparentPanel = class TransparentPanel {
	constructor () {}

	enable() {
		Main.panel.add_style_class_name("QE-transparent-panel")
	}

	disable() {
		Main.panel.remove_style_class_name("QE-transparent-panel")
	}
}
