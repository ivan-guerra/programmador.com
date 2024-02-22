---
title: "Linux Kernel Development Using QEMU"
date: 2024-02-20T14:40:50-08:00
description: "How to setup a Linux kernel dev workflow using QEMU."
tags: ["linux", "qemu"]
---

This article gives an overview of how to setup a Linux kernel development
environment that leverages QEMU. Why bother with this setup? There are plenty of
reasons, but here are my top three:

* Make changes to core kernel code or modules without the risk of loading buggy
  kernel code onto real hardware.
* Up the speed of the edit, build, run cycle while developing kernel code.
* The ability to test code across different architectures (e.g., aarch64,
  x86_64, etc.).

What is QEMU? According to Wikipedia[^1]:

> QEMU (Quick Emulator) is a free and open-source emulator. It emulates a
> computer's processor through dynamic binary translation and provides a set of
> different hardware and device models for the machine, enabling it to run a
> variety of guest operating systems. It can interoperate with Kernel-based
> Virtual Machine (KVM) to run virtual machines at near-native speed. QEMU can
> also do emulation for user-level processes, allowing applications compiled for
> one architecture to run on another.

QEMU has three main operating modes[^2]:

* **User-mode Emulation**: Allows one to run a single program that was compiled
  with a different instruction set than that of the host machine.
* **System Emulation**: Emulates an entire computer system, including
  peripherals. This is what most people mean when they say "virtual machine".
* **Hypervisor Support**: As the name suggests, this mode has QEMU leverage a
  hypervisor (e.g., Linux Kernel-based Virtual Machine or KVM). This is the most
  performant option.

We'll be using the hypervisor support mode. Below is an illustration showing the
intended setup:

