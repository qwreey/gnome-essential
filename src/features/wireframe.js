import Meta from "gi://Meta"
import GLib from "gi://GLib"
import St from "gi://St"
import Clutter from "gi://Clutter"
import Gdk from "gi://Gdk"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
global.imports = { Meta, GLib, St, Clutter, Gdk, Main }

import {
	cloneWindow,
	getMinSize,
	getShadowSize,
	PointerMovePreventer,
	FakePointer,
	Maid,
	PointerUtil,
	getOffset,
	applyOffset,
	WindowMover,
	GrabOp,
} from "../libs/utility.js"
// TODO: 쉬프트키 누르면 창에 붙도록. 이건 타일링어시스턴트 코드 참조하자

export class Wireframe {
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
	#defer
	#deferFn

	async grapBegin(_d, window, op) {
		const gop = new GrabOp(op)
		if (!gop.isResizing()) return
		if (!window.resizeable) return
		this.#defer = true
		this.#deferFn = null

		// save positions
		this.#draggedWindow = window
		this.#draggedPos = getShadowSize(window)
		this.#draggedWindowOp = op

		// Show wireframe
		Main.layoutManager.addTopChrome(this.#draggingWidget)
		this.updateDraggingWidget(this.#draggedPos.frameX, this.#draggedPos.frameY, this.#draggedPos.frameWidth, this.#draggedPos.frameHeight)

		// update fake pointer
		this.#fakePointer.setPosition(...this.#pointerMovePreventer.lockMove())
		this.#fakePointer.updateMouseSprite(PointerUtil.getRawSprite(), ...PointerUtil.getRawHot())
		this.#fakePointer.show()
		GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1, () => {
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
			this.#draggedWindowClone = cloneWindow(
				windowActor,
				this.#draggedPos.bufferHeight,
				this.#draggedPos.bufferWidth,
				this.#draggedPos.bufferX,
				this.#draggedPos.bufferY
			),
			windowActor
		)
		windowActor.opacity = 0

		// Get min size
		let minSize = await getMinSize(window)
		this.#minWidth = minSize[0]
		this.#minHeight = minSize[1]
		windowActor.remove_all_transitions()

		// prevent resizing
		// this.#draggedWindowSizeChanged = window.connect("size-changed", () => {
		// 	const changedRect = getShadowSize(window)
		// 	if (
		// 		changedRect.frameX == this.#draggedPos.frameX &&
		// 		changedRect.frameY == this.#draggedPos.frameY &&
		// 		changedRect.frameWidth == this.#draggedPos.frameWidth &&
		// 		changedRect.frameHeight == this.#draggedPos.frameHeight
		// 	) return
		// 	window.move_resize_frame(true, this.#draggedPos.frameX, this.#draggedPos.frameY, this.#draggedPos.frameWidth, this.#draggedPos.frameHeight)
		// })
		this.#defer = false
		if (this.#deferFn) this.#deferFn()
		this.#deferFn = null
	}

	calculateSize(op, x, y, width, height, pointerX, pointerY, minWidth, minHeight) {
		const gop = new GrabOp(op)
		if (gop.isFacing(GrabOp.NORTH)) {
			const newHeight = Math.max(height + y - pointerY, minHeight)
			return [
				x,
				y - newHeight + height,
				width,
				newHeight,
			]
		} else if (gop.isFacing(GrabOp.SOUTH)) {
			return [
				x,
				y,
				width,
				Math.max(pointerY - y, minHeight),
			]
		} else if (gop.isFacing(GrabOp.WEST)) {
			const newWidth = Math.max(width + x - pointerX, minWidth)
			return [
				x - newWidth + width,
				y,
				newWidth,
				height,
			]
		} else if (gop.isFacing(GrabOp.EAST)) {
			return [
				x,
				y,
				Math.max(pointerX - x, minWidth),
				height,
			]
		} else if (gop.isFacing(GrabOp.NORTH, GrabOp.EAST)) {
			const newHeight = Math.max(height + y - pointerY, minHeight)
			return [
				x,
				y - newHeight + height,
				Math.max(pointerX - x, minWidth),
				newHeight,
			]
		} else if (gop.isFacing(GrabOp.SOUTH, GrabOp.EAST)) {
			return [
				x,
				y,
				Math.max(pointerX - x, minWidth),
				Math.max(pointerY - y, minHeight),
			]
		} else if (gop.isFacing(GrabOp.NORTH, GrabOp.WEST)) {
			const newWidth = Math.max(width + x - pointerX, minWidth)
			const newHeight = Math.max(height + y - pointerY, minHeight)
			return [
				x - newWidth + width,
				y - newHeight + height,
				newWidth,
				newHeight,
			]
		} else if (gop.isFacing(GrabOp.SOUTH, GrabOp.WEST)) {
			const newWidth = Math.max(width + x - pointerX, minWidth)
			return [
				x - newWidth + width,
				y,
				newWidth,
				Math.max(pointerY - y, minHeight),
			]
		}
	}
	calculateSizingCursorPosition(op, x, y, width, height, pointerX, pointerY) {
		const gop = new GrabOp(op)
		if (gop.isFacing(GrabOp.NORTH)) {
			return [
				pointerX,
				y
			]
		} else if (gop.isFacing(GrabOp.SOUTH)) {
			return [
				pointerX,
				y + height
			]
		} else if (gop.isFacing(GrabOp.WEST)) {
			return [
				x,
				pointerY
			]
		} else if (gop.isFacing(GrabOp.EAST)) {
			return [
				x + width,
				pointerY
			]
		} else if (gop.isFacing(GrabOp.NORTH, GrabOp.EAST)) {
			return [
				x + width,
				y
			]
		} else if (gop.isFacing(GrabOp.SOUTH, GrabOp.EAST)) {
			return [
				x + width,
				y + height
			]
		} else if (gop.isFacing(GrabOp.NORTH, GrabOp.WEST)) {
			return [
				x,
				y
			]
		} else if (gop.isFacing(GrabOp.SOUTH, GrabOp.WEST)) {
			return [
				x,
				y + height
			]
		}
	}
	grapEnd(_d, window, op) {
		if (this.#draggedWindow != window) return

		// Remove wireframe
		Main.layoutManager.removeChrome(this.#draggingWidget)

		// Disconnect resize event
		// this.#draggedWindow.disconnect(this.#draggedWindowSizeChanged)
		// this.#draggedWindowSizeChanged = null

		// Calculate new size
		const [newX, newY, newWidth, newHeight] = this.calculateSize(
			this.#draggedWindowOp,
			this.#draggedPos.frameX,
			this.#draggedPos.frameY,
			this.#draggedPos.frameWidth,
			this.#draggedPos.frameHeight,
			...applyOffset(
				[this.#fakePointer.x, this.#fakePointer.y],
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
		this.#windowMover.setWindowRect(window, newX, newY, newWidth, newHeight, true, this.#draggedWindowClone, this.#draggedPos)
		this.#draggedWindowActor = this.#draggedWindowClone = this.#draggedWindow = null
	}
	pointerMove(x, y) {
		if (!this.#draggedWindow) return
		if (this.#defer) {
			this.#deferFn = () => this.pointerMove(x, y)
			return
		}
		this.#fakePointer.setPosition(x, y)

		// Update wireframe
		const [newX, newY, newWidth, newHeight] = this.calculateSize(
			this.#draggedWindowOp,
			this.#draggedPos.frameX,
			this.#draggedPos.frameY,
			this.#draggedPos.frameWidth,
			this.#draggedPos.frameHeight,
			...applyOffset([x, y], this.#sizingCursorOffset),
			this.#minWidth,
			this.#minHeight
		)
		this.updateDraggingWidget(newX, newY, newWidth, newHeight)
	}
	updateDraggingWidget(x, y, width, height) {
		this.#draggingWidget.x = x
		this.#draggingWidget.y = y
		this.#draggingWidget.width = width
		this.#draggingWidget.height = height
	}

	enable() {
		const maid = this.#maid = new Maid()
		maid.safeDestroyJob(this.#windowMover = new WindowMover(), Maid.Priority.Low)
		maid.safeDestroyJob(this.#pointerMovePreventer = new PointerMovePreventer(), Maid.Priority.Low)
		maid.safeDestroyJob(this.#fakePointer = new FakePointer(), Maid.Priority.Low)
		maid.connectJob(global.display, 'grab-op-begin', this.grapBegin.bind(this))
		maid.connectJob(global.display, 'grab-op-end', this.grapEnd.bind(this))
		maid.connectJob(this.#pointerMovePreventer, 'pointer-move', this.pointerMove.bind(this))
		maid.safeDestroyJob(this.#draggingWidget = new St.Widget({
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
