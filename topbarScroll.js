
import Meta from "gi://Meta"
import Clutter from "gi://Clutter"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

export class TopbarScroll {
	constructor() {
		this.panel = Main.panel
		this.panelBinding = null
		this.lastScroll = Date.now()
		this.scrollDelay = 180
	}
	enable() {
		this.panel.reactive = true
		if (this.panelBinding) {
			disable()
		}
		this.panelBinding = this.panel.connect('scroll-event',this._onScroll.bind(this))
	}
	
	disable() {
		if (this.panelBinding) {
			this.panel.disconnect(this.panelBinding)
			this.panelBinding = null
		}
	}

	_onScroll(actor, event) {
		let source = event.get_source()
		if (source != actor) {
			let inStatusArea = this.panel._rightBox.contains(source)
			if (inStatusArea) {
				return Clutter.EVENT_PROPAGATE
			}
		}
		
		let motion
		switch(event.get_scroll_direction()) {
			case Clutter.ScrollDirection.UP:
				motion = Meta.MotionDirection.LEFT
				break
			case Clutter.ScrollDirection.DOWN:
				motion = Meta.MotionDirection.RIGHT
				break
			default:
				return Clutter.EVENT_PROPAGATE
		}
		let activeWs = global.workspaceManager.get_active_workspace()
		let ws = activeWs.get_neighbor(motion)
		if(!ws) return Clutter.EVENT_STOP
		if(ws.index() == global.workspaceManager.get_n_workspaces()-1) return Clutter.EVENT_STOP

		let currentTime = Date.now()
		if (currentTime < this.lastScroll + this.scrollDelay) {
			if(currentTime<this.lastScroll) {
				this.lastScroll = 0
			}
			else {
				return Clutter.EVENT_STOP
			}
		}
		
		this.lastScroll = currentTime
		Main.wm.actionMoveWorkspace(ws)
		return Clutter.EVENT_STOP
	}
}

