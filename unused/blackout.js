const { Meta, St } = imports.gi
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { WindowInitedHandler } = Me.imports.libs.utility

var Blackout = class Blackout {
    constructor() {}

    initWindow(window) {
        if (global.display.get_n_monitors() == 1) {
            return
        }
        const actor = window.get_compositor_private()
        if (window.get_monitor() != 0) return
        window.blackout = new St.Widget({
            reactive: false,
            style: "background: black;",
            width: actor.width,
            height: actor.height,
            x: -10000,
            translationX: 10000,
        })
        actor.add_child(window.blackout)
    }

    uninitWindow(window) {
        if (window.blackout) {
            window.blackout.destroy()
            window.blackout = null
        }
    }

    enable() {
        this.windowInitedHandler = new WindowInitedHandler()
            .setInitWindowHandler(this.initWindow.bind(this))
            .setUninitWindowHandler(this.uninitWindow.bind(this))
            .setFilter(window=>window.wm_class == "Nemo-desktop")
            .init()
    }
    disable() {
        this.windowInitedHandler.dispose()
    }
}
