# NovaCore V3 Enhanced - Premium Miniblox Userscript 💎

<div align="center">

![Version](https://img.shields.io/badge/version-2.9-00ffff?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-00ffff?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-00ffff?style=for-the-badge)

**A feature-rich, high-performance userscript framework for [Miniblox](https://miniblox.io)**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

NovaCore V3 is a powerful, modular Tampermonkey userscript that enhances your Miniblox experience with real-time performance monitoring, customizable themes, and quality-of-life improvements. Built on the foundation of NovaCore V1 by @Scripter132132, this enhanced version features significant performance optimizations, memory management improvements, and a sleek modern UI.

### ✨ Key Highlights

- 🚀 **Optimized Performance** - Unified RAF loop, throttled updates, efficient memory management
- 🎨 **8 Stunning Themes** - Cyan, Purple, Green, Red, Blue, Gold, Pink, Orange + Custom colors
- 📊 **Real-Time Monitoring** - FPS, CPS, Session Timer, Real-Time Clock
- ⚡ **Anti-AFK System** - Automatic jump prevention to avoid kicks
- 💾 **Smart Persistence** - Settings auto-save with position memory
- 🐛 **Debug Console** - Built-in error tracking and logging system
- 🔄 **Auto-Update Checker** - Stay notified of new releases
- 📈 **Session Statistics** - Track clicks, keys, peak performance across sessions

---

## 🎮 Features

### Performance Counters

| Feature | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| **FPS Counter** | Real-time frames per second display | Toggle via menu |
| **CPS Counter** | Clicks per second tracker | Toggle via menu |
| **Real-Time Clock** | Never exit fullscreen to check time | Toggle via menu |
| **Session Timer** | Track your playtime (right-click to reset) | Toggle via menu |

### Quality of Life

- **🎨 Theme System** - Choose from 8 pre-built themes or create your own custom color scheme
- **⚡ Anti-AFK** - Automatically jumps every 5 seconds to prevent kick (idea from Unverified Client V2 thx wytlines100 and devs!)
- **🖱️ Draggable Counters** - Reposition any counter anywhere on screen
- **⌨️ Customizable Keybind** - Set your preferred menu toggle key (default keybind: `\`)
- **🔔 Update Notifications** - Automatic GitHub update checking (idea from me)

### Advanced Features

- **Session Statistics Dashboard** - View total clicks, keys pressed, peak CPS/FPS, and session count
- **Debug Console** - Export detailed error logs for troubleshooting
- **Memory-Efficient Design** - Debounced saves, throttled updates, cleanup on exit
- **Responsive UI** - Works perfectly on desktop and mobile devices
- **Fullscreen Support** - Optimized for fullscreen gaming experience

---

## 📦 Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Opera)
- [Tampermonkey](https://www.tampermonkey.net/) extension installed

### Quick Install

1. **Install Tampermonkey**
   - Chrome/Edge: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - Opera: [Opera Add-ons](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)

2. **Install NovaCore Script**
   - Click [here](https://github.com/TheM1ddleM1n/NovaCoreForMiniblox/blob/main/NCUserscript.js) to view the script
   - Click the **Raw** button to view raw code
   - Tampermonkey should prompt you to install - click **Install**
   
   *Alternatively:* Copy the script code → Open Tampermonkey Dashboard → Create New Script → Paste → Save

3. **Visit Miniblox**
   - Navigate to [miniblox.io](https://miniblox.io)
   - Watch the installation animation
   - Press `\` to open the menu!

---

## 🎯 Usage

### Opening the Menu

- **Default Keybind:** Press `\` (backslash)
- **Custom Keybind:** Change in Settings → Menu Keybind
- **Close Menu:** Press `ESC` or click outside the menu

### Customizing Your Experience

1. **Choose a Theme**
   - Open menu → Scroll to Theme section
   - Click any theme button to apply instantly
   - Or use the color picker for custom colors

2. **Enable Counters**
   - Toggle any counter from the menu
   - Drag counters to reposition them
   - Positions are automatically saved

3. **View Statistics**
   - Click "📊 View Session Stats" in the menu
   - Press F12 to view the formatted console output
   - Stats include: session count, total clicks/keys, peak CPS/FPS

4. **Debug Issues** (I think I will remove this)
   - Click "🐛 View Debug Log" to export error logs
   - Share logs when reporting issues on GitHub

### Tips & Tricks

- 💡 **Right-click Session Timer** to reset it
- 💡 **Counters auto-save positions** when you drag them
- 💡 **Theme changes apply instantly** - no reload needed
- 💡 **Anti-AFK countdown** shows how many seconds until the next jump
- 💡 **Update checker runs automatically** every hour

---

## 🛠️ Configuration

### Script Metadata

```javascript
// @name         NovaCore V3 Enhanced
// @namespace    http://github.com/TheM1ddleM1n/
// @version      3
// @description  NovaCore V3 with improved performance, memory management, and themes!
// @author       (Cant reveal who im), TheM1ddleM1n
// @match        https://miniblox.io/
// @grant        none
```

### Available Themes

| Theme | Primary Color | Use Case |
|-------|---------------|----------|
| Cyan (Default) | `#00ffff` | Classic NovaCore aesthetic |
| Purple Dream | `#9b59b6` | Elegant and mysterious |
| Matrix Green | `#2ecc71` | Hacker vibes |
| Crimson Fire | `#e74c3c` | Bold and aggressive |
| Ocean Blue | `#3498db` | Cool and calming |
| Golden Glow | `#f39c12` | Warm and premium |
| Bubblegum Pink | `#ff69b4` | Fun and playful |
| Sunset Orange | `#ff6b35` | Energetic and vibrant |
| Custom | Your choice | Fully customizable |

### Storage Keys

NovaCore uses localStorage for persistence:
- `novacore_settings` - Feature toggles and positions
- `novacore_session_stats` - Session statistics
- `novacore_custom_color` - Custom theme color
- `novacore_debug_log` - Error and debug logs

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. Check existing [issues](https://github.com/TheM1ddleM1n/NovaCoreForMiniblox/issues)
2. Create a new issue with:
   - Clear description of the bug/feature
   - Steps to reproduce (for bugs)
   - Browser and Tampermonkey version
   - Debug log if applicable

### Pull Requests

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feat/amazing-feature`
5. **Open** a Pull Request with:
   - Clear description of changes
   - Testing steps performed
   - Screenshots/videos if UI changes

### Development Guidelines

- Follow existing code style and structure
- Use `safeExecute()` wrapper for error handling
- Add comments for complex logic
- Test thoroughly before submitting
- Update version number and changelog

---

## 📋 Changelog

### v3 (Current)
- Bumped to V3

### v2.9

- No more debug log spam - Removed entire debug system
- Smarter performance - RAF only runs when actually needed
- Zero memory leaks - All listeners properly tracked and cleaned up
- Crash-resistant - Circuit breaker prevents repeated failures
- Richer analytics - Track averages, not just peaks

### v2.8

- ✨ Added session statistics dashboard
- 🐛 Improved debug logging system
- 🎨 Enhanced theme system with custom color picker
- ⚡ Performance optimizations and memory management
- 🔄 Automatic update checker
- 📱 Mobile responsiveness improvements

### v2.0-2.7

- Major performance improvements
- Theme system implementation
- Anti-AFK feature
- Session timer and real-time clock
- Draggable counters with position memory
- Debounced save system

### v1.0 (Original by @Scripter132132)

- Basic FPS/CPS counters
- Simple menu system
- Core functionality

---

## 📜 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👥 Credits

### Development Team

- **Original Creator:** [@Scripter132132](https://github.com/Scripter132132) - NovaCore V1 foundation!
- **Lead Dev:** [@TheM1ddleM1n](https://github.com/TheM1ddleM1n) - V2+ enhancements and maintenance!

### Special Thanks!

- The Tampermonkey team for the excellent userscript platform and @Scripter132132!

---

## 📞 Support & Contact

- **Issues & Bugs:** [GitHub Issues](https://github.com/TheM1ddleM1n/NovaCoreForMiniblox/issues)
- **Discussions:** [GitHub Discussions](https://github.com/TheM1ddleM1n/NovaCoreForMiniblox/discussions)
- **Repository:** [NovaCoreForMiniblox](https://github.com/TheM1ddleM1n/NovaCoreForMiniblox)

---

## ⭐ Show Your Support

If you find NovaCore useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and suggesting features
- 🤝 Contributing code improvements
- 📢 Sharing with the Miniblox community

---

<div align="center">

**Made with 💎 for the Miniblox community**

[⬆ Back to Top](#novacore-v28-enhanced---premium-miniblox-userscript-)

</div>
