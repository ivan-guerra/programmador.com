---
title: "Part 5: Text Editing"
date: 2024-07-28T16:54:41-04:00
description: "Improving your text editing experience."
tags: ["linux", "workflow optimization"]
series: ["workflow optimization"]
ShowPostNavLinks: false
---

Linux developers spend a large amount of time in both the shell and their text
editors. [Part 4][1] of this series explored improving the shell experience. In
this final installment, you'll dive into how to text edit like a pro.

## Features of a Modern Text Editor

What should your text editor provide? You want an editor with features that are
IDE like without all the bloat and licensing requirements that come with an IDE.
Below is a shortlist of the features a modern text editor should support:

- File type detection.
- Syntax highlighting.
- Language formatters.
- Language linters.
- Directory tree navigation.
- File search both by filename and content.
- Version control system integration.

There are a number of editors that provide these and many more features. The key
players are CLion, Visual Studio Code, Emacs, Vim, and Neovim. This series
recommends you install [Neovim][2].

Why Neovim? Neovim includes all the modern features introduced in this section
and more. Neovim is [free as in beer][3]. You don't have to pay Microsoft or
JetBrains a monthly subscription fee for a text editor/IDE. You configure Neovim
using Lua. Lua is arguably a more user friendly configuration language than
vimscript or Emacs' Lisp dialect. Most importantly, Neovim has an active
community of developers maintaining and creating new plugins.

## Installation and Base Configuration

The following command will install Neovim on an Arch Linux system:

```bash
sudo pacman -S neovim
```

There's two paths you can take in regards to configuring Neovim: create a custom
configuration from scratch or use a community distribution. If you're completely
new to Neovim, the best option is to start with a distribution that suits you.
There are a number of distributions to choose from:

- AstroVim
- LunarVim
- LazyVim
- NVChad

Each distribution differs in their default plugin and keybinding support. Also,
some distributions are more actively maintained than others. The latter point is
especially important. In the world of Neovim, there's a nonzero chance breaking
changes make it into the core editor/plugins. You don't want to spend time
patching your configs. It's better if the distribution developers do that for
you.

The recommended distribution is [NVChad][4]. NVChad sees active maintenance, has
solid documentation, and is straightforward to install.

### NVChad Installation

The NVChad docs provide a step-by-step installation and update guide. Follow the
steps in the [NVChad Quickstart][5] guide before proceeding.

### Adding LSPs and More Using Mason

You might see the acronym LSP thrown around in Neovim docs and elsewhere on the
web. What's an LSP?

> LSP(s) facilitates features like go-to-definition, find references, hover,
> completion, rename, format, refactor, etc., using semantic whole-project
> analysis.

To get the most out of Neovim, **you'll want to install an LSP for each language
that you use**. Mason is a package manager that comes with NVChad that makes LSP
installation easy.

Open Neovim and run the Mason package manager by entering the command `:Mason`:

