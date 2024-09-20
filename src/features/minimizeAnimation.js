import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

import {
	ShouldAnimateActorHook,
	Maid,
	cloneWindow,
} from "../libs/utility.js"

export class MinimizeAnimation {
	constructor() { }

	#maid

	getIcon(window) {
		let [success, icon] = window.get_icon_geometry()
		if (success) {
			return icon
		}
		let monitor = Main.layoutManager.monitors[window.get_monitor()]
		if (monitor && Main.overview.dash) {
			return { x: monitor.x + monitor.width / 2, y: monitor.y + monitor.height, width: 0, height: 0 }
		}
		return { x: 0, y: 0, width: 0, height: 0 }
	}

	calculate(isOpening, rect, icon) {
		const target = isOpening ? rect : icon
		const source = isOpening ? icon : rect

		const scaleX = icon.width / rect.width
		const scaleY = icon.height / rect.height

		target.scaleX = isOpening ? 1 : scaleX
		target.scaleY = isOpening ? 1 : scaleY
		source.scaleX = isOpening ? scaleX : 1
		source.scaleY = isOpening ? scaleY : 1

		target.opacity = isOpening ? 255 : 100
		source.opacity = isOpening ? 100 : 255

		return [source, target]
	}

	completed(isOpening, actor) {
		if (isOpening) {
			this.completed_unminimize(actor)
			if (isOpening) actor.show()
		} else {
			this.completed_minimize(actor)
		}
	}

	animate(actor, isOpening) {
		// Check window ok
		if (actor.is_destroyed()) return
		if (actor.opacity === 0) {
			// for window gesture extension
			actor.remove_all_transitions()
			actor.hide()
			this.completed(isOpening, actor)
			return
		}
		actor.remove_all_transitions()
		if ((!actor.get_parent()) || Main.overview.visible || actor._noAnimation) {
			this.completed(isOpening, actor)
			return
		}

		// Calculate size, pos
		const window = actor.meta_window
		const icon = this.getIcon(window)
		const rect = window.get_buffer_rect()
		const [source, target] = this.calculate(isOpening, rect, icon)

		// Remove old animation
		if (actor.__QE_MINIMIZE_capture) {
			const old = actor.__QE_MINIMIZE_capture
			actor.__QE_MINIMIZE_capture = null
			old.destroy()
		}
		actor.hide()

		// Create clone
		const capture = actor.__QE_MINIMIZE_capture = cloneWindow(
			actor,
			rect.height,
			rect.width,
			rect.x,
			rect.y
		)
		global.window_group.insert_child_above(capture, actor)

		// Animate clone
		capture.scale_x = source.scaleX
		capture.scale_y = source.scaleY
		capture.x = source.x
		capture.y = source.y
		capture.opacity = source.opacity
		capture.ease({
			scale_x: target.scaleX,
			scale_y: target.scaleY,
			x: target.x,
			y: target.y,
			opacity: target.opacity,
			duration: isOpening ? 300 : 240,
			mode: isOpening ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_IN_QUAD,
			onStopped: () => {
				if (actor.is_destroyed()) return
				this.completed(isOpening, actor)
				if (actor.__QE_MINIMIZE_capture !== capture) return
				capture.destroy()
				actor.__QE_MINIMIZE_capture = null
			}
		})
	}

	enable() {
		ShouldAnimateActorHook.add("_minimizeWindow", () => false)
		ShouldAnimateActorHook.add("_unminimizeWindow", () => false)

		const maid = this.#maid = new Maid()
		maid.functionJob(() => ShouldAnimateActorHook.remove("_minimizeWindow"))
		maid.functionJob(() => ShouldAnimateActorHook.remove("_unminimizeWindow"))
		maid.connectJob(global.window_manager, "minimize", (e, actor) => {
			this.animate(actor, false)
		})
		maid.connectJob(global.window_manager, "unminimize", (e, actor) => {
			this.animate(actor, true)
		})
		maid.patchJob(Main.wm._shellwm, "completed_minimize", (orig) => {
			this.completed_minimize = orig.bind(Main.wm._shellwm)
			return () => { }
		})
		maid.patchJob(Main.wm._shellwm, "completed_unminimize", (orig) => {
			this.completed_unminimize = orig.bind(Main.wm._shellwm)
			return () => { }
		})
	}

	disable() {
		this.#maid.destroy()
		this.#maid = this.completed_minimize = this.completed_unminimize = null
	}
}
