---
title: "Dotfile Mgmt With GNU Stow"
date: 2024-01-20T21:24:43-08:00
description: "Using GNU stow to manage your dotfiles."
tags: ["cli-tools", "gnu", "linux"]
showToc: false
cover:
    image: /posts/dotfile-mgmt-with-gnu-stow/gnu-logo.png
    alt: GNU Logo
---

Until just about a year ago, I would manage my dotfiles manually. That is, I
maintained a GitHub repo[^1] with all my dotfiles so that I could gain the
benefits of a VCS, but, whenever I upgraded my machine, I would manually go and
place my dotfiles in the right spots in my home directory. Definitely not the
way to go when you have a nontrivial amount of configs and there's sometimes
years between config reinstallations...

Now I had tried a couple of tools/scripts in the past to help with config
management. The tools I had experimented with were either overly complicated for
the simple task at hand and/or required a million dependencies to get installed.

## Enter GNU Stow

About a year ago while lurking on HackerNews[^2], I came across a comment that
mentioned GNU Stow[^3] for dotfile management. I took the plunge and decided to
try yet another dotfile management tool. I do not regret my decision.

Stow had all the makings of a varsity athlete[^4]:

* Stow is small (a 32KB Perl script).
* Stow is simple to use with a solid manpage.
* Stow doesn't get in the way of version controlling dotfiles.

Real world Stow usage is pretty simple and best explained with an example.
Imagine you had your i3wm and Bash configurations stored in your home
directory. The layout might look something like this:

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
directory (e.g., `mydotfiles/`) that has a directory per tool you wish to
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

I've been using Stow for over a year now across 5 different Linux systems. No
hiccups or BS. 10/10 I recommend you check it out.

[1]: https://github.com/ivan-guerra/dotfiles
[2]: https://news.ycombinator.com/
[3]: https://linux.die.net/man/8/stow
[4]: https://www.youtube.com/watch?v=-fjztq3SwW4

[^1]: In case you wanted to see those dotfiles I was talking about:
    [dotfiles][1].
[^2]: The orange site or [HackerNews][2] is a fun place to read about new and
    old tech when contributors aren't to busy arguing about AI taking over the
    world.
[^3]: [RTFM][3]. Just kidding but not really. The Stow manpage is a short,
    worthwhile read. Check it out.
[^4]: Bet you didn't expect to find a [Sopranos][4] reference here.
