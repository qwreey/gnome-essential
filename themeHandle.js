import Meta from "gi://Meta"
import GLib from "gi://GLib"
import Shell from "gi://Shell"
import Gio from "gi://Gio"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

/* exported getThemeDirs getModeThemeDirs */
const fn = (...args) => GLib.build_filenamev(args)

/**
 * @returns {string[]} - an ordered list of theme directories
 */
function getThemeDirs() {
    return [
        fn(GLib.get_home_dir(), '.themes'),
        fn(GLib.get_user_data_dir(), 'themes'),
        ...GLib.get_system_data_dirs().map(dir => fn(dir, 'themes')),
    ]
}

/**
 * @returns {string[]} - an ordered list of mode theme directories
 */
function getModeThemeDirs() {
    return GLib.get_system_data_dirs()
        .map(dir => fn(dir, 'gnome-shell', 'theme'))
}

export class ThemeHandle {
    #interface
    #settings
    #lightThemeName = "Colloid-Purple-Light-Compact"//"Catppuccin-Latte-Compact-Mauve-Light"
    #darkThemeName = "Colloid-Purple-Dark-Compact"//"Catppuccin-Mocha-Compact-Mauve-Dark"
    #darkScript
    #lightScript
    #darkBackground
    #lightBackground
    #currentGtkTheme

    getStylesheet(themeName) {
        let stylesheet = null

        if (themeName) {
            const stylesheetPaths = getThemeDirs()
                .map(dir => `${dir}/${themeName}/gnome-shell/gnome-shell.css`)

            stylesheetPaths.push(...getModeThemeDirs()
                .map(dir => `${dir}/${themeName}.css`))

            stylesheet = stylesheetPaths.find(path => {
                let file = Gio.file_new_for_path(path)
                return file.query_exists(null)
            })
        }

        return stylesheet
    }

    loadTheme(status) {
        if (!status) status = this.#interface.get_string('color-scheme')

        // get theme name
        const isDark = status == 'prefer-dark'
        const gtkTheme = isDark ? this.#darkThemeName : this.#lightThemeName

        // update current theme
        if (this.#currentGtkTheme === gtkTheme) return
        this.#currentGtkTheme = gtkTheme

        if (this.#interface.get_string("gtk-theme") !== gtkTheme) {
            this.#interface.set_string("gtk-theme",gtkTheme)
            GLib.spawn_async(null, ['sh', '-c', isDark ? this.#darkScript : this.#lightScript], null, GLib.SpawnFlags.SEARCH_PATH, null)
        }

        Main.setThemeStylesheet(this.getStylesheet(gtkTheme))
        Main.loadTheme()
        Main.reloadThemeResource()
    }

    constructor() {}

    enable(extension) {
        this.#darkScript = extension.path+"/dark.sh"
        this.#lightScript = extension.path+"/light.sh"
        this.#darkBackground = extension.path+"/dark.png"
        this.#lightBackground = extension.path+"/light.png"

        this.#currentGtkTheme = null
        this.#interface = new Gio.Settings({ schema: 'org.gnome.desktop.interface' })
        this.#settings = extension.getSettings()

        // Add keybinding
        Main.wm.addKeybinding(
            'qe-themeswitch',
            this.#settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                // toggle it (flip value)
                let now = this.#interface.get_string('color-scheme')
                this.#interface.set_string('color-scheme', now == "default" ? 'prefer-dark' : 'default')
            }
        )

        // Add event binding
        this.#interface.connect('changed::color-scheme', this.loadTheme.bind(this,null))

        // Init theme
        Main.setThemeStylesheet(null)
        Main.loadTheme()
        this.loadTheme()
    }

    disable() {
        Main.wm.removeKeybinding('qe-themeswitch')
        Main.setThemeStylesheet(null)
        Main.loadTheme()
        this.#interface.run_dispose()
        this.#settings.run_dispose()
    }
}
