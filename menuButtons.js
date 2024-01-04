
const WorkspaceThumbnail = imports.ui.workspaceThumbnail
const { Clutter, GObject, St } = imports.gi
const { BoxLayout, Icon, Button } = St
const PanelMenu = imports.ui.panelMenu
const Main = imports.ui.main
const Config = imports.misc.config
const PopupMenu = imports.ui.popupMenu

const Version = parseInt(Config.PACKAGE_VERSION.split('.')[0])
const ShowAppsButton = Version == 3 ? Main.overview.viewSelector._showAppsButton : Main.overview.dash.showAppsButton
const MainOverview = Version == 3 ? Main.overview.viewSelector : Main.overview.dash
const OverviewShowApps = Version == 3 ? Main.overview.viewSelector : Main.overview

var MenuButtons = class MenuButtons {
	constructor() {
	}

	#buttonStyle = "-natural-hpadding: 4px;-minimum-hpadding: 4px;"

	enable() {
		this.mainMenu = new PanelMenu.Button(0.5, "Main Menu")
		this.mainMenu.style = this.#buttonStyle
		this.mainMenu.add_child(new Icon({reactive: true, track_hover: true, icon_name: 'view-app-grid-symbolic', style_class: 'system-status-icon activity-icon'}))
		this.mainMenu.connect('button-press-event', () => {
			if (Main.overview.visible && ShowAppsButton.checked) {
				// on apps (leave apps menu)
				Main.overview.hide()
			} else if (Main.overview.visible) {
				// on overview (show apps)
				ShowAppsButton.checked = true
				// MainOverview._onShowAppsButtonToggled()
			} else {
				Main.overview.show()
			}
		})
		Main.panel.statusArea.activities.container.hide()
		Main.panel.addToStatusArea('activitiesicons', this.mainMenu, 0, 'left')

		// create menu
		this.wspopupMenu = new PanelMenu.Button(0.5, "Workspace Menu")
		this.wspopupMenu.style = this.#buttonStyle
		this.wspopupMenu.add_child(new Icon({reactive: true, track_hover: true, icon_name: 'focus-windows-symbolic', style_class: 'system-status-icon activity-icon'}))
		this.wspopup = new PopupMenu.PopupMenuSection()
		this.wspopupMenu.menu.addMenuItem(this.wspopup)
		// workspace
		this.WSThumbnail = new WorkspaceThumbnail.ThumbnailsBox(
			Main.overview._overview.controls._workspacesDisplay._scrollAdjustment,
			global.display.get_primary_monitor(),
			Clutter.Orientation.HORIZONTAL
		)
		this.wspopup.box.add_child(this.WSThumbnail)
		// create thumbnail when open
		this.wspopupMenu.menu.connect('open-state-changed', () => {
			if (this.wspopupMenu.menu.isOpen) {
				this.WSThumbnail._createThumbnails()
			}
		})
		Main.panel.addToStatusArea('workspace menu', this.wspopupMenu, 1, 'left')
	}
	disable() {
		// this.mainMenuButton.destroy(); this.mainMenuButton = null
		this.mainMenu.destroy()
		this.wspopup.destroy()
		this.wspopupMenu.destroy()
		this.mainMenu = this.wspopup = this.wspopupMenu = null
		Main.panel.statusArea.activities.container.show()
	}

	old_enable() {
		// create panel button
		this.button = new PanelMenu.Button(0.5, "Main Menu")
		this.box = new BoxLayout()

		// create app button
		this.appButton = new Button()
		this.appButton.child = new Icon({reactive: true, track_hover: true, icon_name: 'view-app-grid-symbolic', style_class: 'system-status-icon activity-icon'})
		this.appButton.connect('clicked', () => {
			if (Main.overview.visible && ShowAppsButton.checked) {
				// on apps (leave apps menu)
				Main.overview.hide()
			} else if (Main.overview.visible) {
				// on overview (show apps)
				ShowAppsButton.checked = true
				// MainOverview._onShowAppsButtonToggled()
			} else {
				// mainscreen (show apps)
				OverviewShowApps.showApps()
			}
		})
		this.box.add_actor(this.appButton)

		// crate activitie button
		this.overButton = new Button()
		this.overButton.child = new Icon({reactive: true, track_hover: true, icon_name: 'focus-windows-symbolic', style_class: 'system-status-icon activity-icon'})
		this.overButton.connect('clicked', () => {
			if (Main.overview.visible && ShowAppsButton.checked) {
				// on apps (leave apps menu and show overview)
				ShowAppsButton.checked = false
				// MainOverview._onShowAppsButtonToggled()
			} else if (Main.overview.visible) {
				// on overview (leave overview and show mainscreen)
				Main.overview.hide()
			} else {
				// mainscreen (show overview)
				Main.overview.show()
			}
		})
		this.box.add_actor(this.overButton)

		// mount
		this.button.actor.add_child(this.box)
		this.button.remove_style_class_name("panel-button:hover")
		Main.panel.statusArea.activities.container.hide()
		Main.panel.addToStatusArea('activitiesicons', this.button, 0, 'left')

		// create menu
		this.wspopup = new PopupMenu.PopupMenuSection()
		this.button.menu.addMenuItem(this.wspopup)
		// workspace
		this.WSThumbnail = new WorkspaceThumbnail.ThumbnailsBox(
			Main.overview._overview.controls._workspacesDisplay._scrollAdjustment,
			global.display.get_primary_monitor(),
			Clutter.Orientation.HORIZONTAL
		)
		this.wspopup.box.add_child(this.WSThumbnail)
		// create thumbnail when open
		this.button.menu.connect('open-state-changed', () => {
			if (this.button.menu.isOpen) {
				this.WSThumbnail._createThumbnails()
			}
		})
	}

	old_disable() {
		this.button.destroy()
		Main.panel.statusArea.activities.container.show()
		this.box = this.appButton = this.overButton = this.button = null
	}
}
