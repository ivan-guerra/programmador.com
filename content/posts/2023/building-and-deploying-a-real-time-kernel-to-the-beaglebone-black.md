---
title: "Building and Deploying a Real-time Kernel to the Beaglebone Black"
date: 2023-04-22T11:13:34-07:00
description: "How to build and deploy a real-time Linux kernel to the BeagleBone
Black."
tags: ["beaglebone", "docker", "realtime"]
---

Not long ago, a project that involved a low latency app running on a [Beaglebone
Black (BBB)][1] came up at work. The minimal latency requirement drove the
decision to run the BBB with a [`PREEMPT_RT`][2] patched kernel. Luckily, Robert
C. Nelson, one of the Beaglebone Black maintainers, maintains a set of scripts
for building a kernel specifically for the BBB. Among the many kernel versions
offered are variants that have had the `PREEMPT_RT` patches already applied! The
goal is simple: flash the BBB with the latest console image rootfs and Linux
kernel (RT patches included).

## Prepping the SD Card

First things first, flash the [latest][4] BBB Debian image onto an SD card. The
latest Debian Console Image is the best choice unless there is a solid reason to
use the much larger IoT image:

```bash
wget https://debian.beagleboard.org/images/bone-debian-10.3-console-armhf-2020-04-06-1gb.img.xz
```

Unarchive the `*.img` file:

```bash
xz -d *.xz
```

Finally, write the `*.img` to the SD card. **Before running the command below,
triple check that you have the right device name for the SD card! Run `lsblk` to
discover the SD card devname or check the `dmesg` logs.**

```bash
sudo dd if=*.img of=/dev/sdb
```

## Building the Kernel Installer Files

As mentioned previously, Robert's [`ti-linux-kernel-dev`][3] project lets one
build a kernel with the RT patches applied. The output of a build is a
collection of `*.deb` files that you transfer to the BBB. You install the
packages on the BBB using `dpkg`.

Robert's scripts require that the host system have a number of libraries and
utilities installed in order for the kernel build to succeed. To ease the
process, I created the [`bbb_kernel_builder`][5] project that launches a
docker container which runs the build scripts on your behalf. The docker
container will prompt you to configure the kernel, but, beyond that, the process
is hands off. A successful container run copies `*.deb` kernel packages to the
host PC (see the [`README`][6] for details).

A future post will discuss the details of configuring a kernel for real-time.
For now, watch John Ogness's "A Checklist for Writing Real-Time Linux
Applications" and skip to the section on kernel configuration:

{{< youtube NrjXEaTSyrw >}}

## Installing the Kernel On the BBB

Now, all that remains is installing the kernel on the BBB.

First, mount the [rootfs previously created](#prepping-the-sd-card) onto the
host filesystem. Following the previous example, the rootfs on the SD card has
the label `/dev/sdb1`. Your SD card may have a different name, use `lsblk` to
find the right device.

```bash
sudo mount /dev/sdb1 /mnt/sd
```

Copy the `*.deb` files to some known location on the rootfs. For example, the
`root` user's home directory: `/root`. If you used the `bbb_kernel_builder`
project to build your kernel, the debs will be under `bbb_kernel_builder/bin`.

```bash
sudo cp bbb_kernel_builder/bin/*.deb /mnt/sd/root
```

Unmount the SD card.

```bash
sudo umount /mnt/sd
```

Boot the BBB off the SD card and login as root. Install the kernel.

```bash
dpkg -i /root/*.deb
```

Reboot the BBB off the SD card. Verify your kernel is live by running `uname
-a`. You should see output similar to that shown below. Note the `PREEMPT_RT`
bit indicates that you have a fully preemptible kernel!

```text
Linux beaglebone 5.10.162-ti-rt-r59 #1xross SMP PREEMPT_RT ...
```

## Conclusion

Depending on the requirements of the application you are developing, you may
find a real-time kernel is necessary. Linux provides soft real-time capabilities
in the form of the `PREEMPT_RT` kernel patches. Building and deploying a kernel
for the BBB from scratch is a nontrivial task. Luckily, BBB maintainers have
made it easier by providing `PREEMPT_RT` patched kernel sources and scripts for
building custom kernel install files. Do keep in mind that there's more to
setting up an RT Linux application than just installing a patched kernel. A
follow-on article will dive into the details of how to configure the system and
application for ideal RT performance.

[1]: https://beagleboard.org/black
[2]: https://www.linuxfoundation.org/blog/blog/intro-to-real-time-linux-for-embedded-developers
[3]: https://github.com/RobertCNelson/ti-linux-kernel-dev/tree/5.10.162-ti-rt-r59
[4]: https://beagleboard.org/latest-images
[5]: https://github.com/ivan-guerra/bbb_kernel_builder
[6]: https://github.com/ivan-guerra/bbb_kernel_builder/blob/master/README.md
