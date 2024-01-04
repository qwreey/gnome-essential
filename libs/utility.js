// this module exports many useful functions
// for simplify main codes
const { Meta, St, GLib, Shell, Clutter, Gio } = imports.gi
const Main = imports.ui.main
const Layout = imports.ui.layout
const PointerWatcher = imports.ui.pointerWatcher
const Magnifier = imports.ui.magnifier
const ExtensionUtils = imports.misc.extensionUtils

// Logging
function logger(str) {
	log("[EXTENSION QE] " + str)
}
function error(str) {
	logError("[EXTENSION QE] " + str)
}

// Connection destroyer
var Maid = class Maid {
	#records
	#TaskType = {
		Connect: 0,
		Function: 1,
		Dispose: 2,
		Destroy: 3,
		SafeDestroy: 4,
	}
	static Priority = {
		High:    2000,
		Default: 0,
		Low:     -2000,
	}

	constructor() {
		this.#records = []
	}

	connectJob(signalObject,signalName,handleFunc, priority=0) {
		if (!this.#records) Error("Destroyed connection maid. connect() is not allowed")
		this.#records.push([this.#TaskType.Connect, priority, signalObject, signalObject.connect(signalName,handleFunc)])
	}

	functionJob(func, priority=0) {
		this.#records.push([this.#TaskType.Function, priority, func])
	}

	disposeJob(object, priority=0) {
		this.#records.push([this.#TaskType.Dispose, priority, object])
	}

	destroyJob(object, priority=0) {
		this.#records.push([this.#TaskType.Destroy, priority, object])
	}

	safeDestroyJob(object, priority=0) {
		this.#records.push([this.#TaskType.SafeDestroy, priority, object])
	}

	destroy() {
		if (!this.#records) Error("Destroyed connection maid. destroy() is not allowed")
		this.clean()
		this.#records = null
	}

	clean() {
		if (!this.#records) Error("Destroyed connection maid. clean() is not allowed")
		this.#records.sort((a,b)=>a[1]<b[1]) // Priority sorting
		for (const record of this.#records) {
			const taskType = record.splice(0,2)[0]
			switch (taskType) {
				case this.#TaskType.Connect:
					record[0].disconnect(record[1])
					break
				case this.#TaskType.Function:
					record[0]()
					break
				case this.#TaskType.Dispose:
					record[0].dispose()
					break
				case this.#TaskType.Destroy:
					record[0].destroy()
					break
				case this.#TaskType.SafeDestroy:
					safeDestroy(record[0])
					break
				default:
					throw Error("Unknown task type.")
			}
		}
		this.#records = []
	}
}

// GObject signal alike event emitter
var EventEmitter = class EventEmitter {
	#connections
	#destroyed
	#objects

	constructor() {
		this.#destroyed = false
		this.clearConnections()
	}
	isDestroyed() { return this.#destroyed }
	is_destroyed() { return this.#destroyed }
	destroy() {
		this.#destroyed = true
		this.#connections = null
		this.#objects = null
	}

	// Event handlers
	listEvents() {
		if (this.#destroyed) throw Error("Destroyed event emitter. listEvents() is not allowed")
		const list = []
		for (const key in this.#connections) {
			list.push(key)
		}
		return list
	}
	addEvent(...eventNames) {
		if (this.#destroyed) throw Error("Destroyed event emitter. addEvent() is not allowed")
		for (const eventName of eventNames) {
			if (this.#connections[eventName]) return
			this.#connections[eventName] = []
		}
	}
	removeEvent(...eventNames) {
		if (this.#destroyed) throw Error("Destroyed event emitter. removeEvent() is not allowed")
		for (const eventName of eventNames) {
			if (!this.#connections[eventName]) return
			delete this.#connections[eventName]
		}
	}
	emit(eventName,...args) {
		if (this.#destroyed) throw Error("Destroyed event emitter. emit() is not allowed")
		const connections = this.#connections[eventName]
		if (!connections) throw Error("Event name '"+eventName+"' is not exist.")
		for (const connection of connections) {
			try {
				connection[0](...args)
			} catch (e) {
				logError(e)
				throw Error(e)
			}
		}
	}

	// Connection
	connect(eventName,func) {
		if (this.#destroyed) throw Error("Destroyed event emitter. connect() is not allowed")
		const connections = this.#connections[eventName]
		if (!connections) throw Error("Event name '"+eventName+"' is not exist.")
		const id = this.id++
		connections.push([func,id])
		return [eventName,id]
	}
	disconnect(connection) {
		if (this.#destroyed) throw Error("Destroyed event emitter. disconnect() is not allowed")
		const [ eventName, id ] = connection
		const connections = this.#connections[eventName]
		if (!connections) return
		const index = connections.findIndex(connection=>connection[1]==id)
		if (index == -1) return
		connections.splice(index,1)
	}

	// Object based connection
	connectObject(...args) {
		if (this.#destroyed) throw Error("Destroyed event emitter. connectObject() is not allowed")
		const object = args.pop()
		for (let index = 0; index < args.length/2; index++) { // check event names
			const eventName = args[index*2]
			if (!this.#connections[eventName]) throw Error("Event name '"+eventName+"' is not exist.")
		}
		let connection = this.#objects.find(connection=>connection[0] == object) // get old object connection
		if (!connection) { // if no object connection found, make one
			connection = [object]
			this.#objects.push(connection) // push to object connection list
		}
		for (let index = 0; index < args.length/2; index++) {
			connection.push(this.connect(args[index*2],args[index*2+1])) // make connections
		}
	}
	connect_object(...args) { return this.connectObject(...args) }
	disconnectObject(object) {
		if (this.#destroyed) throw Error("Destroyed event emitter. disconnectObject() is not allowed")
		const index = this.#objects.findIndex(connection=>connection[0] == object)
		if (index == -1) return
		const connection = this.#objects.splice(index,1)[0]
		connection.shift()
		for (const subConnection of connection) {
			this.disconnect(subConnection)
		}
	}
	disconnect_object(object) { this.disconnectObject(object) }

	clearConnections() {
		if (this.#connections) {
			for (const key in this.#connections) {
				this.#connections[key] = []
			}
		} else this.#connections = {}
		this.#objects = []
		this.id = 0
	}
}

// Mouse move preventer
var PointerMovePreventer = class PointerMovePreventer extends EventEmitter {
	#pressureBarrier
	#barrierOffset = 100
	#events = [
		"pointer-move",
		"locked",
		"unlocked",
		"barrier-created",
		"barrier-destroyed",
	]
	sensitivity = 0.65

	constructor() {
		super()
		super.addEvent(...this.#events)

		this.#pressureBarrier = new Layout.PressureBarrier(
			0,
			Layout.HOT_CORNER_PRESSURE_TIMEOUT,
			0 // Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW
		)
		this.#pressureBarrier._onBarrierHit = (_barrier, event)=>{
			super.emit("pointer-move",
				Math.floor(this.x = Math.max(0,Math.min(global.stage.width, this.x + event.dx*this.sensitivity))),
				Math.floor(this.y = Math.max(0,Math.min(global.stage.height,this.y + event.dy*this.sensitivity))),
				event
			)
		}
	}

	// Public functions
	destroy() {
		this.#destroyBarrier()
		this.#pressureBarrier.destroy()
		this.#pressureBarrier = null
	}
	lockMoveAt(x,y) {
		this.x = x
		this.y = y
		this.#createBarrier(x,y)
		PointerUtil.position = [x, y]
		super.emit("locked",x,y)
	}
	lockMove() {
		const [ x, y ] = PointerUtil.getRawPosition()
		this.lockMoveAt(x, y)
		return [ x, y ]
	}
	unlockMove() {
		this.#destroyBarrier()
		super.emit("unlocked")
	}

	// Barrier handler
	#createBarrier(cursorX,cursorY) {
		this.#pressureBarrier.addBarrier(this.leftBarrier = new Meta.Barrier({
			display: global.display,
			x1: cursorX,
			x2: cursorX,
			y1: Math.max(0,cursorY-this.#barrierOffset),
			y2: Math.min(global.stage.height,cursorY+this.#barrierOffset),
			directions: Meta.BarrierDirection.POSITIVE_X,
		}))
		this.#pressureBarrier.addBarrier(this.rightBarrier = new Meta.Barrier({
			display: global.display,
			x1: cursorX+1,
			x2: cursorX+1,
			y1: Math.max(0,cursorY-this.#barrierOffset),
			y2: Math.min(global.stage.height,cursorY+this.#barrierOffset),
			directions: Meta.BarrierDirection.NEGATIVE_X,
		}))
		this.#pressureBarrier.addBarrier(this.topBarrier = new Meta.Barrier({
			display: global.display,
			x1: Math.max(0,cursorX-this.#barrierOffset),
			x2: Math.min(global.stage.width,cursorX+this.#barrierOffset),
			y1: cursorY,
			y2: cursorY,
			directions: Meta.BarrierDirection.POSITIVE_Y,
		}))
		this.#pressureBarrier.addBarrier(this.bottomBarrier = new Meta.Barrier({
			display: global.display,
			x1: Math.max(0,cursorX-this.#barrierOffset),
			x2: Math.min(global.stage.width,cursorX+this.#barrierOffset),
			y1: cursorY+1,
			y2: cursorY+1,
			directions: Meta.BarrierDirection.NEGATIVE_Y,
		}))
		super.emit("barrier-created")
	}
	#destroyBarrier() {
		if (this.leftBarrier) {
			this.#pressureBarrier.removeBarrier(this.leftBarrier)
			this.leftBarrier.destroy()
			this.leftBarrier = null
		}
		if (this.rightBarrier) {
			this.#pressureBarrier.removeBarrier(this.rightBarrier)
			this.rightBarrier.destroy()
			this.rightBarrier = null
		}
		if (this.topBarrier) {
			this.#pressureBarrier.removeBarrier(this.topBarrier)
			this.topBarrier.destroy()
			this.topBarrier = null
		}
		if (this.bottomBarrier) {
			this.#pressureBarrier.removeBarrier(this.bottomBarrier)
			this.bottomBarrier.destroy()
			this.bottomBarrier = null
		}
		super.emit("barrier-destroyed")
	}
}

// Fake pointer
var FakePointer = class FakeCursor {
	#cursorSprite
	#cursorActor
	#visible
	x
	y

	constructor() {
		this.#visible = false
		this.#cursorSprite = new Clutter.Actor({ request_mode: Clutter.RequestMode.CONTENT_SIZE })
		this.#cursorSprite.content = new Magnifier.MouseSpriteContent()

		this.#cursorActor = new Clutter.Actor()
		this.#cursorActor.add_actor(this.#cursorSprite)
	}

	updateMouseSprite(sprite, xHot, yHot) {
		if (!sprite) {
			this.hide()
			return
		}
		this.#cursorSprite.content.texture = sprite
		
		this.#cursorSprite.translationX = -xHot
		this.#cursorSprite.translationY = -yHot

		this.show()
	}

	setPosition(x, y) {
		this.x = x
		this.y = y
		this.#cursorActor.set_position(x, y)
	}
	getPosition() {
		return [this.x, this.y]
	}

	show() {
		if (this.#visible) return
		this.#visible = true

		Main.layoutManager.addTopChrome(this.#cursorActor)
	}
	
	hide() {
		if (!this.#visible) return
		this.#visible = false

		Main.layoutManager.removeChrome(this.#cursorActor)
	}

	destroy() {
		Main.layoutManager.removeChrome(this.#cursorActor)
		this.#cursorSprite.destroy()
		this.#cursorActor.destroy()
	}
}

// Mouse pointer mover
var PointerUtil = new class PointerUtil extends EventEmitter {
	#defaltSeat
	#cursorWatcher
	#cursorWatch
	#cursorTracker
	#cursorCache
	#visibilityCache
	#spriteCache
	#hotCache
	#maid
	#events = [
		"notify::position",
		"notify::visible",
		"notify::sprite",
		"notify::hot",
		"cursor-update",
	]

	constructor() {
		super()
		super.addEvent(...this.#events)
		this.#maid = new Maid()
	}

	enable() {
		global.pointerUtil = this
		this.#defaltSeat = Clutter.get_default_backend().get_default_seat()

		// Cursor position tracker
		this.#cursorWatcher = PointerWatcher.getPointerWatcher()
		this.framerate = 60
		this.interval = 1000/this.framerate
		this.#cursorWatch = this.#cursorWatcher.addWatch(this.interval, this.#updatePosition.bind(this))

		// Cursor shape tracker
		this.#cursorTracker = Meta.CursorTracker.get_for_display(global.display)
		this.#maid.connectJob(this.#cursorTracker, 'cursor-changed',     this.#spriteChanged.bind(this))
		this.#maid.connectJob(this.#cursorTracker, 'visibility-changed', this.#updateVisible.bind(this))
	}
	disable() {
		super.clearConnections()
		this.#maid.clean()
		global.pointerUtil = null
		this.#defaltSeat = null
		this.#cursorWatch.remove()
		this.#cursorWatcher = null
		this.#cursorTracker = null
	}

	
	// sprite & hot (texture)
	get sprite() {
		return this.#spriteCache ?? this.getRawSprite()
	}
	getRawSprite() {
		return this.#spriteCache = this.#cursorTracker.get_sprite()
	}
	get hot() {
		return this.#hotCache ?? this.getRawHot()
	}
	getRawHot() {
		return this.#hotCache = this.#cursorTracker.get_hot()
	}
	#spriteChanged() {
		super.emit("notify::sprite", this.getRawSprite())
		super.emit("notify::hot", this.getRawHot())
		super.emit("cursor-update", this.getRawSprite(), ...this.getRawHot())
	}

	// Visible
	set visible(visibility) {
		this.#cursorTracker.set_pointer_visible(visibility)
	}
	get visible() {
		return this.#visibilityCache ?? this.getRawVisible()
	}
	getRawVisible() {
		return this.#visibilityCache = this.#cursorTracker.get_pointer_visible()
	}
	#updateVisible() {
		super.emit("notify::visible", this.getRawVisible())
	}

	// Position
	set position([x,y]) {
		this.#defaltSeat.warp_pointer(x,y)
	}
	get position() {
		return this.#cursorCache ?? this.getRawPosition()
	}
	getRawPosition() {
		return this.#cursorCache = global.get_pointer()
	}
	#updatePosition(x, y, mask) {
		this.#cursorCache = [x, y, mask]
		super.emit("notify::position", x, y, mask)
	}
}

// Window shadow size calc
function getShadowSize(window) {
	const { width: frameWidth, height: frameHeight, x: frameX, y: frameY } = window.get_frame_rect()
	const { width: bufferWidth, height: bufferHeight, x: bufferX, y: bufferY } = window.get_buffer_rect()
	const maximizedHorizontally = window.maximized_horizontally
	const maximizedVertically = window.maximized_vertically
	const top = frameY-bufferY
	const bottom = (bufferY+bufferHeight)-(frameY+frameHeight)
	const left = frameX-bufferX
	const right = (bufferX+bufferWidth)-(frameX+frameWidth)
	const vertical = top+bottom
	const horizontal = left+right
	const verticalShadowRatio = vertical/bufferHeight
	const horizontalShadowRatio = horizontal/bufferWidth

	return {
		top, bottom, left, right,
		frameWidth, frameHeight, frameX, frameY,
		bufferWidth, bufferHeight, bufferX, bufferY,
		maximizedHorizontally, maximizedVertically,
		maximized: maximizedVertically || maximizedHorizontally,
		verticalShadowRatio, horizontalShadowRatio,
		horizontalFrameRatio: 1-horizontalShadowRatio,
		verticalFrameRatio: 1-verticalShadowRatio,
		horizontal, vertical,
	}
}

// Caclulate resize animation size
function getResizeAnimationSize(shadow,toX,toY,toWidth,toHeight) {
	const widthWithShadow = toWidth + shadow.horizontal
	const heightWithShadow = toHeight + shadow.vertical
	const afterVerticalShadowRatio = shadow.vertical / heightWithShadow
	const afterHorizontalShadowRatio = shadow.horizontal / widthWithShadow
	const afterVerticalFrameRatio = 1-afterVerticalShadowRatio
	const afterHorizontalFrameRatio = 1-afterHorizontalShadowRatio

	// 1 / from * to => How many times did it increase or decrease
	// (total ratio including shadows) * (how much frame ratio increase or decrease)
	// It causes the frame ratio maintained. imaging some situration. eg:
	// normal case: buffer:1{frame:0.5 shadow:0.5}, buffer:0.5{frame:0.8 shadow:0.2}
	// resize buffer:1 to buffer:0.5, buffer:0.5{frame:0.5,shadow:0.5} frame=0.5*0.5 << not match with 0.5*0.8
	// buffer:(0.5 ×(1÷0.5*0.8) = 0.8){frame:0.5,shadow: 0.5} frame=0.8*0.5 << match with 0.5*0.8
	const cloneGoalScaleX = widthWithShadow/shadow.bufferWidth / shadow.horizontalFrameRatio * afterHorizontalFrameRatio
	const cloneGoalScaleY = heightWithShadow/shadow.bufferHeight / shadow.verticalFrameRatio * afterVerticalFrameRatio
	const actorInitScaleX = shadow.bufferWidth/widthWithShadow * shadow.horizontalFrameRatio / afterHorizontalFrameRatio
	const actorInitScaleY = shadow.bufferHeight/heightWithShadow * shadow.verticalFrameRatio / afterVerticalFrameRatio

	// place clone with *shadow position ignored
	const cloneGoalX = toX-shadow.left*cloneGoalScaleX
	const cloneGoalY = toY-shadow.top*cloneGoalScaleY

	// place actor with *shadow position ignored
	const actorInitX = shadow.frameX - shadow.left * actorInitScaleX
	const actorInitY = shadow.frameY - shadow.top * actorInitScaleY
	const actorTranslationX = actorInitX - (toX - shadow.left) // this means just x
	const actorTranslationY = actorInitY - (toY - shadow.top)

	return {
		widthWithShadow,
		heightWithShadow,
		afterVerticalShadowRatio,
		afterHorizontalShadowRatio,
		afterVerticalFrameRatio,
		afterHorizontalFrameRatio,
		cloneGoalScaleX,
		cloneGoalScaleY,
		actorInitScaleX,
		actorInitScaleY,
		cloneGoalX,
		cloneGoalY,
		actorInitX,
		actorInitY,
		actorTranslationX,
		actorTranslationY,
	}
}

// Background blur
var StaticBlur = class StaticBlur {
	#blur
	#sigma
	#brightness
	#monitorIndex
	#background
	#background_parent
	#enabled
	#target
	#disposed
	#x
	#y
	#rect
	#visible

	constructor() {
		this.#sigma = 8
		this.#brightness = 0.5
		this.#enabled = false
		this.#disposed = false
		this.#x = 0
		this.#y = 0
		this.#visible = true
		this.rect = { width: 0, height: 0, x: 0, y: 0 }
	}

	// public functions
	enable() {
		if (this.#disposed) throw Error("[EXTENSION QE] utility.StaticBlur Already disposed. ignore enable call")
		if (this.#monitorIndex === undefined) this.#monitorIndex = global.display.get_primary_monitor()
		this.#enabled = true

		// create holder
		this.#background_parent = new St.Widget({
			name: 'blur-parent',
			x: this.#x, y: this.#y, width: 0, height: 0
		})
		if (!this.#visible) {
			this.#background_parent.hide()
		}

		// create background
		this.#background = new Meta.BackgroundActor({
			meta_display: global.display,
			monitor: this.#monitorIndex
		})
		this.#background_parent.add_child(this.#background)
		this.#setBackground()

		// add blur to background
		this.#blur = new Shell.BlurEffect({
			brightness: this.#brightness,
			sigma: this.#sigma * global.display.get_monitor_scale(this.#monitorIndex),
			mode: Shell.BlurMode.ACTOR
		})
		this.#background.add_effect_with_name("blur",this.#blur)

		// add whole to target / create connection / update rect
		if (this.#target) {
			this.#target.insert_child_at_index(this.#background_parent,0)
		}
		this.updateRect(this.#rect)
		this.#createConnection()
	}
	disable() {
		if (!this.#enabled) return
		this.#destroyConnection()
		safeDestroy(this.#blur,this.#background,this.#background_parent)
		this.#blur = this.#background = this.#background_parent = null
		this.#enabled = false
	}
	reset() {
		if (!this.#enabled) return
		this.disable()
		GLib.timeout_add(GLib.PRIORITY_DEFAULT,1,()=>{
			if (this.#disposed || this.#enabled) return GLib.SOURCE_REMOVE
			this.enable()
			return GLib.SOURCE_REMOVE
		})
	}
	dispose() {
		if (this.#enabled) this.disable()
		this.#disposed = true
	}
	hide() {
		this.#visible = false
		if (this.#enabled && this.#background_parent) {
			this.#background_parent.hide()
		}
	}
	show() {
		this.#visible = true
		if (this.#enabled && this.#background_parent) {
			this.#background_parent.show()
		}
	}
	updateRect(rect) {
		this.#rect = rect
		if (!this.#enabled) return
		this.#background.set_clip(rect.x, rect.y, rect.width, rect.height)
		this.#background.x = -rect.x
		this.#background.y = -rect.y
	}

	// manage connection
	#connection_background
	#connection_monitor
	#createConnection() {
		// background chnage
		this.#connection_background = Main.layoutManager._backgroundGroup.connect('notify',this.#setBackground.bind(this))

		// connect to monitors change
		this.#connection_monitor = Main.layoutManager.connect('monitors-changed', this.reset.bind(this))
	}
	#destroyConnection() {
		if (this.#connection_background) {
			Main.layoutManager._backgroundGroup.disconnect(this.#connection_background)
			this.#connection_background = null
		}
		if (this.#connection_monitor) {
			Main.layoutManager.disconnect(this.#connection_monitor)
			this.#connection_monitor = null
		}
	}

	#setBackground() {
		if (!this.#enabled) return
		const bg = Main.layoutManager._backgroundGroup.get_child_at_index(
			this.#monitorIndex
		)
		if (!bg) return
		const content = bg.get_content()
		if (!content) return
		this.#background.content.set({
			background: content.background
		})
	}

	// common getter
	get monitorIndex() { return this.#monitorIndex }
	get brightness() { return this.#brightness }
	get sigma() { return this.#sigma }
	get x() { return this.#x }
	get y() { return this.#y }
	get visible() { return this.#visible }
	get target() { return this.#target }
	get actor() { return this.#background_parent }
	
	// common setter
	set monitorIndex(monitorIndex) {
		this.#monitorIndex = monitorIndex
		this.reset()
	}
	set brightness(brightness) {
		this.#brightness = brightness
		if (this.#enabled && this.#blur) {
			this.#blur.brightness = brightness
		}
	}
	set sigma(sigma) {
		this.#sigma = sigma
		if (this.#enabled && this.#blur) {
			this.#blur.sigma =  sigma * global.display.get_monitor_scale(this.#monitorIndex)
		}
	}
	set x(x) {
		// x = parseInt(x)
		this.#x = x
		if (this.#enabled && this.#background_parent) {
			this.#background_parent.x = x
		}
	}
	set y(y) {
		// y = parseInt(y)
		this.#y = y
		if (this.#enabled && this.#background_parent) {
			this.#background_parent.y = y
		}
	}
	set visible(visible) {
		if (visible) this.show()
		else this.hide()
	}
	set target(target) {
		const lastTarget = this.#target
		this.#target = target
		if (this.#enabled && this.#background_parent) {
			if (lastTarget) lastTarget.remove_child(this.#background_parent)
			target.insert_child_at_index(this.#background_parent,0)
		}
	}
}

// Window unresizer
var Unresizabler = class Unresizabler {
	resizeOps = [
		Meta.GrabOp.RESIZING_E,
		Meta.GrabOp.RESIZING_N,
		Meta.GrabOp.RESIZING_NE,
		Meta.GrabOp.RESIZING_NW,
		Meta.GrabOp.RESIZING_S,
		Meta.GrabOp.RESIZING_SE,
		Meta.GrabOp.RESIZING_SW,
		Meta.GrabOp.RESIZING_W,
	]

	constructor(window,allowResizeChecker,getTargetSize) {
		window._unresizabler = true
		{
			const rect = window.get_frame_rect()
			window.savedX = rect.x
			window.savedY = rect.y
			window.savedWidth = rect.width
			window.savedHeight = rect.height
		}
		window._unresizabler_positionsave = window.connect("position-changed",window=>{
			const rect = window.get_frame_rect()
			if (rect.width != window.savedWidth || rect.height != window.savedHeight) return
			window.savedX = rect.x
			window.savedY = rect.y
		})
		window._unresizabler_resizer = window.connect("size-changed",window=>{
			if (window._unresizabler_change) return
			const rect = window.get_frame_rect()
			if (allowResizeChecker(rect) || (rect.width == window.savedWidth && rect.height == window.savedHeight)) {
				window.savedX = rect.x
				window.savedY = rect.y
				const { targetWidth, targetHeight } = getTargetSize(rect)
				window.savedHeight = targetHeight
				window.savedWidth = targetWidth
				return
			}
			window._unresizabler_change = true
			if (window.get_maximized()) window.unmaximize(Meta.MaximizeFlags.BOTH)
			window.move_resize_frame(false, window.savedX ?? rect.x, window.savedY ?? rect.y, window.savedWidth, window.savedHeight)
			window.maximize(Meta.MaximizeFlags.BOTH)
			window.unmaximize(Meta.MaximizeFlags.BOTH)
			window._unresizabler_change = false
		})
	}
}

// Window init handler
var WindowInitedHandler = class WindowInitedHandler {
	#initWindow
	#uninitWindow
	#id
	#filter
	#method
	constructor(initerId) {
		this.#id = initerId + "_inited"
	}

	setInitWindowHandler(handler) {
		this.#initWindow = handler
		return this
	}

	setUninitWindowHandler(handler) {
		this.#uninitWindow = handler
		return this
	}

	setFilter(filter) {
		this.#filter = filter
		return this
	}

	useMap() {
		this.#method = "map"
		return this
	}

	useCreated() {
		this.#method = null
		return this
	}

	init() {
		if (this.#method == "map") {
			this.windowCreatedEvent = global.window_manager.connect("map", (_, actor)=>this.windowCreated(actor.metaWindow))
		} else {
			this.windowCreatedEvent = global.display.connect("window-created", (_,window)=>this.windowCreated(window))
		}
		global.get_window_actors()
			.map(actor=>actor.meta_window)
			.filter(window=>window)
			.forEach(window=>this.windowCreated(window,true))
		this.windowDestroyEvent = global.window_manager.connect("destroy", (e, actor) => {
			const window = actor.meta_window
			if (!window) return
			this.windowDestroying(window)
		})
		return this
	}

	windowCreated(window,firstTime) {
		if (this.#filter) {
			if (!this.#filter(window)) return
		}
		window[this.#id] = this
		if (this.#initWindow) this.#initWindow(window,firstTime||false)
	}

	windowDestroying(window) {
		if (!window[this.#id]) return
		delete window[this.#id]
		if (this.#uninitWindow) this.#uninitWindow(window)
	}

	dispose() {
		for (const actor of global.get_window_actors()) {
			const window = actor?.metaWindow
			if (!window) continue
			this.windowDestroying(window)
		}
		if (this.#method == "map") {
			global.window_manager.disconnect(this.windowCreatedEvent)
		} else {
			global.display.disconnect(this.windowCreatedEvent)
		}
		global.window_manager.disconnect(this.windowDestroyEvent)
		this.windowDestroyEvent = this.windowCreatedEvent = null
	}
}

// Window Types
const focusableWindowTypes = [
	Meta.WindowType.NORMAL,
	Meta.WindowType.DIALOG,
	Meta.WindowType.MODAL_DIALOG,
]
function isFocusable(window) {
	return focusableWindowTypes.includes(window.window_type)
}
function isNormal(window) {
	return window.window_type === Meta.WindowType.NORMAL
}

const RENDER_DELAY = 3+1 // ignore initial call / first frame call (on resized) / after call (window redraw) + time to render window

var WindowMover = class WindowMover {
  constructor() {
    this._windowAnimations = []
  }

  // deinit all animations
  destroy() {
    this._windowAnimations.forEach(animation=>this._destroyAnimation(animation))
    this._windowAnimations = null
  }

  // capture window content and create clone clutter
  _captureWindow(window_actor,rect) {
    return new Clutter.Actor({
      height: rect.height,
      width: rect.width,
      x: rect.x,
      y: rect.y,
      content: window_actor.paint_to_content(null)
    })
  }

  // give time to redraw it selfs to application
  // If canceled, return true
  _delayFrames(actor,animation) {
    return new Promise(resolve=>{
      const timeline = animation.timeline = new Clutter.Timeline({ actor:actor,duration: 1000 })
      let count = 0
      animation.resolve = resolve
      animation.newframe = timeline.connect("new-frame",()=>{
        if (++count < RENDER_DELAY) return 
        timeline.disconnect(animation.newframe)
        timeline.run_dispose()
        animation.resolve = animation.newframe = animation.timeline = null
        resolve()
      })
      timeline.start()
    })
  }

  // destroy last animation, Also cancel delayFraems
  _destroyAnimation(animation,keepTransitions) {
    const actor = animation.actor

    // remove animation from lists
    const index = this._windowAnimations.indexOf(animation)
    if (index != -1) this._windowAnimations.splice(index,1)
    
    // kill transitions
    if (!keepTransitions) {
      animation?.clone?.remove_all_transitions()
      animation?.clone?.destroy()
      if (actor) {
        actor.remove_all_transitions()
        actor.scale_x = 1
        actor.scale_y = 1
        actor.translation_x = 0
        actor.translation_y = 0
      }
      animation.clone = animation.actor = animation.window = null
    }

    // kill last delay
    const timeline = animation?.timeline
    if (timeline) {
      timeline.disconnect(animation.newframe)
      timeline.run_dispose()
      const resolve = animation.resolve
      actor.thaw()
      animation.resolve = animation.newframe = animation.timeline = null
      resolve(true)
    }
  }

  async setWindowRect(window, x, y, width, height, animate, clone) {
	if (!animate) {
		clone.destroy()
		clone = null
	}
    const actor = window.get_compositor_private()
    const lastAnimation = this._windowAnimations.find(item=>item.window === window)
    const thisAnimation = {}

    // Calculate before size / position
	const beforeShadow = getShadowSize(window)
	const animationSize = getResizeAnimationSize(beforeShadow,x,y,width,height)

    // destroy last animation and freeze actor
    if (lastAnimation) this._destroyAnimation(lastAnimation,animate) // destroy old animation (but keep keep transitions for smoother)
    actor.freeze() // do not render while real resizing done

    // unmaximize
    if (beforeShadow.maximized) {
      // clone actor before unmaximize for animate maxed -> tiled
      clone ??= animate && this._captureWindow(actor,actor)
      window.unmaximize(Meta.MaximizeFlags.BOTH)
      actor.remove_all_transitions() // remove unmaximize animation
    }

    // in another workspace
    if (!window.showing_on_its_workspace()) {
      if (lastAnimation) this._destroyAnimation(lastAnimation,animate)
      window.move_resize_frame(true, x, y, width, height)
      actor.thaw()
      return
    }

    // save this animation / clone window
    if (animate) {
      thisAnimation.clone = clone ??= this._captureWindow(actor,actor)
      thisAnimation.window = window
      thisAnimation.actor = actor
      this._windowAnimations.push(thisAnimation)
    }

    // resize meta window / wait for window ready
    window.move_resize_frame(true, x, y, width, height)
	window.move_frame(true,x,y) // some buggy window require this... (eg: gnome terminal)
    if (!animate) { // if no animate
      actor.thaw() // allow render window
      return
    }
    const resultDelay = await this._delayFrames(actor,thisAnimation) // wait once for window size updating
    if (lastAnimation) this._destroyAnimation(lastAnimation) // remove old transitions (actor easing)
    if (resultDelay) return // If canceled, just return
    if (clone.get_parent() === null) global.window_group.insert_child_above(clone,actor) // insert clone on screen

    // Set real window actor position
    actor.scale_x = animationSize.actorInitScaleX
    actor.scale_y = animationSize.actorInitScaleY
    actor.translation_x = animationSize.actorTranslationX
    actor.translation_y = animationSize.actorTranslationY
	actor.show()
    actor.thaw() // allow render window

    // Clone animation
    clone.ease_property('opacity', 0, {
      duration: 220,
      mode: Clutter.AnimationMode.EASE_OUT_QUART
    })
    clone.ease({
      scale_x: animationSize.cloneGoalScaleX,
      scale_y: animationSize.cloneGoalScaleY,
      x: animationSize.cloneGoalX,
      y: animationSize.cloneGoalY,
      duration: 375,
      mode: Clutter.AnimationMode.EASE_OUT_QUINT,
    })

    // Real window animation
    actor.ease({
      scale_x: 1,
      scale_y: 1,
      translation_x: 0,
      translation_y: 0,
      duration: 375,
      mode: Clutter.AnimationMode.EASE_OUT_QUINT,
      onStopped: ()=>{
        const nowAnimation = this._windowAnimations.find(item=>item.window === window)
        if (nowAnimation?.clone === clone) this._destroyAnimation(nowAnimation)
      }
    })
  }
}

// Grap ops
var resizingOps = [
	Meta.GrabOp.RESIZING_N,
	Meta.GrabOp.RESIZING_NE,
	Meta.GrabOp.RESIZING_NW,
	Meta.GrabOp.RESIZING_E,
	Meta.GrabOp.RESIZING_W,
	Meta.GrabOp.RESIZING_S,
	Meta.GrabOp.RESIZING_SE,
	Meta.GrabOp.RESIZING_SW,
]

function set(obj,props) {
	for (const index in props) {
		obj[index] = props[index]
	}
	return obj
}

// Safe destroy
function safeDestroy(...actors) {
	for (const actor of actors) {
		if (actor === undefined || actor === null || actors.__destroyed) continue
		if (actor.is_destroyed && actor.is_destroyed()) continue
		try { actors.__destroyed = true } catch {}
		if (actor.dispose) { actor.dispose(); continue }
		else if (actor.destroy) { actor.destroy(); continue }
		else if (actor.run_dispose) { actor.run_dispose(); continue }
	}
}

// Focus array
var FocusArray = new class FocusArray {
	array
	#settings
	#windowInitedHandler

	constructor() {}

	// Public functions
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

	// Handle windows
	#windowFocused(window) {
		let index = this.array.indexOf(window)
		if (index != -1) {
			this.array.splice(index,1)
		}
		this.array.unshift(window)
	}
	#initWindow(window) {
		if (window.has_focus()) this.#windowFocused(window) // Push to top if focused
		else if (!this.array.includes(window)) this.array.push(window) // Push to bottom if not focused

		// Make destroy/focus event handler
		if (!window._focus_array_focus) {
			window._focus_array_focus = window.connect('focus',()=>this.#windowFocused(window))
		}
	}
	#uninitWindow(window) {
		const index = this.array.indexOf(window)
		if (index != -1) this.array.splice(index)
		if (window._focus_array_focus) window.disconnect(window._focus_array_focus)
	}

	enable() {
		global.focusArray = this
		this.array = []
		this.#settings = ExtensionUtils.getSettings()

		// Load saved windows
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
				this.#initWindow(window)
			})
		}

		// Load window initer
		this.#windowInitedHandler = new WindowInitedHandler("EdgeTmpHide")
			.setInitWindowHandler(this.#initWindow.bind(this))
			.setUninitWindowHandler(this.#uninitWindow.bind(this))
			.setFilter(isFocusable)
			.init()
	}

	disable() {
		// Save focus array
		const saveList = []
		this.array.forEach(window=>{
			if (!window) return
			let actor = window.get_compositor_private()
			if (!actor) return
			if (actor.is_destroyed()) return
			
			saveList.push(""+window.get_description())
		})
		this.#settings.set_strv("qe-ws-last-windows",saveList)
	
		// Dispose All
		this.#settings.run_dispose()
		this.#windowInitedHandler.dispose()
		this.#settings = this.focusArray = global.focusArray = null
	}
}

function getOffset(from,to) {
	const result = []
	from.forEach((value,index)=>result.push(to[index]-value))
	return result
}
function applyOffset(from,offset) {
	const result = []
	from.forEach((value,index)=>result.push(value-offset[index]))
	return result
}
function clamp(x,a,b) {
	if (b<a) {
		const tmp = a
		a=b
		b=tmp
	}
	return Math.min(Math.max(x,a),b)
}

// Items which should be enabled when plugin running
var ExtensionHandlers = [
	FocusArray,
	PointerUtil,
]
