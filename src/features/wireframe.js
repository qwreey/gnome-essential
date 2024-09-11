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

const CommonMinSizePrecalc = {
	"Stardew Valley": [100, 100],
	"firefox": [450, 120],
	"Thorium-browser": [500, 29],
	"com.raggesilver.BlackBox": [290, 100],
	"Code": [400, 307],
	"nemo": [
		{
			"title_regex": "^.* Properties$",
			"window_type": 0,
			"size": [452, 701],
		},
		{
			"title": "File Management Preferences",
			"window_type": 0,
			"size": [186, 83],
		},
		{
			"window_type": 0,
			"size": [324, 209],
		},
	],
	// dynamic size, yea
	// "org.gnome.gitlab.somas.Apostrophe": [656, 501],
	"org.gnome.Extensions": [
		{
			"window_type": 0,
			"size": [275, 205],
		},
		{
			"window_type": 4,
			"size": [640, 576],
		},
	],
	"vesktop": [1, 38],
	"com.belmoussaoui.Obfuscate": [360, 360],
	"dev.geopjr.Collision": [360, 360],
	"org.gnome.Settings": [360, 294],
	"org.gnome.Snapshot": [360, 294],
	"dconf-editor": [301, 232],
	"gedit": [479, 136],
	"geary": [360, 140],
	"com.belmoussaoui.Decoder": [360, 294],
	"Amberol": [356, 663],
	"org.gnome.Weather": [381, 542],
	"org.remmina.Remmina": [
		{
			"title": "Remmina Remote Desktop",
			"window_type": 0,
			"size": [671, 204],
		},
		{
			"title": "Remmina Preferences",
			"window_type": 0,
			"size": [812, 515],
		},
		{
			"window_type": 0,
			"size": [185, 100],
		}
	],
	"com.obsproject.Studio": [
		{
			"title": "Settings",
			"size": [706, 545],
		},
		{
			"title_regex": "^OBS [\\-\\.\\d]* \\- Profile: .* \\- Scenes: .*$",
			"size": [875, 376],
		}
	],
	"org.gnome.clocks": [360, 294],
	"org.pulseaudio.pavucontrol": [280, 179],
	"eog": [
		{
			"title": "Preferences",
			"window_type": 0,
			"sizze": [294, 414],
		},
		{
			"window_type": 0,
			"size": [473, 298],
		}
	],
	"com.github.rafostar.Clapper": [352, 198],
	"org.gnome.gitlab.YaLTeR.VideoTrimmer": [307, 234],
	"org.gnome.SystemMonitor": [620, 480],
	"com.github.wwmm.easyeffects": [486, 433],
	"org.gnome.Calendar": [360, 600],
	"sober": [
		{
			"title": "Sober",
			"size": [185, 100],
			"window_type": 0,
		}
	],

	// [(w=r(66).get_parent().get_parent().meta_window).get_frame_rect().width,w.get_frame_rect().height,w.wm_class,w.window_type]
	// log((w=r(77).get_parent().get_parent().meta_window).get_frame_rect().width,w.get_frame_rect().height,w.wm_class,w.window_type)
}
const MinSize = [100, 100]

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

	getMinSizePrecalc(meta_window) {
		const wm_class = meta_window.wm_class
		if (!wm_class) return null
		const precalc = CommonMinSizePrecalc[wm_class]

		if (!precalc) return null
		if (typeof precalc[0] === "number") {
			if (meta_window.window_type === 0) {
				return precalc
			}
			return null
		}

		for (const field of precalc) {
			if (field.title && field.title !== meta_window.title) {
				continue
			}
			if (field.window_type && field.window_type !== meta_window.window_type) {
				continue
			}
			if (field.title_regex) {
				if (!meta_window.title) continue
				let regex = field._title_regex
				if (!regex) {
					regex = field._title_regex = new RegExp(field.title_regex)
				}
				if (!meta_window.title.match(regex)) {
					continue
				}
			}
			return field.size
		}
		return null
	}

	async grapBegin(window, op) {
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
		let minSize = this.getMinSizePrecalc(window)
		if (!minSize) minSize = await getMinSize(window)
		this.#minWidth = Math.max(MinSize[0], minSize[0])
		this.#minHeight = Math.max(MinSize[1], minSize[1])
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
		this.#deferFn = null

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
		this.#windowMover
			.setWindowRect(window, newX, newY, newWidth, newHeight, this.#draggedWindowClone, this.#draggedPos)
			.catch(log)
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
		if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) return
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
		maid.connectJob(global.display, 'grab-op-begin', (_d, window, op) => {
			this.grapBegin(window, op).catch(log)
		})
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
