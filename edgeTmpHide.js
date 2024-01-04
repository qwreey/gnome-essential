const {Shell, Meta, Clutter, St, Gtk, GLib} = imports.gi
const Layout = imports.ui.layout
const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { FocusArray, WindowInitedHandler, isNormal, safeDestroy, getShadowSize } = Me.imports.libs.utility

const SIDE_LEFT = 0
const SIDE_RIGHT = 1

const OVERLAY_WIDTH = 40
const OVERLAY_HIEGHT = 220
const OVERLAY_OPACITY = 242
const OVERLAY_PADDING = 6
const OVERLAY_MARGIN = 6
const PREVIEW_PADDING = 90

const ICON_SIZE = 22

// TODO: top bottom shadow size fix
// TODO: 창 드레그 엔 드롭 지원
// TODO: 파일 드래그 해서 놓으면 자동으로 열림
// TODO: 그냥 마우스 쳐서 크게 미리보기 (혹은 호버)
// TODO: 툴팁 뜬 상태로 옮기면 안사라지는거 버그 고치기
// TODO: 창 중간에 안오는 버그 고치기
// TODO: 블러 버그 고치기
// TODO: 오버뷰에서 마지막 안보이게하기
//? TODO: 최소화 방지
//? TODO: on closed and user moved trigger\
//? TODO: Add all last ws apps when start and user added

class HideOverlayHolder {
	// addBlur() {
	// 	this.leftHolderBackground.add_effect_with_name("blur",new Shell.BlurEffect({
	// 		brightness: 0.5,
	// 		sigma: 8 * global.display.get_monitor_scale((global.display.get_primary_monitor())),
	// 		mode: Shell.BlurMode.ACTOR
	// 	}))
	// 	this.rightHolderBackground.add_effect_with_name("blur",new Shell.BlurEffect({
	// 		brightness: 0.5,
	// 		sigma: 8 * global.display.get_monitor_scale((global.display.get_primary_monitor())),
	// 		mode: Shell.BlurMode.ACTOR
	// 	}))
	// }
	// removeBlur() {
	// 	this.leftHolderBackground.remove_effect_by_name("blur")
	// 	this.rightHolderBackground.remove_effect_by_name("blur")
	// }

	// setBackground(background) {
	// 	const bg = Main.layoutManager._backgroundGroup.get_child_at_index(
	// 		this.monitorIndex
	// 	)
	// 	if (!bg) return
	// 	background.content.set({
	// 		background: bg.get_content().background
	// 	})
	// }

	constructor() {
		this.queue = []
		this.monitorIndex = global.display.get_primary_monitor()
		const mainMonitor = this.monitorGeometry = global.display.get_monitor_geometry(this.monitorIndex)
		this.animationHolder = new St.Widget({
			x: mainMonitor.x,
			y: mainMonitor.y,
			width: mainMonitor.width,
			height: mainMonitor.height - Main.panel.height,
			offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
			clip_to_allocation: true,
			reactive: false,
		})
		this.leftHolder = new St.Widget({
			x: mainMonitor.x,
			y: mainMonitor.y,
			width: OVERLAY_WIDTH,
			height: mainMonitor.height - Main.panel.height,
			offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
			reactive: false,
			clip_to_allocation: true,
		})
		this.rightHolder = new St.Widget({
			x: mainMonitor.x+mainMonitor.width-OVERLAY_WIDTH,
			y: mainMonitor.y,
			width: OVERLAY_WIDTH,
			height: mainMonitor.height - Main.panel.height,
			offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
			reactive: false,
			clip_to_allocation: true,
		})	

		// blurs
		// this.leftHolderBackgroundHolder = new St.Widget({
		// 	x:0, y:0, width: 0, height: 0
		// })
		// this.leftHolderBackground = new Meta.BackgroundActor({
		// 	meta_display: global.display,
		// 	monitor: this.monitorIndex
		// })
		// this.leftHolderBackgroundHolder.add_child(this.leftHolderBackground)
		// this.leftHolder.add_child(this.leftHolderBackgroundHolder)
		// this.rightHolderBackgroundHolder = new St.Widget({
		// 	x:0, y:0, width: 0, height: 0
		// })
		// this.rightHolderBackground = new Meta.BackgroundActor({
		// 	meta_display: global.display,
		// 	monitor: this.monitorIndex
		// })
		// this.rightHolderBackgroundHolder.add_child(this.rightHolderBackground)
		// this.rightHolder.add_child(this.rightHolderBackgroundHolder)
		// Main.layoutManager._backgroundGroup.connect('notify',()=>{
		// 	this.setBackground(this.leftHolderBackground)
		// 	this.setBackground(this.rightHolderBackground)
		// })
		// this.addBlur()

		const updateView = ()=>{
			this.monitorIndex = global.display.get_primary_monitor()
			const mainMonitor = this.monitorGeometry = global.display.get_monitor_geometry(this.monitorIndex)
			this.leftHolder.x = mainMonitor.x
			this.leftHolder.y = mainMonitor.y
			this.leftHolder.height = mainMonitor.height - Main.panel.height
			this.rightHolder.x = mainMonitor.x+mainMonitor.width-OVERLAY_WIDTH
			this.rightHolder.y = mainMonitor.y
			this.rightHolder.height = mainMonitor.height - Main.panel.height
			this.animationHolder.x = mainMonitor.x
			this.animationHolder.y = mainMonitor.y
			this.animationHolder.width = mainMonitor.width
			this.animationHolder.height = mainMonitor.height - Main.panel.height
			this.reorderLeft()
			this.reorderRight()

			// blur update
			// this.leftHolderBackground.monitor = this.monitorIndex
			// this.rightHolderBackground.monitor = this.monitorIndex
			// this.removeBlur()
			// this.addBlur()
			// this.setBackground(this.leftHolderBackground)
			// this.setBackground(this.rightHolderBackground)
		}
		this.monitorChanged = Main.layoutManager.connect("monitors-changed",updateView)
		this.panelHeightChanged = Main.panel.connect("notify::height",updateView)

		this.leftChildren = []
		this.rightChildren = []
	}

