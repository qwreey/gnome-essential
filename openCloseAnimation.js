const { Clutter, Meta, St, Shell } = imports.gi

const Main = imports.ui.main

const types = [
	Meta.WindowType.NORMAL,
	Meta.WindowType.DIALOG,
	Meta.WindowType.MODAL_DIALOG,
]

var OpenCloseAnimation = class OpenCloseAnimation {
	constructor() {}

	get_bottom(actor) {
		const window = actor.meta_window
		const monitor = window.get_monitor()
		const monitorGeometry = global.display.get_monitor_geometry(monitor)
		return monitorGeometry.y+monitorGeometry.height - actor.y
	}

	_captureWindow(window_actor) {
		return new Clutter.Actor({
			height: window_actor.height,
			width: window_actor.width,
			x: window_actor.x,
			y: window_actor.y,
			content: window_actor.paint_to_content(null)
		})
	}

	enable() {
		this.orig_shouldAnimateActor = Main.wm._shouldAnimateActor
		this.shouldAnimateActor = Main.wm._shouldAnimateActor.bind(Main.wm)
		Main.wm._shouldAnimateActor = (actor, types, stack)=>{
			stack = stack || new Error().stack
			if (stack && (stack.indexOf("_mapWindow") !== -1 || stack.indexOf("_destroyWindow") !== -1)) {
				return false
			}
			return this.shouldAnimateActor(actor, types, stack)
		}

		this.orig_completed_destroy = Main.wm._shellwm.completed_destroy
		this.completed_destroy = Main.wm._shellwm.completed_destroy.bind(Main.wm._shellwm)
		Main.wm._shellwm.completed_destroy = function(actor) {
			return
		}

// this.wmMap = global.window_manager.connect("map",async(e, actor)=>{
// log(`EVENT_WINDOW_CREATED::
//     id: ${(()=>{try {return actor.meta_window.get_id()} catch{}})()}
//     title: ${actor.meta_window.get_title()}
//     sandboxAppId (flatpak): ${actor.meta_window.get_sandboxed_app_id()}
//     description: ${actor.meta_window.get_description()}
//     root_ancestor: ${actor.meta_window.find_root_ancestor()?.get_id()}
//   wm:
//     wmClass: ${actor.meta_window.get_wm_class()}
//     wmClassInstance: ${actor.meta_window.get_wm_class_instance()}
//     wmRole: ${actor.meta_window.get_role()}
//     wmMutterHint: ${actor.meta_window.get_mutter_hints()}
//     wmType: ${["NORMAL","DESKTOP","DOCK","DIALOG","MODAL_DIALOG","TOOLBAR","MENU","UTILITY","SPLASHSCREEN","DROPDOWN_MENU","POPUP_MENU","TOOLTIP","NOTIFICATION","COMBO","DND","OVERRIDE_OTHER"][actor._windowType]}(${actor._windowType})
//     wmClientType: ${["WAYLAND (0)","X11 (1)"][actor.meta_window.get_client_type()]}
//     wmFrameType: ${["NORMAL 0","DIALOG 1","MODAL_DIALOG 2","UTILITY 3","MENU 4","BORDER 5","ATTACHED 6","LAST 7"][actor.meta_window.get_frame_type()]}
//   gtk:
//     gtkApplicationId: ${actor.meta_window.get_gtk_application_id()}
//     gtkApplicationObjectPath: ${actor.meta_window.get_gtk_application_object_path()}
//     gtkObjectPath: ${actor.meta_window.get_gtk_window_object_path()}
//     gtkMenubarObjectPath: ${actor.meta_window.get_gtk_menubar_object_path()}
//     gtkAppMenuObjectPath: ${get_gtk_app_menu_object_path()}
//     gtkUniqueBusName: ${actor.meta_window.get_gtk_unique_bus_name()}
//     gtkThemeVariant: ${actor.meta_window.get_gtk_theme_variant()}`)
// })

		this.wmMap = global.window_manager.connect("map",async(e, actor)=>{
			if (((!actor._windowType) || actor._windowType == Meta.WindowType.DESKTOP) && actor.meta_window.get_wm_class() == "Nemo-desktop") {
				actor.show()
				actor.opacity = 0
				actor.ease({
					opacity: 255,
					duration: 360,
					mode: Clutter.AnimationMode.EASE_IN_QUART
				})
				return
			}
			switch (actor._windowType) {
			case Meta.WindowType.NORMAL:
				actor.show()

				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_x = 0.6
				actor.scale_y = 0.6
				actor.opacity = 160

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 360,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: ()=>actor.set_pivot_point(0, 0)
				})
				break

				// const blur = new Shell.BlurEffect({
				// 	brightness: 1,
				// 	sigma: 82,
				// 	mode: Shell.BlurMode.ACTOR
				// })
				// actor.add_effect_with_name("open_blur",blur)

				// actor.remove_all_transitions()
				// actor.set_pivot_point(0.5, 0.5)
				// actor.scale_x = 1.5//0.6
				// actor.scale_y = 1.5//0.6
				// actor.opacity = 160

				// actor.ease({
				// 	opacity: 255,
				// 	scale_x: 1,
				// 	scale_y: 1,
				// 	duration: 385,//360,
				// 	mode: Clutter.AnimationMode.EASE_OUT_EXPO,
				// 	onStopped: ()=>actor.set_pivot_point(0, 0)
				// })
				// // break
				// const timeline = new Clutter.Timeline({ actor:actor,duration: 385,progress_mode: Clutter.AnimationMode.EASE_OUT_EXPO })
				// timeline.connect("new-frame",()=>{
				// 	const progress = timeline.get_progress()
				// 	blur.sigma = 82*(1-progress)
				// })
				// timeline.connect('completed', ()=>{
				// 	actor.remove_effect_with_name("open_blur")
				// })
				// timeline.start()
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
					onStopped: ()=>actor.set_pivot_point(0, 0)
				})
				break
			case Meta.WindowType.DROPDOWN_MENU:
			case Meta.WindowType.POPUP_MENU:
			case Meta.WindowType.OVERRIDE_OTHER:
				actor.show()
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_y = 0.9
				actor.scale_x = 0.9
				actor.opacity = 0
				actor.translation_z = -50

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					translation_z: 0,
					duration: 120,//190,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: ()=>actor.set_pivot_point(0, 0)
				})
				break
			case Meta.WindowType.MODAL_DIALOG:
			case Meta.WindowType.DIALOG:
				actor.show()
				actor.remove_all_transitions()
				actor.set_pivot_point(0.5, 0.5)
				actor.scale_y = 1.34
				actor.scale_x = 1.34
				actor.opacity = 0

				actor.ease({
					opacity: 255,
					scale_x: 1,
					scale_y: 1,
					duration: 280,//360,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: ()=>actor.set_pivot_point(0, 0)
				})
				break
			}
		})

		this.wmDestroy = global.window_manager.connect("destroy",async(e, actor)=>{
			if (((!actor._windowType) || actor._windowType == Meta.WindowType.DESKTOP) && actor.meta_window.get_wm_class() == "Nemo-desktop") {
				actor.opacity = 255
				actor.ease({
					opacity: 0,
					duration: 320,
					mode: Clutter.AnimationMode.EASE_OUT_QUART,
					onStopped: ()=>this.completed_destroy(actor)
				})
				return
			}
			let clone
			switch (actor._windowType) {
			case Meta.WindowType.NORMAL:
			case undefined:
				// const bottom = this.get_bottom(actor)
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone,actor)
				else global.window_group.add_child(clone)
				this.completed_destroy(actor)
			
				clone.set_pivot_point(0.5, 0.5)
				clone.opacity = 255
				clone.scale_x = 1
				clone.scale_y = 1
				// clone.translation_y = 0

				clone.ease({
					scale_x: 0.55,
					scale_y: 0.55,
					opacity: 0,
					// translation_y: bottom,
					duration: 200,
					mode: Clutter.AnimationMode.EASE_IN_QUART,
					onStopped: ()=>clone.destroy()
				})
				// clone.ease({
				// 	scale_x: 1.4,//0.55,
				// 	scale_y: 1.4,//0.55,
				// 	opacity: 0,
				// 	// translation_y: bottom,
				// 	// duration: 200,
				// 	duration: 385,
				// 	// mode: Clutter.AnimationMode.EASE_IN_QUART,
				// 	mode: Clutter.AnimationMode.EASE_OUT_EXPO,
				// 	onStopped: ()=>clone.destroy()
				// })

				// const blur = new Shell.BlurEffect({
				// 	brightness: 1,
				// 	sigma: 0,
				// 	mode: Shell.BlurMode.ACTOR
				// })
				// clone.add_effect_with_name("open_blur",blur)

				// // break
				// const timeline = new Clutter.Timeline({ actor:clone,duration: 385,progress_mode: Clutter.AnimationMode.EASE_OUT_EXPO })
				// timeline.connect("new-frame",()=>{
				// 	const progress = timeline.get_progress()
				// 	blur.sigma = 82*progress
				// })
				// timeline.connect('completed', ()=>{
				// 	clone.remove_effect_with_name("open_blur")
				// })
				// timeline.start()
				break
			case Meta.WindowType.TOOLTIP:
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone,actor)
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
					onStopped: ()=>clone.destroy()
				})
				break
			case Meta.WindowType.DROPDOWN_MENU:
			case Meta.WindowType.POPUP_MENU:
			case Meta.WindowType.OVERRIDE_OTHER:
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone,actor)
				else global.window_group.add_child(clone)
				this.completed_destroy(actor)

				clone.set_pivot_point(0.5, 0.5)
				clone.scale_y = 1
				clone.scale_x = 1
				clone.opacity = 255

				clone.ease({
					opacity: 0,
					scale_x: 0.9,
					scale_y: 0.9,
					duration: 280,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: ()=>clone.destroy()
				})
				break
			case Meta.WindowType.MODAL_DIALOG:
			case Meta.WindowType.DIALOG:
				clone = this._captureWindow(actor)
				if (actor.get_parent() == global.window_group) global.window_group.insert_child_above(clone,actor)
				else global.window_group.add_child(clone)
				this.completed_destroy(actor)

				clone.set_pivot_point(0.5, 0.5)
				clone.scale_y = 1
				clone.scale_x = 1
				clone.opacity = 255

				clone.ease({
					opacity: 0,
					scale_x: 1.1,
					scale_y: 1.1,
					duration: 260,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
					onStopped: ()=>clone.destroy()
				})
				break
			default:
				this.completed_destroy(actor)
				break
			}
		})

	}

	disable() {
		Main.wm._shouldAnimateActor = this.orig_shouldAnimateActor
		Main.wm._shellwm.completed_destroy = this.orig_completed_destroy
		this.orig_shouldAnimateActor = this.orig_completed_destroy = null
		this.shouldAnimateActor = this.completed_destroy = null

		global.window_manager.disconnect(this.wmMap)
		global.window_manager.disconnect(this.wmDestroy)
		this.wmMap = this.wmDestroy = null
	}
}
