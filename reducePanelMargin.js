

const Main = imports.ui.main

var ReducePanelMargin = class ReducePanelMargin {
	constructor () {}

	async enable() {
		Main.uiGroup.add_style_class_name("QE-reduce-panel-margin")
	}

	async disable() {
		Main.uiGroup.remove_style_class_name("QE-reduce-panel-margin")
	}
}