	save() {
		const left = []
		this.leftChildren.forEach(child=>{
			left.push(""+child.window.get_description())
		})
		const right = []
		this.rightChildren.forEach(child=>{
			right.push(""+child.window.get_description())
		})
		return JSON.stringify([left,right])
	}

	load(stringData) {
		const [ left,right ] = JSON.parse(stringData)
		const windowActors = global.get_window_actors()
		const windowByids = {}
		for (const windowActor of windowActors) {
			const window = windowActor.meta_window
			windowByids[""+window.get_description()] = window
		}

		for (const id of left) {
			const window = windowByids[id]
			if (!window) continue
			this.addWindow(window,SIDE_LEFT)
		}
		for (const id of right) {
			const window = windowByids[id]
			if (!window) continue
			this.addWindow(window,SIDE_RIGHT)
		}
	}

	addWindow(window,side) {
		const { x:frameX,y:frameY,width:frameWidth,height:frameHeight } = window.get_frame_rect()
		const { x:bufferX,y:bufferY,width:bufferWidth,height:bufferHeight } = window.get_buffer_rect()
		new HideOverlay(window, side, this,
			{ frameX,frameY,frameWidth,frameHeight,bufferX,bufferY,bufferWidth,bufferHeight })
	}

	addRight(child) {
		if (this.rightChildren.length === 0) {
			Main.layoutManager.addChrome(this.rightHolder,{
				affectsStruts: true,
				trackFullscreen: true,
			})
			this.rightHolderHasChrome = true
		}
		const x = this.monitorGeometry.width - OVERLAY_WIDTH
		this.rightHolder.insert_child_at_index(child.base,1)
		
		// reorder (push another windows)
		let yStep = OVERLAY_HIEGHT+OVERLAY_MARGIN
		let y = this.rightChildren.length * yStep
		let offset = parseInt((this.monitorGeometry.height-Main.panel.height-y-OVERLAY_HIEGHT)/2)
		if (offset <= 0) {
			// if hit bottom of screen
			offset = 0
			yStep = (this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height)/(this.rightChildren.length)
			y = this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height
		} else y += offset
		this.rightChildren.forEach((item,index)=>{
			item.base.ease_property('y', yStep*index + offset, {
				duration: 160,
				mode: Clutter.AnimationMode.EASE_OUT_EXPO,
			})
			item.position = { x, y: yStep*index + offset }
		})

		child.base.y = y
		this.rightChildren.push(child)
		return { x, y: y }
	}

	addLeft(child) {
		if (this.leftChildren.length === 0) {
			Main.layoutManager.addChrome(this.leftHolder,{
				affectsStruts: true,
				trackFullscreen: true,
			})
			this.leftHolderHasChrome = true
		}
		this.leftHolder.insert_child_at_index(child.base,1)
		
		// reorder (push another windows)
		let yStep = OVERLAY_HIEGHT+OVERLAY_MARGIN
		let y = this.leftChildren.length * yStep
		let offset = parseInt((this.monitorGeometry.height-Main.panel.height-y-OVERLAY_HIEGHT)/2)
		if (offset <= 0) {
			// if hit bottom of screen
			offset = 0
			yStep = (this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height)/(this.leftChildren.length)
			y = this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height
		} else y += offset
		this.leftChildren.forEach((item,index)=>{
			item.base.ease_property('y', yStep*index + offset, {
				duration: 160,
				mode: Clutter.AnimationMode.EASE_OUT_EXPO,
			})
			item.position = {
				x: 0,
				y: yStep*index + offset,
			}
		})

		child.base.y = y
		this.leftChildren.push(child)
		return {
			x: 0,
			y: y,
		}
	}

	reorderRight() {
		let yStep = OVERLAY_HIEGHT+OVERLAY_MARGIN
		let offset = parseInt((this.monitorGeometry.height-Main.panel.height-((this.rightChildren.length-1)*yStep)-OVERLAY_HIEGHT)/2)
		if (offset <= 0) {
			offset = 0
			yStep = (this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height)/(this.rightChildren.length-1)
		}
		this.rightChildren.forEach((item,index)=>{
			item.base.ease_property('y', yStep*index + offset, {
				duration: 320,
				mode: Clutter.AnimationMode.EASE_OUT_QUINT,
			})
			item.position.y = yStep*index + offset
		})
	}

