---
title: "Part 4: Terminal Emulation and the Shell"
date: 2024-07-22T20:23:55-04:00
description: "Choosing a terminal emulator and shell."
tags: ["linux", "workflow optimization"]
series: ["workflow optimization"]
ShowPostNavLinks: false
---

The terminal emulator and shell are critical components of any developer's
toolbox. The terminal provides features to customize the look and feel of the
text interface. Most importantly, the terminal emulator runs a shell. The shell
is the program that takes your text input, interprets the input as a set of one
or more commands, and passes on those commands to the OS. All emulators and
shells provide this basic set of features. What sets them apart are small
differences that can sometimes amount to large productivity gains.

## The Terminal Emulator

There's tons of terminal emulators to choose from. The Arch Linux wiki has a
non-exhaustive [list of terminal emulators][1]. When you compare and contrast
the different options, you see a few features are consistently promoted:

- Light CPU and RAM usage.
- 256 Color support.
- Font support.
- Support for tabs.
- Unlimited scrolling.
- [GPU acceleration][2].

In this series, it's recommended you install [xfce4-terminal][3]. The XFCE
terminal supports all the listed features except GPU acceleration. If you have
been following along since [Part 3][4], you will already have the XFCE terminal
installed!

Launch the terminal (`super+enter`) and right click the XFCE terminal window.
Select the "preferences" option in the popup menu. You should see a window popup
like the one shown below.

![xfce4-terminal Preferences](/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/xfce4-terminal-preferences.webp#center)

Many of the customization options are self explanatory. Hovering over an option
will popup a helpful tool tip.

A couple of things are worth customizing. The terminal emulator's keybindings
are under the "Shortcuts" tab. If you'd like to change the color scheme to
something more appealing, checkout the [Gogh][5] project for a selection of
themes with install instructions. If you're in need of a hacker friendly font,
the [Source Code Pro][6] font family is your friend. Adjusting XFCE terminal's
scrolling features under "General -> Scrolling" is highly recommended.

## The Shell

Much like the terminal emulator, most shells are fundamentally the same but
differ in minor ways that can dramatically transform your workflow. This series
recommends you use [fish, the friendly interactive shell][7].

Fish is a popular option these days for its ease of configuration and the amount
of nice-to-have features you get out of the box.

## Setting Your Shell in XFCE Terminal

To pair your shell to your terminal emulator, right click the XFCE terminal and
select the "preferences" option in the menu. Under the "General" tab in the
"Command" section, check the "Run a custom command instead of my shell" box and
type "fish" in the "Custom command" field:

![Setting the Shell](/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/setting-the-shell.webp#center)

Save your preferences and open a new terminal. You will then see the standard
fish prompt:

```text
Welcome to fish, the friendly interactive shell
Type help for instructions on how to use fish
you@hostname ~>
```

In the following sections, you'll get a demo of many of the unique features of
fish. The list isn't exhaustive but it should give you a taste of what fish has
to offer.

## Fish Features

### Autosuggestions

Unlike other shells, fish comes with autosuggestions by default. These
suggestions source from the utilities on your `PATH` and your command history.

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-autosuggestions.mp4" type="video/mp4" preload="auto" >}}

Fish goes even further. You can get completion suggestions from the installed
manpages. Just tell fish to parse the manpages by running the following command
in the shell:

```bash
fish_update_completions
```

Now, when you type a hyphen after a command, you will get option suggestions
with their short descriptions. You can add characters after the hyphen and hit
tab to get "combined" option suggestions.

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-manpage-suggestions.mp4" type="video/mp4" preload="auto" >}}

### Web Based Configuration

Like any shell, you can configure fish via a series of text files. Unlike most
other shells, you can also configure fish via a web interface.

Run the following command in the shell:

```bash
fish_config
```

You should see a browser window popup with your fish settings:

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-web-config.mp4" type="video/mp4" preload="auto" >}}

Take some time to explore the options. The web interface is a nice alternative
to purely text based configuration.

### History Search

The history search function in fish is an improvement over the default provided
by other shells like bash. Fish provides an interactive view into your command
history.

Type `ctrl+r` in your terminal. You should see a search prompt appear. Start
typing a command and then make a selection.

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-history-search.mp4" type="video/mp4" preload="auto" >}}

### Fast Path Navigation

In other shells, you write command aliases to assist in quick directory
navigation. Fish comes with a built in `cd` function. That is, if you type the
name of a directory and press `enter`, that's equivalent to typing `cd
/path/to/dir`:

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-cd.mp4" type="video/mp4" preload="auto" >}}

Additionally, you can cycle through recently visited directories using the
`alt+right_arrow` and `alt+left_arrow` keybindings:

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-cd-shortcut.mp4" type="video/mp4" preload="auto" >}}

### Syntax Highlighting

Syntax highlighting in fish helps save you time by catching errors before you
execute the command. Fish's built in syntax highlighting provides a visual cue
when a command is incorrect.

{{< video src="/series/workflow-optimization/part-4:-terminal-emulation-and-the-shell/fish-syntax-highlighting.mp4" type="video/mp4" preload="auto" >}}

The syntax highlighting also works in the context of command options though it
may be harder to spot single character errors.

## Conclusion

The combination of terminal emulator and shell can make or break a workflow.
XFCE Terminal and the Fish shell enhance your experience at the command line.
They each provide various quality of life features out of the box where others
don't.

In the next article, you'll get a look at how to get the most out of your Linux
text editing experience.

[1]: https://wiki.archlinux.org/title/Category:Terminal_emulators
[2]: https://news.ycombinator.com/item?id=29528343#:~:text=Faster%20screen%20updates%2C%20lower%20CPU,completely%20while%20burning%20the%20CPU.
[3]: https://docs.xfce.org/apps/terminal/start
[4]: https://programmador.com/series/workflow-optimization/part-3-an-i3-desktop-environment/
[5]: https://github.com/Gogh-Co/Gogh
[6]: https://github.com/adobe-fonts/source-code-pro
[7]: https://fishshell.com/docs/current/
