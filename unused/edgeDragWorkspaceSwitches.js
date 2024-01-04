const {Shell, Meta} = imports.gi
const Layout = imports.ui.layout
const Main = imports.ui.main

var EdgeDragWorkspaceSwitches = class EdgeDragWorkspaceSwitches {
	enable() {
		// -----------------------------------------------------------------------------------
		// ----------------------- enable edge-drag workspace-switches -----------------------
		// -----------------------------------------------------------------------------------

		// We add two Meta.Barriers, one at each side of the stage. If the pointer hits one of
		// these with enough pressure while dragging a window, we initiate a workspace-switch.
		// The last parameter (0) is actually supposed to be a bitwise combination of
		// Shell.ActionModes. The pressure barrier will only trigger, if Main.actionMode
		// equals one of the given action modes. This works well for Shell.ActionMode.NORMAL
		// and Shell.ActionMode.OVERVIEW, however it does not work for Shell.ActionMode.NONE
		// (which actually equals zero). However, when we want the barriers to also trigger in
		// Shell.ActionMode.NONE, as this is the mode during a drag-operation in the overview.
		// Therefore, we modify the _onBarrierHit method of the pressure barrier to completely
		// ignore this parameter. Instead, we check for the correct action mode in the trigger
		// handler.
		this._pressureBarrier =
			new Layout.PressureBarrier(
				120,
				// this._settings.get_int('edge-switch-pressure'),
				Layout.HOT_CORNER_PRESSURE_TIMEOUT, 0)

		// Update pressure threshold when the corresponding settings key changes.
		// this._settings.connect('changed::edge-switch-pressure', () => {
		//     this._pressureBarrier._threshold = this._settings.get_int('edge-switch-pressure')
		// })

		// This is an exact copy of the original _onBarrierHit, with only one line disabled to
		// ignore the given ActionMode.
		// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/layout.js#L1366
		this._pressureBarrier._onBarrierHit = function(barrier, event) {
			barrier._isHit = true

			// If we've triggered the barrier, wait until the pointer has the
			// left the barrier hitbox until we trigger it again.
			if (this._isTriggered) return

			if (this._eventFilter && this._eventFilter(event)) return

			// Throw out all events not in the proper keybinding mode
			// if (!(this._actionMode & Main.actionMode)) return

			let slide    = this._getDistanceAlongBarrier(barrier, event)
			let distance = this._getDistanceAcrossBarrier(barrier, event)

			if (distance >= this._threshold) {
				this._trigger()
				return
			}

			// Throw out events where the cursor is move more
			// along the axis of the barrier than moving with
			// the barrier.
			if (slide > distance) return

			this._lastTime = event.time

			this._trimBarrierEvents()
			distance = Math.min(15, distance)

			this._barrierEvents.push([event.time, distance])
			this._currentPressure += distance

			if (this._currentPressure >= this._threshold) this._trigger()
		}

		// Now we add the left and right barrier to the pressure barrier.
		const createBarriers = () => {
			if (this._leftBarrier) {
				this._pressureBarrier.removeBarrier(this._leftBarrier)
				this._leftBarrier.destroy()
			}

			if (this._rightBarrier) {
				this._pressureBarrier.removeBarrier(this._rightBarrier)
				this._rightBarrier.destroy()
			}

			this._leftBarrier = new Meta.Barrier({
				display: global.display,
				x1: 0,
				x2: 0,
				y1: 1,
				y2: global.stage.height,
				directions: Meta.BarrierDirection.POSITIVE_X,
			})

			this._rightBarrier = new Meta.Barrier({
				display: global.display,
				x1: global.stage.width,
				x2: global.stage.width,
				y1: 1,
				y2: global.stage.height,
				directions: Meta.BarrierDirection.NEGATIVE_X,
			})

			this._pressureBarrier.addBarrier(this._leftBarrier)
			this._pressureBarrier.addBarrier(this._rightBarrier)
		}

		// Re-create the barriers whenever the stage's allocation is changed.
		this._stageAllocationID = global.stage.connect('notify::allocation', createBarriers)
		createBarriers()

		// When the pressure barrier is triggered, the corresponding setting is enabled, and a
		// window is currently dragged, we move the dragged window to the adjacent workspace
		// and activate it as well.
		this._pressureBarrier.connect('trigger', () => {
			const direction =
				this._leftBarrier._isHit ? Meta.MotionDirection.LEFT : Meta.MotionDirection.RIGHT

			const newWorkspace =
				global.workspace_manager.get_active_workspace().get_neighbor(direction)

			if (Main.actionMode == Shell.ActionMode.NORMAL && this._draggedWindow) {
				Main.wm.actionMoveWindow(this._draggedWindow, newWorkspace)
			} else if (Main.actionMode == Shell.ActionMode.NONE && Main.overview.visible) {
				newWorkspace.activate(global.get_current_time())
			}
		})

		// Keep a reference to the currently dragged window.
		this._grapOpBegin = global.display.connect('grab-op-begin', (d, win, op) => {
			if (op == Meta.GrabOp.MOVING) {
				this._draggedWindow = win
			}
		})

		// Release the reference to the currently dragged window.
		this._grapOpEnd = global.display.connect('grab-op-end', (d, win, op) => {
			if (op == Meta.GrabOp.MOVING) {
				this._draggedWindow = null
			}
		})

	}

	disable() {
		global.display.disconnect(this._grapOpBegin)
		global.display.disconnect(this._grapOpEnd)
		global.stage.disconnect(this._stageAllocationID)
		this._pressureBarrier.destroy()
		this._leftBarrier.destroy()
		this._rightBarrier.destroy()

		this._pressureBarrier = null
		this._leftBarrier     = null
		this._rightBarrier    = null
	}
}