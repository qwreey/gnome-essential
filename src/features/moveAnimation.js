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

// const maximizeOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]
// const fullscreenOps = [Meta.SizeChange.FULLSCREEN, Meta.SizeChange.UNFULLSCREEN]
// const allowedOps = [Meta.SizeChange.UNMAXIMIZE, Meta.SizeChange.MAXIMIZE]

// FIXME: try super -> <- ... something unexpected

export class MoveAnimation {
	constructor() { }

	#maid

	before(actor, op, oldFrameRect, oldBufferRect) {
		// check animatable
		if (!actor.mapped) return
		// if (allowedOps.includes(op) === -1) {
		// 	log("op not allowed??")
		// 	return
		// }
		if (actor._noAnimation) return

		// if (this.resizedActor) return
		// if (actor.meta_window._unresizabler) return

		// remove old animation
		actor.remove_all_transitions()
		if (actor.__QE_MOVE_capture && !actor.__QE_MOVE_capture.__destroyed) {
			actor.__QE_MOVE_capture.__destroyed = true
			actor.__QE_MOVE_capture.destroy()
			this.completed_size_change(actor)
		}

		// save old position
		const sourceShadow = actor.__QE_MOVE_source_shadow = getShadowSize(actor.meta_window, oldFrameRect, oldBufferRect)
		global.window_group.insert_child_above(
			actor.__QE_MOVE_capture = cloneWindow(
				actor,
				sourceShadow.bufferHeight,
				sourceShadow.bufferWidth,
				sourceShadow.bufferX,
				sourceShadow.bufferY
			),
			actor
		)
		actor.opacity = 0
		actor.__QE_MOVE_resize_op = op
	}

	// // not works for now, how?
	// async fullscreenAnimation(actor) {
	// 	const shadow = getShadowSize(actor.meta_window)

	// 	const size = this.op === Meta.SizeChange.FULLSCREEN ? 80 : -100
	// 	actor.scale_x = (shadow.frameWidth - size) / shadow.frameWidth
	// 	actor.scale_y = (shadow.frameHeight - size) / shadow.frameHeight
	// 	actor.translation_x = actor.translation_y = size / 2

	// 	actor.ease({
	// 		scale_y: 1,
	// 		translation_y: 0,
	// 		mode: Clutter.AnimationMode.EASE_OUT_QUINT,
	// 		duration: 260,
	// 		onStopped: () => {
	// 			if (actor.is_destroyed()) return
	// 			actor.scale_x = 1
	// 			actor.scale_y = 1
	// 			actor.translation_x = 0
	// 			actor.translation_y = 0
	// 		},
	// 	})
	// 	this.capture.destroy()
	// }

	async maximizeAnimation(actor) {
		// check before state
		const source_shadow = actor.__QE_MOVE_source_shadow
		actor.__QE_MOVE_source_shadow = null
		if (!source_shadow) return log("shadow")
		const op = actor.__QE_MOVE_resize_op || 0; log("91")
		const capture = actor.__QE_MOVE_capture; log("92")

		// get animation factors
		const shadow = getShadowSize(actor.meta_window); log("95")
		const animationSize = getResizeAnimationSize(source_shadow, shadow.frameX, shadow.frameY, shadow.frameWidth, shadow.frameHeight); log("96")
		const speed = getSpeed(source_shadow, shadow.frameWidth, shadow.frameHeight, 0.9, 0.9, 1.3); log("97", speed)

		// idk what happen (maybe less buggy)
		await delayFrames(actor, this, 4); log("100")
		// await sleep(50)

		actor.scale_x = animationSize.actorInitScaleX; log("103")
		actor.scale_y = animationSize.actorInitScaleY; log("104")
		actor.translation_x = animationSize.actorTranslationX; log("105")
		actor.translation_y = animationSize.actorTranslationY; log("106")
		actor.opacity = 255; log("107")

		// Animate real actor
		const durationY = (op === Meta.SizeChange.MAXIMIZE ? 340 : 360) * speed; log("110")
		const durationX = (op === Meta.SizeChange.MAXIMIZE ? 330 : 360) * speed; log("111")
		const modeY = op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUINT : Clutter.AnimationMode.EASE_OUT_EXPO; log("112")
		const modeX = op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_QUART : Clutter.AnimationMode.EASE_OUT_QUINT; log("113")
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
		}); log("126")
		actor.ease({
			scale_x: 1,
			translation_x: 0,
			duration: durationX,
			mode: modeX,
		}); log("132")

		// Animate clone fade actor
		capture.ease({
			scale_y: animationSize.cloneGoalScaleY,
			y: animationSize.cloneGoalY,
			mode: modeY,
			duration: durationY,
		}); log("140")
		capture.ease({
			scale_x: animationSize.cloneGoalScaleX,
			x: animationSize.cloneGoalX,
			duration: durationX,
			mode: modeX,
		}); log("146")
		await sleep(10 * speed); log("147")
		if (capture.__destroyed) return
		capture.ease_property('opacity', 0, {
			duration: (op === Meta.SizeChange.MAXIMIZE ? 160 : 120) * speed,
			mode: op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_OUT_QUART,
			onStopped: () => {
				if (capture.__destroyed) return
				actor.__QE_MOVE_capture = null
				capture.destroy()
				this.completed_size_change(actor)
			}
		})
	}

	enable() {
		ShouldAnimateActorHook.add("_sizeChangeWindow", () => false)

		this.completed_size_change = (
			this.orig_completed_size_change = global.window_manager.completed_size_change
		).bind(global.window_manager)
		global.window_manager.completed_size_change = () => { }

		const maid = this.#maid = new Maid()
		maid.functionJob(() => ShouldAnimateActorHook.remove("_sizeChangeWindow"))
		maid.connectJob(global.window_manager, "size-change", (shellwm, actor, op, oldFrameRect, oldBufferRect) => {
			log(op)
			this.before(actor, op, oldFrameRect, oldBufferRect)
		})
		maid.connectJob(global.window_manager, "size-changed", (shellwm, actor) => {
			// if (actor._noAnimation) return
			// log(actor)
			if (actor.is_destroyed()) {
				log("destroyed??")
				if (actor.__QE_MOVE_capture && !actor.__QE_MOVE_capture.__destroyed) {
					actor.__QE_MOVE_capture.__destroyed = true
					actor.__QE_MOVE_capture.destroy()
				}
				return
			}

			actor.remove_all_transitions()
			// if (maximizeOps.includes(actor.__QE_MOVE_resize_op) !== -1) {
			log("let's go maximizeAnimation")
			this.maximizeAnimation(actor).catch(log)
			// }
			// } else if (fullscreenOps.includes(this.op) !== -1) {
			// this.fullscreenAnimation(actor).catch(log)
			// }
		})
	}

	disable() {
		this.#maid.destroy()
		this.#maid = null
		global.window_manager.completed_size_change = this.orig_completed_size_change
		this.orig_completed_size_change = this.completed_size_change = null
		for (const actor of global.get_window_actors()) {
			actor.__QE_MOVE_resize_op = null
		}
	}
}
