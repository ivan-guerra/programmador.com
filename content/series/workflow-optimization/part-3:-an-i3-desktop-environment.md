---
title: "Part 3: An I3 Desktop Environment"
date: 2024-07-13T20:51:45-04:00
description: "Setting up an i3 desktop environment."
tags: ["linux", "workflow optimization"]
series: ["workflow optimization"]
ShowPostNavLinks: false
---

The next step in optimizing your development workflow is to setup the desktop
environment (DE). Linux has many different DEs to choose from: Unity, XFCE, KDE
Plasma, just to name a few. Which should you choose? This series argues that the
[i3 tiling window manager][1] is the optimal choice.

## Why i3

Listed below are the benefits of a tiling WM:

- Small CPU and memory footprint.
- Highly customizable in regards to look and feel.
- Focus on minimalism and keeping what's important in focus.
- Keyboard centric workflow.
- Stability.

A lag free environment where you don't have to take your hands off the keyboard
to sift through a sea of GUI menus is ideal. Tiling WMs provide just that.

There are many tiling WMs out there: dwm, awesome, sway, the list goes on. So
why i3? The answer is **simplicity with respect to configuration**. Unlike a
number of other WMs that require programming language knowledge or a custom
scripting language, you configure i3 via text files. The configuration options
are well documented and easy to follow.

## Configuring i3

This section assumes you're following along from [Part 2][2] of this series.
During Arch installation, you should have selected to install i3 as your DE. If
you skipped that step, follow the instructions in sections 1 and 2 of the
[ArchWiki's i3 page][3] before continuing.

It's important to understand that i3 is just the base window manager. There's a
number of niceties provided by other programs. You'll likely want to install the
programs in the list below:

- [i3bar][4] - Provides a customizable status bar where you can display CPU
  usage, date/time info, network SSID, and much more.
- [i3lock][5] - A lock screen to keep people out when you're away from the
  keyboard.
- [dmenu][6] - Search and launch installed applications.
- [feh][7] - A lightweight image viewer. Useful for wallpaper display.
- [picom][8] - A compositor. Enables window shadows, transparency, animations,
  etc.

The configurations introduced later in this section also require a number of
additional programs. The `pacman` install command below includes all the
required packages:

```bash
pacman -S awesome-terminal-fonts brightnessctl chromium dmenu feh i3lock i3status lm_sensors picom pulseaudio xfce4-terminal xorg-xinput
```

You configure i3 and i3bar via text files named `config` placed in your user's
home directory:

```text
$HOME
└── .config
    ├── i3
    │   └── config
    └── i3status
        └── config
```

It's best to configure i3 from a known working configuration. You can find a
base set of configurations at this [link][9]. Copy the linked directories to
`/$HOME/.config/`. Take a moment to inspect both config files. The i3 config
consists of mostly keybindings to programs and window manipulations. The i3bar
config controls what status info gets displayed in the status bar. You can find
a complete listing of status options in the [i3status docs][10].

Enter `Super+shift+r` to reload you're i3 configuration. If you're not fond of a
black wallpaper, edit `$HOME/.config/i3/config` and change the `exec
--no-startup-id feh ...` command to point to a background image of your choice
and reload. You're desktop should look similar to the capture below:

![i3 Desktop](/series/workflow-optimization/part-3:-an-i3-desktop-environment/i3-desktop.webp#center)

Feel free to change a number of the programs and settings in the config. For
example, if you don't have the Berkeley Mono font installed, you might want to
specify a different font in `$HOME/.config/i3/config`.

## Working with i3

A tiling WM takes some getting used to. To help get you started, the video below
covers the basic bindings you would use day-to-day.

{{< video src="/series/workflow-optimization/part-3:-an-i3-desktop-environment/basic-keybindings.mp4" type="video/mp4" preload="auto" >}}

The table below provides a cheatsheet with a few extras. Consult the config for
the complete listing.

| Keybinding                                                    | Description                               |
| ------------------------------------------------------------- | ----------------------------------------- |
| `Super+d`                                                     | Launch dmenu.                             |
| `Super+enter`                                                 | Launch terminal.                          |
| `Super+h`                                                     | Set layout to horizontal.                 |
| `Super+v`                                                     | Set layout to vertical.                   |
| `Super+shift+[up_arrow\|down_arrow\|left_arrow\|right_arrow]` | Reposition focused window.                |
| `Super+[j\|k\|up_arrow\|down_arrow]`                          | Change focused window.                    |
| `Super+spacebar`                                              | Toggle floating mode.                     |
| `Super+[1\|2\|3\|4\|5]`                                       | Change workspace.                         |
| `Super+[left_arrow\|right_arrow]`                             | Cycle through workspaces.                 |
| `Super+shift+[1\|2\|3\|4\|5]`                                 | Move focused window to another workspace. |
| `Super+c`                                                     | Kill focused window.                      |
| `Super+q`                                                     | Logout/quit i3.                           |
| `Super+r`                                                     | Reload i3/i3bar config.                   |
| `Super+b`                                                     | Launch a browser.                         |
| `Super+alt+[up_arrow\|down_arrow]`                            | Lower/increase volume.                    |
| `Super+alt+[left_arrow\|right_arrow]`                         | Lower/increase screen brightness.         |
| `Super+F4`                                                    | Shutdown.                                 |
| `Super+F5`                                                    | Restart.                                  |

## Conclusion

When it comes to development, it's hard to beat a tiling WM. A lightweight,
focused, and keyboard centric environment is ideal. i3 is one of the best tiling
WMs out there due to its rich feature set and ease of configuration.

In the next installment, you'll explore the terminal emulator and shell.

[1]: https://i3wm.org/
[2]: https://programmador.com/series/workflow-optimization/part-2-choosing-a-distribution/
[3]: https://wiki.archlinux.org/title/i3
[4]: https://i3wm.org/i3bar/
[5]: https://i3wm.org/i3lock/
[6]: https://tools.suckless.org/dmenu/
[7]: https://feh.finalrewind.org/
[8]: https://github.com/chjj/compton
[9]: https://github.com/ivan-guerra/dotfiles/tree/master/i3/.config
[10]: https://i3wm.org/docs/i3status.html
