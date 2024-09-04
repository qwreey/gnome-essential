import Meta from "gi://Meta"
import GLib from "gi://GLib"
import St from "gi://St"
import Shell from "gi://Shell"
import Gtk from "gi://Gtk"
import Clutter from "gi://Clutter"
import Gio from "gi://Gio"
import GObject from "gi://GObject"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
import * as Layout from "resource:///org/gnome/shell/ui/layout.js"
import * as ExtensionUtils from "resource:///org/gnome/shell/misc/extensionUtils.js"

import {
    getShadowSize,
    PointerMovePreventer,
    FakePointer,
    resizingOps,
    Maid,
    PointerUtil,
    getOffset,
    applyOffset,
    WindowMover,
	FocusArray,
	WindowInitedHandler,
	isNormal,
	safeDestroy,
    getResizeAnimationSize,
} from "./libs/utility.js"


import { QuickToggle, SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js"


import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"