	removeRight(child) {
		const index = this.rightChildren.indexOf(child)
		if (index == -1) return
		this.rightChildren.splice(index,1)
		this.rightHolder.remove_child(child.base)
		this.reorderRight()

		// remove chrome
		if (this.rightChildren.length === 0) {
			Main.layoutManager.removeChrome(this.rightHolder)
			this.rightHolderHasChrome = false
		}
	}

	reorderLeft() {
		// reorder windows
		let yStep = OVERLAY_HIEGHT+OVERLAY_MARGIN
		let offset = parseInt((this.monitorGeometry.height-Main.panel.height-((this.leftChildren.length-1)*yStep)-OVERLAY_HIEGHT)/2)
		if (offset <= 0) {
			offset = 0
			yStep = (this.monitorGeometry.height-OVERLAY_HIEGHT-Main.panel.height)/(this.leftChildren.length-1)
		}
		this.leftChildren.forEach((item,index)=>{
			item.base.ease_property('y', yStep*index + offset, {
				duration: 320,
				mode: Clutter.AnimationMode.EASE_OUT_QUINT,
			})
			item.position.y = yStep*index + offset
		})
	}

	removeLeft(child) {
		const index = this.leftChildren.indexOf(child)
		if (index == -1) return
		this.leftChildren.splice(index,1)
		this.leftHolder.remove_child(child.base)
		this.reorderLeft()

		// remove chrome
		if (this.leftChildren.length === 0) {
			Main.layoutManager.removeChrome(this.leftHolder)
			this.leftHolderHasChrome = false
		}
	}

	dispose() {
		this.disposed = true
		this.leftChildren.forEach(child=>child.dispose())
		this.rightChildren.forEach(child=>child.dispose())
		safeDestroy(this.animationHolder)
		Main.layoutManager.disconnect(this.monitorChanged)
		Main.panel.disconnect(this.panelHeightChanged)
		if (this.leftHolderHasChrome) Main.layoutManager.removeChrome(this.leftHolder)
		if (this.rightHolderHasChrome) Main.layoutManager.removeChrome(this.rightHolder)

		this.leftHolder =
		this.rightHolder =
		this.leftChildren =
		this.rightChildren =
		this.monitorChanged =
		this.monitorGeometry =
		this.animationHolder =
		this.panelHeightChanged =
		this.leftHolderHasChrome =
		this.rightHolderHasChrome = null
	}

	addAnimation(actor,keepAlive) {
		if (!actor) return
		if (this.animationHolder.get_children().length === 0) {
			Main.layoutManager.addChrome(this.animationHolder)
		}
		this.animationHolder.add_child(actor)
		if (keepAlive) {
			return
		}
		actor._edgetmphide_animation_timeout =
		GLib.timeout_add(GLib.PRIORITY_DEFAULT,5000,()=>{
			actor._edgetmphide_animation_timeout = null
			this.removeAnimation(actor)
			return GLib.SOURCE_REMOVE
		})
	}
	
	removeAnimation(actor) {
		if (!actor) return
		if (actor._edgetmphide_animation_timeout) {
			GLib.source_remove(actor._edgetmphide_animation_timeout)
			actor._edgetmphide_animation_timeout = null
		}
		safeDestroy(actor)
		if (this.animationHolder.get_children().length === 0) {
			Main.layoutManager.removeChrome(this.animationHolder)
		}
	}

	blockActions(duration,queueFunction) {
		if (this.blocking) {
			if (queueFunction) this.queue.push([duration,queueFunction])
			return true
		}
		this.blocking = true
		GLib.timeout_add(GLib.PRIORITY_DEFAULT,duration,()=>{
			this.blocking = false
			if (this.queue.length == 0) return GLib.SOURCE_REMOVE
			const [queuedDuration, queuedFunction] = this.queue.shift()
			this.blockActions(queuedDuration,queuedFunction)
			return GLib.SOURCE_REMOVE
		})
		if (queueFunction) queueFunction()
		return false
	}

	getAuthSide(allowEnableRight) {
		if (this.leftSideDisabled && !this.rightSideDisabled) return SIDE_RIGHT
		if (this.rightSideDisabled && !this.leftSideDisabled) return SIDE_LEFT
		if (this.rightSideDisabled && this.leftSideDisabled) return null
		if (this.leftChildren.length >= 4 && this.rightChildren.length < 4) return SIDE_RIGHT
		if (this.rightChildren.length >= 4 && this.leftChildren.length < 4) return SIDE_LEFT
		if (this.rightChildren.length === 0 && (!allowEnableRight)) return SIDE_LEFT
		return this.rightChildren.length > this.leftChildren.length ? SIDE_RIGHT : SIDE_LEFT
	}
}

