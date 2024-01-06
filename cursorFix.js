const { St, GLib, Meta } = imports.gi
const Main = imports.ui.main

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { PointerUtil } = Me.imports.libs.utility

var CursorFix = class CursorFix {
    updateVisibility() {
        if (global.display.get_n_monitors()!=1) {
            this.disabledByMonitor = false
        } else {
            this.disabledByMonitor = true
        }
        if (this.visible) {
            Main.layoutManager.removeChrome(this.widget)
            this.visible = false
        }
    }
    enable() {
        this.updateVisibility()
        this.monitorGeometry = global.display.get_monitor_geometry(0)
        global.overlayCursor = this.widget = new St.Widget({
            reactive: false,
            style: "background: white;border-radius: 7px;",
            width: 14,
            height: 14,
            x: -7,
            y: -7,
        })
        this.widget.add_child(new St.Widget({
            reactive: false,
            style: "background: #9a52ff;border-radius: 5px;",
            width: 10,
            height: 10,
            x: 2,
            y: 2,
        }))
        this.visible = false
        PointerUtil.connectObject(
            'notify::position', (x,y)=>{
                if (this.disabledByMonitor) return
                if (global.display.get_current_monitor() != 0) {
                    if (this.visible) {
                        Main.layoutManager.removeChrome(this.widget)
                        this.visible = false
                    }
                    return
                }
    
                this.widget.translationX = x
                this.widget.translationY = y
    
                // Change visibility
                if (!this.visible) {
                    Main.layoutManager.addTopChrome(this.widget)
                    this.visible = true
                }
            },
            this
        )
        this.monitorChanged =  Main.layoutManager.connect("monitors-changed",this.updateVisibility.bind(this))
    }

    disable() {
        Main.layoutManager.disconnect(this.monitorChanged)
        PointerUtil.disconnectObject(this)
        if (this.visible) {
            Main.layoutManager.removeChrome(this.widget)
        }
        this.widget.destroy()
        this.widget =
        this.visible =
        this.monitorChanged =
        this.monitorGeometry = null
    }
}
