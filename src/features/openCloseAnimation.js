import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

// todo: rewrite and reanimate with mouse position

import {
	cloneWindow,
	Maid,
	PointerUtil,
	ShouldAnimateActorHook,
	getShadowSize,
	getResizeAnimationSize,
} from "../libs/utility.js"

export class OpenCloseAnimation {
	constructor() { }

	#maid

	get_bottom(actor) {
		const window = actor.meta_window
		const monitor = window.get_monitor()
		const monitorGeometry = global.display.get_monitor_geometry(monitor)
		return monitorGeometry.y + monitorGeometry.height - actor.y
	}

	_captureWindow(window_actor) {
		return cloneWindow(window_actor, window_actor.height, window_actor.width, window_actor.x, window_actor.y)
	}

	animateFileselector(modalActor, rootWin, isOpen) {
		const modalWin = modalActor.meta_window
		const modalShadow = getShadowSize(modalWin)
		const rootShadow = getShadowSize(rootWin)
		const rootActor = rootWin.get_compositor_private()
		const rootActorClone = this._captureWindow(rootActor)
		rootActor.__QE_fileselector = modalActor
		rootActor.hide()

		const animationSize = getResizeAnimationSize(modalShadow, rootShadow.frameX, rootShadow.frameY, rootShadow.frameWidth, rootShadow.frameHeight)
		const cloneScaleX = rootActorClone.scale_x = modalShadow.frameWidth / rootShadow.frameWidth
		const cloneScaleY = rootActorClone.scale_y = modalShadow.frameHeight / rootShadow.frameHeight
		rootActorClone.x = (-rootShadow.left * cloneScaleX) + modalShadow.left
		rootActorClone.y = (-rootShadow.top * cloneScaleY) + modalShadow.top

		// set actor position
		modalActor.scale_x = isOpen ? animationSize.cloneGoalScaleX : 1
		modalActor.scale_y = isOpen ? animationSize.cloneGoalScaleY : 1
		const modalX = (animationSize.cloneGoalX - modalShadow.bufferX)
		const modalY = (animationSize.cloneGoalY - modalShadow.bufferY)
		modalActor.translation_x = isOpen ? modalX : 0
		modalActor.translation_y = isOpen ? modalY : 0

		// Animate modal actor
		modalActor.ease({
			scale_x: isOpen ? 1 : animationSize.cloneGoalScaleX,
			scale_y: isOpen ? 1 : animationSize.cloneGoalScaleY,
			translation_x: isOpen ? 0 : modalX,
			translation_y: isOpen ? 0 : modalY,
			mode: isOpen ? Clutter.AnimationMode.EASE_OUT_QUINT : Clutter.AnimationMode.EASE_OUT_QUART,
			duration: isOpen ? 320 : 330,
			onStopped: () => {
				if (!isOpen) {
					this.completed_destroy(modalActor)
					if (!rootActor.is_destroyed()) rootActor.show()
					rootActor.__QE_fileselector = null
				}
			}
		})

		// Animate capute
		modalActor.add_child(rootActorClone)
		rootActorClone.opacity = isOpen ? 255 : 0
		rootActorClone.ease({
			opacity: isOpen ? 0 : 255,
			duration: isOpen ? 160 : 180,
			mode: isOpen ? Clutter.AnimationMode.EASE_IN_QUART : Clutter.AnimationMode.EASE_OUT_QUAD,
			onStopped: () => {
				if (modalActor.is_destroyed()) return
				rootActorClone.destroy()
			}
		})
	}

	animateNemoDesktop(actor, isOpen) {
		actor.remove_all_transitions()
		actor.opacity = isOpen ? 0 : 255
		actor.ease({
			opacity: isOpen ? 255 : 0,
			duration: isOpen ? 360 : 320,
			mode: isOpen ? Clutter.AnimationMode.EASE_IN_QUART : Clutter.AnimationMode.EASE_OUT_QUART,
			onStopped: () => {
				if (!isOpen) this.completed_destroy(actor)
			}
		})
	}

	FileselectorTitles = ["Open Files", "Open video", "Open Folder"]
	isAnimatableFileselector(actor, isOpen) {
		const window = actor.meta_window
		if (actor._windowType !== Meta.WindowType.MODAL_DIALOG) return
		if (window.wm_class !== "org.gnome.Nautilus" && !this.FileselectorTitles.includes(window.title)) return

		const root = actor.meta_window.find_root_ancestor()
		if (!root) return
		if (root.wm_class === "org.gnome.Nautilus") return
		if (isOpen && root.get_maximized()) return
		if (!isOpen && !root.get_compositor_private().__QE_fileselector) return

		return root
	}

	isNemoDesktop(actor) {
		if (actor._windowType !== Meta.WindowType.DESKTOP) return
		if (actor.meta_window.wm_class !== "Nemo-desktop") return

		return true
	}

