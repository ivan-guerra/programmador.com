---
title: "Dotfile Mgmt With GNU Stow"
date: 2024-01-20T21:24:43-08:00
description: "Using GNU stow to manage your dotfiles."
tags: ["cli-tools", "gnu", "linux"]
showToc: false
---

Do you have a bunch of dotfiles? Do you maintain a GitHub repo with all your
[dotfiles][1]? Whenever you upgrade your machine, do you find yourself manually
placing the dotfiles in the right spots in your home directory? If you answered
yes to these questions, read on.

## Enter GNU Stow

[GNU Stow][2] is a dotfile management utility. Stow has all the makings of a
[varsity athlete][3]:

- Stow is small (a 32KB Perl script).
- Stow is simple to use with a solid manpage.
- Stow doesn't get in the way of version controlling dotfiles.

Real world Stow usage is pretty simple and best explained with an example.
Imagine you had your i3wm and Bash configurations stored in your home directory.
The layout might look something like this:

```text
home/
    ieg/
        .bashrc
        .bash_profile
        .config/
            i3/
                config
            i3status/
                config
```

To organize the configs into something Stow can work with, make a dotfiles
directory (for example, `mydotfiles/`) that has a directory per tool you wish to
manage:

```text
home/
    ieg/
        mydotfiles/
            bash/
            i3/
```

Copy the configs of each tool into their corresponding directory. **Be sure to
copy over the files/directory structure exactly as they appear in your home
directory**:

```text
home/
    ieg/
        mydotfiles/
            bash/
                .bashrc
                .bash_profile
            i3/
                .config/
                    i3/
                        config
                    i3status/
                        config
```

Supposed you hopped onto a fresh system with GNU Stow and your `mydotfiles/`
repo checked out. You can **selectively** "install" configs using the `stow`
command. For example to install i3 and Bash configs:

```bash
cd mydotfiles/
stow bash
stow i3
```

It's that simple. Stow takes care of creating symlinks in your home directory
that point to the concrete files in `mydotfiles/`! If you want to unlink some
configs, just run `stow -D`. For example, to unlink Bash configs:

```bash
cd mydotfiles/
stow -D bash
```

Doesn't get much easier than that.

[1]: https://github.com/ivan-guerra/dotfiles
[2]: https://linux.die.net/man/8/stow
[3]: https://www.youtube.com/watch?v=-fjztq3SwW4
