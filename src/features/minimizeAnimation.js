import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

import {
	ShouldAnimateActorHook,
	delayFrames,
	Maid
} from "../libs/utility.js"

// TODO: rewrite this
class AnimationHandler {
	captureWindow(window_actor, rect) {
		return new Clutter.Actor({
			height: rect.height,
			width: rect.width,
			x: rect.x,
			y: rect.y,
			content: window_actor.paint_to_content(null)
		})
	}

	constructor(actor, icon, isOpening, onCompleted) {
		actor.show()
		if (isOpening) actor.visible = false
		if (isOpening) delayFrames(actor, this, 8).then(this.init.bind(this, actor, icon, isOpening, onCompleted)).catch(log)
		else this.init(actor, icon, isOpening, onCompleted)
	}

	init(actor, icon, isOpening, onCompleted) {
		actor.visible = true
		const rect = this.rect = actor.meta_window.get_buffer_rect()

		this.icon = icon
		this.actor = actor
		this.isOpening = isOpening
		this.onCompleted = onCompleted
		this.clone = this.captureWindow(actor, rect)
		if (actor.get_parent()) global.window_group.insert_child_above(this.clone, actor)
		else global.window_group.add_child(this.clone)

		const target = this.target = (isOpening ? rect : icon)
		const source = this.source = (isOpening ? icon : rect)

		const scaleX = icon.width / rect.width
		const scaleY = icon.height / rect.height

		target.scaleX = isOpening ? 1 : scaleX
		target.scaleY = isOpening ? 1 : scaleY
		source.scaleX = isOpening ? scaleX : 1
		source.scaleY = isOpening ? scaleY : 1

		target.opacity = isOpening ? 255 : 100
		source.opacity = isOpening ? 100 : 255

		this.initAnimation()
	}

	initAnimation() {
		const target = this.target
		const source = this.source
		const clone = this.clone

		clone.scale_x = source.scaleX
		clone.scale_y = source.scaleY
		clone.x = source.x
		clone.y = source.y
		clone.opacity = source.opacity

		clone.ease({
			scale_x: target.scaleX,
			scale_y: target.scaleY,
			x: target.x,
			y: target.y,
			opacity: target.opacity,
			duration: this.isOpening ? 300 : 240,
			mode: this.isOpening ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_IN_QUAD,
			onStopped: this.complate.bind(this)
		})

		this.actor.hide()
	}

	complate() {
		if (this.isOpening) this.actor.show()
		if (this.clone) this.clone.destroy()
		this.clone = null
		this.onCompleted()
	}

	destroy() {
		if (this.clone) this.clone.destroy()
		this.clone = null
		this.source = this.icon =
			this.rect = this.actor =
			this.isOpening = this.target =
			this.clone = this.onCompleted = null
	}
}

export class MinimizeAnimation {
	constructor() { }

	#maid

	enable() {
		ShouldAnimateActorHook.add("_minimizeWindow", () => false)
		ShouldAnimateActorHook.add("_unminimizeWindow", () => false)

		const maid = this.#maid = new Maid()
		maid.functionJob(() => ShouldAnimateActorHook.remove("_minimizeWindow"))
		maid.functionJob(() => ShouldAnimateActorHook.remove("_unminimizeWindow"))
		maid.connectJob(global.window_manager, "minimize", (e, actor) => {
			if (actor._noAnimation) {
				this.completed_minimize(actor)
				return
			}
			if (Main.overview.visible) {
				this.completed_minimize(actor)
				return
			}

			this.destroyActorEffect(actor)
			this.createMinimizeActorEffect(actor, this.getIcon(actor))
		})
		maid.connectJob(global.window_manager, "unminimize", (e, actor) => {
			if (actor._noAnimation) {
				this.completed_minimize(actor)
				return
			}
			if (Main.overview.visible) {
				this.completed_unminimize(actor)
				return
			}

			this.destroyActorEffect(actor)
			this.createUnminimizeActorEffect(actor, this.getIcon(actor))
		})

		this.orig_completed_minimize = Main.wm._shellwm.completed_minimize
		this.completed_minimize = Main.wm._shellwm.completed_minimize.bind(Main.wm._shellwm)
		Main.wm._shellwm.completed_minimize = function (actor) {
			return
		}

		this.orig_completed_unminimize = Main.wm._shellwm.completed_unminimize
		this.completed_unminimize = Main.wm._shellwm.completed_unminimize.bind(Main.wm._shellwm)
		Main.wm._shellwm.completed_unminimize = function (actor) {
			return
		}
	}

	disable() {
		this.#maid.destroy()
		this.#maid = null

		global.get_window_actors().forEach(actor => this.destroyActorEffect(actor))

		Main.wm._shellwm.completed_minimize = this.orig_completed_minimize
		Main.wm._shellwm.completed_unminimize = this.orig_completed_unminimize
		this.orig_completed_minimize = this.orig_completed_unminimize = null
		this.completed_minimize = this.completed_unminimize = null
	}

	destroyActorEffect(actor) {
		if (actor.QEAnimation) actor.QEAnimation.destroy()
		actor.QEAnimation = null
	}

	createMinimizeActorEffect(actor, icon) {
		actor.QEAnimation = new AnimationHandler(actor, icon, false, this.completed_minimize.bind(this, actor))
	}
	createUnminimizeActorEffect(actor, icon) {
		actor.QEAnimation = new AnimationHandler(actor, icon, true, this.completed_unminimize.bind(this, actor))
	}

	getIcon(actor) {
		let [success, icon] = actor.meta_window.get_icon_geometry()
		if (success) {
			return icon
		}
		let monitor = Main.layoutManager.monitors[actor.meta_window.get_monitor()]
		if (monitor && Main.overview.dash) {
			return { x: monitor.x + monitor.width / 2, y: monitor.y + monitor.height, width: 0, height: 0 }
		}
		return { x: 0, y: 0, width: 0, height: 0 }
	}
}
