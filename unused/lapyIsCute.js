

const WorkspaceThumbnail = imports.ui.workspaceThumbnail
const { Meta, St } = imports.gi
const { Bin,Button } = St

var LapyIsCute = class LapyIsCute {
	#status
    #wmMap
    constructor() {
        this.#status = false
    }
    createTracker(handler,x,y,w,h) {
        let tracker = new Button({
            reactive: true,
            width: w,
            height: h,
            x,y,
            // style: "background-color: red;"
        })
        handler.connect("destroy",()=>{
            tracker.destroy()
            this.#status = false
        })
        // handler.meta_window.connect("focused",()=>{})
        handler.meta_window.connect("focus",()=>{
            setTimeout(()=>global.window_group.set_child_above_sibling(tracker,handler),10)
        })
        global.window_group.insert_child_above(tracker,handler)
        // handler.add_child(tracker)

        tracker.connect("leave-event",(actor, event)=>{
            if (this.#status) global.display.set_cursor(Meta.Cursor.DEFAULT)
            this.#status = false
        })
        tracker.connect("button-press-event",()=>{
            if (!this.#status) return
            global.display.set_cursor(Meta.Cursor.DND_IN_DRAG)
            return true
        })
        tracker.connect("button-release-event",()=>{
            if (!this.#status) return
            global.display.set_cursor(Meta.Cursor.POINTING_HAND)
            return true
        })
        tracker.connect("enter-event",(actor, event)=>{
            global.window_group.set_child_above_sibling(tracker,handler)
            if (!this.#status) global.display.set_cursor(Meta.Cursor.POINTING_HAND)
            this.#status = true
        })
    }
    apply(handler) {
        if (!handler.meta_window) return
        if (handler.meta_window.get_wm_class() != "Nemo-desktop") return

        this.createTracker(handler,530,380,100,100)
    }
	enable() {
        global.get_window_actors().forEach(this.apply.bind(this))
        this.#wmMap = global.window_manager.connect("map",async(e, actor)=>this.apply(actor))
	}
	disable() {
        global.window_manager.disconnect(this.#wmMap)
        this.#wmMap = null
    }
}

