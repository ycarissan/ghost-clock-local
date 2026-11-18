import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const ANIMATIONS = [
    ['fade', 'Fondu'],
    ['slide', 'Glissement vers le bas'],
    ['zoom', 'Zoom'],
    ['none', 'Aucune (instantané)'],
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
            title: 'Apparence',
            description: 'Les modifications sont appliquées instantanément sur tous les écrans.',
        });
        page.add(appearance);

        // Police : famille, style, graisse et taille dans un seul sélecteur
        const fontRow = new Adw.ActionRow({
            title: 'Police',
            subtitle: 'Famille, style et taille du texte',
        });
        const fontButton = new Gtk.FontDialogButton({
            dialog: new Gtk.FontDialog({title: 'Choisir une police'}),
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
            title: 'Opacité',
            subtitle: 'De presque invisible (0,05) à opaque (1,00)',
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
        opacityRow.add_suffix(scale);
        appearance.add(opacityRow);

        // --- Comportement --------------------------------------------------
        const behaviour = new Adw.PreferencesGroup({title: 'Comportement'});
        page.add(behaviour);

        const delayRow = Adw.SpinRow.new_with_range(0.5, 30, 0.5);
        delayRow.set({
            title: 'Délai de réapparition (s)',
            subtitle: 'Temps d’immobilité de la souris avant le retour de l’horloge',
            digits: 1,
        });
        settings.bind('reappear-delay', delayRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviour.add(delayRow);

        const fullscreenRow = new Adw.SwitchRow({
            title: 'Masquer en plein écran',
            subtitle: 'Cache l’horloge sur un écran affichant une fenêtre en plein écran (vidéo, jeu…)',
        });
        settings.bind('hide-in-fullscreen', fullscreenRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviour.add(fullscreenRow);

        // --- Animation -----------------------------------------------------
        const animation = new Adw.PreferencesGroup({title: 'Animation'});
        page.add(animation);

        const animRow = new Adw.ComboRow({
            title: 'Type d’animation',
            model: Gtk.StringList.new(ANIMATIONS.map(([, label]) => label)),
        });
        animation.add(animRow);

        const hideRow = Adw.SpinRow.new_with_range(0, 2000, 10);
        hideRow.set({title: 'Durée de la disparition (ms)'});
        settings.bind('hide-duration', hideRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        animation.add(hideRow);

        const showRow = Adw.SpinRow.new_with_range(0, 5000, 50);
        showRow.set({title: 'Durée de la réapparition (ms)'});
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
