const { Clutter, Meta } = imports.gi
const Main = imports.ui.main

var MoveAnimation = class MoveAnimation {
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
			this.sourceRect = oldFrameRect || actor.meta_window.get_frame_rect()
			this.sourceBuffer = oldBufferRect || actor.meta_window.get_buffer_rect()
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
			if (actor.is_destroyed()) return

			actor.thaw()
			actor.remove_all_transitions()
			this.targetRect = actor.meta_window.get_frame_rect()
			this.targetBuffer = actor.meta_window.get_buffer_rect()
			const cloneGoalScaleX = this.targetRect.width/this.sourceRect.width
			const cloneGoalScaleY = this.targetRect.height/this.sourceRect.height
			const decoLeftBefore  = (this.sourceRect.x-this.sourceBuffer.x)
			const decoTopBefore   = (this.sourceRect.y-this.sourceBuffer.y)
			const decoLeftAfter   = (this.targetRect.x-this.targetBuffer.x)
			const decoTopAfter    = (this.targetRect.y-this.targetBuffer.y)
			const actorInitScaleX = this.sourceRect.width/this.targetRect.width
			const actorInitScaleY = this.sourceRect.height/this.targetRect.height

			actor.scale_x = actorInitScaleX
			actor.scale_y = actorInitScaleY
			actor.translation_x = this.sourceRect.x - this.targetRect.x
			actor.translation_y = this.sourceRect.y - this.targetRect.y
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
			actor.add_child(this.capture)
			const capture = this.capture
			capture.scale_x = cloneGoalScaleX
			capture.scale_y = cloneGoalScaleY
			capture.x = decoLeftAfter*actorInitScaleX - decoLeftBefore*cloneGoalScaleX
			capture.y = decoTopAfter*actorInitScaleY - decoTopBefore*cloneGoalScaleY
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
