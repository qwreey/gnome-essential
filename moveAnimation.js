import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
import {
    getShadowSize,
    getResizeAnimationSize,
} from "./libs/utility.js"

export class MoveAnimation {
	constructor() {}

	_captureWindow(window_actor) {
		return new Clutter.Actor({
			height: window_actor.height,
			width: window_actor.width,
			x: window_actor.x,
			y: window_actor.y,
			content: window_actor.paint_to_content(null)
		})
	}

	// give time to redraw it selfs to application
	// If canceled, return true
	// RENDER_DELAY = 4
	RENDER_DELAY = 6
	_delayFrames(actor) {
		return new Promise(resolve=>{
			const timeline = actor.timeline = new Clutter.Timeline({ actor:actor,duration: 1000 })
			let count = 0
			actor.resolve = resolve
			actor.newframe = timeline.connect("new-frame",()=>{
				if (++count < this.RENDER_DELAY) return
				timeline.disconnect(actor.newframe)
				timeline.run_dispose()
				actor.resolve = actor.newframe = actor.timeline = null
				resolve()
			})
			timeline.start()
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

		const allowedOps = [Meta.SizeChange.UNMAXIMIZE,Meta.SizeChange.MAXIMIZE]
		this.size_change = global.window_manager.connect("size-change",(shellwm, actor, op, oldFrameRect, oldBufferRect)=>{
			if (!actor.mapped) return
			if (allowedOps.includes(op) === -1) {
				return
			}
			if (this.resizedActor) return
			if (actor.meta_window._unresizabler) return
			if (actor._noAnimation) return

			this.resizedActor = actor
			this.sourceShadow = getShadowSize(actor.meta_window)
			this.capture = this._captureWindow(actor)
			this.op = op
			actor.freeze()
		})
		this.size_changed = global.window_manager.connect("size-changed",async (shellwm, actor)=>{
			if (actor.is_destroyed()) return
			if (this.resizedActor != actor) return
			if (actor._noAnimation) return
			this.resizedActor = null
			await this._delayFrames(actor)
			if (actor.is_destroyed()) return // TOD: do not use this. it will error

			actor.thaw()
			actor.remove_all_transitions()

			const shadow = getShadowSize(actor.meta_window)
			const animationSize = getResizeAnimationSize(this.sourceShadow,shadow.frameX,shadow.frameY,shadow.frameWidth,shadow.frameHeight)

			actor.scale_x = animationSize.actorInitScaleX
			actor.scale_y = animationSize.actorInitScaleY
			actor.translation_x = animationSize.actorTranslationX
			actor.translation_y = animationSize.actorTranslationY
			actor.ease({
				scale_y: 1,
				translation_y: 0,
				// duration: 330,
				mode: Clutter.AnimationMode.EASE_OUT_EXPO,
				// mode: Clutter.AnimationMode.EASE_OUT_QUINT,
				duration: this.op === Meta.SizeChange.MAXIMIZE? 340: 360,
				// mode: this.op === Meta.SizeChange.MAXIMIZE? Clutter.AnimationMode.EASE_OUT_EXPO: Clutter.AnimationMode.EASE_OUT_QUART,
				onStopped: ()=>{
					if (actor.is_destroyed()) return
					actor.scale_x = 1
					actor.scale_y = 1
					actor.translation_x = 0
					actor.translation_y = 0
				}
			})
			actor.ease({
				scale_x: 1,
				translation_x: 0,
				// duration: 380,
				// mode: Clutter.AnimationMode.EASE_OUT_QUART,
				// mode: Clutter.AnimationMode.EASE_OUT_QUINT,
				// duration: this.op === Meta.SizeChange.MAXIMIZE? 380: 360,
				duration: this.op === Meta.SizeChange.MAXIMIZE? 375: 400,
				mode: this.op === Meta.SizeChange.MAXIMIZE? Clutter.AnimationMode.EASE_OUT_QUART: Clutter.AnimationMode.EASE_OUT_QUINT,
				// mode: this.op === Meta.SizeChange.MAXIMIZE? Clutter.AnimationMode.EASE_OUT_QUART: Clutter.AnimationMode.EASE_OUT_QUINT,
			})

			// global.window_group.insert_child_above(this.capture,actor)
			// const capture = this.capture
			// capture.ease({
            //     opacity: 0,
            //     scale_x: animationSize.cloneGoalScaleX,
            //     scale_y: animationSize.cloneGoalScaleY,
            //     x: animationSize.cloneGoalX,
            //     y: animationSize.cloneGoalY,
			// 	// duration: 300, //360
			// 	duration: this.op === Meta.SizeChange.MAXIMIZE ? 220 : 120,
			// 	mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_IN_QUINT,
			// 	// mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_OUT_QUART,
			// 	onStopped: ()=>{
			// 		if (actor.is_destroyed()) return
			// 		capture.destroy()
			// 	}
			// })
            actor.add_child(this.capture)
			const capture = this.capture
			capture.scale_x = animationSize.cloneGoalScaleX
			capture.scale_y = animationSize.cloneGoalScaleY
			capture.x = animationSize.cloneGoalX - shadow.bufferX
			capture.y = animationSize.cloneGoalY - shadow.bufferY
			capture.ease_property('opacity', 0, {
				// duration: 300, //360
				duration: this.op === Meta.SizeChange.MAXIMIZE ? 220 : 120,
				mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_IN_QUINT,
				// mode: this.op === Meta.SizeChange.MAXIMIZE ? Clutter.AnimationMode.EASE_OUT_EXPO : Clutter.AnimationMode.EASE_OUT_QUART,
				onStopped: ()=>{
					if (actor.is_destroyed()) return
					capture.destroy()
				}
			})
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
