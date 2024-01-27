---
title: "Building and Deploying a Real-time Kernel to the Beaglebone Black"
date: 2023-04-22T11:13:34-07:00
description: "How to build and deploy a real-time Linux kernel to the BeagleBone
Black."
tags: ["beaglebone", "docker", "realtime"]
---

Recently, I wanted to develop a low latency app running on my BeagleBone Black
(BBB)[^1]. My application had timing requirements that are strict enough to
where it made sense to run the BBB with a `PREEMPT_RT`[^2] kernel. Luckily for
me, Robert C. Nelson, one of the BeagleBone Black maintainers, maintains a set
of scripts for building a kernel specifically for BBB devices[^3]. Among the
many kernel versions offered are variants that have had the `PREEMPT_RT` patches
already applied! With Robert's build scripts and SD card in hand, I setoff to
build and deploy my RT kernel for the BBB.

## Prepping the SD Card

First things first, I needed to flash the latest BBB Debian image[^4] onto my SD
card. I typically go for the latest Debian Console Image though the IoT image
will work just as well:
```bash
wget https://debian.beagleboard.org/images/bone-debian-10.3-console-armhf-2020-04-06-1gb.img.xz
```

Unarchive the `*.img` file:
```bash
xz -d *.xz
```

Finally, write the `*.img` to the SD card. **Before running the command below,
triple check that you have the right device name for the SD card!**
```bash
sudo dd if=*.img of=/dev/sdb
```

After mounting the first partition of the SD card, in my case `/dev/sdb1`, an
`ls` command revealed the newly minted rootfs!

## Building the Kernel Installer Files

As mentioned previously, Robert's [`ti-linux-kernel-dev`][3] project lets us
build a kernel with the RT patches applied. The output of a build is a
collection of `*.deb` files that can be transferred to and installed on the BBB
using the `dpkg` utility.

Robert's scripts require that the host system have a number of libs and
utilities installed in order to build the kernel. To ease the process, I created
the [`bbb_kernel_builder`][5][^5] project that launches a docker container which
runs the build scripts on your behalf. You'll be prompted to configure the
kernel, but, beyond that, the process is hands off. When the container run
completes, the `*.deb` kernel packages are copied to the host (see the
[`README`][6] for details).

In the future, I'll write a post about how to configure a kernel for real-time.
For now, I highly recommend anyone reading watch John Ogness's "A Checklist for
Writing Real-Time Linux Applications" and skip to the section on kernel
configuration:

{{< youtube NrjXEaTSyrw >}}

## Installing the Kernel On the BBB

Now, all that remains is installing the kernel on the BBB.

First, we mount the [rootfs we previously created](#prepping-the-sd-card) onto
the host filesystem. In my case the rootfs on the SD card has the label
`/dev/sdb1`. Your SD card may have a different name, use `mount` or `lsblk` to
find the right device.
```bash
sudo mount /dev/sdb1 /mnt/sd
```

We can just copy the `*.deb` files to some known location on the rootfs. I like
to just use the `root` user's home directory: `/root`. If you used the
`bbb_kernel_builder` project to build your kernel, the debs will be under
`bbb_kernel_builder/bin`.
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
bit indicates that we are running a fully preemptible kernel!

```text
Linux beaglebone 5.10.162-ti-rt-r59 #1xross SMP PREEMPT_RT ...
```

## Conclusion

Depending on the requirements of the application you are developing, you may
find a real-time kernel is necessary. Linux provides soft real-time capabilities
in the form of the `PREEMPT_RT` kernel patches. Building and deploying a kernel
for the BBB from scratch is a nontrivial task. Luckily, BBB maintainers have
made it easy for us by providing `PREEMPT_RT` patched kernel sources and
scripts for building custom kernel install files. Do keep in mind that
there's more to setting up an RT linux application than just installing a
patched kernel. In a follow-on article, I'll get into the details of how to
configure the system and application for ideal RT performance.

[1]: https://beagleboard.org/black
[2]: https://www.linuxfoundation.org/blog/blog/intro-to-real-time-linux-for-embedded-developers
[3]: https://github.com/RobertCNelson/ti-linux-kernel-dev/tree/5.10.162-ti-rt-r59
[4]: https://beagleboard.org/latest-images
[5]: https://github.com/ivan-guerra/bbb_kernel_builder
[6]: https://github.com/ivan-guerra/bbb_kernel_builder/blob/master/README.md

[^1]: The [BeagleBone Black][1] is a low-cost, community-supported development
    platform for developers and hobbyists.
[^2]: ["Intro to Real-Time Linux for Embedded Developers"][2] gives a nice
    overview of what the `PREEMPT_RT` patches bring to the table.
[^3]: Checkout Robert Nelson's [`ti-linux-kernel-dev`][3] project on GitHub.
[^4]: Go to the [BeagleBoard][4] site to download the latest Debian image.
[^5]: Checkout the [`bbb_kernel_builder`][5] project on GitHub. This project may
    save you time when using the `ti-linux-kernel-dev` projects' scripts since
    you won't have to hunt for missing build dependencies.
