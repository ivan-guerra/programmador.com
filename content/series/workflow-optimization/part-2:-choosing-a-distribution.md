---
title: "Part 2: Choosing a Distribution"
date: 2024-07-06T11:22:22-04:00
description: "Selecting and installing a Linux distro."
tags: ["linux", "workflow optimization"]
series: ["workflow optimization"]
ShowPostNavLinks: false
---

The Linux distribution you choose has a large impact on your Linux development
experience. What's a Linux distribution or distro for short? A distro is the OS.
It's the combination of a Linux kernel, package manager, and userland programs.
You might think there are two or three Linux distros. As of today,
[DistroWatch][1] shows there are over 20 different distros to choose from! Where
do you start?

## Selection Criteria

What makes a good developers distro? The five bullets below take a stab at
answering that question:

- Includes the latest long term support (LTS) Linux kernel.
- Has a large and actively maintained package repository.
- Has active community forums. A good distro wiki is a plus.
- If the distro requires upgrades, a clear upgrade path is desirable.
- Stability.

While there are dozens of distros, many of them are passion projects maintained
by a handful of people. The latter distros aren't a great choice for development
since their stability and the pace of package updates isn't always the best.
Further, a number of distros are special purpose. For example, [RaspPiOS][2] is
a distro optimized for use with the Raspberry Pi hardware.

Putting the "hobby" and specialty purpose distros aside, you're left with the
mainstream contenders.

## Picking a Distro

Below is a table of the most popular, mainstream Linux distros. Click the images
to read more about them on DistroWatch.

<div class="row" style="display:flex">
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=arch">
    <img src="/series/workflow-optimization/choosing-a-distribution/arch.webp"
      alt="Cover Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=fedora">
    <img src="/series/workflow-optimization/choosing-a-distribution/fedora.webp"
      alt="Secret Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=gentoo">
    <img src="/series/workflow-optimization/choosing-a-distribution/gentoo.webp"
      alt="Merged Image" style="width:75%">
    </a>
  </div>
</div>
<div class="row" style="display:flex">
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=mint">
    <img src="/series/workflow-optimization/choosing-a-distribution/mint.webp"
      alt="Cover Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=opensuse">
    <img src="/series/workflow-optimization/choosing-a-distribution/opensuse.webp"
      alt="Secret Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=redhat">
    <img src="/series/workflow-optimization/choosing-a-distribution/redhat.webp"
      alt="Merged Image" style="width:75%">
    </a>
  </div>
</div>
<div class="row" style="display:flex">
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=slackware">
    <img src="/series/workflow-optimization/choosing-a-distribution/slackware.webp"
      alt="Cover Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=ubuntu">
    <img src="/series/workflow-optimization/choosing-a-distribution/ubuntu.webp"
      alt="Secret Image" style="width:75%">
    </a>
  </div>
  <div class="column">
    <a href="https://distrowatch.com/table.php?distribution=void">
    <img src="/series/workflow-optimization/choosing-a-distribution/void.webp"
      alt="Merged Image" style="width:75%">
    </a>
  </div>
</div>

**Any of these distros meets the ["dev distro"](#selection-criteria) criteria.**
In fact, there are a number of other distros not listed here that fit the bill.
Which distro do you choose? For the purpose of this series, it's recommended you
install **Arch Linux**.

Why Arch over the others? Arch is a rolling release distro meaning you don't
have to go through an upgrade cycle every couple of months. When you update Arch
through the package manager, you have the latest version of Arch. Along with a
large and up-to-date official package repository, Arch also provides access to a
larger set of unofficial packages available through the [Arch User Repository
(AUR)][3]. Perhaps the biggest bonus you get with Arch is the documentation. The
[ArchWiki][4] is the gold standard for documentation. Even if you choose another
distro, you'll likely find yourself referencing the ArchWiki.

There are [plenty of cons][5] to using Arch. Depending on who the end user is
and what their goals are, the pros can often outweigh the cons. That's the case
when a Linux developer uses Arch. Immediate access to the latest tools is worth
any friction that may arise through updates and configuration.

## Installing Arch Linux

One downside to Arch is that installing it can be a pain. In the past, your only
option was to follow the ArchWiki's [installation guide][6] step-by-step. These
days, the Arch ISO comes prepackaged with a `archinstall` script that makes
installation much more user friendly.

The video below walks you through the process of installing Arch using the
`archinstall` script. **When you reach the section on desktop environment
selection at time mark 6:47, select the i3 desktop option.** You'll see how to
customize the desktop environment in the next series installment.

{{< youtube d5rquFPwh-Y >}}

## Closing Remarks

Don't worry if you're having a hard time with the new distro. It can be a shock
transitioning from Windows/Mac to Linux or even from one Linux distro to
another. Keep an open mind and give it some time.

At this point, you should have a complete Arch install on your PC. If you get
stuck installing or configuring something on the system, make a habit out of
consulting the ArchWiki and [Arch User Forums][7]. In the next article, you'll
explore the desktop environment, specifically the i3 window manager.

[1]: https://distrowatch.com/
[2]: https://distrowatch.com/table.php?distribution=raspios
[3]: https://aur.archlinux.org/
[4]: https://wiki.archlinux.org/
[5]: https://wiki.archlinux.org/title/Frequently_asked_questions#Why_would_I_not_want_to_use_Arch?
[6]: https://wiki.archlinux.org/title/installation_guide
[7]: https://bbs.archlinux.org/viewforum.php?id=23
