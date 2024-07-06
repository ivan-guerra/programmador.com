---
title: "Linux Kernel Development Using QEMU"
date: 2024-02-20T14:40:50-08:00
description: "How to setup a Linux kernel dev workflow using QEMU."
tags: ["linux", "qemu"]
---

This article gives an overview of how to setup a Linux kernel development
environment that leverages QEMU. Why should you bother with this setup? Here are
the highlights:

- Make changes to core kernel code or modules without the risk of loading buggy
  kernel code onto real hardware.
- Up the speed of the edit, build, run cycle while developing kernel code.
- The ability to test code across different architectures (for example, aarch64,
  x86_64, etc.).

What's QEMU? According to [Wikipedia][1]:

> QEMU (Quick Emulator) is a free and open-source emulator. It emulates a
> computer's processor through dynamic binary translation and provides a set of
> different hardware and device models for the machine, enabling it to run a
> variety of guest operating systems. It can interoperate with Kernel-based
> Virtual Machine (KVM) to run virtual machines at near-native speed. QEMU can
> also do emulation for user-level processes, allowing applications compiled for
> one architecture to run on another.

QEMU has three main [operating modes][2]:

- **User-mode Emulation**: Run a single program compiled with a different
  instruction set than that of the host machine.
- **System Emulation**: Emulate an entire computer system, including
  peripherals. This is what most people mean when they say "virtual machine."
- **Hypervisor Support**: As the name suggests, this mode has QEMU leverage a
  hypervisor (for example, Linux Kernel-based Virtual Machine or KVM). This is
  the most performant option.

This article demos hypervisor support mode. Below is an illustration showing the
intended setup:

```text
+--------------------------------------------+
| PC                                         |
|                                            |
|  +----------+                +-----------+ |
|  | Host OS  |<------SSH----->|  Guest OS | |
|  +----------+                +-----------+ |
|                                            |
+--------------------------------------------+
```

The goal is to run a guest OS on your host machine. The guest OS will run a
Linux distro of your choice along with your custom kernel. From within the
guest, you got all the comforts of a full fledged Linux system and can poke and
prod without any fear. The SSH connection makes it easy to transfer some files
to/from the guest.

## Install QEMU and OpenSSH

First, download and install QEMU and OpenSSH on the host machine.

The following install commands work on a Fedora 38 machine. **If you are using
another distro, adjust the package manager and package names!**

```bash
sudo dnf install qemu qemu-image openssh
```

## Create an Image

You'll need a virtual disk image to install the guest OS. You can create an
image using `qemu-img`:

```bash
qemu-img create -f raw <MY_IMAGE> 4G
```

You can change `4G` to whatever size in gigabytes you can afford. Worth
mentioning is the alternative `qcow2` image format. While slower than a `raw`
formatted image, the `qcow2` image size increases during VM usage. You set a
limit in gigabytes on the size of the `qcow2` image during creation.

## Install a Distro

The world is your oyster when it comes to distros. It doesn't matter what distro
you use. Arch Linux is a solid choice since a base install is pretty bare bones.
Plus, you can [tell everyone you use Arch][3]. Download the [latest ISO][4] and
follow the steps below to get started with the install.

You'll first want to load the Arch installer by telling QEMU to boot off an
emulated CD-ROM with your Arch ISO on it:

```bash
qemu-system-x86_64 \
    -enable-kvm \
    -cdrom <ARCH_ISO> \
    -boot order=d \
    -drive file=<MY_IMAGE>,format=raw \
    -m 4G
```

Lets take a moment to breakdown these options:

| Option        | Description                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `-enable-kvm` | Enable hypervisor support using the Linux KVM.                                                        |
| `-cdrom`      | Points to what image will be inserted into our emulated CD slot.                                      |
| `-boot`       | Tell QEMU we want to boot from CD-ROM.                                                                |
| `-drive`      | Specifies a drive on the system. We tell QEMU about our previously created image file and its format. |
| `-m`          | Tell QEMU the size of RAM. The more the better.                                                       |

A quick side note on KVM support. It's possible though unlikely your PC doesn't
have KVM support. If you try to run the command and QEMU complains about a lack
of KVM support try the following:

- Verify the host processor has virtualization enabled. Run `lscpu | grep
Virtualization`. If you are on an Intel machine with virtualization enabled,
  the output will be `Virtualization: VT-x`. If your output doesn't match,
  enable virtualization in the BIOS menu.
- Some distros require your user be part of a KVM group. You can add yourself to
  such a group using the command: `sudo usermod -aG kvm $USER`. Replace `kvm`
  with name of the KVM group on your system.
- Most mainstream distros ship a Linux kernel with KVM features enabled. If that
  isn't the case for you, then you may have to tweak your kernel's command line
  args or install a kernel with [`kvm_guest.config`][6] applied.

After running the `qemu-system-x86_64` command, you will see a QEMU window that
has the Arch Installer running:

