const { Meta } = imports.gi
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { WindowInitedHandler, Unresizabler } = Me.imports.libs.utility

var FuckYouKakaoTalk = class FuckYouKakaoTalk {
    constructor() {}

    initWindow(window) {
        // 불필요한 그림자를 없엡니다
        if (window.title == "KakaoTalkShadowWnd" || window.title == "KakaoTalkEdgeWnd") {
            const actor = window.get_compositor_private()
            window.kakaoShow = actor.connect("show",actor.hide.bind(actor))
            actor.hide()
            return
        }

        // if (window.window_type == Meta.WindowType.NORMAL) {
            // 392 502
            // new Unresizabler(window,(rect)=>rect.height >= 502 && rect.,getTargetSize)
        // }

        // console.log("FuckYouKakaoTalk",window.title,["NORMAL","DESKTOP","DOCK","DIALOG","MODAL_DIALOG","TOOLBAR","MENU","UTILITY","SPLASHSCREEN","DROPDOWN_MENU","POPUP_MENU","TOOLTIP","NOTIFICATION","COMBO","DND","OVERRIDE_OTHER"][window.window_type],["NORMAL 0","DIALOG 1","MODAL_DIALOG 2","UTILITY 3","MENU 4","BORDER 5","ATTACHED 6","LAST 7"][window.get_frame_type()])
        // 팝업 광고를 없엡니다
        
        // if (window.wm_class === "kakaotalk.exe"
        //     && window.title === ""
        //     && (window.get_compositor_private() !== null)
        //     && (!window.allows_move())
        //     && (!window.allows_resize())
        //     && (!window.can_minimize())
        //     && (!window.can_maximize())
        //     && window.is_skip_taskbar()
        //     && window.is_always_on_all_workspaces()
        //     && (!window.can_close())
        //     && window.get_frame_type() === 7 // LAST
        //     && (!window.decorated)
        //     && window.window_type == Meta.WindowType.OVERRIDE_OTHER) {
        //     window.get_compositor_private().hide()
        //     // window.delete(global.get_current_time())
        //     global.test = window
        //     log("Killed kakaotalk ad window")
        //     return
        // }
    }

    uninitWindow(window) {
        if (window.kakaoShow) {
            const actor = window.get_compositor_private()
            actor.disconnect(window.kakaoShow)
            window.kakaoShow = null
        }
    }

    enable() {
        this.windowInitedHandler = new WindowInitedHandler()
			.setInitWindowHandler(this.initWindow.bind(this))
			.setUninitWindowHandler(this.uninitWindow.bind(this))
			.setFilter(window=>window.get_wm_class() == "kakaotalk.exe")
            .useMap()
			.init()
    }
    disable() {
        this.windowInitedHandler.dispose()
    }
}
