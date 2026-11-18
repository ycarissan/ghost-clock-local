import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const ANIMATIONS = [
    ['fade', 'Fade'],
    ['slide', 'Slide Down'],
    ['zoom', 'Zoom'],
    ['none', 'None (instant)'],
];

export default class GhostClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // Garde une référence aux réglages tant que la fenêtre est ouverte
        window._settings = settings;

        const page = new Adw.PreferencesPage();
        window.add(page);

        // --- Apparence -----------------------------------------------------
        const appearance = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Changes are applied instantly on all screens.',
        });
        page.add(appearance);

        // Police : famille, style, graisse et taille dans un seul sélecteur
        const fontRow = new Adw.ActionRow({
            title: 'Font',
            subtitle: 'Text family, style and size',
        });
        const fontButton = new Gtk.FontDialogButton({
            dialog: new Gtk.FontDialog({title: 'Choose a Font'}),
            level: Gtk.FontLevel.FONT,
            use_font: true,
            use_size: true,
            valign: Gtk.Align.CENTER,
        });
        fontButton.set_font_desc(Pango.FontDescription.from_string(settings.get_string('font')));
        fontButton.connect('notify::font-desc', () => {
            const desc = fontButton.get_font_desc();
            if (desc)
                settings.set_string('font', desc.to_string());
        });
        fontRow.add_suffix(fontButton);
        appearance.add(fontRow);

        // Opacité
        const opacityRow = new Adw.ActionRow({
            title: 'Opacity',
            subtitle: 'From almost invisible (5 %) to opaque (100 %)',
        });
        const opacityAdjustment = new Gtk.Adjustment({
            lower: 0.05,
            upper: 1.0,
            step_increment: 0.05,
            page_increment: 0.1,
        });
        settings.bind('opacity', opacityAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: opacityAdjustment,
            digits: 2,
            draw_value: true,
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });
        // La clé stocke une fraction (0.05–1.0), affichée en pourcentage
        scale.set_format_value_func((_scale, value) => `${Math.round(value * 100)} %`);
        opacityRow.add_suffix(scale);
        appearance.add(opacityRow);

        // Panneau à palettes
        const flapRow = new Adw.SwitchRow({
            title: 'Split-Flap Display',
            subtitle: 'Digits on flipping tiles, like old train station or airport boards',
        });
        settings.bind('split-flap', flapRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(flapRow);

        // --- Comportement --------------------------------------------------
        const behaviour = new Adw.PreferencesGroup({title: 'Behavior'});
        page.add(behaviour);

        const delayRow = Adw.SpinRow.new_with_range(0.5, 30, 0.5);
        delayRow.set({
            title: 'Reappear Delay (s)',
            subtitle: 'Mouse inactivity time before the clock comes back',
            digits: 1,
        });
        settings.bind('reappear-delay', delayRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviour.add(delayRow);

        const fullscreenRow = new Adw.SwitchRow({
            title: 'Hide in Fullscreen',
            subtitle: 'Hide the clock on a screen showing a fullscreen window (video, game…)',
        });
        settings.bind('hide-in-fullscreen', fullscreenRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviour.add(fullscreenRow);

        // --- Animation -----------------------------------------------------
        const animation = new Adw.PreferencesGroup({title: 'Animation'});
        page.add(animation);

        const animRow = new Adw.ComboRow({
            title: 'Animation Type',
            model: Gtk.StringList.new(ANIMATIONS.map(([, label]) => label)),
        });
        animation.add(animRow);

        const hideRow = Adw.SpinRow.new_with_range(0, 2000, 10);
        hideRow.set({title: 'Hide Duration (ms)'});
        settings.bind('hide-duration', hideRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        animation.add(hideRow);

        const showRow = Adw.SpinRow.new_with_range(0, 5000, 50);
        showRow.set({title: 'Show Duration (ms)'});
        settings.bind('show-duration', showRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        animation.add(showRow);

        const syncAnimation = () => {
            const id = settings.get_string('animation');
            const index = ANIMATIONS.findIndex(([value]) => value === id);
            if (index >= 0 && animRow.selected !== index)
                animRow.selected = index;
            // Les durées n'ont pas de sens sans animation
            hideRow.sensitive = showRow.sensitive = id !== 'none';
        };
        syncAnimation();

        // --- Position ------------------------------------------------------
        const positionGroup = new Adw.PreferencesGroup({
            title: 'Position',
            description: 'Configure where the clock appears on each screen.',
        });
        page.add(positionGroup);

        const POSITIONS = [
            ['bottom-right', 'Bottom Right'],
            ['bottom-left', 'Bottom Left'],
            ['top-right', 'Top Right'],
            ['top-left', 'Top Left'],
            ['center', 'Center'],
            ['custom', 'Custom Position'],
        ];

        const positionRow = new Adw.ComboRow({
            title: 'Position Mode',
            model: Gtk.StringList.new(POSITIONS.map(([, label]) => label)),
        });
        positionGroup.add(positionRow);

        const positionXRow = Adw.SpinRow.new_with_range(0, 100, 1);
        positionXRow.set({
            title: 'Custom X Position (%)',
            subtitle: 'Horizontal position as percentage (0 = left, 100 = right)',
            digits: 0,
        });
        positionGroup.add(positionXRow);

        const positionYRow = Adw.SpinRow.new_with_range(0, 100, 1);
        positionYRow.set({
            title: 'Custom Y Position (%)',
            subtitle: 'Vertical position as percentage (0 = top, 100 = bottom)',
            digits: 0,
        });
        positionGroup.add(positionYRow);

        // Les clés stockent une fraction (0.0–1.0), l'interface affiche un pourcentage
        const bindPercent = (key, row) => {
            const syncRow = () => {
                const percent = Math.round(settings.get_double(key) * 100);
                if (row.value !== percent)
                    row.value = percent;
            };
            row.connect('notify::value', () => {
                const fraction = row.value / 100;
                if (Math.abs(settings.get_double(key) - fraction) > 1e-6)
                    settings.set_double(key, fraction);
            });
            const id = settings.connect(`changed::${key}`, syncRow);
            window.connect('close-request', () => {
                settings.disconnect(id);
                return false;
            });
            syncRow();
        };
        bindPercent('position-x', positionXRow);
        bindPercent('position-y', positionYRow);

        const stretchRow = new Adw.SwitchRow({
            title: 'Stretch to Screen',
            subtitle: 'Enlarge the clock text to fill the screen (aspect ratio kept)',
        });
        settings.bind('stretch-to-screen', stretchRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        positionGroup.add(stretchRow);

        const keepRatioRow = new Adw.SwitchRow({
            title: 'Keep Aspect Ratio',
            subtitle: 'Off: distort the text to cover the whole screen width and height',
        });
        settings.bind('stretch-keep-ratio', keepRatioRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('stretch-to-screen', keepRatioRow, 'sensitive', Gio.SettingsBindFlags.GET);
        positionGroup.add(keepRatioRow);

        const syncPosition = () => {
            const mode = settings.get_string('position-mode');
            const index = POSITIONS.findIndex(([value]) => value === mode);
            if (index >= 0 && positionRow.selected !== index)
                positionRow.selected = index;
            // Custom position controls only visible in custom mode
            positionXRow.sensitive = positionYRow.sensitive = mode === 'custom';
        };

        positionRow.connect('notify::selected', () => {
            const [value] = POSITIONS[positionRow.selected] ?? POSITIONS[0];
            settings.set_string('position-mode', value);
        });
        const positionChangedId = settings.connect('changed::position-mode', syncPosition);
        window.connect('close-request', () => {
            settings.disconnect(positionChangedId);
            return false;
        });
        syncPosition();

        animRow.connect('notify::selected', () => {
            const [value] = ANIMATIONS[animRow.selected] ?? ANIMATIONS[0];
            settings.set_string('animation', value);
        });
        const animChangedId = settings.connect('changed::animation', syncAnimation);
        window.connect('close-request', () => {
            settings.disconnect(animChangedId);
            return false;
        });
    }
}
