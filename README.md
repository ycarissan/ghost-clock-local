# Ghost Clock

> **Horloge transparente discrète pour GNOME Shell**

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-49%20|%2050%20|%2051-blue?logo=gnome&logoColor=white)](https://gnome.org)

Ghost Clock est une extension GNOME Shell qui affiche une **horloge transparente et minimaliste** dans le coin inférieur droit de **tous vos écrans**. Elle se cache automatiquement lorsque vous bougez la souris et réapparaît après un court délai d'inactivité, pour un espace de travail épuré.

## 🎯 Fonctionnalités

- **Horloge multi-écrans** : Une horloge par écran, positionnée en bas à droite
- **Transparence ajustable** : Opacité personnalisable de 5% à 100%
- **Disparition intelligente** : Masquage automatique au mouvement de la souris
- **Animations fluides** : 4 types d'animations (fondu, glissement, zoom, instantané)
- **Police personnalisable** : Famille, style, graisse et taille via sélecteur natif
- **Plein écran aware** : Option pour masquer l'horloge sur les écrans en plein écran
- **Heure synchronisée** : Mise à jour automatique à chaque minute
- **Thème adapté** : Ombre automatique pour une bonne lisibilité sur tous les fonds

## 📸 Aperçu

![Ghost Clock - Horloge transparente sur le bureau](https://img.shields.io/badge/Capture%20d%C3%A9cran-À%20venire-orange)
*Capture à venir*

## ⚙️ Prérequis

- **GNOME Shell** : Version 49, 50 ou 51
- **Système** : Linux avec environnement GNOME (Ubuntu, Fedora, Debian, Arch, etc.)

## 💻 Installation

### Méthode 1 : Installation manuelle (recommandée pour le développement)

1. **Cloner ou copier** le dépôt dans le dossier des extensions :
   ```bash
   # Pour une installation utilisateur (recommandé)
   mkdir -p ~/.local/share/gnome-shell/extensions/ghost-clock@local
   cp -r /chemin/vers/ghost-clock-local/* ~/.local/share/gnome-shell/extensions/ghost-clock@local/
   
   # Ou pour une installation système
   sudo cp -r /chemin/vers/ghost-clock-local /usr/share/gnome-shell/extensions/ghost-clock@local
   ```

2. **Compiler le schéma GSettings** :
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/ghost-clock@local/schemas/
   ```

3. **Activer l'extension** :
   - Redémarrer GNOME Shell avec `Alt+F2` puis `r` + Entrée
   - Ou via l'application **Extensions** (gnome-extensions-app)
   - Ou en ligne de commande :
     ```bash
     gnome-extensions enable ghost-clock@local
     ```

### Méthode 2 : Installation via EGO (Extensions GNOME Online)

*À venir : Soumission sur extensions.gnome.org*

## ⚙️ Configuration

Après installation, accédez aux paramètres via :
- **Applications → Extensions → Ghost Clock → Préférences**
- Ou **gnome-extensions-app** dans le terminal

### Paramètres disponibles

| Groupe | Paramètre | Valeurs par défaut | Description |
|--------|-----------|-------------------|-------------|
| **Apparence** | Police | Sans Bold 27 | Famille, style, graisse et taille du texte |
| **Apparence** | Opacité | 35% | Transparence de l'horloge (0.05 à 1.00) |
| **Comportement** | Délai de réapparition | 2.0 secondes | Temps d'immobilité avant retour de l'horloge |
| **Comportement** | Masquer en plein écran | Activé | Cache l'horloge sur les écrans en plein écran |
| **Animation** | Type | Fondu | Choix : Fondu, Glissement, Zoom, Aucun |
| **Animation** | Durée de disparition | 120 ms | Durée de l'animation de masquage |
| **Animation** | Durée de réapparition | 400 ms | Durée de l'animation d'affichage |

## 🎨 Personnalisation avancée

### Police d'écriture

Le format de police accepté est la **description Pango** complète :
- `Cantarell Bold 24`
- `Roboto Italic 18`
- `Monospace 14`
- `Sans Bold 32`

> ⚠️ Si aucune taille n'est spécifiée, l'extension utilise 27pt par défaut.

### Opacité

L'opacité est définie en valeur décimale (0.05 à 1.00) :
- **0.05** : Presque invisible (idéal pour un effet très discret)
- **0.35** : Léger et élégant (valeur par défaut)
- **0.80-1.00** : Très visible

### Animations

| Type | Description |
|------|-------------|
| **Fondu** | Apparaît/disparaît progressivement |
| **Glissement** | Glisse vers le bas pour disparaître, remonte pour apparaître |
| **Zoom** | Rétrécit pour disparaître, grandit pour apparaître |
| **Aucune** | Changement instantané sans animation |

## 🛠️ Développement

### Structure du projet

```
ghost-clock-local/
├── extension.js          # Code principal de l'extension
├── prefs.js              # Interface des préférences
├── metadata.json         # Métadonnées de l'extension
├── schemas/
│   └── org.gnome.shell.extensions.ghost-clock.gschema.xml  # Schéma GSettings
└── README.md             # Ce fichier
```

### Technologies utilisées

- **JavaScript (ES6+)** avec GNOME Shell APIs
- **GLib, Gtk, GObject Introspection** pour l'intégration système
- **GSettings** pour la persistance des paramètres
- **St (Clutter)** pour le rendu graphique
- **Adwaita (Libadwaita)** pour les préférences

### Dépendances de développement

```bash
# Sur Debian/Ubuntu
sudo apt install gnome-shell-extension-tool sassc gettext glib-2.0-dev

# Sur Fedora
sudo dnf install gnome-extensions-devel sassc gettext glib2-devel

# Sur Arch Linux
sudo pacman -S gnome-shell-extensions sass gettext glib2
```

### Recompiler après modifications

```bash
# Recompiler le schéma GSettings
glib-compile-schemas schemas/

# Redémarrer GNOME Shell pour appliquer les changements
killall -3 gnome-shell
```

## 📝 Historique des versions

### v1.0 (2605f14)
- Ajout de nouvelles fonctionnalités et paramètres
- Première version fonctionnelle

### v0.1 (5ad29c8)
- Commit initial
- Structure de base de l'extension

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. **Signaler un bug** : Ouvrez une issue avec les étapes pour reproduire
2. **Proposer une fonctionnalité** : Ouvrez une issue pour discuter de la proposition
3. **Contribuer du code** : Fork, modifiez, et soumettez une Pull Request

## 📄 Licence

Ce projet est distribué sous licence **GPL-3.0** ou supérieure.

Voir [LICENSE](LICENSE) pour plus de détails ou créez un fichier LICENSE avec :

```
Ghost Clock - Horloge transparente pour GNOME Shell
Copyright (C) 2024 Yannick

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

---

**Créé avec ❤️ pour GNOME Shell**

*Aucune responsabilités en cas de problèmes. Utilisez à vos propres risques.*
