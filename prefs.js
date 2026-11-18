import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GhostClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Apparence de l’horloge',
            description: 'Les modifications sont appliquées instantanément sur tous les écrans.'
        });
        page.add(group);

        // 1. Taille de la police
        const sizeRow = new Adw.SpinRow({
            title: 'Taille de la police (px)',
            subtitle: 'Hauteur du texte en pixels',
            adjustment: new Gtk.Adjustment({
                lower: 12,
                upper: 200,
                step_increment: 2,
                value: settings.get_int('font-size')
            })
        });
        sizeRow.connect('notify::value', () => {
            settings.set_int('font-size', sizeRow.get_value());
        });
        group.add(sizeRow);

        // 2. Transparence (Opacité)
        const opacityRow = new Adw.ActionRow({
            title: 'Opacité',
            subtitle: 'De presque invisible (0.05) à opaque (1.00)'
        });
        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0.05,
                upper: 1.0,
                step_increment: 0.05,
                value: settings.get_double('opacity')
            }),
            digits: 2,
            draw_value: true,
            hexpand: true,
            valign: Gtk.Align.CENTER
        });
        scale.connect('value-changed', () => {
            settings.set_double('opacity', scale.get_value());
        });
        opacityRow.add_suffix(scale);
        group.add(opacityRow);

        // 3. Choix de la police
        const fontRow = new Adw.ActionRow({
            title: 'Police d’écriture',
            subtitle: 'Sélectionner une police installée sur le système'
        });
        const fontDialog = new Gtk.FontDialog({
            title: 'Choisir une police'
        });
        const fontButton = new Gtk.FontDialogButton({
            dialog: fontDialog,
            valign: Gtk.Align.CENTER,
            use_font: true,
            use_size: false
        });
        const currentFont = settings.get_string('font-family');
        fontButton.set_font_desc(Pango.FontDescription.from_string(currentFont));

        fontButton.connect('notify::font-desc', () => {
            const desc = fontButton.get_font_desc();
            if (desc) {
                settings.set_string('font-family', desc.get_family());
            }
        });
        fontRow.add_suffix(fontButton);
        group.add(fontRow);

        window.add(page);
    }
}
