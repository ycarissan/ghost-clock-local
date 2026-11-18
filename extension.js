import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
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

// Taille de police de référence pour mesurer le texte en mode « étirer »
const FIT_REFERENCE_PX = 100;

// Effet « panneau à palettes » (split-flap) : durée d'un demi-basculement
// et nombre maximal de palettes intermédiaires affichées par chiffre
const FLAP_HALF_MS = 45;
const FLAP_MAX_STEPS = 10;

const VISIBLE_PROPS = {opacity: 255, translation_y: 0, scale_x: 1, scale_y: 1};

// Place l'unique enfant dans le conteneur selon des facteurs d'alignement,
// à l'intérieur d'une marge. N'utilise ni translation ni échelle, qui
// restent libres pour les animations.
const ClockLayout = GObject.registerClass(
class ClockLayout extends Clutter.LayoutManager {
    _init({xFactor, yFactor, margin}) {
        super._init();
        this.xFactor = Math.min(1, Math.max(0, xFactor));
        this.yFactor = Math.min(1, Math.max(0, yFactor));
        this.margin = margin;
    }

    vfunc_get_preferred_width(_container, _forHeight) {
        return [0, 0];
    }

    vfunc_get_preferred_height(_container, _forWidth) {
        return [0, 0];
    }

    vfunc_allocate(container, box) {
        const availW = Math.max(0, box.get_width() - 2 * this.margin);
        const availH = Math.max(0, box.get_height() - 2 * this.margin);

        for (const child of container.get_children()) {
            const [,, natW, natH] = child.get_preferred_size();
            const w = Math.min(natW, availW);
            const h = Math.min(natH, availH);
            const x = Math.round(this.margin + (availW - w) * this.xFactor);
            const y = Math.round(this.margin + (availH - h) * this.yFactor);
            child.allocate(new Clutter.ActorBox({x1: x, y1: y, x2: x + w, y2: y + h}));
        }
    }
});

