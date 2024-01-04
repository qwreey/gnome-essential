var FocusArrayProvider = new class {
	array
	#settings

	focusWindow(window) {
		let index = this.array.indexOf(window)
		if (index != -1) {
			this.array.splice(index,1)
		}
		this.array.unshift(window)
	}

	destroyWindow(window) {
		let index = this.array.indexOf(window)
		if (index != -1) {
			this.array.splice(index)
		}
	}

	createWindow(window) {
		if (!isFocusable(window)) return
		if (window.has_focus()) this.focusWindow(window)
		else if (!this.array.includes(window)) this.array.push(window)
		window._change_ws_easing_focus = window.connect('focus', ()=>this.focusWindow(window))
		window._change_ws_easing_unmanaged = window.connect('unmanaged', ()=>this.destroyWindow(window))
	}

	constructor() {}

	getTopWindowOfWorkspace(workspace) {
		return this.array.find(window=>
			window.located_on_workspace(workspace)
			&& window.showing_on_its_workspace() && (!window.minimized))
		|| global.get_window_actors().find(actor=>actor.meta_window.get_wm_class()=="Nemo-desktop")?.meta_window
	}

	focusTopWindowOfWorkspace(workspace) {
		const firstWindow = this.getTopWindowOfWorkspace(workspace)
		if (firstWindow) {
			firstWindow.focus(global.get_current_time())
		}
	}

	enable() {
		global.focusArray = this
		this.array = []
		this.#settings = ExtensionUtils.getSettings()
		global.display.connect('window-created', (_,window)=>this.createWindow(window))
		const windowList = global.get_window_actors()
			.map(actor=>actor.meta_window)
			.filter(window=>window)
			
		const lastWindowIds = this.#settings.get_strv("qe-ws-last-windows")
		if (lastWindowIds) {
			lastWindowIds.forEach(windowId=>{
				let window = windowList.find(window=>window.get_description()==windowId)
				if (!window) return
				let actor = window.get_compositor_private()
				if (!actor) return
				if (actor.is_destroyed()) return
				this.createWindow(window)
			})
		}
		windowList.forEach(this.createWindow.bind(this))
	}

	disable() {
		const saveList = []
		this.array.forEach(window=>{
			if (!window) return
			let actor = window.get_compositor_private()
			if (!actor) return
			if (actor.is_destroyed()) return
			
			saveList.push(""+window.get_description())
		})
		this.#settings.set_strv("qe-ws-last-windows",saveList)
		this.#settings.run_dispose()
		this.#settings = this.focusArray = global.focusArray = null

		for (const actor of global.get_window_actors()) {
			if (actor.is_destroyed()) continue
			let window = actor.get_meta_window()
			if (!window) return
			if (window._change_ws_easing_focus) {
				window.disconnect(window._change_ws_easing_focus)
				delete window._change_ws_easing_focus
			}
			if (window._change_ws_easing_unmanaged) {
				window.disconnect(window._change_ws_easing_unmanaged)
				delete window._change_ws_easing_unmanaged
			}
		}
	}
}