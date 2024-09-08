import Clutter from "gi://Clutter"
import GObject from "gi://GObject"
import Mtk from "gi://Mtk"
import St from "gi://St"
import * as Main from "resource:///org/gnome/shell/ui/main.js"

const TilePreviewFrame = GObject.registerClass(
	class TilePreviewFrame extends St.Widget {
		_init() {
			super._init();
			global.window_group.add_child(this);

			this._reset();
			this._showing = false;
		}

		open(window, tileRect, monitorIndex) {
			this.lastWindow = window
			let windowActor = window.get_compositor_private();
			if (!windowActor)
				return;

			global.window_group.set_child_below_sibling(this, windowActor);

			if (this._rect && this._rect.equal(tileRect))
				return;

			let changeMonitor = this._monitorIndex === -1 ||
				this._monitorIndex !== monitorIndex;

			this._monitorIndex = monitorIndex;
			this._rect = tileRect;

			let monitor = Main.layoutManager.monitors[monitorIndex];

			this._updateStyle(monitor);

			if (!this._showing || changeMonitor) {
				const monitorRect = new Mtk.Rectangle({
					x: monitor.x,
					y: monitor.y,
					width: monitor.width,
					height: monitor.height,
				});
				let [, rect] = window.get_frame_rect().intersect(monitorRect);
				this.set_size(rect.width, rect.height);
				this.set_position(rect.x, rect.y);
				this.opacity = 0;
			}

			this._showing = true;
			this.show();
			this.ease({
				x: tileRect.x + 6,
				y: tileRect.y + 6,
				width: Math.max(tileRect.width - 12, 0),
				height: Math.max(tileRect.height - 12),
				opacity: 255,
				duration: 260, // WINDOW_ANIMATION_TIME,
				mode: Clutter.AnimationMode.EASE_OUT_QUINT, // Clutter.AnimationMode.EASE_OUT_QUAD,
			});
		}

		close() {
			if (!this._showing)
				return;

			this._showing = false;

			if (this.lastWindow) {
				let monitor = Main.layoutManager.monitors[this._monitorIndex];
				const monitorRect = new Mtk.Rectangle({
					x: monitor.x,
					y: monitor.y,
					width: monitor.width,
					height: monitor.height,
				});
				let [, rect] = this.lastWindow.get_frame_rect().intersect(monitorRect)

				this.ease({
					opacity: 0,
					duration: 260,
					x: rect.x + 6,
					y: rect.y + 6,
					width: Math.max(rect.width - 12, 0),
					height: Math.max(rect.height - 12),
					mode: Clutter.AnimationMode.EASE_OUT_QUINT,
					onComplete: () => this._reset(),
				});
			} else {
				this.ease({
					opacity: 0,
					duration: 260,
					mode: Clutter.AnimationMode.EASE_OUT_QUINT,
					onComplete: () => this._reset(),
				});
			}
		}

		_reset() {
			this.hide();
			this._rect = null;
			this._monitorIndex = -1;
		}

		_updateStyle(monitor) {
			this.style = "background: rgba(185, 115, 255, 0.16); border-radius: 12px; border: solid rgba(164, 79, 255, 0.78) 1px;"
			// let styles = ['tile-preview'];
			// if (this._monitorIndex === Main.layoutManager.primaryIndex)
			//     styles.push('on-primary');
			// if (this._rect.x === monitor.x)
			//     styles.push('tile-preview-left');
			// if (this._rect.x + this._rect.width === monitor.x + monitor.width)
			//     styles.push('tile-preview-right');

			// this.style_class = styles.join(' ');
		}
	}
);

export class TilePreview {
	constructor() { }

	enable() {
		if (Main.wm._tilePreview) {
			Main.wm._tilePreview.destroy()
			Main.wm._tilePreview = null
		}
		Main.wm._tilePreview = new TilePreviewFrame()
	}

	disable() {
		if (Main.wm._tilePreview) {
			Main.wm._tilePreview.destroy()
			Main.wm._tilePreview = null
		}
	}
}
