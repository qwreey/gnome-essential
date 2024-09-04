
const { Icon, BoxLayout } = imports.gi.St
const Main = imports.ui.main
const DateMenuActor = Main.panel.statusArea.dateMenu.actor.first_child

var AddDateMenuIcon = class AddDateMenuIcon {
	constructor() {
	}

	enable() {
		// this.box = new BoxLayout({style_class: 'datemenu-box'})
		// DateMenuActor.remove_child(label)
		this.icon = new Icon({reactive: false, track_hover: true, icon_name: 'accessories-calculator-symbolic', style_class: 'datemenu-icon'})
		DateMenuActor.insert_child_at_index(this.icon,1)

		// this.box.add_child(this.icon)
		// this.box.add_child(label)
		// DateMenuActor.add_child(this.box)
	}

	disable() {
		this.icon.destroy()
		// this.box.remove_child(label)
		// DateMenuActor.remove_child(this.box)
		// DateMenuActor.add_child(label)
		// this.box.destroy()
	}
}
