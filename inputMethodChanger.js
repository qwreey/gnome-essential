import Meta from "gi://Meta"
import GLib from "gi://GLib"
import Shell from "gi://Shell"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
import { getInputSourceManager } from "resource:///org/gnome/shell/ui/status/keyboard.js"

export class InputMethodChanger {
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

    enable(extension) {
        this.#inputSourceManager = getInputSourceManager()
        this.#settings = extension.getSettings()
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
