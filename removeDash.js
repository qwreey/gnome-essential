import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class RemoveDash {
	constructor() {
	}

	enable() {
		this.dash = Main.overview.dash
		this.dash.visible = false
		this.height = this.dash.height
		this.dash.height = 80
	}

	disable() {
		this.dash.visible = true
		this.dash.height = this.height
		this.dash = null
	}
}
