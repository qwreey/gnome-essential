const { St, GLib, Meta, Shell, Clutter } = imports.gi
const Main = imports.ui.main

const PointerWatcher = imports.ui.pointerWatcher
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { getShadowSize, PointerMovePreventer, FakePointer, resizingOps, Maid, PointerUtil, getOffset, applyOffset, WindowMover } = Me.imports.libs.utility

// TODO: 쉬프트키 누르면 창에 붙도록. 이건 타일링어시스턴트 코드 참조하자

var Wireframe = class Wireframe {
	#pointerMovePreventer
	#fakePointer
	#maid
	#draggedWindow
	#draggedWindowActor
	#draggedPos
	#draggedWindowSizeChanged
	#draggedWindowClone
	#draggedWindowOp
	#draggingWidget
	#sizingCursorOffset
	#minWidth
	#minHeight
	#windowMover

	grapBegin(_d ,window, op) {
		if (!resizingOps.includes(op)) return
	
		// save positions
		this.#draggedWindow = window
		this.#draggedPos = getShadowSize(window)
		this.#draggedWindowOp = op
		
		// Show wireframe
		Main.layoutManager.addTopChrome(this.#draggingWidget)
		this.updateDraggingWidget(this.#draggedPos.frameX,this.#draggedPos.frameY,this.#draggedPos.frameWidth,this.#draggedPos.frameHeight)

		// update fake pointer
		this.#fakePointer.setPosition(...this.#pointerMovePreventer.lockMove())
		this.#fakePointer.updateMouseSprite(PointerUtil.getRawSprite(), ...PointerUtil.getRawHot())
		this.#fakePointer.show()
		GLib.timeout_add(GLib.PRIORITY_DEFAULT,1,()=>{
			this.#fakePointer.updateMouseSprite(PointerUtil.getRawSprite(), ...PointerUtil.getRawHot())
			global.display.set_cursor(Meta.Cursor.BLANK)
		})

		// Save resize pointer / fake pointer offset
		this.#sizingCursorOffset = getOffset(
			this.calculateSizingCursorPosition(op,
				this.#draggedPos.frameX,
				this.#draggedPos.frameY,
				this.#draggedPos.frameWidth,
				this.#draggedPos.frameHeight,
				this.#pointerMovePreventer.x,
				this.#pointerMovePreventer.y
			),
			[
				this.#pointerMovePreventer.x,
				this.#pointerMovePreventer.y
			]
		)

		// Create clone
		const windowActor = this.#draggedWindowActor = this.#draggedWindow.get_compositor_private()
		global.window_group.insert_child_above(
			this.#draggedWindowClone = new Clutter.Actor({
				height: this.#draggedPos.bufferHeight,
				width: this.#draggedPos.bufferWidth,
				x: this.#draggedPos.bufferX,
				y: this.#draggedPos.bufferY,
				content: windowActor.paint_to_content(null),
			}
		),windowActor)
		windowActor.hide()

		// Get min size
		if (window.maximized_vertically || window.maximized_horizontally) {
			window.unmaximize(Meta.MaximizeFlags.BOTH)
			windowActor.remove_all_transitions() // remove unmaximize animation
		}
		window.move_resize_frame(true, 0,0,0,0)
		const { width, height } = window.get_frame_rect()
		this.#minWidth = width
		this.#minHeight = height
		window.move_resize_frame(true, this.#draggedPos.frameX, this.#draggedPos.frameY, this.#draggedPos.frameWidth, this.#draggedPos.frameHeight)

		// prevent resizing
		this.#draggedWindowSizeChanged = window.connect("size-changed",()=>{
			const changedRect = getShadowSize(window)
			if (
				changedRect.frameX == this.#draggedPos.frameX &&
				changedRect.frameY == this.#draggedPos.frameY &&
				changedRect.frameWidth == this.#draggedPos.frameWidth &&
				changedRect.frameHeight == this.#draggedPos.frameHeight
			) return
			window.move_resize_frame(true, this.#draggedPos.frameX, this.#draggedPos.frameY, this.#draggedPos.frameWidth, this.#draggedPos.frameHeight)
		})
	}
	calculateSize(op, x, y, width, height, pointerX, pointerY, minWidth, minHeight) {
		if (op == Meta.GrabOp.RESIZING_N) {
			const newHeight = Math.max(height+y-pointerY,minHeight)
			return [
				x,
				y-newHeight+height,
				width,
				newHeight,
			]
		} else if (op == Meta.GrabOp.RESIZING_S) {
			return [
				x,
				y,
				width,
				Math.max(pointerY-y,minHeight),
			]
		} else if (op == Meta.GrabOp.RESIZING_W) {
			const newWidth = Math.max(width+x-pointerX,minWidth)
			return [
				x-newWidth+width,
				y,
				newWidth,
				height,
			]
		} else if (op == Meta.GrabOp.RESIZING_E) {
			return [
				x,
				y,
				Math.max(pointerX-x,minWidth),
				height,
			]
		} else if (op == Meta.GrabOp.RESIZING_NE) {
			const newHeight = Math.max(height+y-pointerY,minHeight)
			return [
				x,
				y-newHeight+height,
				Math.max(pointerX-x,minWidth),
				newHeight,
			]
		} else if (op == Meta.GrabOp.RESIZING_SE) {
			return [
				x,
				y,
				Math.max(pointerX-x,minWidth),
				Math.max(pointerY-y,minHeight),
			]
		} else if (op == Meta.GrabOp.RESIZING_NW) {
			const newWidth = Math.max(width+x-pointerX,minWidth)
			const newHeight = Math.max(height+y-pointerY,minHeight)
			return [
				x-newWidth+width,
				y-newHeight+height,
				newWidth,
				newHeight,
			]
		} else if (op == Meta.GrabOp.RESIZING_SW) {
			const newWidth = Math.max(width+x-pointerX,minWidth)
			return [
				x-newWidth+width,
				y,
				newWidth,
				Math.max(pointerY-y,minHeight),
			]
		}
	}
	calculateSizingCursorPosition(op, x, y, width, height, pointerX, pointerY) {
		if (op == Meta.GrabOp.RESIZING_N) {
			return [
				pointerX,
				y
			]
		} else if (op == Meta.GrabOp.RESIZING_S) {
			return [
				pointerX,
				y+height
			]
		} else if (op == Meta.GrabOp.RESIZING_W) {
			return [
				x,
				pointerY
			]
		} else if (op == Meta.GrabOp.RESIZING_E) {
			return [
				x+width,
				pointerY
			]
		} else if (op == Meta.GrabOp.RESIZING_NE) {
			return [
				x+width,
				y
			]
		} else if (op == Meta.GrabOp.RESIZING_SE) {
			return [
				x+width,
				y+height
			]
		} else if (op == Meta.GrabOp.RESIZING_NW) {
			return [
				x,
				y
			]
		} else if (op == Meta.GrabOp.RESIZING_SW) {
			return [
				x,
				y+height
			]
		}
	}
	grapEnd(_d ,window, op) {
		if (this.#draggedWindow != window) return

		// Remove wireframe
		Main.layoutManager.removeChrome(this.#draggingWidget)

		// Disconnect resize event
		this.#draggedWindow.disconnect(this.#draggedWindowSizeChanged)
		this.#draggedWindowSizeChanged = null

		// Calculate new size
		const [ newX, newY, newWidth, newHeight ] = this.calculateSize(
			this.#draggedWindowOp,
			this.#draggedPos.frameX,
			this.#draggedPos.frameY,
			this.#draggedPos.frameWidth,
			this.#draggedPos.frameHeight,
			...applyOffset(
				[ this.#fakePointer.x, this.#fakePointer.y ],
				this.#sizingCursorOffset
			),
			this.#minWidth,
			this.#minHeight
		)
		
		// Set cursor position and hide fake pointer
		this.#pointerMovePreventer.unlockMove()
		PointerUtil.position = this.#fakePointer.getPosition()
		this.#fakePointer.hide()
		global.display.set_cursor(Meta.Cursor.DEFAULT)
		
		// Create resize animation on clone actor
		this.#windowMover.setWindowRect(window, newX, newY, newWidth, newHeight, true, this.#draggedWindowClone)
		this.#draggedWindowActor = this.#draggedWindowClone = this.#draggedWindow = null
	}
	pointerMove(x, y) {
		if (!this.#draggedWindow) return
		this.#fakePointer.setPosition(x, y)

		// Update wireframe
		const [ newX, newY, newWidth, newHeight ] = this.calculateSize(
			this.#draggedWindowOp,
			this.#draggedPos.frameX,
			this.#draggedPos.frameY,
			this.#draggedPos.frameWidth,
			this.#draggedPos.frameHeight,
			...applyOffset([x,y],this.#sizingCursorOffset),
			this.#minWidth,
			this.#minHeight
		)
		this.updateDraggingWidget(newX,newY,newWidth,newHeight)
	}
	updateDraggingWidget(x,y,width,height) {
		this.#draggingWidget.x = x + 3
		this.#draggingWidget.y = y + 3
		this.#draggingWidget.width = width - 6
		this.#draggingWidget.height = height - 6
	}

	enable() {
		this.#maid = new Maid()
		this.#maid.safeDestroyJob( this.#windowMover = new WindowMover(), Maid.Priority.Low )
		this.#maid.safeDestroyJob( this.#pointerMovePreventer = new PointerMovePreventer(), Maid.Priority.Low )
		this.#maid.safeDestroyJob( this.#fakePointer = new FakePointer(),                   Maid.Priority.Low )
		this.#maid.connectJob(global.display, 'grab-op-begin', this.grapBegin.bind(this))
		this.#maid.connectJob(global.display, 'grab-op-end',   this.grapEnd.bind(this))
		this.#maid.connectJob(this.#pointerMovePreventer, 'pointer-move', this.pointerMove.bind(this))
		this.#maid.safeDestroyJob(this.#draggingWidget = new St.Widget({
			style: "background: rgba(185, 115, 255, 0.16); border-radius: 12px; border: solid rgba(164, 79, 255, 0.78) 1px;",
		}))
	}

	disable() {
		this.#maid.destroy()
		this.#maid =
		this.#pointerMovePreventer =
		this.#draggingWidget =
		this.#fakePointer = null
	}
}
