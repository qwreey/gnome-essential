import Clutter from "gi://Clutter"
import Meta from "gi://Meta"
import GLib from "gi://GLib"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

import { FocusArray } from "./libs/utility.js"

const WINDOW_ANIMATION_TIME = 340//340;

export class ChangeWorkspaceEasing {
	constructor() {
	}

	#freezableWindowTypes = [
		Meta.WindowType.NORMAL,
		Meta.WindowType.DIALOG,
		Meta.WindowType.MODAL_DIALOG,
	]

	is_freezable(actor) {
		let meta_window = actor?.meta_window
		if (!meta_window) return false
		if ((!actor.is_mapped()) || (!actor.is_realized()) || (!actor.is_visible()) || (actor.is_destroyed())) return false
		if (meta_window.get_wm_class() == "Nemo-desktop") return false
		if (!meta_window.showing_on_its_workspace()) return false
		if (!this.#freezableWindowTypes.includes(meta_window.window_type)) return false
		return true
	}

	enable() {
		this.animateSwitch = imports.ui.workspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch
		// imports.ui.workspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch = (from, to, direction, onComplete)=>{
		// Main.wm._workspaceAnimation.animateSwitch = function (from, to, direction, onComplete) {
		let animation = false
		let freezeWindows = []
		let is_freezable = this.is_freezable.bind(this)
		let nemoBackgrounds = {}
		let aniId = 0
		imports.ui.workspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch = function (from, to, direction, onComplete) {
			//! >>>>>>>>> PATCH:NEMO_MOVING
			// Show nemo desktop in each workspaces
			if (!animation) {
				nemoBackgrounds = {}
				global.get_window_actors().forEach(window => {
					if (window.meta_window.get_wm_class() != "Nemo-desktop") return
					let monitorIndex = window.meta_window.get_monitor()
					if (nemoBackgrounds[monitorIndex]) return
					let monitorGeometry = global.display.get_monitor_geometry(monitorIndex)
					nemoBackgrounds[monitorIndex] = {
						window,
						monitorGeometry,
						content: window.paint_to_content(null),
						height: window.height,
						width: window.width,
						y: window.y - monitorGeometry.y,
					}
					// window.hide()
				})
				aniId++;
			}
			let thisAniId = aniId;
			//! <<<<<<<<< PATCH:NEMO_MOVING

			//! >>>>>>>>> PATCH:FREEZE
			// freeze all window to skip all window buffer updates
			// it helps make ws animation's fps better
			if (!animation) {
				freezeWindows = []
				global.get_window_actors().forEach(actor=>{
					if (!is_freezable(actor)) return
					actor.freeze()
					freezeWindows.push(actor)
				})
			}
			animation = true
			//! <<<<<<<<< PATCH:FREEZE

			// gnome's default code
			this._swipeTracker.enabled = false;
		
			let workspaceIndices = [];
		
			switch (direction) {
			case Meta.MotionDirection.UP:
			case Meta.MotionDirection.LEFT:
			case Meta.MotionDirection.UP_LEFT:
			case Meta.MotionDirection.UP_RIGHT:
				workspaceIndices = [to, from];
				break;
		
			case Meta.MotionDirection.DOWN:
			case Meta.MotionDirection.RIGHT:
			case Meta.MotionDirection.DOWN_LEFT:
			case Meta.MotionDirection.DOWN_RIGHT:
				workspaceIndices = [from, to];
				break;
			}
		
			if (Clutter.get_default_text_direction() === Clutter.TextDirection.RTL &&
				direction !== Meta.MotionDirection.UP &&
				direction !== Meta.MotionDirection.DOWN)
				workspaceIndices.reverse();
		
			this._prepareWorkspaceSwitch(workspaceIndices);
			this._switchData.inProgress = true;
		
			const fromWs = global.workspace_manager.get_workspace_by_index(from);
			const toWs = global.workspace_manager.get_workspace_by_index(to);
		
			for (const monitorGroup of this._switchData.monitors) {
				monitorGroup.progress = monitorGroup.getWorkspaceProgress(fromWs);
				const progress = monitorGroup.getWorkspaceProgress(toWs);
		
				const params = {
					duration: WINDOW_ANIMATION_TIME,
					mode: Clutter.AnimationMode.EASE_OUT_EXPO,
				};

				if (monitorGroup.index === Main.layoutManager.primaryIndex) {
					params.onComplete = () => {
						//! >>>>>>>>> PATCH:UNFREEZE
						// undo freeze
						freezeWindows.forEach(actor=>{
							if (actor.is_destroyed()) return
							actor.thaw()
						})
						animation = false
						//! <<<<<<<<< PATCH:UNFREEZE

						this._finishWorkspaceSwitch(this._switchData);
						if (onComplete) onComplete();
						this._swipeTracker.enabled = true;

						//! >>>>>>>>> PATCH:FOCUS
						FocusArray.focusTopWindowOfWorkspace(toWs)
						GLib.timeout_add(GLib.PRIORITY_DEFAULT,60,()=>{
							if (thisAniId == aniId) FocusArray.focusTopWindowOfWorkspace(toWs)
							return GLib.SOURCE_REMOVE
						})
						//! >>>>>>>>> PATCH:FOCUS
					};
				}

				if (toWs.noAnimation || fromWs.noAnimation) {
					fromWs.noAnimation = toWs.noAnimation = null
					monitorGroup.progress = progress
					params.onComplete()
				} else {
					monitorGroup.ease_property('progress', progress, params);
				}
			}
		}

		this.createWindow = imports.ui.workspaceAnimation.WorkspaceGroup.prototype._createWindows
		imports.ui.workspaceAnimation.WorkspaceGroup.prototype._createWindows = function() {
			let monitor = this._monitor
			
			//! >>>>>>>>> PATCH:NEMO_MOVING
			let nemoInfo = nemoBackgrounds[monitor.index]
			if (nemoInfo && this._background) {
				this.add_child(this.nemoCapture = new Clutter.Actor({
					height: nemoInfo.height,
					width: nemoInfo.width,
					x: 0,
					y: nemoInfo.y,
					content: nemoInfo.content,
				}))
			}
			//! <<<<<<<<< PATCH:NEMO_MOVING

			global.get_window_actors().forEach(window => {
				if (window.meta_window.get_wm_class() == "Nemo-desktop") return
				if (!this._shouldShowWindow(window.meta_window)) return
	
				//! >>>>>>>>> PATCH:FPS_PATCH
				// using capture instead of cloning, much better for fps
				const capture = new Clutter.Actor({
					height: window.height,
					width: window.width,
					x: window.x - monitor.x,
					y: window.y - monitor.y,
					content: window.paint_to_content(null)
				})
				this.add_child(capture)
	
				const record = { windowActor: window, clone: capture }

				// window.connectObject('destroy', () => {
				// 	capture.destroy()
				// 	this._windowRecords.splice(this._windowRecords.indexOf(record), 1)
				// }, this)
				//! <<<<<<<<< PATCH:FPS_PATCH
	
				this._windowRecords.push(record)
			})
		}

		imports.ui.workspaceAnimation.WorkspaceGroup.prototype._syncStacking = function() {
			const windowActors = global.get_window_actors().filter(w =>
				this._shouldShowWindow(w.meta_window));
	
			let lastRecord;
			const bottomActor = this._background ?? null;
	
			for (const windowActor of windowActors) {
				const record = this._windowRecords.find(r => r.windowActor === windowActor);
				if (!record?.clone) continue;
	
				this.set_child_above_sibling(record.clone,
					lastRecord ? lastRecord.clone : bottomActor);
				lastRecord = record;
			}

			//! >>>>>>>>> PATCH:NEMO_MOVING
			if (this.nemoCapture) {
				this.set_child_above_sibling(this.nemoCapture,bottomActor)
			}
			//! <<<<<<<<< PATCH:NEMO_MOVING
		}
	}

	disable() {
		imports.ui.workspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch = this.animateSwitch
		imports.ui.workspaceAnimation.WorkspaceGroup.prototype._createWindows = this.createWindow
	}
}
