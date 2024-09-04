import Meta from "gi://Meta"
import St from "gi://St"
import Shell from "gi://Shell"
import Clutter from "gi://Clutter"
import GObject from "gi://GObject"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

class Holder extends St.Widget {
    static {
        GObject.registerClass({}, this)
    }

    constructor() {
        super({ reactive: true, clip_to_allocation: true })
    }

    vfunc_motion_event() {
        if (this.moved) this.moved()
        return Clutter.EVENT_PROPAGATE
    }
    
    onMoveKeyPressed(keyval) {
        switch(keyval) {
        case Clutter.KEY_w:
        case Clutter.KEY_k:
        case Clutter.KEY_Up:
            if (this.moveCursor) this.moveCursor(-1)
            break
        case Clutter.KEY_s:
        case Clutter.KEY_j:
        case Clutter.KEY_Down:
            if (this.moveCursor) this.moveCursor(1)
            break
        case Clutter.KEY_Left:
            if (this.zoom) this.zoom(-1)
            break
        case Clutter.KEY_Right:
            if (this.zoom) this.zoom(1)
            break
        }
    }
    
    vfunc_key_press_event(event) {
        const { keyval } = event;
        if(keyval === Clutter.KEY_Escape) {
            if (this.escPressed) this.escPressed()
            return Clutter.EVENT_PROPAGATE
        } else {
            this.onMoveKeyPressed(keyval)
        }
        return super.vfunc_key_press_event(event)
    }

    vfunc_scroll_event(event) {
        const { direction } = event
        switch (direction) {
        case Clutter.ScrollDirection.DOWN:
            if (this.scroll) this.scroll(1)
            break
        case Clutter.ScrollDirection.UP:
            if (this.scroll) this.scroll(-1)
            break
        }
        // return super.vfunc_scroll_event(event)
    }

    // vfunc_button_press_event(event) {
    //     return Clutter.EVENT_PROPAGATE;
    // }
}

export class FocusIn {
    constructor() {}

    moveCursor(y) {
        let [X, Y] = global.get_pointer()
        this.virtualPointer.notify_absolute_motion(global.get_current_time(), X, Y + y)
    }

    updateView() {
        this.monitorIndex = global.display.get_primary_monitor()
        const mainMonitor = this.monitorGeometry = global.display.get_monitor_geometry(this.monitorIndex)
        this.holder.x = mainMonitor.x
        this.holder.y = mainMonitor.y
        this.holder.height = mainMonitor.height
        this.holder.width = mainMonitor.width
        this.top.height = mainMonitor.height
        this.top.width = mainMonitor.width
        this.bottom.height = mainMonitor.height
        this.bottom.width = mainMonitor.width
    }

    updatePosition() {
        const y = parseInt((global.get_pointer())[1])
        const mainMonitor = this.monitorGeometry
        const size = parseInt(this.size / 2)
        this.top.height = Math.max(y - mainMonitor.y - size, 0)
        this.bottom.height = Math.max(mainMonitor.height - y - mainMonitor.y - size, 0)
        this.bottom.y = y + size
    }

    show() {
        this.visible = true
        this.updatePosition()
        Main.layoutManager.addTopChrome(this.holder)
        this.model = Main.pushModal(this.holder, { actionMode: Shell.ActionMode.NORMAL })
    }

    hide() {
        this.visible = false
        if (this.model) {
            Main.popModal(this.model)
            this.model = null
        }
        Main.layoutManager.removeChrome(this.holder)
    }

    toggle() {
        if (this.visible) {
            this.hide()
        } else {
            this.show()
        }
    }

    enable(extension) {
        this.size = 30
        this.settings = extension.getSettings()
        this.virtualPointer = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE)
        this.visible = false

        // create actors
        this.holder = new Holder()

        // this.holder.hide()
        this.top = new St.Widget({
            y: 0,
            style: "background: rgba(0,0,0,0.9);",
        })
        this.holder.add_child(this.top)
        this.bottom = new St.Widget({
            style: "background: rgba(0,0,0,0.9);",
        })
        this.holder.add_child(this.bottom)

        // binding / update
        this.updateView()
        this.holder.escPressed = this.hide.bind(this)
        this.holder.moved = this.updatePosition.bind(this)
        this.holder.moveCursor = direction => this.moveCursor(parseInt(direction * this.size / 3))
        this.holder.scroll = direction => this.moveCursor(direction * 6)
        this.holder.zoom = direction => {
            this.size = Math.min(Math.max(this.size + direction*2,12),200)
            this.updatePosition()
        }

        // create binding
        Main.wm.addKeybinding(
            'qe-focusin',
            this.settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                this.toggle()
            }
        )

        // create monitor changed event
        this.monitorChanged = Main.layoutManager.connect("monitors-changed",this.updateView.bind(this))
		this.panelHeightChanged = Main.panel.connect("notify::height",this.updateView.bind(this))
    }
    disable() {
        if (this.model) {
            Main.popModal(this.model)
            this.model = null
        }
        if (this.visible) {
            Main.layoutManager.removeChrome(this.holder)
        }

        this.monitorIndex = this.monitorGeometry = null
        this.virtualPointer = this.size = this.visible = null
        Main.wm.removeKeybinding('qe-focusin')

        this.settings.run_dispose()
        this.settings = null

        Main.layoutManager.disconnect(this.monitorChanged)
        Main.panel.disconnect(this.panelHeightChanged)
        this.monitorChanged = this.panelHeightChanged = null

        this.top.destroy()
        this.bottom.destroy()
        this.holder.destroy()
        this.top = this.bottom = this.holder = null
    }
}
