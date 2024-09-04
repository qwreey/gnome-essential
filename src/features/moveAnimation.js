import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
import {
	getShadowSize,
	getResizeAnimationSize,
	getSpeed,
	sleep,
	cloneWindow,
} from "../libs/utility.js"

const allowedOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]

export class MoveAnimation {
	constructor() { }

	// give time to redraw it selfs to application
	// If canceled, return true
	// RENDER_DELAY = 4
	RENDER_DELAY = 6
	_delayFrames(actor) {
		return new Promise(resolve => {
			const timeline = actor.timeline = new Clutter.Timeline({ actor: actor, duration: 1000 })
			let count = 0
			actor.resolve = resolve
			actor.newframe = timeline.connect("new-frame", () => {
				if (++count < this.RENDER_DELAY) return
				timeline.disconnect(actor.newframe)
				timeline.run_dispose()
				actor.resolve = actor.newframe = actor.timeline = null
				resolve()
			})
			timeline.start()
		})
	}

	before(actor, op, oldFrameRect, oldBufferRect) {
		if (!actor.mapped) return
		if (allowedOps.includes(op) === -1) {
			return
		}
		if (this.resizedActor) return
		if (actor.meta_window._unresizabler) return
		if (actor._noAnimation) return

		this.resizedActor = actor
		const sourceShadow = this.sourceShadow = getShadowSize(actor.meta_window, oldFrameRect, oldBufferRect)
		global.window_group.insert_child_above(
			this.capture = cloneWindow(
				actor,
				sourceShadow.bufferHeight,
				sourceShadow.bufferWidth,
				sourceShadow.bufferX,
				sourceShadow.bufferY
			),
			actor
		)
		actor.opacity = 0
		this.op = op
	}

	async animate(actor) {
		actor.remove_all_transitions()

		const shadow = getShadowSize(actor.meta_window)
		const animationSize = getResizeAnimationSize(this.sourceShadow, shadow.frameX, shadow.frameY, shadow.frameWidth, shadow.frameHeight)
		const speed = getSpeed(this.sourceShadow, shadow.frameWidth, shadow.frameHeight, 0.9, 0.9, 1.3)

		actor.scale_x = animationSize.actorInitScaleX
		actor.scale_y = animationSize.actorInitScaleY
		actor.translation_x = animationSize.actorTranslationX
		actor.translation_y = animationSize.actorTranslationY
		actor.opacity = 255

		const durationY = (this.op === Meta.SizeChange.MAXIMIZE ? 340 : 360) * speed
		const durationX = (this.op === Meta.SizeChange.MAXIMIZE ? 330 : 360) * speed
		const modeY = this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUINT : Clutter.AnimationMode.EASE_OUT_EXPO
		const modeX = this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUART : Clutter.AnimationMode.EASE_OUT_QUINT
		actor.ease({
			scale_y: 1,
			translation_y: 0,
			mode: modeY,
			duration: durationY,
			onStopped: () => {
				if (actor.is_destroyed()) return
				actor.scale_x = 1
				actor.scale_y = 1
				actor.translation_x = 0
				actor.translation_y = 0
			},
		})
		actor.ease({
			scale_x: 1,
			translation_x: 0,
			duration: durationX,
			mode: modeX,
		})

		const capture = this.capture
		capture.ease({
			scale_y: animationSize.cloneGoalScaleY,
			y: animationSize.cloneGoalY,
			mode: modeY,
			duration: durationY,
		})
		capture.ease({
			scale_x: animationSize.cloneGoalScaleX,
			x: animationSize.cloneGoalX,
			duration: durationX,
			mode: modeX,
		})
		await sleep(10 * speed);
		capture.ease_property('opacity', 0, {
			duration: (this.op === Meta.SizeChange.MAXIMIZE ? 160 : 120) * speed,
			mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_OUT_QUART,
			onStopped: () => {
				capture.destroy()
			}
		})
	}

	enable() {
		this.orig_shouldAnimateActor = Main.wm._shouldAnimateActor
		this.shouldAnimateActor = Main.wm._shouldAnimateActor.bind(Main.wm)
		Main.wm._shouldAnimateActor = (actor, types, stack) => {
			stack = stack || new Error().stack
			if (stack && (stack.indexOf("_sizeChangeWindow") !== -1)) {
				return false
			}
			return this.shouldAnimateActor(actor, types, stack)
		}

		this.size_change = global.window_manager.connect("size-change", (shellwm, actor, op, oldFrameRect, oldBufferRect) => {
			this.before(actor, op, oldFrameRect, oldBufferRect)
		})
		this.size_changed = global.window_manager.connect("size-changed", (shellwm, actor) => {
			const resizedActor = this.resizedActor
			this.resizedActor = null
			if (resizedActor != actor) return
			if (actor._noAnimation) return
			if (actor.is_destroyed()) return // TOD: do not use this. it will error

			this.animate(actor).catch(log)
		})
	}

	disable() {
		this.capture = null

		global.window_manager.disconnect(this.size_change)
		global.window_manager.disconnect(this.size_changed)
		this.size_changed = this.size_change = null

		Main.wm._shouldAnimateActor = this.orig_shouldAnimateActor
		this.orig_shouldAnimateActor = null
		this.sizeChangedWindow = null
	}
}
