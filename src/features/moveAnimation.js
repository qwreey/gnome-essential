import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
// import * as Main from "resource:///org/gnome/shell/ui/main.js"
import {
	getShadowSize,
	getResizeAnimationSize,
	getSpeed,
	sleep,
	cloneWindow,
	ShouldAnimateActorHook,
	delayFrames,
	Maid
} from "../libs/utility.js"

const maximizeOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]
const fullscreenOps = [Meta.SizeChange.FULLSCREEN, Meta.SizeChange.UNFULLSCREEN]
const allowedOps = [...maximizeOps] //, ...fullscreenOps]

// FIXME: try super -> <- ... something unexpected

export class MoveAnimation {
	constructor() { }

	#maid

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

	// not works for now, how?
	async fullscreenAnimation(actor) {
		const shadow = getShadowSize(actor.meta_window)

		const size = this.op === Meta.SizeChange.FULLSCREEN ? 80 : -100
		actor.scale_x = (shadow.frameWidth - size) / shadow.frameWidth
		actor.scale_y = (shadow.frameHeight - size) / shadow.frameHeight
		actor.translation_x = actor.translation_y = size / 2

		actor.ease({
			scale_y: 1,
			translation_y: 0,
			mode: Clutter.AnimationMode.EASE_OUT_QUINT,
			duration: 260,
			onStopped: () => {
				if (actor.is_destroyed()) return
				actor.scale_x = 1
				actor.scale_y = 1
				actor.translation_x = 0
				actor.translation_y = 0
			},
		})
		this.capture.destroy()
	}

	async maximizeAnimation(actor) {
		const shadow = getShadowSize(actor.meta_window)
		const animationSize = getResizeAnimationSize(this.sourceShadow, shadow.frameX, shadow.frameY, shadow.frameWidth, shadow.frameHeight)
		const speed = getSpeed(this.sourceShadow, shadow.frameWidth, shadow.frameHeight, 0.9, 0.9, 1.3)

		// idk what happen (maybe less buggy)
		await delayFrames(actor, this, 4)

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
		ShouldAnimateActorHook.add("_sizeChangeWindow", () => false)

		const maid = this.#maid = new Maid()
		maid.functionJob(() => ShouldAnimateActorHook.remove("_sizeChangeWindow"))
		maid.connectJob(global.window_manager, "size-change", (shellwm, actor, op, oldFrameRect, oldBufferRect) => {
			this.before(actor, op, oldFrameRect, oldBufferRect)
		})
		maid.connectJob(global.window_manager, "size-changed", (shellwm, actor) => {
			const resizedActor = this.resizedActor
			this.resizedActor = null
			if (resizedActor != actor) return
			if (actor._noAnimation) return
			if (actor.is_destroyed()) return // TOD: do not use this. it will error

			actor.remove_all_transitions()
			if (maximizeOps.includes(this.op) !== -1) {
				this.maximizeAnimation(actor).catch(log)
			} else if (fullscreenOps.includes(this.op) !== -1) {
				this.fullscreenAnimation(actor).catch(log)
			}
		})
	}

	disable() {
		ShouldAnimateActorHook.remove("_sizeChangeWindow")

		this.#maid.destroy()
		this.resizedActor = this.capture = this.#maid = null
	}
}