![QEMU Arch Installer](/posts/2024/linux-kernel-development-using-qemu/arch-install.webp#center)

You can now go [RTFM][5] (that is, the Arch wiki installation guide). The
alternative is to use the `archinstaller` script to do the heavy lifting for
you. The following Youtube video has all the details on how to do just that (you
can skip to the `2:16` mark):

{{< youtube d5rquFPwh-Y >}}

## Building the Kernel

This section assumes you know how to build and configure a Linux kernel. There
are plenty of videos and tutorials online if you need a refresher.

Below are the commands for preparing a kernel meant to run in a QEMU VM:

```bash
make O=/my/build/dir defconfig
make O=/my/build/dir kvm_guest.config
make O=/my/build/dir nconfig # Optionally configure additional kernel params
make O=/my/build/dir -j$(nproc)
```

The only oddity is perhaps the addition of `kvm_guest.config`. Building this
config enables a number of Kernel-based Virtual Machine (KVM) options allowing
the kernel to boot as a KVM guest. Also, re-directing the output of the build
using the `O=` option to `make` isn't necessary but does keep your kernel source
tree clean.

You can cross-compile the kernel for your architecture of choice. You can then
run the appropriate `qemu-system-*` binary to emulate that architecture on the
host. However, **you can't use the KVM features across platforms**. For example,
if you're on an x86_64 host and cross compile and run a aarch64 VM, then you
can't leverage the `-enable-kvm` switch to enable KVM features. In this example,
you would have to run QEMU in system emulation mode not hypervisor mode.

## Boot the Virtual Machine

Moment of truth. Time to boot the VM. This bash script gives the QEMU
incantation:

```bash
#!/bin/bash

DISK="kernel-dev-archlinux.img"
KERNEL="/home/ieg/dev/kernel/build/arch/x86/boot/bzImage"

qemu-system-x86_64 \
    -enable-kvm \
    -drive format=raw,file=$DISK \
    -m 4G \
    -nic user,hostfwd=tcp::2222-:22 \
    -serial stdio \
    -smp 4,sockets=1,cores=2,threads=2,maxcpus=4 \
    -kernel $KERNEL \
    -append "root=/dev/sda2 console=ttyS0,115200 rw" \
    -display none
```

Once again, this is command line soup. Lets look at what each switch is doing.

| Option        | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `-enable-kvm` | Enable hypervisor support using the Linux KVM.                                                      |
| `-drive`      | Defines the virtual drive (AKA the disk image we previously created and installed our distro to).   |
| `-m`          | RAM size.                                                                                           |
| `-nic`        | Setup net options. We specify user mode and setup port forwarding for SSH.                          |
| `-serial`     | Redirect the virtual serial port. We redirect serial debug info to `stdio`.                         |
| `-smp`        | Simulate an SMP system. I used `lscpu` to pass the config of my host system but you do not have to! |
| `-kernel`     | Path to the kernel bzImage.                                                                         |
| `-append`     | This is the kernel commandline. We tell the kernel where the rootfs is and setup the console.       |
| `-display`    | Selects the type of display to use. The `none` arg makes it so no video output is displayed.        |

After running the script, you will see a VM terminal. You can verify your kernel
is running via the `uname -a` command:

![QEMU VM Boot](/posts/2024/linux-kernel-development-using-qemu/vm-boot.webp#center)

If the `uname` command prints your kernel version, you are all set! Just one
last thing left to do: setup SSH.

## SSH Setup

While you won't be developing directly on the VM, you might want to transfer a
number of files between the host and VM (for example, loadable modules). SSH and
the `scp` utility are perfect for that.

### SSH'ing as `root`

If you don't mind using the `root` account in the VM, follow these steps to
login as `root` on the VM over SSH:

1. Login to the VM as `root`.
2. Install `openssh`:

```bash
pacman -Syu openssh
```

3. Edit `/etc/ssh/sshd_config` and uncomment `PermitRootLogin yes`.
4. Stop and then enable the `sshd` service:

```bash
systemctl stop sshd
systemctl enable sshd
```

5. From the host machine, SSH to the VM:

```bash
ssh -p 2222 root@localhost
```

### SSH'ing as a User

If instead of using the `root` user you would like to login as `my_user`,
follow these steps:

1. Login to the VM as `root`. Optionally, if `my_user` has `sudo` privileges,
   login as `my_user`.
2. Install `openssh`:

```bash
pacman -Syu openssh
```

3. Enable the `sshd` service:

```bash
systemctl enable sshd
```

4. From the host machine, SSH to the VM:

```bash
ssh -p 2222 my_user@localhost
```

## Conclusion

If you do a lot of kernel development, a workflow that uses QEMU may be for you.
Using a VM makes it easier to make and deploy kernel changes when compared to
most target hardware setups. Plus, there's the added benefit that if/when you
yeet the system, you can patch your changes and just fire up a fresh VM. Also,
keep in mind that QEMU can do a lot more than what's shown here. Definitely take
a look at other QEMU tutorials and experiment a bit.

[1]: https://en.wikipedia.org/wiki/QEMU
[2]: https://en.wikipedia.org/wiki/QEMU#Operating_modes
[3]: https://knowyourmeme.com/memes/btw-i-use-arch
[4]: https://archlinux.org/download/
[5]: https://en.wikipedia.org/wiki/RTFM#:~:text=RTFM%20is%20an%20initialism%20and,forum%2C%20software%20documentation%20or%20FAQ.
[6]: https://github.com/torvalds/linux/blob/master/kernel/configs/kvm_guest.config
