const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

// https://github.com/Schneegans/Desktop-Cube
const { EdgeDragWorkspaceSwitches } = Me.imports.edgeDragWorkspaceSwitches

// https://github.com/squgeim/Workspace-Scroll
const { TopbarScroll } = Me.imports.topbarScroll

// https://github.com/fthx/workspaces-bar
// const { WorkspacesBarHandler } = Me.imports.workspaceBar

// https://github.com/bdaase/noannoyance
const { NoAnnoyance } = Me.imports.noAnnoyance

// https://extensions.gnome.org/extension/591/remove-app-menu/
const { RemoveAppMenu } = Me.imports.removeAppMenu

// https://github.com/KEIII/gnome-shell-panel-date-format
const { PanelDateFormat } = Me.imports.panelDateFormat

// https://extensions.gnome.org/extension/2741/remove-alttab-delay-v2/
const { RemoveAltTabDelay } = Me.imports.removeAltTabDelay

// https://extensions.gnome.org/extension/2872/activities-icons/
const { MenuButtons } = Me.imports.menuButtons

// https://gitlab.gnome.org/jrahmatzadeh/just-perfection
const { MoveNotification } = Me.imports.moveNotification

const { MoveDateMenu } = Me.imports.moveDateMenu
const { RemoveDash } = Me.imports.removeDash
// const { AnimationSpeed } = Me.imports.animationSpeed
const { ReducePanelMargin } = Me.imports.reducePanelMargin
const { NemoDesktopIntegration } = Me.imports.nemoDesktopIntegration
const { ChangeWorkspaceEasing } = Me.imports.changeWorkspaceEasing
const { StartupNoOverview } = Me.imports.startupNoOverview
const { TransparentPanel } = Me.imports.transparentPanel
const { MinimizeAnimation } = Me.imports.minimizeAnimation
const { MoveAnimation } = Me.imports.moveAnimation
const { OpenCloseAnimation } = Me.imports.openCloseAnimation
// const { AddDateMenuIcon } = Me.imports.addDateMenuIcon
const { ThemeHandle } = Me.imports.themeHandle
// const { LapyIsCute } = Me.imports.lapyIsCute
const { Waydroid } = Me.imports.waydroid
const { EdgeTmpHide } = Me.imports.edgeTmpHide
const { TrayiconBugfix } = Me.imports.trayiconBugfix
const { FuckYouKakaoTalk } = Me.imports.fuckYouKakaoTalk

const { ExtensionHandlers } = Me.imports.libs.utility
const { GnomeTerminalBlur } = Me.imports.gnomeTerminalBlur
const { FocusIn } = Me.imports.focusin
const { InputMethodChanger } = Me.imports.inputMethodChanger
const { CursorFix } = Me.imports.cursorFix
const { Blackout } = Me.imports.blackout
const { Wireframe } = Me.imports.wireframe

const verbose = true
var enabledList,start,last,now

function enable() {
	last = start = +Date.now()
	log("[QE] Setup shared objects")
	for (const item of ExtensionHandlers) {
		item.enable()
		if (verbose) {
			now = +Date.now()
			log("[QE] | Loaded " + item.constructor.name + " taken "+ (now - last) + "ms")
			last = now
		}
	}

	log("[QE] Init classes")
	enabledList = [
		new FuckYouKakaoTalk(),
		new EdgeTmpHide(),
		// new EdgeDragWorkspaceSwitches(),
		new RemoveAppMenu(),
		new NoAnnoyance(),
		new PanelDateFormat(),
		// new WorkspacesBarHandler(),
		new TopbarScroll(),
		new RemoveAltTabDelay(),
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
		new Waydroid(),
		new TrayiconBugfix(),
		// new GnomeTerminalBlur(),
		new FocusIn(),
		new InputMethodChanger(),
		new CursorFix(),
		new Blackout(),
		new Wireframe(),
	]
	if (verbose) {
		last = +Date.now()
		log("[QE] Taken " + (last - start) + "ms")
		log("[QE] execute enable() forEach")
	}
	for (const item of enabledList) {
		item.enable()
		if (verbose) {
			now = +Date.now()
			log("[QE] | Loaded " + item.constructor.name + " taken "+ (now - last) + "ms")
			last = now
		}
	}
	enabledList.reverse()
	log("[QE] Loaded! taken " + (+Date.now() - start) + "ms")
}

function disable() {
	if (!enabledList) return
	for (const item of enabledList) item.disable()
	for (const item of ExtensionHandlers) item.disable()
	enabledList = null
}
