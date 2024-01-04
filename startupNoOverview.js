


const Main = imports.ui.main
const ControlsState = imports.ui.overviewControls.ControlsState

var StartupNoOverview = class StartupNoOverview {
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