class HideOverlay {
	constructor(window,side,holder,draggedPos) {
		window.tmpHide = this
		this.animationId = 0
		this.draggedPos = draggedPos
		this.holder = holder
		this.window = window
		this.side = side
		this.base = new St.BoxLayout({
			width: OVERLAY_WIDTH,
			clip_to_allocation: true,
			reactive: true,
			height: OVERLAY_HIEGHT,
			vertical: true,
		})
		this.shadowSize = getShadowSize(this.window)

		this.createWindowClone()
		this.createAppIcon()

		if (this.side == SIDE_LEFT) {
			this.position = this.holder.addLeft(this)
		} else {
			this.position = this.holder.addRight(this)
		}

		if (window.get_workspace() != this.getLastWorkspace()) {
			// Make unpressable when animation is pending
			this.base.reactive = false
			this.holder.blockActions(200,this.animateWindow.bind(
				this,()=>this.base.reactive = true)
			)
		}

		this.base.connect("leave-event",()=>{
			this.removePreview()
		})
		this.base.connect("button-press-event",(_,event)=>{
			if (event.get_button() === 3) {
				this.createPreview()
			}
		})
		this.base.connect("button-release-event",(_,event)=>{
			if (event.get_button() === 3) {
				this.removePreview()
			} else {
				if (this.animationInProgress) return
				this.holder.blockActions(10,this.onClick.bind(this))
				this.base.reactive = false
			}
		})

		this.unmanaged = window.connect("unmanaged", ()=>{
			this.dispose()
		})

		if (Main.layoutManager.overviewGroup.visible) {
			this.hide(true)
		}
		this.overviewShow = Main.layoutManager.overviewGroup.connect("show",()=>this.hide())
		this.overviewHide = Main.layoutManager.overviewGroup.connect("hide",()=>this.show())
	}

	// preview
	calculatePreviewPositionAndSize() {
		const monitorHeight = parseInt(this.holder.monitorGeometry.height * 0.95)
		const frameHeight = this.shadowSize.frameHeight
		let heightScale = 1
		if (monitorHeight < frameHeight) {
			heightScale = monitorHeight / frameHeight
		}

		const monitorWidth = parseInt(this.holder.monitorGeometry.width * 0.95)
		const frameWidth = this.shadowSize.frameWdith
		let widthScale = 1
		if (monitorWidth < frameHeight) {
			widthScale = monitorWidth / frameWidth
		}
		const scale = Math.min(heightScale,widthScale)

		return {
			y: parseInt((this.holder.monitorGeometry.height - frameHeight) / 2) - this.shadowSize.top + parseInt((frameHeight - (frameHeight*scale))/2),
			x: (this.side === SIDE_LEFT ? PREVIEW_PADDING - this.shadowSize.left : this.holder.monitorGeometry.width - PREVIEW_PADDING - this.shadowSize.bufferWidth*scale + this.shadowSize.right*scale),
			scale,
		}
	}
	createPreview() {
		if (this.preview) {
			this.holder.removeAnimation(this.preview)
		}
		this.animationId++
		this.shadowSize = getShadowSize(this.window)
		const { x: cloneX, y: cloneY, scale: cloneScale } = this.calculateCloneWindowSizeAndPositionInMonitor()
		const { scale, y, x } = this.calculatePreviewPositionAndSize()

		this.cloneBin.opacity = 0
		this.preview = new Clutter.Clone({source: this.window.get_compositor_private()})
		this.preview.scale_x = this.preview.scale_y = cloneScale
		this.preview.y = cloneY
		this.preview.x = cloneX
		// this.preview.translation_x
		// this.preview.translation_y = (cloneY - (cloneY * cloneScale))/2
		this.preview.opacity = OVERLAY_OPACITY
		// this.preview.set_pivot_point(this.side == SIDE_LEFT ? 0 : 1,0.5)

		this.holder.addAnimation(this.preview,true)

		this.preview.ease({
			x,y,
			scale_x: scale,
			scale_y: scale,
			opacity: 255,
			duration: 300,
			mode: Clutter.AnimationMode.EASE_OUT_EXPO,
		})
		this.iconBin.ease_property('opacity', 0, {
			duration: 200,
			mode: Clutter.AnimationMode.LINEAR,
		})
	}
	removePreview() {
		if (!this.preview) return
		if (this.preview.destroyed) return
		const thisAnimationId = ++this.animationId
		const preview = this.preview
		preview.destroyed = true
		const { x, y, scale } = this.calculateCloneWindowSizeAndPositionInMonitor()
		preview.ease({
			x,y,
			scale_x: scale,
			scale_y: scale,
			opacity: OVERLAY_OPACITY,
			duration: 300,
			mode: Clutter.AnimationMode.EASE_OUT_EXPO,
			onStopped: (finished)=>{
				if (finished && thisAnimationId == this.animationId) {
					this.cloneBin.opacity = 255
				}
				this.holder.removeAnimation(preview)
				if (this.preview === preview) this.preview = null
			}
		})
		this.iconBin.ease_property('opacity', 255, {
			duration: 320,
			mode: Clutter.AnimationMode.LINEAR,
		})
	}

