---
title: "My terminal setup, mid-2026"
description: "The tools I actually open every day, and the ones I uninstalled."
pubDate: 2026-06-28
tags: ["tools"]
---

I periodically audit my terminal setup by asking one question: *did I use this in the last week?* Here's what survived the latest pass.

## The keepers

- **zsh** with a deliberately short config. Every line I delete from `.zshrc` is a line that can't break.
- **ripgrep** and **fd** — at this point `grep -r` feels like dial-up.
- **fzf** wired into history search. `Ctrl-R` with fuzzy matching is the single highest-value keybinding I have.
- **git worktrees** for working on more than one branch without the stash shuffle.

## The uninstalled

The fancy prompt with git status, kubernetes context, weather, and moon phase? Gone. It was 200ms of latency on every keypress to display information I looked at twice a day.

Same for the terminal multiplexer config that had grown its own plugin manager. I replaced it with tabs. Tabs are fine.

## The one-liner that earns its keep

```sh
git log --oneline --graph --all -20
```

Aliased to `glg`. It answers "what is the state of this repo" faster than any GUI I've tried.

The theme, if there is one: tools should be boring in the way load-bearing walls are boring.
