
var AnimationSpeed = class AnimationSpeed {
	constructor() {
	}

	enable() {
		this.WORKSPACE_SWITCH_TIME = imports.ui.workspacesView.WORKSPACE_SWITCH_TIME
		this.SIDE_CONTROLS_ANIMATION_TIME = imports.ui.overviewControls.SIDE_CONTROLS_ANIMATION_TIME
		this.ANIMATION_TIME = imports.ui.overview.ANIMATION_TIME
	
		// imports.ui.workspacesView.WORKSPACE_SWITCH_TIME = 500
		// imports.ui.overviewControls.SIDE_CONTROLS_ANIMATION_TIME = 
		// imports.ui.overview.ANIMATION_TIME = 1000
	}

	disable() {
		imports.ui.workspacesView.WORKSPACE_SWITCH_TIME = this.WORKSPACE_SWITCH_TIME
		imports.ui.overviewControls.SIDE_CONTROLS_ANIMATION_TIME = this.SIDE_CONTROLS_ANIMATION_TIME
		imports.ui.overview.ANIMATION_TIME = this.ANIMATION_TIME
	}
}