	async open(actor) {
		// Nemo desktop
		if (this.isNemoDesktop(actor)) {
			this.animateNemoDesktop(actor, true)
			return
		}

		// File selector
		const root = this.isAnimatableFileselector(actor, true)
		if (root) {
			this.animateFileselector(actor, root, true)
			return
		}

		switch (actor._windowType) {
			case Meta.WindowType.NORMAL:
				actor.show()
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_x = 0.88
				actor.scale_y = 0.88
				actor.opacity = 160

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 360,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => {
						actor.set_pivot_point(0, 0)
						actor.opacity = 255
						actor.scale_x = 1
						actor.scale_y = 1
					}
				})
				break

			case Meta.WindowType.TOOLTIP:
				actor.show()
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0)
				actor.scale_y = 0.9
				actor.scale_x = 0.85
				actor.opacity = 0

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 180,//220,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => {
						actor.set_pivot_point(0, 0)
						actor.opacity = 255
						actor.scale_x = 1
						actor.scale_y = 1
					}
				})
				break
			case Meta.WindowType.DROPDOWN_MENU:
			case Meta.WindowType.POPUP_MENU:
			case Meta.WindowType.OVERRIDE_OTHER:
				actor.show()
				actor.remove_all_transitions()
				actor.scale_y = 0.6
				actor.scale_x = 0.6
				actor.opacity = 0

				const [cursorX, cursorY] = PointerUtil.position

				const curInsideX = Math.max(Math.min((cursorX - actor.x) / actor.width, 1), 0)
				const curInsideY = Math.max(Math.min((cursorY - actor.y) / actor.height, 1), 0)
				actor.set_pivot_point(curInsideX, curInsideY)

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 120,//190,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => {
						actor.set_pivot_point(0, 0)
						actor.opacity = 255
						actor.scale_x = 1
						actor.scale_y = 1
					}
				})
				break
			case Meta.WindowType.MODAL_DIALOG:
			case Meta.WindowType.DIALOG:
				actor.show()
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_y = 1.12
				actor.scale_x = 1.12
				actor.opacity = 0

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 280,//360,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => {
						actor.set_pivot_point(0, 0)
						actor.opacity = 255
						actor.scale_x = 1
						actor.scale_y = 1
					}
				})
				break
		}
	}

	async close(actor) {
		// Nemo desktop
		if (this.isNemoDesktop(actor)) {
			this.animateNemoDesktop(actor, false)
			return
		}

		// File selector
		const root = this.isAnimatableFileselector(actor, false)
		if (root) {
			this.animateFileselector(actor, root, false)
			return
		}

		let clone
		switch (actor._windowType) {
			case Meta.WindowType.NORMAL:
			case undefined:
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.opacity = 255
				actor.scale_x = 1
				actor.scale_y = 1

				actor.ease({
					scale_x: 0.86,
					scale_y: 0.86,
					opacity: 0,
					duration: 200,
					mode: Clutter.AnimationMode.EASE_IN_QUART,
					onStopped: () => this.completed_destroy(actor)
				})
				break
			case Meta.WindowType.TOOLTIP:
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone, actor)
				else global.window_group.add_child(clone)
				this.completed_destroy(actor)

				clone.set_pivot_point(0.5, 0)
				clone.scale_y = 1
				clone.scale_x = 1
				clone.opacity = 255

				clone.ease({
					opacity: 0,
					scale_x: 0.9,
					scale_y: 0.9,
					duration: 280,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => clone.destroy()
				})
				break
			case Meta.WindowType.DROPDOWN_MENU:
			case Meta.WindowType.POPUP_MENU:
			case Meta.WindowType.OVERRIDE_OTHER:
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone, actor)
				else global.window_group.add_child(clone)
				this.completed_destroy(actor)

				clone.set_pivot_point(0.5, 0.5)
				clone.scale_y = 1
				clone.scale_x = 1
				clone.opacity = 255

				clone.ease({
					opacity: 0,
					scale_x: 0.94,
					scale_y: 0.94,
					duration: 280,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => clone.destroy()
				})
				break
			case Meta.WindowType.MODAL_DIALOG:
			case Meta.WindowType.DIALOG:
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_y = 1
				actor.scale_x = 1
				actor.opacity = 255

				actor.ease({
					opacity: 0,
					scale_x: 1.08,
					scale_y: 1.08,
					duration: 260,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: () => this.completed_destroy(actor)
				})
				break
			default:
				this.completed_destroy(actor)
				break
		}
	}

	enable() {
		ShouldAnimateActorHook.add("_mapWindow", () => false)
		ShouldAnimateActorHook.add("_destroyWindow", () => false)

		const maid = this.#maid = new Maid()
		maid.functionJob(() => ShouldAnimateActorHook.remove("_mapWindow"))
		maid.functionJob(() => ShouldAnimateActorHook.remove("_destroyWindow"))
		maid.connectJob(global.window_manager, "map", (e, actor) => {
			this.open(actor).catch(logError)
		})
		maid.connectJob(global.window_manager, "destroy", (e, actor) => {
			this.close(actor).catch(logError)
		})
		maid.patchJob(Main.wm._shellwm, "completed_destroy", (orig) => {
			this.completed_destroy = orig.bind(Main.wm._shellwm)
			return () => { }
		})
	}

	disable() {
		this.#maid.destroy()
		this.#maid = this.completed_destroy = null
	}
}