	open() {
		this.animationId++
		// Animate Window
		const windowActor = this.window.get_compositor_private()
		this.shadowSize = getShadowSize(this.window)
		const clone = this.captureWindow(windowActor,{
			x: this.shadowSize.bufferX - this.holder.monitorGeometry.x,
			y: this.shadowSize.bufferY - this.holder.monitorGeometry.y,
			width: this.shadowSize.bufferWidth,
			height: this.shadowSize.bufferHeight,
		})
		this.holder.addAnimation(clone)

		let { scale, x, y } = this.calculateCloneWindowSizeAndPositionInMonitor()
		x = this.position.x
			+( this.side == SIDE_LEFT ? this.shadowSize.left*scale : -this.shadowSize.right*scale )
			+( this.side == SIDE_LEFT ? -OVERLAY_PADDING : OVERLAY_PADDING )
			+( this.side == SIDE_LEFT ? -this.shadowSize.bufferWidth+OVERLAY_WIDTH : 0 )
		const preview = this.preview
		if (preview) {
			scale = preview.scale_x
			x = preview.x
			y = preview.y
			clone.opacity = preview.opacity
			this.preview = null

			// if preview is normal size
			// if (scale == 1) {
			// 	this.holder.removeAnimation(clone)
			// 	this.destroy()
			// 	this.window.move_frame(true,x+this.shadowSize.left,y+this.shadowSize.top)
			// 	this.window.change_workspace(this.getCurrentWorkspace())
			// 	GLib.timeout_add(GLib.PRIORITY_DEFAULT,15,()=>{
			// 		try {
			// 			this.window.focus(global.get_current_time())
			// 			if (!this.window.above) {
			// 				this.window.make_above()
			// 				this.window.unmake_above()
			// 			}
			// 		} catch {}
			// 		this.holder.removeAnimation(preview)
			// 		return GLib.SOURCE_REMOVE
			// 	})
			// 	return
			// } else this.holder.removeAnimation(preview)
			this.holder.removeAnimation(preview)
		} else {
			clone.opacity = OVERLAY_OPACITY
			clone.set_pivot_point( this.side == SIDE_LEFT? 1 : 0, 0 )
		}
		clone.scale_x = scale
		clone.scale_y = scale
		clone.x = x
		clone.y = y

		// const scale = (OVERLAY_HIEGHT-ICON_SIZE)/(this.shadowSize.bufferHeight)
		// clone.scale_x = scale
		// clone.scale_y = scale
		// clone.x = this.position.x
		// 	+( this.side == SIDE_LEFT ? this.shadowSize.left*scale : -this.shadowSize.right*scale )
		// 	+( this.side == SIDE_LEFT ? -OVERLAY_PADDING : OVERLAY_PADDING )
		// 	+( this.side == SIDE_LEFT ? -this.shadowSize.bufferWidth+OVERLAY_WIDTH : 0 )
		// clone.y = this.position.y

		clone.ease({
			x: this.shadowSize.bufferX - this.holder.monitorGeometry.x,
			duration: 330,
			mode: Clutter.AnimationMode.EASE_OUT_EXPO,
		})
		clone.ease({
			y: this.shadowSize.bufferY - this.holder.monitorGeometry.y,
			scale_x: 1,
			scale_y: 1,
			opacity: 255,
			duration: 350,
			mode: Clutter.AnimationMode.EASE_OUT_QUINT,
			onStopped: ()=>{
				this.window.change_workspace(this.getCurrentWorkspace())
				GLib.timeout_add(GLib.PRIORITY_DEFAULT,0,()=>{
					this.holder.removeAnimation(clone)
					return GLib.SOURCE_REMOVE
				})
				GLib.timeout_add(GLib.PRIORITY_DEFAULT,15,()=>{
					// Try focus it
					try {
						this.window.focus(global.get_current_time())
						if (!this.window.above) {
							this.window.make_above()
							this.window.unmake_above()
						}
					} catch {}
					this.dispose()
					return GLib.SOURCE_REMOVE
				})
			},
		})
		this.cloneBin.opacity = 0
		this.iconBin.ease_property('opacity', 0, {
			duration: 220,
			mode: Clutter.AnimationMode.LINEAR,
		})
		this.window.tmpHide = null
	}

	onClick() {
		if (this.window.tmpHide != this) return
		if (this.getLastWorkspace() == global.workspace_manager.get_active_workspace()) return
		this.open()
	}

	calculateCloneWindowSizeAndPositionInMonitor() {
		const scale = (OVERLAY_HIEGHT-ICON_SIZE)/(this.shadowSize.bufferHeight)
		return {
			x: this.position.x
				+( this.side == SIDE_LEFT ? this.shadowSize.left*scale : -this.shadowSize.right*scale )
				+( this.side == SIDE_LEFT ? -this.shadowSize.bufferWidth*scale+OVERLAY_WIDTH-OVERLAY_PADDING : OVERLAY_PADDING ),
			y: this.position.y,
			scale,
		}
	}

