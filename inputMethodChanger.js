const { Meta, Shell, GLib } = imports.gi
const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { getInputSourceManager } = imports.ui.status.keyboard

var InputMethodChanger = class InputMethodChanger {
    #settings
    #inputSourceManager
    constructor() {}

    apply(inputSource) {
        if (!inputSource) return
        if (this.#inputSourceManager.currentSource == inputSource) return
        // this.#inputSourceManager.activateInputSource(inputSource)
        inputSource.activate()
        GLib.timeout_add(GLib.PRIORITY_DEFAULT,2,()=>{
            this.apply(inputSource)
            return GLib.SOURCE_REMOVE
        })
    }

    change() {
        const currentSource = this.#inputSourceManager.currentSource
        const sources = this.#inputSourceManager.inputSources
        let lastIndex,currentIndex=0,source
        for (let index=0; source=sources[index]; index++) {
            if (currentSource == source) currentIndex = index
            lastIndex = index
        }
        const nextIndex = (currentIndex+1)%(lastIndex+1)
        const nextSource = sources[nextIndex]
        this.apply(nextSource)
    }

    enable() {
        this.#inputSourceManager = getInputSourceManager()
        this.#settings = ExtensionUtils.getSettings()
        Main.wm.addKeybinding(
            'qe-input-method-change',
            this.#settings,

            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT
            & Meta.KeyBindingFlags.NON_MASKABLE
            & Meta.KeyBindingFlags.BUILTIN
            & Meta.KeyBindingFlags.PER_WINDOW
            & Meta.KeyBindingFlags.NO_AUTO_GRAB,

            Shell.ActionMode.ALL,
            this.change.bind(this)
        )
    }

    disable() {
        Main.wm.removeKeybinding('qe-input-method-change')
    }
}
