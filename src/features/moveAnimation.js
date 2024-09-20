import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
import {
	getShadowSize,
	getResizeAnimationSize,
	getSpeed,
	sleep,
	cloneWindow,
	ShouldAnimateActorHook,
	Maid
} from "../libs/utility.js"

// const maximizeOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]
// const fullscreenOps = [Meta.SizeChange.FULLSCREEN, Meta.SizeChange.UNFULLSCREEN]
const allowedOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]

export class MoveAnimation {
	constructor() { }

	#maid

	before(actor, op, oldFrameRect, oldBufferRect) {
		// check animatable
		if (!actor.mapped) return
		if (allowedOps.includes(op) === -1) {
			return
		}
		if (actor._noAnimation) return
		// if (this.resizedActor) return
		// if (actor.meta_window._unresizabler) return

		// remove old animation
		actor.remove_all_transitions()
		if (actor.__QE_MOVE_capture) {
			const old = actor.__QE_MOVE_capture
			actor.__QE_MOVE_capture = null
			old.destroy()
			if (actor.__QE_MOVE_freeze) {
				actor.thaw()
				actor.__QE_MOVE_freeze = null
			}
			// this.completed_size_change(actor)
		}

		// save old position
		const source_shadow = actor.__QE_MOVE_source_shadow = getShadowSize(actor.meta_window, oldFrameRect, oldBufferRect)
		actor.__QE_MOVE_resize_op = op

		// create capture
		const capture = actor.__QE_MOVE_capture = cloneWindow(
			actor,
			source_shadow.bufferHeight,
			source_shadow.bufferWidth,
			source_shadow.bufferX,
			source_shadow.bufferY
		)
		actor.add_child(capture)
		capture.hide()

		// freeze
		actor.freeze()
		actor.__QE_MOVE_freeze = true
	}

	// // not works for now, how?
	async fullscreenAnimation(actor) {
		// check before state
		const source_shadow = actor.__QE_MOVE_source_shadow
		actor.__QE_MOVE_source_shadow = null
		if (!source_shadow) return
		const op = actor.__QE_MOVE_resize_op || 0
		const capture = actor.__QE_MOVE_capture

		// wait render
		await sleep(100)
		if (actor.is_destroyed()) return
		if (actor.__QE_MOVE_capture !== capture) return

		// get animation factors
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
		// check before state
		const source_shadow = actor.__QE_MOVE_source_shadow
		actor.__QE_MOVE_source_shadow = null
		if (!source_shadow) return
		const op = actor.__QE_MOVE_resize_op || 0
		const capture = actor.__QE_MOVE_capture

		// wait render
		// await delayFrames(actor, this, 6)
		await sleep(100)
		if (actor.is_destroyed()) return
		if (actor.__QE_MOVE_capture !== capture) return

		// get animation factors
		const shadow = getShadowSize(actor.meta_window)
		const animationSize = getResizeAnimationSize(source_shadow, shadow.frameX, shadow.frameY, shadow.frameWidth, shadow.frameHeight)
		const speed = getSpeed(source_shadow, shadow.frameWidth, shadow.frameHeight, 0.9, 0.9, 1.3)

		// set capture position
		const cloneGoalScaleX = capture.scale_x = shadow.frameWidth / source_shadow.frameWidth
		const cloneGoalScaleY = capture.scale_y = shadow.frameHeight / source_shadow.frameHeight
		capture.x = (-source_shadow.left * cloneGoalScaleX) + shadow.left
		capture.y = (-source_shadow.top * cloneGoalScaleY) + shadow.top
		capture.show()

		// set actor position
		actor.scale_x = animationSize.actorInitScaleX
		actor.scale_y = animationSize.actorInitScaleY
		actor.translation_x = animationSize.actorTranslationX
		actor.translation_y = animationSize.actorTranslationY

		// thaw
		if (actor.__QE_MOVE_freeze) {
			actor.thaw()
			actor.__QE_MOVE_freeze = null
		}

		// Animate real actor
		const durationY = (op === Meta.SizeChange.MAXIMIZE ? 340 : 360) * speed
		const durationX = (op === Meta.SizeChange.MAXIMIZE ? 330 : 360) * speed
		const modeY = op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUINT : Clutter.AnimationMode.EASE_OUT_EXPO
		const modeX = op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUART : Clutter.AnimationMode.EASE_OUT_QUINT
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
				this.completed_size_change(actor)
			},
		})
		actor.ease({
			scale_x: 1,
			translation_x: 0,
			duration: durationX,
			mode: modeX,
		})

		// fade capture
		await sleep((this.op === Meta.SizeChange.MAXIMIZE ? 30 : 20) * speed)
		if (actor.is_destroyed()) return
		if (actor.__QE_MOVE_capture !== capture) return
		capture.ease_property('opacity', 0, {
			duration: (this.op === Meta.SizeChange.MAXIMIZE ? 120 : 100) * speed,
			// duration: (this.op === Meta.SizeChange.MAXIMIZE ? 90 : 60) * speed,
			// mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_IN_QUINT,
			mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_CUBIC : Clutter.AnimationMode.EASE_OUT_QUAD,
			onStopped: () => {
				if (actor.is_destroyed()) return
				if (actor.__QE_MOVE_capture !== capture) return
				capture.destroy()
				actor.__QE_MOVE_capture = null
			}
		})
	}

	enable() {
		ShouldAnimateActorHook.add("_sizeChangeWindow", () => false)

		const maid = this.#maid = new Maid()
		maid.patchJob(global.window_manager, "completed_size_change", (orig) => {
			this.completed_size_change = orig.bind(global.window_manager)
			return () => { }
		})
		maid.functionJob(() => ShouldAnimateActorHook.remove("_sizeChangeWindow"))
		maid.connectJob(global.window_manager, "size-change", (shellwm, actor, op, oldFrameRect, oldBufferRect) => {
			this.before(actor, op, oldFrameRect, oldBufferRect)
		})
		maid.connectJob(global.window_manager, "size-changed", (shellwm, actor) => {
			if (actor.is_destroyed()) {
				return
			}
			// actor.remove_all_transitions()
			this.maximizeAnimation(actor).catch(logError)
		})
	}

	disable() {
		this.#maid.destroy()
		this.completed_size_change = this.#maid = null
		for (const actor of global.get_window_actors()) {
			actor.__QE_MOVE_resize_op = null
		}
	}
}