	animateWindow(callback) {
		this.animationId++
		this.cloneBin.opacity = 0
		const windowActor = this.window.get_compositor_private()

		// Animate Window
		const clone = this.animationClone = this.captureWindow(windowActor,{
			x: this.shadowSize.bufferX - this.holder.monitorGeometry.x,
			y: this.shadowSize.bufferY - this.holder.monitorGeometry.y,
			width: this.shadowSize.bufferWidth,
			height: this.shadowSize.bufferHeight,
		})
		// const scale = (OVERLAY_HIEGHT-ICON_SIZE)/(this.shadowSize.bufferHeight)
		const { x,y,scale } = this.calculateCloneWindowSizeAndPositionInMonitor()
		this.holder.addAnimation(clone)
		clone.ease({
			x,y,
			scale_x: scale,
			scale_y: scale,
			// x: this.position.x
			// 	+( this.side == SIDE_LEFT ? this.shadowSize.left*scale : -this.shadowSize.right*scale )
			// 	+( this.side == SIDE_LEFT ? -this.shadowSize.bufferWidth*scale+OVERLAY_WIDTH-OVERLAY_PADDING : OVERLAY_PADDING ),
			// y: this.position.y,
			// scale_x: scale,
			// scale_y: scale,
			opacity: OVERLAY_OPACITY,
			duration: 420,
			mode: Clutter.AnimationMode.EASE_OUT_EXPO,
			onStopped: ()=>{
				if (this.animationClone) {
					this.holder.removeAnimation(this.animationClone)
					this.animationClone = null
				}
				this.cloneBin.opacity = OVERLAY_OPACITY
				if (callback) callback()
			},
		})
		this.iconBin.opacity = 0
		this.iconBin.ease_property('opacity', OVERLAY_OPACITY, {
			duration: 480,
			mode: Clutter.AnimationMode.LINEAR,
		})
		
		// Hide real window
		let grapEnd = false
		windowActor.hide()
		GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
			Main.wm._hideTilePreview()
			
			if (grapEnd) {
				return GLib.SOURCE_REMOVE
			} else {
				windowActor.hide()
				return GLib.SOURCE_CONTINUE
			}
		})
		this.grap = true
		const connection = global.display.connect("grab-op-end",()=>{
			global.display.disconnect(connection)
			grapEnd = true
			windowActor._noAnimation = true
			this.window.unmaximize(Meta.MaximizeFlags.BOTH)
			if (this.draggedPos.maximized_horizontally || this.draggedPos.maximized_vertically) {
				const windowSize = this.window.get_frame_rect()
				this.window.move_frame(true,
					parseInt(this.holder.monitorGeometry.x + (this.holder.monitorGeometry.width - windowSize.width)/2),
					parseInt(this.holder.monitorGeometry.y + (this.holder.monitorGeometry.height - windowSize.height)/2)
				)
			} else if (this.draggedPos.frameX < 0 || this.draggedPos.frameX + this.draggedPos.frameWdith > this.holder.monitorGeometry.width) {
				this.window.move_frame(true, this.draggedPos.frameX, this.draggedPos.frameY)
			} else {
				this.window.move_frame(true, this.draggedPos.frameX, this.draggedPos.frameY)
			}
			if (this.window.get_monitor() != this.holder.monitorIndex) this.window.move_to_monitor(this.holder.monitorIndex)
			this.window.change_workspace(this.getLastWorkspace())
			windowActor.show()
			windowActor._noAnimation = false
			this.grap = false
		})
	}

	getCurrentWorkspace() {
		return global.workspace_manager.get_active_workspace()
	}

	getLastWorkspace() {
		return global.workspace_manager.get_workspace_by_index(global.workspace_manager.nWorkspaces-1)
	}

	captureWindow(window_actor,rect) {
		return new Clutter.Actor({
			height: rect.height,
			width: rect.width,
			x: rect.x,
			y: rect.y,
			content: window_actor.paint_to_content(null)
		})
	}

	createWindowClone() {
		if (this.clone) { // when update
			safeDestroy(this.clone,this.cloneBin)
		}
		this.clone = new Clutter.Clone({source: this.window.get_compositor_private()})

		const scale = (OVERLAY_HIEGHT-ICON_SIZE)/this.shadowSize.bufferHeight

		const sideShadowSize = (this.side == SIDE_LEFT ? this.shadowSize.right : this.shadowSize.left)*scale
		const width = this.shadowSize.bufferWidth*scale

		this.cloneBin = new St.Bin({
			width: OVERLAY_WIDTH,
			height: OVERLAY_HIEGHT-ICON_SIZE,
			scale_x: width/OVERLAY_WIDTH,
			translation_x: this.side == SIDE_LEFT? -width+OVERLAY_WIDTH-OVERLAY_PADDING+sideShadowSize: -sideShadowSize+OVERLAY_PADDING,
			opacity: OVERLAY_OPACITY,
		})
		this.cloneBin.set_child(this.clone)
		this.base.add_child(this.cloneBin)
	}

	createAppIcon() {
		this.iconBin = new St.Bin({
			x_align: Clutter.ActorAlign.CENTER,
			style_class: "QE-edge-hide-icon-holder",
			opacity: OVERLAY_OPACITY,
		})
		const tracker = Shell.WindowTracker.get_default()
		this.icon = tracker.get_window_app(this.window).create_icon_texture(ICON_SIZE)
		this.iconBin.set_child(this.icon)
		this.base.add_child(this.iconBin)
	}

	destroy() {
		if (this.destroyed) return
		if (this.preview) {
			this.holder.removeAnimation(this.preview)
		}
		this.animationId = null
		this.preview = null
		this.destroyed = true
		this.window.tmpHide = null
		this.cloneBin.ease_property('opacity', 0, {
			duration: 320,
			mode: Clutter.AnimationMode.EASE_OUT_QUAD,
		})
		this.iconBin.ease_property('opacity', 0, {
			duration: 320,
			mode: Clutter.AnimationMode.LINEAR,
		})
		GLib.timeout_add(GLib.PRIORITY_DEFAULT,320,()=>{
			this.dispose()
			return GLib.SOURCE_REMOVE
		})
		
	}

	hide(noAnimation) {
		this.base.reactive = false
		const value = this.side == SIDE_LEFT ? -OVERLAY_WIDTH : OVERLAY_WIDTH
		if (noAnimation) {
			this.base.translation_x = value
			return
		}
		this.base.ease_property("translation_x", value, {
			duration: 200,
			mode: Clutter.AnimationMode.LINEAR,
		})
	}
	show(noAnimation) {
		this.base.reactive = true
		if (noAnimation) {
			this.base.translation_x = 0
			return
		}
		this.base.ease_property("translation_x", 0, {
			duration: 200,
			mode: Clutter.AnimationMode.EASE_OUT_QUINT,
		})
	}

	dispose() {
		if (this.disposed) return
		this.destroyed = true
		this.disposed = true
		this.window.tmpHide = null
		if (!this.holder.disposed) {
			if (this.side == SIDE_LEFT) {
				this.holder.removeLeft(this)
			} else {
				this.holder.removeRight(this)
			}
		}
		if (this.animationClone) {
			this.holder.removeAnimation(this.animationClone)
			this.animationClone = null
		}
		Main.layoutManager.overviewGroup.disconnect(this.overviewShow)
		Main.layoutManager.overviewGroup.disconnect(this.overviewHide)
		if (this.unmanaged) this.window.disconnect(this.unmanaged)
		safeDestroy(
			this.icon,
			this.clone,
			this.iconBin,
			this.cloneBin,
			this.base
		)
		// this.focus =
		this.overviewShow =
		this.overviewHide =
		this.unmanaged =
		this.iconBin =
		this.cloneBin =
		this.base =
		this.clone =
		this.icon =
		this.shadowSize =
		this.position =
		this.draggedPos =
		this.side =
		this.holder =
		this.window = null
	}
}

