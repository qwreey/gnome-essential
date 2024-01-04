
const Main = imports.ui.main;
const Dash = Main.overview.dash;

var RemoveDash = class RemoveDash {
	constructor() {
	}

	enable() {
		Dash.visible = false
		this.height = Dash.height
		Dash.height = 80
	}

	disable() {
		Dash.visible = true
		Dash.height = this.height
	}
}
