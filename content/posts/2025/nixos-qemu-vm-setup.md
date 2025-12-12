---
title: "NixOS QEMU VM Setup"
date: 2025-12-12T13:57:09-05:00
description: "How to setup NixOS in a QEMU VM."
categories: ["projects"]
tags: ["nixos"]
---

This article will walk you through the process of running NixOS in a QEMU
virtual machine (VM) on a Linux host system. Basic nix configuration to help
with connectivity to the VM from the host is also included. 

This article assumes you're on a Arch Linux host system. Instructions may vary
with regards to package installation on other distros, but the rest of the steps
should be largely identical. Additionally, your machine must support
virtualization and have it enabled in the BIOS/UEFI settings.

## Installing QEMU and QEMU Utilities

You'll need the QEMU emulator package for your host architecture along with the
`qemu-img` utility to create disk images. On Arch Linux, you can install these
packages in a single command:

```bash
sudo pacman -S qemu-full
```

Verify the installation by running:

```bash
qemu-system-x86_64 --version
qemu-img --version
```

> **Tip**: `qemu-full` is a large package that includes support for multiple
> architectures. If you want to save space, you can install only the emulator
> for your host architecture (for example, `qemu-system-x86_64` for x86_64
> hosts). If you go this route, remember to additionally install the `qemu-img`
> package.

## Downloading the NixOS ISO

You can download the latest NixOS ISO from the [NixOS download page][1]. For a
first time user, it's best to download a "Graphical ISO image". Graphical
installation ISOs contain a desktop environment with an installation wizard.

## Installing NixOS to a Virtual Disk

Create a disk image for your NixOS VM. The following command creates a 30GB
QCOW2 image.

```bash
qemu-img create -f qcow2 nixos-vm.qcow2 30G
```

The base installation comfortably fits within 10GB. That said, give yourself at
least another 20GB for app installs.

Create a bash script in the same directory as your QCOW2 image called
`start-nixos-vm.sh`. Add the following content to boot the NixOS installation
ISO:

```bash
#!/bin/bash

qemu-system-x86_64 \
    -m 6144 \
    -smp 3 \
    -drive file=nixos-vm.qcow2,format=qcow2 \
    -cdrom /path/to/nixos-graphical-25.11.941.c97c47f2bac4-x86_64-linux.iso \
    -boot d \
    -net nic \
    -net user,hostfwd=tcp::2222-:22 \
    -enable-kvm
```

You may want to adjust the following parameters based on your system and
preferences:

| Option                                      | Description                                                      |
|---------------------------------------------|------------------------------------------------------------------|
| `-m 6144`                                   | Allocates 6GB of RAM to the VM.                                  |
| `-smp 3`                                    | Allocates 3 CPU cores to the VM.                                 |
| `-cdrom <ISO_PATH>`                         | Path to the NixOS ISO downloaded earlier.                        |
| `-enable-kvm`                               | Optional feature for better performance. See the Arch Wiki's [KVM][2] article for more information. |

Run the `start-nixos-vm.sh` script to boot into the installation ISO. The
install wizard should launch automatically. Follow the on-screen instructions to
complete the installation. Once done, shut down the VM.

## Booting into NixOS

Modify the `start-nixos-vm.sh` script to boot from the virtual disk instead of
the installation ISO. Update the script as follows:

```bash
#!/usr/bin/env bash

qemu-system-x86_64 \
    -m 6144 \
    -smp 3 \
    -drive file=nixos.qcow2,format=qcow2 \
    -net nic \
    -net user,hostfwd=tcp::2222-:22 \
    -enable-kvm
```

**Remember to adjust the `-m` and `-smp` values as needed.**

Running the script once more should boot you into your newly installed NixOS VM.
From here, you can begin your NixOS journey from the comfort of a virtual
machine.

## Bonus: SSH Access

With the `-net user,hostfwd=tcp::2222-:22` option in the QEMU command, you can
SSH into your NixOS VM from the host machine. But first, you'll need to enable
SSH in your `configuration.nix`. Follow these steps to connect via SSH:

1. Run your NixOS VM.
2. Edit your nix config: 

```bash
sudo nano /etc/nixos/configuration.nix`.
```

3. Uncomment or add the line `services.openssh.enable = true;`.
4. Rebuild your NixOS configuration: 

```bash
sudo nixos-rebuild switch`.
```

5. On the host machine, run the following command replacing `<USERNAME>` with
   your NixOS username:

```bash
ssh -p 2222 <USERNAME>@localhost
```

[1]: https://nixos.org/download/
[2]: https://wiki.archlinux.org/title/KVM