![VM Setup](/posts/linux-kernel-development-using-qemu/vm-setup.png#center)

We want to run a guest OS on our host machine. The guest OS will run a Linux
distro of our choice along with our custom kernel. From within the guest, we got
all the comforts of a full fledged Linux system and can poke and prod without
any fear. We establish an SSH connection just to make our lives easier in case
we want to transfer some files to/from the guest.

## Install QEMU and OpenSSH

First, we need to download and install QEMU and OpenSSH on the host machine.

The following install commands are meant for and were tested on a Fedora 38
machine. **If you are using another distro, adjust the package manager and
package names!**

```bash
sudo dnf install qemu qemu-image openssh
```

## Create an Image

We'll need a virtual disk image in order to install our guest OS. We can create
an image using `qemu-img`:

```bash
qemu-img create -f raw <MY_IMAGE> 4G
```

You can change `4G` to whatever size in gigabytes you can afford. Worth
mentioning is the alternative `qcow2` image format. At the price of being a
little bit slower than a `raw` formatted image, the `qcow2` format allows the
image size to increase during VM usage setting a limit of as many gigabytes were
specified at creation.

## Install a Distro 

The world is your oyster when it comes to distros. It doesn't really matter what
distro you use. I recommend Arch Linux since a base install is pretty barebones.
Plus, you can tell everyone you use Arch[^3]. Download the [latest ISO][4] and
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
|---------------|-------------------------------------------------------------------------------------------------------|
| `-enable-kvm` | Enable hypervisor support using the Linux KVM.                                                        | 
| `-cdrom`      | Points to what image will be inserted into our emulated CD slot.                                      |
| `-boot`       | Tell QEMU we want to boot from CD-ROM.                                                                |
| `-drive`      | Specifies a drive on the system. We tell QEMU about our previously created image file and its format. |
| `-m`          | Tell QEMU the size of RAM. The more the better.                                                       |

A quick sidenote on KVM support. It's possible though very unlikely your PC does
not have KVM support. If you try to run the above command and QEMU complains
about a lack of KVM support try the following:

* Check that virtualization is enabled on the host processor. Run `lscpu | grep
  Virtualization`. If you are on an Intel machine with virtualization enabled,
  the output will be `Virtualization: VT-x`. If your output does not match,
  enable virtualization in the BIOS menu.
* Some distros require your user be part of a KVM group. You can add yourself to
  such a group using the command: `sudo usermod -aG kvm $USER`. Replace `kvm`
  with name of the KVM group on your system.
* Most mainstream distros ship a Linux kernel with KVM features enabled. If that
  is not the case for you, then you may have to tweak your kernel's commandline
  args or install a kernel with `kvm_guest.config`[^5] applied.

After running the `qemu-system-x86_64` command above, you will be met with a
QEMU window that has the Arch Installer running:

![QEMU Arch Installer](/posts/linux-kernel-development-using-qemu/arch-install.png#center)

If I was one of those RTFM[^4] guys, I'd tell you to go checkout the Arch wiki's
installation guide. Since you're not really setting up an Arch environment for
personal usage, I think it's best to take some shortcuts and use the
`archinstaller` script to do the heavy lifting for you. The following YouTube
video has all the details on how to do just that (you can skip to the `2:16`
mark):

{{< youtube d5rquFPwh-Y >}}

## Building the Kernel 

If you are following this guide, I assume you know how to build and configure a
Linux kernel so I won't bore you with too many details in this section. 

Below are the commands that I use to prep a kernel meant to run in a QEMU VM:

```bash
make O=/my/build/dir defconfig
make O=/my/build/dir kvm_guest.config
make O=/my/build/dir nconfig # Optionally configure additional kernel params
make O=/my/build/dir -j$(nproc)
```

The only oddity is perhaps the addition of the `kvm_guest.config`[^5]. Building
this config enables a number of Kernel-based Virtual Machine (KVM) options
allowing the kernel to boot as a KVM guest. Also, re-directing the output of the
build using the `O=` option to `make` is not strictly necessary but I do find it
handy to not muck up my kernel source tree.

As was alluded to in the intro, you can cross-compile the kernel for your
architecture of choice. You can then run the appropriate `qemu-system-*` binary
to emulate that architecture on the host. However, **you cannot use the KVM
features across platforms**. For example, if I am on an x86_64 host and cross
compile and run a aarch64 kernel using QEMU, then I cannot leverage the
`-enable-kvm` switch to enable KVM features. In this example, you would have to
run QEMU in system emulation mode not hypervisor mode.

## Boot the VM

Moment of truth. Time to boot the VM. I wrote a simple bash script to capture
the QEMU incantation:

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

Once again, this is command-line soup. Lets look at what each switch is doing.

| Option        | Description                                                                                         |
|---------------|-----------------------------------------------------------------------------------------------------|
| `-enable-kvm` | Enable hypervisor support using the Linux KVM.                                                      |
| `-drive`      | Defines the virtual drive (AKA the disk image we previously created and installed our distro to).   |
| `-m`          | RAM size.                                                                                           |
| `-nic`        | Setup net options. We specify user mode and setup port forwarding for SSH.                          |
| `-serial`     | Redirect the virtual serial port. We redirect serial debug info to `stdio`.                         |
| `-smp`        | Simulate an SMP system. I used `lscpu` to pass the config of my host system but you do not have to! |
| `-kernel`     | Path to the kernel bzImage.                                                                         |
| `-append`     | This is the kernel commandline. We tell the kernel where the rootfs is and setup the console.       |
| `-display`    | Selects the type of display to use. The `none` arg makes it so no video output is displayed.        |

After running the script, you should be dropped into a VM terminal. You can
verify your kernel is running via the `uname -a` command:

![QEMU VM Boot](/posts/linux-kernel-development-using-qemu/vm-boot.png#center)

If the `uname` command prints your kernel version, you are all set! Just one
last thing left to do: setup SSH.

## SSH Setup

While you won't be developing directly on the VM, you might want to transfer a
number of files between the host and VM (e.g., loadable modules). SSH and the
`scp` utility are perfect for that.

### SSH'ing as `root`

I personally don't mind using the `root` account in the VM. If you feel the same
way, you can follow these steps to login as `root` on the VM over SSH:

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
I personally find it much easier to make and deploy kernel changes when using a
VM versus most target hardware that I've worked with. Plus, there's the added
benefit that if I yeet the system, I can patch my changes and just fire up a
fresh VM. Also, keep in mind that QEMU can do a lot more than what I've shown
here. Definitely take a look at other QEMU tutorials and experiment a bit to see
if this workflow makes sense for you.


[1]: https://en.wikipedia.org/wiki/QEMU
[2]: https://en.wikipedia.org/wiki/QEMU#Operating_modes
[3]: https://knowyourmeme.com/memes/btw-i-use-arch
[4]: https://archlinux.org/download/
[5]: https://en.wikipedia.org/wiki/RTFM#:~:text=RTFM%20is%20an%20initialism%20and,forum%2C%20software%20documentation%20or%20FAQ.
[6]: https://github.com/torvalds/linux/blob/master/kernel/configs/kvm_guest.config

[^1]: [Wikipedia: QEMU][1]
[^2]: [Wikipedia: QEMU - Operating Modes][2]
[^3]: Time for some sick [Arch Memes][3].
[^4]: [Wikipedia: RTFM][5]
[^5]: [`kvm_guest.config`][6]
