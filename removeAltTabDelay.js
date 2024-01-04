const SwitcherPopup = imports.ui.switcherPopup
var RemoveAltTabDelay = class RemoveAltTabDelay {
	constructor() {}
	enable() {
		this.old = SwitcherPopup.POPUP_DELAY_TIMEOUT
		SwitcherPopup.POPUP_DELAY_TIMEOUT = 0
	}
	disable() {
		SwitcherPopup.POPUP_DELAY_TIMEOUT = this.old
	}
}