![Mason UI](/series/workflow-optimization/part-5:-text-editing/mason.webp#center)

From the Mason UI, you can manage your LSPs, formatters, linters, etc. It's
highly recommended you take the time look at each category and install the
packages for the languages you use.

### Enabling LSPs, Diagnostics, and Formatters

Mason only installs the LSP, linter, etc. To use these plugins, you must work
them into your NVChad configurations. The following video tutorial shows you how
to do just that and more. While the video targets C++ development, the steps
shown are equally useful for developing in other languages with an NVChad
distribution.

{{< youtube lsFoZIg-oDs >}}

## Working with Neovim

Learning Neovim or more so Vim keystrokes may take some getting used to. There
are plenty of [resources][6] and [cheatsheets][7] out there online to help you
get started. The best advice is to dive right in but pace yourself. Learn a few
keystrokes a week. Modify any key bindings that feel unergonomic. Soon enough
you'll find you've developed the muscle memory to navigate and edit any
document.

Likewise, you need to learn what tools are available to you in Neovim. This is
especially important when developing software. In this section, you'll take a
tour of some of Neovim's most critical features for software development. The
list isn't meant to be exhaustive. If you feel like something is missing, that
something likely exists as a plugin already. A quick online search or post on
the [Neovim IRC][8] will get you going in the right direction.

### Nvdash and NvCheatsheet

NVChad comes with a beginner friendly dashboard. To launch the dashboard run
`:Nvdash`:

![Nvdash](/series/workflow-optimization/part-5:-text-editing/nvdash.webp#center)

The dashboard shows you some key combos that bring up different menus and
functionality. Its handy to look at when starting out. Speaking of key binds,
there are a number of useful default mappings provided by NVChad. You can see
these mappings at anytime by running `:NvCheatsheet` or pressing `space+c+h`:

{{< video src="/series/workflow-optimization/part-5:-text-editing/nvcheatsheet.mp4" type="video/mp4" preload="auto" >}}

That's a lot of mappings. Remember, just focus on learning what you need
day-to-day first.

### Directory Navigation Using nvim-tree

nvim-tree is a file explorer plugin. You can toggle the tree via `ctrl+n`. To
change focus between the tree and the text area, press `ctrl+w+w`.

{{< video src="/series/workflow-optimization/part-5:-text-editing/nvim-tree.mp4" type="video/mp4" preload="auto" >}}

nvim-tree is a nice feature but it's hampered by its inability to perform a
search on a directories' contents. For that there's the telescope plugin.

### File Search Using Telescope

Telescope is a "fuzzy finder over lists." What that means is you can use
telescope to search for files over a directory using imprecise search terms.

To launch telescope file search press `space+f+f`. Type your search term and
select your file.

{{< video src="/series/workflow-optimization/part-5:-text-editing/telescope.mp4" type="video/mp4" preload="auto" >}}

Note, you can open a file in a new vertical pane by entering `ctrl+v`. Equally
handy is `space+f+o` which opens a list of recently opened files.

### Searching via Regex Using ripgrep

Telescope also provides an integration with [ripgrep][9]. For this to work,
you'll first need to install ripgrep:

```bash
sudo pacman -S ripgrep
```

Enter `space+f+w` in Neovim to open the ripgrep live preview window. Enter a
regex and telescope will show you a live preview of all files whose **content**
matches the regex.

{{< video src="/series/workflow-optimization/part-5:-text-editing/ripgrep.mp4" type="video/mp4" preload="auto" >}}

### Git Integrations

NVChad includes a number of Git integrations out of the box. For example, to
view the commit list alongside a live diff, enter `space+c+m`:

![Git Commit](/series/workflow-optimization/part-5:-text-editing/git-commits.webp#center)

To run git's status command alongside a live diff, enter `space+g+t`:

![Git Status](/series/workflow-optimization/part-5:-text-editing/git-status.webp#center)

You also get live change tracking on the left handside of the screen whenever
you make changes to a git version controlled file. This information and more is
also included in the status bar at the bottom of the window.

![Git Bar](/series/workflow-optimization/part-5:-text-editing/git-bar.webp#center)

One of the most powerful git plugins included with NVChad is gitsigns. You can
see all the keybindings in the cheatsheet (`space+c+h`) under the "gitsigns"
sections. The clip below shows how you can navigate (`]+c` and `[+c`), inspect
(`space+p+h`), and undo "hunks" (`space+r+h`) of changes.

{{< video src="/series/workflow-optimization/part-5:-text-editing/gitsigns.mp4" type="video/mp4" preload="auto" >}}

### Theme Selection

NVChad prepackages a large selection of popular themes. Better yet, a theme
picker is available so that you can switch themes at any time. Enter `space+t+h`
to open up the theme picker and make a selection.

{{< video src="/series/workflow-optimization/part-5:-text-editing/themes.mp4" type="video/mp4" preload="auto" >}}

## Conclusion

Being able to text edit is a critical component of a developer's workflow. To
make the editing experience smoother, the editor program must provide a number
of modern features. Neovim is an editor that has many of those modern features
including file/content search, code navigation, and version control support. In
particular, the NVChad Neovim distribution comes prepackaged with most of what
you need to make your Linux editing experience more pleasant. NVChad/Neovim
introduce a learning curve in regards to the number key bindings one has to
remember to be effective. That said, just weeks into using the tools, you'll
find it was worth investing the time to learn your editor.

That's it for this series. Hopefully these articles have helped shape your Linux
dev experience to be efficient and, most importantly, enjoyable.

[1]: https://programmador.com/series/workflow-optimization/part-4-terminal-emulation-and-the-shell/
[2]: https://neovim.io/
[3]: https://en.wiktionary.org/wiki/free_as_in_beer
[4]: https://nvchad.com/
[5]: https://nvchad.com/docs/quickstart/install
[6]: https://vim-adventures.com/
[7]: https://vim.rtorr.com/
[8]: https://neovim.io/community/
[9]: https://github.com/BurntSushi/ripgrep
