import * as Main from "resource:///org/gnome/shell/ui/main.js"
import { ControlsState } from "resource:///org/gnome/shell/ui/overviewControls.js"

export class StartupNoOverview {
	constructor() {}
	enable() {
		this.oldHasOverview = Main.sessionMode.hasOverview
		this.oldStartInOverview = Main.layoutManager.startInOverview
		this.oldControlsState = Main.overview._overview.controls._stateAdjustment.value

		Main.sessionMode.hasOverview = false
		Main.layoutManager.startInOverview = false
		Main.overview._overview.controls._stateAdjustment.value = ControlsState.HIDDEN
	}
	disable() {
		Main.sessionMode.hasOverview = this.oldHasOverview
		Main.layoutManager.startInOverview = this.oldStartInOverview
		Main.overview._overview.controls._stateAdjustment.value = this.oldControlsState
	}
}
