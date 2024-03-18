const SwitcherPopup = imports.ui.switcherPopup

export class RemoveAltTabDelay {
	constructor() {}
	enable() {
		this.old = SwitcherPopup.POPUP_DELAY_TIMEOUT
		SwitcherPopup.POPUP_DELAY_TIMEOUT = 0
	}
	disable() {
		SwitcherPopup.POPUP_DELAY_TIMEOUT = this.old
	}
}

// In gnome 45.5, this is not required.