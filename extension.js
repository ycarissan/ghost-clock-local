import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class GhostClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._labels = [];
        this._buildClocks();

        // Mise à jour en direct si un réglage change
        this._settingsChangedId = this._settings.connect('changed', () => {
            this._applyStyleAndPosition();
        });

        // Recalcule les horloges si la configuration des écrans change
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this._buildClocks();
        });

        // Mise à jour de l'heure chaque seconde
        this._updateTime();
        this._clockTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._updateTime();
            return GLib.SOURCE_CONTINUE;
        });

        // Détection du mouvement de la souris
        this._lastX = -1;
        this._lastY = -1;
        this._mouseTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            let [x, y] = global.get_pointer();
            if (this._lastX !== -1 && (x !== this._lastX || y !== this._lastY)) {
                this._hideTemporarily();
            }
            this._lastX = x;
            this._lastY = y;
            return GLib.SOURCE_CONTINUE;
        });
    }

    _getStyleString() {
        let size = this._settings.get_int('font-size');
        let opacity = this._settings.get_double('opacity').toFixed(2);
        let font = this._settings.get_string('font-family');
        // Nettoie le nom de police si Pango inclut le poids/taille
        let cleanFont = font.replace(/\s+\d+$/, '');
        return `font-family: "${cleanFont}", sans-serif; font-size: ${size}px; font-weight: bold; color: rgba(255, 255, 255, ${opacity}); text-shadow: 0 1px 4px rgba(0, 0, 0, ${Math.min(opacity * 1.5, 0.8).toFixed(2)});`;
    }

    _buildClocks() {
        this._destroyLabels();
        let now = GLib.DateTime.new_now_local();
        let timeText = now.format('%H:%M');

        for (let monitor of Main.layoutManager.monitors) {
            let label = new St.Label({
                text: timeText,
                reactive: false
            });
            label._monitor = monitor;
            Main.layoutManager.uiGroup.add_child(label);
            this._labels.push(label);
        }
        this._applyStyleAndPosition();
    }

    _applyStyleAndPosition() {
        let style = this._getStyleString();
        let margin = 25;

        for (let label of this._labels) {
            label.set_style(style);
            let monitor = label._monitor;
            // Force le recalcul de la taille du texte avant positionnement
            label.queue_relayout();
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (label && label.get_parent()) {
                    label.set_position(
                        monitor.x + monitor.width - label.width - margin,
                        monitor.y + monitor.height - label.height - margin
                    );
                }
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _updateTime() {
        let now = GLib.DateTime.new_now_local();
        let timeText = now.format('%H:%M');
        for (let label of this._labels) {
            label.set_text(timeText);
        }
    }

    _hideTemporarily() {
        for (let label of this._labels) {
            label.ease({
                opacity: 0,
                duration: 120,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
        }

        if (this._fadeTimer) {
            GLib.source_remove(this._fadeTimer);
        }

        this._fadeTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            for (let label of this._labels) {
                label.ease({
                    opacity: 255,
                    duration: 400,
                    mode: Clutter.AnimationMode.EASE_IN_QUAD
                });
            }
            this._fadeTimer = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _destroyLabels() {
        for (let label of this._labels) {
            label.destroy();
        }
        this._labels = [];
    }

    disable() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._clockTimer) {
            GLib.source_remove(this._clockTimer);
            this._clockTimer = null;
        }
        if (this._mouseTimer) {
            GLib.source_remove(this._mouseTimer);
            this._mouseTimer = null;
        }
        if (this._fadeTimer) {
            GLib.source_remove(this._fadeTimer);
            this._fadeTimer = null;
        }
        this._destroyLabels();
        this._settings = null;
    }
}
