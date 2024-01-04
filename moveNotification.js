const XY_POSITION = {
	TOP_START: 0,
	TOP_CENTER: 1,
	TOP_END: 2,
	BOTTOM_START: 3,
	BOTTOM_CENTER: 4,
	BOTTOM_END: 5,
	CENTER_START: 6,
	CENTER_CENTER: 7,
	CENTER_END: 8,
}

const Main = imports.ui.main
const messageTrayClass = imports.ui.messageTray
const { Clutter } = imports.gi

var MoveNotification = class MoveNotification {
	constructor() {
		this._originals = {}
	}

	notificationBannerPositionSet(pos) {
		let messageTray = Main.messageTray
		let bannerBin = messageTray._bannerBin
	
		if (this._originals['bannerAlignmentX'] === undefined) {
			this._originals['bannerAlignmentX'] = messageTray.bannerAlignment
		}
	
		if (this._originals['bannerAlignmentY'] === undefined) {
			this._originals['bannerAlignmentY'] = bannerBin.get_y_align()
		}
	
		if (this._originals['hideNotification'] === undefined) {
			this._originals['hideNotification'] = messageTray._hideNotification
		}

		// TOP
		messageTray._hideNotification = this._originals['hideNotification']
	
		bannerBin.set_y_align(Clutter.ActorAlign.START)
	
		if (pos === XY_POSITION.TOP_START) {
			messageTray.bannerAlignment = Clutter.ActorAlign.START
			return
		}
	
		if (pos === XY_POSITION.TOP_END) {
			messageTray.bannerAlignment = Clutter.ActorAlign.END
			return
		}
	
		if (pos === XY_POSITION.TOP_CENTER) {
			messageTray.bannerAlignment = Clutter.ActorAlign.CENTER
			return
		}
	
		// BOTTOM
	
		// >>
		// This block is going to fix the animation when the notification is
		// in bottom area
		// this is the same function from (ui.messageTray.messageTray._hideNotification)
		// with clutter animation mode set to EASE.
		// because the EASE_OUT_BACK (original code) causes glitch when
		// the tray is on bottom 
		const State = messageTrayClass.State
		const ANIMATION_TIME = messageTrayClass.ANIMATION_TIME
	
		messageTray._hideNotification = function (animate) {
			messageTray._notificationFocusGrabber.ungrabFocus()
			messageTray._banner.disconnectObject(messageTray)
	
			messageTray._resetNotificationLeftTimeout()
			messageTray._bannerBin.remove_all_transitions()
	
			if (animate) {
				messageTray._notificationState = State.HIDING
				messageTray._bannerBin.ease({
					opacity: 0,
					duration: ANIMATION_TIME,
					mode: Clutter.AnimationMode.EASE,
				})
				messageTray._bannerBin.ease({
					opacity: 0,
					y: messageTray._bannerBin.height,
					duration: ANIMATION_TIME,
					mode: Clutter.AnimationMode.EASE,
					onComplete: () => {
						this._notificationState = State.HIDDEN
						this._hideNotificationCompleted()
						this._updateState()
					},
				})
			} else {
				messageTray._bannerBin.y = messageTray._bannerBin.height
				messageTray._bannerBin.opacity = 0
				this._notificationState = State.HIDDEN
				this._hideNotificationCompleted()
			}
		}
		// <<
	
		bannerBin.set_y_align(Clutter.ActorAlign.END)
	
		if (pos === XY_POSITION.BOTTOM_START) {
			messageTray.bannerAlignment = Clutter.ActorAlign.START
			return
		}
	
		if (pos === XY_POSITION.BOTTOM_END) {
			messageTray.bannerAlignment = Clutter.ActorAlign.END
			return
		}
	
		if (pos === XY_POSITION.BOTTOM_CENTER) {
			messageTray.bannerAlignment = Clutter.ActorAlign.CENTER
			return
		}
	}

	notificationBannerPositionSetDefault() {
		if (this._originals['bannerAlignmentX'] === undefined ||
			this._originals['bannerAlignmentY'] === undefined ||
			this._originals['hideNotification'] === undefined
		) {
			return
		}

		let messageTray = Main.messageTray
		let bannerBin = messageTray._bannerBin

		messageTray.bannerAlignment = this._originals['bannerAlignmentX']
		bannerBin.set_y_align(this._originals['bannerAlignmentY'])
		messageTray._hideNotification = this._originals['hideNotification']
	}

	enable() {
		this.notificationBannerPositionSet(XY_POSITION.BOTTOM_END)
	}

	disable() {
		this.notificationBannerPositionSetDefault()
	}
}
