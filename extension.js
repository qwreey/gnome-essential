import { Extension } from "resource:///org/gnome/shell/extensions/extension.js"

// https://github.com/Schneegans/Desktop-Cube
// import { EdgeDragWorkspaceSwitches } from "./edgeDragWorkspaceSwitches.js"

// https://github.com/squgeim/Workspace-Scroll
import { TopbarScroll } from "./topbarScroll.js"

// https://github.com/fthx/workspaces-bar
// import { WorkspacesBarHandler } from "./workspaceBar.js"

// https://github.com/bdaase/noannoyance
// import { NoAnnoyance } from "./noAnnoyance.js"

// https://extensions.gnome.org/extension/591/remove-app-menu/
import { RemoveAppMenu } from "./removeAppMenu.js"

// https://github.com/KEIII/gnome-shell-panel-date-format
import { PanelDateFormat } from "./panelDateFormat.js"

// https://extensions.gnome.org/extension/2741/remove-alttab-delay-v2/
// import { RemoveAltTabDelay } from "./removeAltTabDelay.js"

// https://extensions.gnome.org/extension/2872/activities-icons/
import { MenuButtons } from "./menuButtons.js"

// https://gitlab.gnome.org/jrahmatzadeh/just-perfection
import { MoveNotification } from "./moveNotification.js"

import { MoveDateMenu } from "./moveDateMenu.js"
import { RemoveDash } from "./removeDash.js"
// import { AnimationSpeed } from "./animationSpeed.js"
import { ReducePanelMargin } from "./reducePanelMargin.js"
import { NemoDesktopIntegration } from "./nemoDesktopIntegration.js"
import { ChangeWorkspaceEasing } from "./changeWorkspaceEasing.js"
import { StartupNoOverview } from "./startupNoOverview.js"
// import { TransparentPanel } from "./transparentPanel.js"
import { MinimizeAnimation } from "./minimizeAnimation.js"
import { MoveAnimation } from "./moveAnimation.js"
import { OpenCloseAnimation } from "./openCloseAnimation.js"
// import { AddDateMenuIcon } from "./addDateMenuIcon.js"
import { ThemeHandle } from "./themeHandle.js"
// import { LapyIsCute } from "./lapyIsCute.js"
// import { Waydroid } from "./waydroid.js"
import { EdgeTmpHide } from "./edgeTmpHide.js"
// import { TrayiconBugfix } from "./trayiconBugfix.js"
// import { FuckYouKakaoTalk } from "./fuckYouKakaoTalk.js"

import { ExtensionHandlers } from "./libs/utility.js"
// import { GnomeTerminalBlur } from "./gnomeTerminalBlur.js"
import { FocusIn } from "./focusin.js"
import { InputMethodChanger } from "./inputMethodChanger.js"
// import { CursorFix } from "./cursorFix.js"
// import { Blackout } from "./blackout.js"
import { Wireframe } from "./wireframe.js"

const verbose = false

export default class MainExtension extends Extension {
	constructor(meta) {
		super(meta)
		this.enabledList = null
		this.start = null
		this.last = null
		this.now = null
	}

	enable() {
		this.last = this.start = +Date.now()
		log("[QE] Setup shared objects")
		for (const item of ExtensionHandlers) {
			item.enable(this)
			if (verbose) {
				this.now = +Date.now()
				log("[QE] | Loaded " + item.constructor.name + " taken "+ (this.now - this.last) + "ms")
				this.last = this.now
			}
		}
	
		log("[QE] Init classes")
		this.enabledList = [
			// new FuckYouKakaoTalk(),
			new EdgeTmpHide(),
			// new EdgeDragWorkspaceSwitches(),
			new RemoveAppMenu(),
			// new NoAnnoyance(),
			new PanelDateFormat(),
			// new WorkspacesBarHandler(),
			new TopbarScroll(),
			// new RemoveAltTabDelay(),
			new MoveDateMenu(),
			new RemoveDash(),
			// new AnimationSpeed(),
			new MenuButtons(),
			new ReducePanelMargin(),
			new NemoDesktopIntegration(),
			new ChangeWorkspaceEasing(),
			new MoveNotification(),
			new StartupNoOverview(),
			// new TransparentPanel(),
			new MinimizeAnimation(),
			// new AddDateMenuIcon(),
			new MoveAnimation(),
			new OpenCloseAnimation(),
			new ThemeHandle(),
			// new LapyIsCute(),
			// new Waydroid(),
			// new TrayiconBugfix(),
			// new GnomeTerminalBlur(),
			new FocusIn(),
			new InputMethodChanger(),
			// new CursorFix(),
			// new Blackout(),
			new Wireframe(),
		]
		if (verbose) {
			this.last = +Date.now()
			log("[QE] Taken " + (this.last - this.start) + "ms")
			log("[QE] execute enable() forEach")
		}
		for (const item of this.enabledList) {
			item.enable(this)
			if (verbose) {
				this.now = +Date.now()
				log("[QE] | Loaded " + item.constructor.name + " taken "+ (this.now - this.last) + "ms")
				this.last = this.now
			}
		}
		this.enabledList.reverse()
		log("[QE] Loaded! taken " + (+Date.now() - this.start) + "ms")
	}
	
	disable() {
		if (!this.enabledList) return
		for (const item of this.enabledList) item.disable()
		for (const item of ExtensionHandlers) item.disable()
		this.enabledList = null
	}
}
