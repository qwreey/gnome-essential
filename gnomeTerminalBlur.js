const { Meta } = imports.gi
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { WindowInitedHandler, StaticBlur, getShadowSize, isNormal } = Me.imports.libs.utility

var GnomeTerminalBlur = class GnomeTerminalBlur {
    constructor() {}

    updateWindowRect(window) {
        const blur = window._gnome_terminal_blur
        const shadowData = getShadowSize(window)
        blur.updateRect({
            height: shadowData.frameHeight - 58,
            width: shadowData.frameWidth,
            x: shadowData.frameX,
            y: shadowData.frameY,
        })
        blur.x = shadowData.left
        blur.y = shadowData.top + 58
    }

    initWindow(window) {
        const blur = window._gnome_terminal_blur = new StaticBlur()
        window._gnome_terminal_blur_pos_changed = window.connect("position-changed",this.updateWindowRect.bind(this,window))
		window._gnome_terminal_blur_size_changed = window.connect("size-changed",this.updateWindowRect.bind(this,window))
        this.updateWindowRect(window)
        blur.brightness = 0.1
        blur.target = window.get_compositor_private()
        blur.enable()
        global.blur = blur
    }

    uninitWindow(window) {
        window._gnome_terminal_blur.dispose()
        window.disconnect(window._gnome_terminal_blur_pos_changed)
        window.disconnect(window._gnome_terminal_blur_size_changed)
        window._gnome_terminal_blur_pos_changed =
        window._gnome_terminal_blur_size_changed = null
    }

    enable() {
        this.windowInitedHandler = new WindowInitedHandler()
			.setInitWindowHandler(this.initWindow.bind(this))
			.setUninitWindowHandler(this.uninitWindow.bind(this))
			.setFilter(window=>window.wm_class == "Gnome-terminal" && isNormal(window))
            // .useMap()
			.init()
    }
    disable() {
        this.windowInitedHandler.dispose()
    }
}

