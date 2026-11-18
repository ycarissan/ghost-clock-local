# Ghost Clock

> **Discreet transparent clock for GNOME Shell**

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-49%20|%2050%20|%2051-blue?logo=gnome&logoColor=white)](https://gnome.org)
[![Vibe Coded Extension](https://img.shields.io/badge/Vibe%20Coded%20Extension-000000?logo=mistralai&logoColor=white)](https://vibe.coders.ist)

Ghost Clock is a GNOME Shell extension that displays a **transparent, minimalist clock** in the bottom-right corner of **all your screens**. It automatically hides when you move the mouse and reappears after a short period of inactivity, providing a clean and uncluttered workspace.

---

## 🎯 Features

- **Multi-monitor support** : One clock per screen
- **Configurable position** : Choose from screen corners, center, or custom X/Y percentage position
- **Full-screen stretch mode** : Option to stretch clock text across the entire screen
- **Adjustable transparency** : Customizable opacity from 5% to 100%
- **Smart auto-hide** : Automatically hides on mouse movement
- **Smooth animations** : 4 animation types (fade, slide, zoom, instant)
- **Customizable font** : Family, style, weight, and size via native selector
- **Fullscreen aware** : Option to hide clock on fullscreen screens
- **Auto-updating time** : Synchronized updates every minute
- **Automatic theming** : Smart shadow for optimal readability on any background

## 📸 Screenshot

![Ghost Clock - Transparent clock on desktop](https://img.shields.io/badge/Screenshot-Coming%20Soon-orange)
*Screenshot coming soon*

## ⚙️ Requirements

- **GNOME Shell** : Version 49, 50, or 51
- **System** : Linux with GNOME environment (Ubuntu, Fedora, Debian, Arch, etc.)

## 💻 Installation

### Method 1: Manual Installation (Recommended for Development)

1. **Clone or copy** the repository to your extensions folder:
   ```bash
   # For user installation (recommended)
   mkdir -p ~/.local/share/gnome-shell/extensions/ghost-clock@local
   cp -r /path/to/ghost-clock-local/* ~/.local/share/gnome-shell/extensions/ghost-clock@local/
   
   # Or for system-wide installation
   sudo cp -r /path/to/ghost-clock-local /usr/share/gnome-shell/extensions/ghost-clock@local
   ```

2. **Compile the GSettings schema:**
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/ghost-clock@local/schemas/
   ```

3. **Enable the extension:**
   - Restart GNOME Shell with `Alt+F2` then type `r` and press Enter
   - Or via the **Extensions** application (gnome-extensions-app)
   - Or via command line:
     ```bash
     gnome-extensions enable ghost-clock@local
     ```

### Method 2: Installation via EGO (GNOME Extensions Online)

*Coming soon: Submission to extensions.gnome.org*

## ⚙️ Configuration

After installation, access settings via:
- **Applications → Extensions → Ghost Clock → Preferences**
- Or **gnome-extensions-app** from the terminal

### Available Settings

| Group | Setting | Default Value | Description |
|-------|---------|---------------|-------------|
| **Appearance** | Font | Sans Bold 27 | Text family, style, weight, and size |
| **Appearance** | Opacity | 35% | Clock transparency (0.05 to 1.00) |
| **Behavior** | Reappear Delay | 2.0 seconds | Mouse inactivity time before clock returns |
| **Behavior** | Hide in Fullscreen | Enabled | Hide clock on fullscreen screens |
| **Animation** | Type | Fade | Choice: Fade, Slide, Zoom, None |
| **Animation** | Hide Duration | 120 ms | Hide animation duration |
| **Animation** | Show Duration | 400 ms | Show animation duration |
| **Position** | Position Mode | Bottom Right | Choose: Bottom Right, Bottom Left, Top Right, Top Left, Center, Custom |
| **Position** | Custom X Position (%) | 50 | Horizontal position as percentage (0 = left, 100 = right) - only for Custom mode |
| **Position** | Custom Y Position (%) | 50 | Vertical position as percentage (0 = top, 100 = bottom) - only for Custom mode |
| **Position** | Stretch to Screen | Disabled | Stretch clock text to fill the entire screen |

## 🎨 Advanced Customization

### Font Settings

The accepted font format is **complete Pango description**:
- `Cantarell Bold 24`
- `Roboto Italic 18`
- `Monospace 14`
- `Sans Bold 32`

> ⚠️ If no size is specified, the extension defaults to 27pt.

### Opacity

Opacity is defined as a decimal value (0.05 to 1.00):
- **0.05** : Almost invisible (for a very subtle effect)
- **0.35** : Light and elegant (default value)
- **0.80-1.00** : Very visible

### Position Settings

Ghost Clock offers flexible positioning options:

| Mode | Description |
|------|-------------|
| **Bottom Right** | Clock positioned in the bottom-right corner (default) |
| **Bottom Left** | Clock positioned in the bottom-left corner |
| **Top Right** | Clock positioned in the top-right corner |
| **Top Left** | Clock positioned in the top-left corner |
| **Center** | Clock centered on the screen |
| **Custom Position** | Manually set X and Y as percentages (0-100%) |

**Custom Position:** When "Custom Position" mode is selected, you can specify exact placement using:
- **Custom X Position (%)**: 0 = far left, 100 = far right
- **Custom Y Position (%)**: 0 = top, 100 = bottom

### Stretch Mode

When **Stretch to Screen** is enabled, the clock text expands to fill the entire screen dimensions. This creates a dramatic, immersive clock display that uses the full available space. The text remains centered and readable while occupying maximum screen real estate.

### Animations

| Type | Description |
|------|-------------|
| **Fade** | Gradually appears/disappears |
| **Slide** | Slides down to hide, slides up to show |
| **Zoom** | Shrinks to hide, grows to show |
| **None** | Instant change without animation |

## 🛠️ Development

### Project Structure

```
ghost-clock-local/
├── extension.js          # Main extension code
├── prefs.js              # Preferences interface
├── metadata.json         # Extension metadata
├── schemas/
│   └── org.gnome.shell.extensions.ghost-clock.gschema.xml  # GSettings schema
└── README.md             # This file
```

### Technologies Used

- **JavaScript (ES6+)** with GNOME Shell APIs
- **GLib, Gtk, GObject Introspection** for system integration
- **GSettings** for persistent settings
- **St (Clutter)** for graphics rendering
- **Adwaita (Libadwaita)** for preferences UI

### Development Dependencies

```bash
# On Debian/Ubuntu
sudo apt install gnome-shell-extension-tool sassc gettext glib-2.0-dev

# On Fedora
sudo dnf install gnome-extensions-devel sassc gettext glib2-devel

# On Arch Linux
sudo pacman -S gnome-shell-extensions sass gettext glib2
```

### Recompile After Modifications

```bash
# Recompile the GSettings schema
glib-compile-schemas schemas/

# Restart GNOME Shell to apply changes
killall -3 gnome-shell
```

## 📝 Version History

### v1.0 (2605f14)
- Added new features and settings
- First functional version

### v0.1 (5ad29c8)
- Initial commit
- Basic extension structure

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. **Report a bug** : Open an issue with steps to reproduce
2. **Suggest a feature** : Open an issue to discuss the proposal
3. **Contribute code** : Fork, modify, and submit a Pull Request

## 📄 License

This project is distributed under **GPL-3.0** or later license.

See [LICENSE](LICENSE) for more details or create a LICENSE file with:

```
Ghost Clock - Transparent Clock for GNOME Shell
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

**This is a Vibe Coded Extension - Built with Mistral Vibe**

*No warranties. Use at your own risk.*
