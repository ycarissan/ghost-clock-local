import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Graphene from 'gi://Graphene';
import Pango from 'gi://Pango';
import GnomeDesktop from 'gi://GnomeDesktop';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Marge entre l'horloge et le coin de l'écran (CSS, donc mise à l'échelle par St)
const MARGIN_PX = 25;
// Taille utilisée si la description de police ne contient pas de taille
const DEFAULT_FONT_SIZE_PT = 27;
// Fréquence de lecture de la souris (le service s'arrête quand l'utilisateur est inactif)
const POINTER_INTERVAL_MS = 100;
// Déplacement minimal (px) pour considérer que la souris a bougé (ignore les micro-vibrations)
const MOVE_THRESHOLD_PX = 3;
// Paramètres des animations
const SLIDE_DISTANCE_PX = 40;
const ZOOM_SCALE = 0.6;

const VISIBLE_PROPS = {opacity: 255, translation_y: 0, scale_x: 1, scale_y: 1};

export default class GhostClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._clocks = [];
        this._hidden = false;
        this._showTimer = 0;
        this._lastMoveTime = 0;

        // Horloge système : notifie à chaque changement de minute, après une
        // mise en veille et lors d'un changement de fuseau horaire.
        this._wallClock = new GnomeDesktop.WallClock({time_only: true});
        this._wallClockId = this._wallClock.connect('notify::clock', () => this._updateTime());
        this._timeText = this._currentTime();

        this._buildClocks();

        this._settingsChangedId = this._settings.connect('changed',
            (_settings, key) => this._onSettingChanged(key));
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed',
            () => this._buildClocks());

        // Suivi de la souris via le service partagé de GNOME Shell
        [this._lastX, this._lastY] = global.get_pointer();
        this._pointerWatch = PointerWatcher.getPointerWatcher().addWatch(
            POINTER_INTERVAL_MS, (x, y) => this._onPointerMoved(x, y));
    }

    disable() {
        this._pointerWatch?.remove();
        this._pointerWatch = null;

        if (this._wallClockId) {
            this._wallClock.disconnect(this._wallClockId);
            this._wallClockId = 0;
        }
        this._wallClock = null;

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }
        if (this._showTimer) {
            GLib.source_remove(this._showTimer);
            this._showTimer = 0;
        }

        this._destroyClocks();
        this._settings = null;
    }

    // --- Construction des horloges -----------------------------------------

    _buildClocks() {
        this._destroyClocks();
        const trackFullscreen = this._settings.get_boolean('hide-in-fullscreen');
        const style = this._getStyleString();
        const positionMode = this._settings.get_string('position-mode');
        const stretchToScreen = this._settings.get_boolean('stretch-to-screen');

        for (const monitor of Main.layoutManager.monitors) {
            // Le texte est aligné par la mise en page de St
            const label = new St.Label({
                text: this._timeText,
                style,
                pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
            });

            // Conteneur invisible et non interactif couvrant tout l'écran
            const bin = new St.Bin({
                child: label,
                reactive: false,
                x: monitor.x,
                y: monitor.y,
                width: monitor.width,
                height: monitor.height,
            });

            // Appliquer l'étirement si activé
            if (stretchToScreen) {
                label.set({
                    width: monitor.width,
                    height: monitor.height,
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER,
                });
                bin.set_style('padding: 0px;');
            } else {
                // Appliquer la position selon le mode
                this._applyPosition(label, bin, monitor, positionMode);
            }

            if (this._hidden)
                label.set(this._hiddenProps());

            Main.layoutManager.addTopChrome(bin, {trackFullscreen});
            this._clocks.push({bin, label});
        }
    }

    _applyPosition(label, bin, monitor, positionMode) {
        const margin = MARGIN_PX;

        switch (positionMode) {
        case 'bottom-right':
            label.set({
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.END,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        case 'bottom-left':
            label.set({
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.END,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        case 'top-right':
            label.set({
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.START,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        case 'top-left':
            label.set({
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.START,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        case 'center':
            label.set({
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        case 'custom':
            const posX = this._settings.get_double('position-x');
            const posY = this._settings.get_double('position-y');
            label.set({
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                translation_x: (posX - 0.5) * monitor.width,
                translation_y: (posY - 0.5) * monitor.height,
            });
            bin.set_style(`padding: ${margin}px;`);
            break;

        default:
            label.set({
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.END,
            });
            bin.set_style(`padding: ${margin}px;`);
        }
    }

    _destroyClocks() {
        // Détruire le conteneur le retire aussi du suivi du LayoutManager
        for (const {bin} of this._clocks)
            bin.destroy();
        this._clocks = [];
    }

    _onSettingChanged(key) {
        switch (key) {
        case 'font':
        case 'opacity': {
            const style = this._getStyleString();
            for (const {label} of this._clocks)
                label.set_style(style);
            break;
        }
        case 'hide-in-fullscreen':
        case 'position-mode':
        case 'position-x':
        case 'position-y':
        case 'stretch-to-screen':
            this._buildClocks();
            break;
        default:
            // Délai, animation et durées sont lus au moment où ils servent
            break;
        }
    }

    _getStyleString() {
        const desc = Pango.FontDescription.from_string(this._settings.get_string('font'));

        // Retire les caractères qui casseraient la feuille de style
        const family = (desc.get_family() || 'Sans').replace(/["\\;{}]/g, '');

        let size = desc.get_size() / Pango.SCALE;
        let unit = desc.get_size_is_absolute() ? 'px' : 'pt';
        if (size <= 0) {
            size = DEFAULT_FONT_SIZE_PT;
            unit = 'pt';
        }

        // St n'accepte que les graisses multiples de 100
        const weight = Math.min(900, Math.max(100, Math.round(desc.get_weight() / 100) * 100));

        let fontStyle = 'normal';
        if (desc.get_style() === Pango.Style.ITALIC)
            fontStyle = 'italic';
        else if (desc.get_style() === Pango.Style.OBLIQUE)
            fontStyle = 'oblique';

        const opacity = this._settings.get_double('opacity');
        const shadow = Math.min(opacity * 1.5, 0.8);

        return `font-family: "${family}", sans-serif; ` +
            `font-size: ${size}${unit}; ` +
            `font-weight: ${weight}; ` +
            `font-style: ${fontStyle}; ` +
            `color: rgba(255, 255, 255, ${opacity.toFixed(2)}); ` +
            `text-shadow: 0 1px 4px rgba(0, 0, 0, ${shadow.toFixed(2)});`;
    }

    // --- Heure --------------------------------------------------------------

    _currentTime() {
        return GLib.DateTime.new_now(this._wallClock.timezone).format('%H:%M');
    }

    _updateTime() {
        const text = this._currentTime();
        if (text === this._timeText)
            return;

        this._timeText = text;
        for (const {label} of this._clocks)
            label.set_text(text);
    }

    // --- Masquage / réapparition -------------------------------------------

    _onPointerMoved(x, y) {
        if (Math.abs(x - this._lastX) < MOVE_THRESHOLD_PX &&
            Math.abs(y - this._lastY) < MOVE_THRESHOLD_PX)
            return;

        this._lastX = x;
        this._lastY = y;
        this._hideTemporarily();
    }

    _hideTemporarily() {
        this._lastMoveTime = GLib.get_monotonic_time();

        if (!this._hidden) {
            this._hidden = true;
            this._animate(true);
        }

        // Un seul minuteur : au lieu de le recréer à chaque mouvement, il
        // vérifie à l'échéance si la souris a bougé entre-temps.
        if (!this._showTimer)
            this._scheduleShow(this._reappearDelayMs());
    }

    _scheduleShow(delayMs) {
        this._showTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.max(1, Math.ceil(delayMs)), () => {
            this._showTimer = 0;

            const elapsedMs = (GLib.get_monotonic_time() - this._lastMoveTime) / 1000;
            const remainingMs = this._reappearDelayMs() - elapsedMs;
            if (remainingMs > 0) {
                this._scheduleShow(remainingMs);
                return GLib.SOURCE_REMOVE;
            }

            this._hidden = false;
            this._animate(false);
            return GLib.SOURCE_REMOVE;
        });
        GLib.Source.set_name_by_id(this._showTimer, '[ghost-clock] show');
    }

    _reappearDelayMs() {
        return this._settings.get_double('reappear-delay') * 1000;
    }

    _hiddenProps() {
        switch (this._settings.get_string('animation')) {
        case 'slide': {
            const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
            return {opacity: 0, translation_y: SLIDE_DISTANCE_PX * scale};
        }
        case 'zoom':
            return {opacity: 0, scale_x: ZOOM_SCALE, scale_y: ZOOM_SCALE};
        default: // 'fade' et 'none'
            return {opacity: 0};
        }
    }

    _animate(hide) {
        const instant = this._settings.get_string('animation') === 'none';
        const duration = instant
            ? 0
            : this._settings.get_int(hide ? 'hide-duration' : 'show-duration');

        for (const {label} of this._clocks) {
            label.remove_all_transitions();
            label.ease({
                // À la réapparition on rétablit tout, au cas où le type
                // d'animation a changé pendant que l'horloge était cachée.
                ...(hide ? this._hiddenProps() : VISIBLE_PROPS),
                duration,
                mode: hide
                    ? Clutter.AnimationMode.EASE_OUT_QUAD
                    : Clutter.AnimationMode.EASE_OUT_CUBIC,
            });
        }
    }
}