var EdgeTmpHide = class EdgeTmpHide {
	enable() {
		this.settings = ExtensionUtils.getSettings()
		this.hideOverlayHolder = new HideOverlayHolder()
		this.hideOverlayHolder.leftSideDisabled = true
		try {
			this.hideOverlayHolder.load(
				this.settings.get_string("qe-tmphide-last-windows")
			)
		} catch (e) { console.log(e) }

		// create barrier
		this.pressureBarrier =
			new Layout.PressureBarrier(
				20,
				Layout.HOT_CORNER_PRESSURE_TIMEOUT, 0)
		this.pressureBarrier._onBarrierHit = function(barrier, event) {
			barrier._isHit = true

			if (this._isTriggered) return

			if (this._eventFilter && this._eventFilter(event)) return

			let slide    = this._getDistanceAlongBarrier(barrier, event)
			let distance = this._getDistanceAcrossBarrier(barrier, event)

			if (distance >= this._threshold) {
				this._trigger()
				return
			}

			if (slide > distance) return

			this._lastTime = event.time

			this._trimBarrierEvents()
			distance = Math.min(15, distance)

			this._barrierEvents.push([event.time, distance])
			this._currentPressure += distance

			if (this._currentPressure >= this._threshold) this._trigger()
		}
		this.stageAllocationID = global.stage.connect(
			'notify::allocation', this.createBarriers.bind(this))
		this.createBarriers()
		this.pressureBarrier.connect('trigger', () => {
			if (
				(!this.draggedWindow)
				|| (!isNormal(this.draggedWindow))
				|| (this.draggedWindow.tmpHide)
				|| (this.draggedWindow.minimized)
			) return
			if (global.workspace_manager.get_active_workspace().index() == global.workspace_manager.nWorkspaces-1) return
			if ((!this.leftBarrier) && (!this.rightBarrier)) return
			new HideOverlay(this.draggedWindow, (this.leftBarrier && this.leftBarrier._isHit)? SIDE_LEFT: SIDE_RIGHT, this.hideOverlayHolder, this.draggedPos)
		})

		// track grap
		this.grapOpBegin = global.display.connect('grab-op-begin', (d, win, op) => {
			if (this.draggedWindow == win) return
			if (op == Meta.GrabOp.MOVING) {
				// save positions
				this.draggedWindow = win
				let { x:frameX,y:frameY,width:frameWidth,height:frameHeight } = win.get_frame_rect()
				let { x:bufferX,y:bufferY,width:bufferWidth,height:bufferHeight } = win.get_buffer_rect()
				this.draggedPos = { frameX,frameY,frameWidth,frameHeight,bufferX,bufferY,bufferWidth,bufferHeight,maximized_horizontally: win.maximized_horizontally, maximized_vertically: win.maximized_vertically }
			}
		})
		this.grapOpEnd = global.display.connect('grab-op-end', (d, win, op) => {
			if (op == Meta.GrabOp.MOVING) {
				this.draggedWindow = null
			}
		})

		// create window initer
		this.windowInitedHandler = new WindowInitedHandler("EdgeTmpHide")
			.setInitWindowHandler(this.initWindow.bind(this))
			.setUninitWindowHandler(this.uninitWindow.bind(this))
			.setFilter(isNormal)
			.init()

		// prevent to go last workspace
		this.oldWorkspace = global.workspace_manager.get_active_workspace()
		if (this.oldWorkspace.index() == global.workspace_manager.nWorkspaces-1) {
			this.oldWorkspace = global.workspace_manager.get_workspace_by_index(0)
		}
		this.activeWorkspaceChanged = global.workspace_manager.connect('active-workspace-changed', () => {
			const currentWorkspace = global.workspace_manager.get_active_workspace()
			const focused = global.display.get_focus_window() // 그냥 포커스한거 끌고오세요

			if (currentWorkspace.index() == global.workspace_manager.nWorkspaces-1) {
				const oldWorkspace = this.oldWorkspace
				oldWorkspace.noAnimation = true
				GLib.timeout_add(GLib.PRIORITY_DEFAULT,0,()=>{
					oldWorkspace.noAnimation = true
					const topWindow = FocusArray.getTopWindowOfWorkspace(oldWorkspace)
					const currentTime = global.get_current_time()
					if (topWindow) oldWorkspace.activate_with_focus(topWindow,currentTime)
					else oldWorkspace.activate(currentTime)
					return GLib.SOURCE_REMOVE
				})
			} else {
				if ((!Main.layoutManager.overviewGroup.visible) && focused && focused.tmpHide) focused.tmpHide.open()
				this.oldWorkspace = currentWorkspace
			}
		})
	}

	createBarriers() {
		if (this.leftBarrier) {
			this.pressureBarrier.removeBarrier(this.leftBarrier)
			this.leftBarrier.destroy()
			this.leftBarrier = null
		}

		if (this.rightBarrier) {
			this.pressureBarrier.removeBarrier(this.rightBarrier)
			this.rightBarrier.destroy()
			this.rightBarrier = null
		}

		if (!this.hideOverlayHolder.leftSideDisabled) {
			this.leftBarrier = new Meta.Barrier({
				display: global.display,
				x1: 0,
				x2: 0,
				y1: 1,
				y2: global.stage.height,
				directions: Meta.BarrierDirection.POSITIVE_X,
			})
			this.pressureBarrier.addBarrier(this.leftBarrier)
		}
		
		if (!this.hideOverlayHolder.rightSideDisabled) {
			this.rightBarrier = new Meta.Barrier({
				display: global.display,
				x1: global.stage.width,
				x2: global.stage.width,
				y1: 1,
				y2: global.stage.height,
				directions: Meta.BarrierDirection.NEGATIVE_X,
			})
			this.pressureBarrier.addBarrier(this.rightBarrier)
		}
	}

	checkWindowWorkspace(window,allowEnableRight) {
		const primaryMonitor = global.display.get_primary_monitor()
		// const monitor = window.get_monitor()
		const workspace = window.get_workspace()
		if(!workspace) return
		const index = workspace.index()
		const lastWorkspace = global.workspace_manager.nWorkspaces-1
		if (window.tmpHide) { // check leave last ws
			// if (!window.tmpHide) return
			// if (monitor != primaryMonitor || index != lastWorkspace) {
			if (index != lastWorkspace && !window.tmpHide.grap) {
				window.tmpHide.destroy()
			}
		} else { // check enter last ws
			// if (monitor == primaryMonitor && index == lastWorkspace) {
			if (index == lastWorkspace) {
				const side = this.hideOverlayHolder.getAuthSide(allowEnableRight)
				this.hideOverlayHolder.addWindow(window, side)
			}
		}
	}
	initWindow(window,firstTime) {
		this.checkWindowWorkspace(window,firstTime)
		window.tmpHideWorkspaceChanged = window.connect("workspace-changed",window=>this.checkWindowWorkspace(window))
	}
	uninitWindow(window) {
		window.disconnect(window.tmpHideWorkspaceChanged)
		if (window.tmpHide) {
			window.tmpHide.destroy()
		}
	}

	disable() {
		// Save last state
		try {
			this.settings.set_string("qe-tmphide-last-windows",this.hideOverlayHolder.save())
		} catch (e) { console.log(e) }
		this.settings.run_dispose()

		global.workspace_manager.disconnect(this.activeWorkspaceChanged)
		global.display.disconnect(this.grapOpBegin)
		global.display.disconnect(this.grapOpEnd)
		global.stage.disconnect(this.stageAllocationID)
		this.windowInitedHandler.dispose()
		this.pressureBarrier.destroy()
		if (this.leftBarrier) this.leftBarrier.destroy()
		if (this.rightBarrier) this.rightBarrier.destroy()
		this.hideOverlayHolder.dispose()

		this.windowInitedHandler =
		this.activeWorkspaceChanged =
		this.pressureBarrier =
		this.leftBarrier =
		this.rightBarrier =
		this.grapOpBegin =
		this.grapOpEnd =
		this.hideOverlayHolder =
		this.stageAllocationID = null
	}
}