// Affichage à palettes, façon tableau d'horaires de gare ou d'aéroport :
// chaque chiffre est sur une palette qui bascule, en passant par les
// chiffres intermédiaires, lorsque l'heure change.
const FlapFace = GObject.registerClass(
class FlapFace extends St.BoxLayout {
    _init({text, style, tileAlpha}) {
        super._init({style});
        this._tileAlpha = tileAlpha;
        this._cells = [];
        this._destroyed = false;
        // Le signal « destroy » est émis avant la destruction des enfants :
        // les basculements en cours s'arrêtent sans toucher d'acteur détruit.
        this.connect('destroy', () => {
            this._destroyed = true;
        });
        this._build(text);
    }

    _build(text) {
        for (const cell of this._cells)
            cell.gen++;
        this.destroy_all_children();
        this._cells = [...text].map(ch => this._makeCell(ch));
        for (const cell of this._cells)
            this.add_child(cell.actor);
    }

    _makeCell(ch) {
        const label = new St.Label({
            text: ch,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
        });
        if (!/\d/.test(ch)) {
            // Séparateur (« : ») : pas de palette
            return {actor: label, label, char: ch, gen: 0};
        }

        label.set_style('padding: 0 0.08em;');
        const tile = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style: `background-color: rgba(28, 28, 28, ${this._tileAlpha.toFixed(2)}); ` +
                'border-radius: 0.1em;',
        });
        // Fente horizontale entre les deux moitiés de la palette
        const split = new St.Widget({
            style: `background-color: rgba(0, 0, 0, ${Math.min(1, this._tileAlpha * 1.5).toFixed(2)}); height: 0.04em;`,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        });
        tile.add_child(label);
        tile.add_child(split);
        return {actor: tile, label, char: ch, gen: 0};
    }

    setTime(text) {
        const chars = [...text];
        if (chars.length !== this._cells.length) {
            this._build(text);
            return;
        }
        chars.forEach((ch, i) => {
            if (this._cells[i].char !== ch)
                this._flip(this._cells[i], ch);
        });
    }

    // Suite des caractères affichés pour passer de « from » à « to »
    _steps(from, to) {
        if (!/\d/.test(from) || !/\d/.test(to))
            return [to];
        const steps = [];
        let d = Number(from);
        while (String(d) !== to && steps.length < FLAP_MAX_STEPS) {
            d = (d + 1) % 10;
            steps.push(String(d));
        }
        if (steps.at(-1) !== to)
            steps.push(to);
        return steps;
    }

    _flip(cell, target) {
        const gen = ++cell.gen;
        const steps = this._steps(cell.char, target);
        cell.char = target;
        const alive = () => !this._destroyed && gen === cell.gen;

        const step = i => {
            if (!alive() || i >= steps.length)
                return;
            cell.label.ease({
                scale_y: 0,
                duration: FLAP_HALF_MS,
                mode: Clutter.AnimationMode.EASE_IN_QUAD,
                onComplete: () => {
                    if (!alive())
                        return;
                    cell.label.text = steps[i];
                    cell.label.ease({
                        scale_y: 1,
                        duration: FLAP_HALF_MS,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        onComplete: () => step(i + 1),
                    });
                },
            });
        };
        step(0);
    }
});

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
        const [xFactor, yFactor] = this._positionFactors();
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

        const splitFlap = this._settings.get_boolean('split-flap');
        const tileAlpha = Math.min(0.9, this._settings.get_double('opacity') * 1.6);

        for (const monitor of Main.layoutManager.monitors) {
            // « label » est l'acteur animé : simple texte ou panneau à palettes
            const label = splitFlap
                ? new FlapFace({text: this._timeText, style, tileAlpha})
                : new St.Label({text: this._timeText, style});
            label.pivot_point = new Graphene.Point({x: 0.5, y: 0.5});

            // Conteneur invisible et non interactif couvrant tout l'écran ;
            // sa mise en page place l'horloge selon les facteurs de position.
            const bin = new St.Widget({
                layout_manager: new ClockLayout({
                    xFactor,
                    yFactor,
                    margin: MARGIN_PX * scale,
                }),
                reactive: false,
                x: monitor.x,
                y: monitor.y,
                width: monitor.width,
                height: monitor.height,
            });
            // Intermédiaire qui porte la déformation du mode « étirer » sans
            // ratio : l'échelle du label reste réservée à l'animation zoom.
            const stretcher = new St.Bin({
                child: label,
                pivot_point: new Graphene.Point({x: 0, y: 0}),
            });
            bin.add_child(stretcher);

            if (this._hidden)
                label.set(this._hiddenProps());

            Main.layoutManager.addTopChrome(bin, {trackFullscreen});
            const clock = {bin, stretcher, label, monitor};
            this._clocks.push(clock);
            this._fitClock(clock);
        }
    }

    // Facteurs d'alignement (0 = gauche/haut, 1 = droite/bas)
    _positionFactors() {
        switch (this._settings.get_string('position-mode')) {
        case 'bottom-left':
            return [0, 1];
        case 'top-right':
            return [1, 0];
        case 'top-left':
            return [0, 0];
        case 'center':
            return [0.5, 0.5];
        case 'custom':
            return [
                this._settings.get_double('position-x'),
                this._settings.get_double('position-y'),
            ];
        default: // 'bottom-right'
            return [1, 1];
        }
    }

    // En mode « étirer », calcule la taille de police qui remplit l'écran
    _fitClock({bin, stretcher, label, monitor}) {
        if (!this._settings.get_boolean('stretch-to-screen'))
            return;

        const margin = 2 * bin.layout_manager.margin;
        const availW = monitor.width - margin;
        const availH = monitor.height - margin;
        if (availW <= 0 || availH <= 0)
            return;

        // La taille du texte est proportionnelle à la taille de police :
        // on mesure à une taille de référence puis on applique le ratio.
        let size = FIT_REFERENCE_PX;
        for (let i = 0; i < 2; i++) {
            label.set_style(this._getStyleString(size));
            const [,, natW, natH] = label.get_preferred_size();
            if (natW <= 0 || natH <= 0)
                return;
            size *= Math.min(availW / natW, availH / natH);
        }
        label.set_style(this._getStyleString(Math.floor(size)));

        if (this._settings.get_boolean('stretch-keep-ratio'))
            return;

        // Sans ratio : on déforme le texte (déjà au plus grand sans
        // déformation) pour qu'il couvre exactement la zone disponible.
        // L'échelle partant du coin haut-gauche, on le cale dans ce coin.
        const [,, natW, natH] = stretcher.get_preferred_size();
        if (natW <= 0 || natH <= 0)
            return;
        stretcher.set_scale(availW / natW, availH / natH);
        const layout = bin.layout_manager;
        if (layout.xFactor !== 0 || layout.yFactor !== 0) {
            layout.xFactor = layout.yFactor = 0;
            layout.layout_changed();
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
        case 'opacity':
            this._buildClocks();
            break;
        case 'hide-in-fullscreen':
        case 'position-mode':
        case 'position-x':
        case 'position-y':
        case 'stretch-to-screen':
        case 'stretch-keep-ratio':
        case 'split-flap':
            this._buildClocks();
            break;
        default:
            // Délai, animation et durées sont lus au moment où ils servent
            break;
        }
    }

    // sizePx : taille imposée (mode « étirer »), sinon celle de la police choisie
    _getStyleString(sizePx = 0) {
        const desc = Pango.FontDescription.from_string(this._settings.get_string('font'));

        // Retire les caractères qui casseraient la feuille de style
        const family = (desc.get_family() || 'Sans').replace(/["\\;{}]/g, '');

        let size = desc.get_size() / Pango.SCALE;
        let unit = desc.get_size_is_absolute() ? 'px' : 'pt';
        if (sizePx > 0) {
            size = sizePx;
            unit = 'px';
        } else if (size <= 0) {
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
            `text-shadow: 0 1px 4px rgba(0, 0, 0, ${shadow.toFixed(2)});` +
            // Palettes : espacement et chiffres de largeur fixe
            (this._settings.get_boolean('split-flap')
                ? ' spacing: 0.08em; font-feature-settings: "tnum";'
                : '');
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
        for (const clock of this._clocks) {
            if (clock.label instanceof FlapFace)
                clock.label.setTime(text);
            else
                clock.label.set_text(text);
            this._fitClock(clock);
        }
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
