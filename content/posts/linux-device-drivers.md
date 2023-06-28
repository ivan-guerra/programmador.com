---
title: "Docker Assisted Driver Dev and LDD3"
date: 2022-09-18T20:44:17-07:00
image: "/posts/linux-device-drivers/ldd.jpg"
alt: "RTFM Hackles"
description: "Creating a containerized Linux dev environment with working LDD3 modules."
tags: ["linux", "docker", "device-drivers"]
comments: true
---

## Motivation

Recently, I wanted to learn more about Linux kernel internals. Like most newbies
who don't have a particular subsystem in mind, I gravitated towards learning
about how to write Linux device drivers. Surprisingly, most people recommended
Linux Device Drivers 3rd Edition[^1] (LDD3) even though its most recent update
was back in 2009! After some thorough Googling, I settled on giving LDD3 a shot.
I knew there would be some challenges in working with the sample code given that
the kernel version used in the book was `2.6.10` and at the time the kernel was
at version `5.19`! I figured understanding and fixing API deltas would postively
add to the challenge. And so began my month long journey into Linux device
drivers.

## Containerizing the Kernel Dev Environment

When it comes to setting up a Linux kernel dev environment, you get a couple of
options:

1. Develop and test the dev kernel on a single dev machine (can be risky).
2. Develop on a dev machine and test the dev kernel on some target hardware.
3. Develop on a dev machine and test the dev kernel within an emulator such as
   QEMU[^2].

I went with option #3 with a twist: I wanted to configure and build the kernel
and required initramfs from within a container. I like the idea that my kernel
and dev environment is roughly portable to any x86_64 PC running Docker. Plus,
if I came back at a later date and say wanted to build a different kernel
    version, I wouldn't have to re-educate myself on the required build
    dependencies, script calls, etc.

What did the containerization of the initramfs and kernel build process look
like? Well, I split the task into three seperate images:

* A common base image.
* A kernel build image.
* A initramfs build image.

Each image feeds into the next with the result being a kernel `bzImage` and
initramfs `initramfs-busybox-x86.cpio.gz` archive that can be fed straight into
QEMU.

### A Common Base Image

There was a lot of overlap in the tools required to build the initramfs and the
kernel. As a result, I created a common image[^3] built off the latest Debian
slim release. I also introduce ccache[^4] in this image which helps reduce
kernel build times significantly[^5].

### The Kernel Build Image

The kernel build image Dockerfile[^6] is straightforward. The magic happens in
the `kbuild.sh` script (shown below) which executes whenever a kernel build
container is launched. `kbuild.sh` carries out the following three tasks:

1. Prompting the User to configure their kernel.
2. Building the kernel.
3. Building the LDD3 modules.

```bash
#!/bin/bash

# kbuild.sh runs the series of command needed to configure and build the kernel
# and any custom drivers in MODULE_SRC_DIR.

ConfigKernel()
{
    pushd $KERNEL_SRC_DIR
        make O=$KERNEL_OBJ_DIR x86_64_defconfig &&\
        make O=$KERNEL_OBJ_DIR kvm_guest.config &&\
        make O=$KERNEL_OBJ_DIR nconfig
    popd
}

BuildKernel()
{
    pushd $KERNEL_SRC_DIR
        make O=$KERNEL_OBJ_DIR -j$(nproc)
    popd
}

BuildModules()
{
    pushd $MODULE_SRC_DIR
        make O=$KERNEL_OBJ_DIR -j$(nproc) all
    popd
}

Main()
{
    read -p "Build kernel? [y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        if [ ! -f "${KERNEL_OBJ_DIR}/.config" ]
        then
            # Missing kernel config, create one.
            ConfigKernel
        else
            # A .config already exists. Prompt the User in case they want to
            # create a new config with this build.
            read -p "Do you want to generate a new kernel .config? [y/n] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]
            then
                ConfigKernel
            fi
        fi
        BuildKernel
    fi

    read -p "Build modules (assumes existing kernel build)? [y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        BuildModules
    fi
}

Main
```

You might notice, there's a lot of environment variables being referenced.
Where are they defined? The environment variables are passed to the container as
arguments. The variables each point to binary or source directories on the host
system. Those binary/source directories are also mounted as volumes[^7] in the
container. We want to keep those binary directories on the host otherwise we
would be building the kernel and modules from scratch everytime we run a new
build container!

### The initramfs Build Image

As part of running our kernel, we need to hand QEMU a initramfs with a basic
userland. Creating the initramfs breaks down into a five step process:

1. Generate basic userland utilities using a tool like busybox[^8].
2. Create the skeleton of the rootfs.
3. Copy over your utilities from (1) into (2).
4. Copy over the `init` script and custom module kobjects into (2).
5. Use `cpio` to package the filesystem up.

The initramfs Dockerfile[^9] implements the above steps. The output of running
the initramfs container is a `initramfs-busybox-x86.cpio.gz`.

## Custom Kernel Modules in QEMU

With my bzImage and initramfs archive in hand, I was ready to boot my kernel.
The `run.sh`[^10] script shows the QEMU incantation needed to boot the system
and get dropped into a terminal at the root:

```bash
qemu-system-x86_64 \
    -kernel "${LDD3_BIN_DIR}/bzImage" \
    -initrd "${LDD3_BIN_DIR}/initramfs-busybox-x86.cpio.gz" \
    -nographic \
    -append "console=ttyS0,115200" \
    -enable-kvm
```

All LDD3 module kobjects are located under the `/modules` directory. I wrote
load/unload scripts for most of the modules. I didn't have any issues following
along with the book when fiddling with the `/proc` filesystem or viewing kernel
log messages through `dmesg`.

With the ability to build modules and test them out in the emulator, I was ready
to dive into LDD3...

## The LDD3 Experience

I'd say LDD3 was a pleasant read given the subject matter. You'll get the most
out of this book if you come in with a solid grasp of the C programming
language, moderate knowledge of Linux development, and, perhaps most important,
good operating systems fundamentals[^11].

A strong selling point of this book is that you don't need actual hardware to
follow along. Throughout the book, you develop different types of Simple
Character Utility for Loading Localities (`scull`) device drivers.  The `scull`
drivers manage an in memory device which removes the need for any specific
hardware. Each `scull` version illustrates a new driver programming concept.

One of the surprisingly fun parts of working through LDD3 was resolving issues
in the sample code. The sample code was written and tested on the `2.6.10`
kernel. As part of this project, I wanted to target a more recent kernel
release: `5.19`. The choice of using a more modern kernel broke a few of the
drivers. This forced me to navigate the kernel source code and the LWN archives
in search of answers which often times led me to interesting discussions
regarding kernel design decisions.

[![Kernel Oops](/posts/linux-device-drivers/kernel_oops.png)][14]

Among the many demystifying chapters in this book, I really enjoyed Chapter 4:
*Debugging Techniques*. As the title suggests, the authors walk you through a
number of driver debug techniques ranging from looking at system log messages to
firing up a kernel debugger. They even talk about how to decode the dreaded
kernel oops[^12] messages!

I thought it was crazy that it was possible to virtually debug kernel code using
a tool like GDB just as you would a userland program. I had to add support for
debugging to my own project. The short of it is, given a kernel built with the
right debug info configurations, you can attach a GDB session to the QEMU
VM[^13] and break, step, etc. through driver/kernel code[^14]! While it wasn't
absolutely necessary for working through LDD3, the debugger did come in handy on
a few occassions making it worth the effort to learn how to set it up.

## Conclusion

I'll conclude that LDD3 holds up in 2022. Sure the sample code needs some
tweaking and a couple of the later chapters may be a bit dated. That said, the
core concepts of the book remain relevant. I enjoyed developing containers to
streamline my kernel, module, and initramfs builds. I especially enjoyed not
having to buy any hardware to follow along with the examples in the text. 10/10
would recommend LDD3 in 2022!

You can find the complete project source with build instructions, usage, etc.
on my GitHub page: [linux_device_drivers][16].

[1]: https://lwn.net/Kernel/LDD3/
[2]: https://lwn.net/Archives/
[3]: https://www.qemu.org/
[4]: https://github.com/ivan-guerra/linux_device_drivers/blob/master/docker/common/Dockerfile
[5]: https://ccache.dev/
[6]: https://nickdesaulniers.github.io/blog/2018/06/02/speeding-up-linux-kernel-builds-with-ccache/
[7]: https://busybox.net/
[8]: https://github.com/ivan-guerra/linux_device_drivers/blob/master/docker/initramfs/Dockerfile
[9]: https://github.com/ivan-guerra/linux_device_drivers/blob/master/scripts/build.sh
[10]: https://github.com/ivan-guerra/linux_device_drivers/blob/master/docker/kernel/Dockerfile
[11]: https://docs.docker.com/storage/volumes/
[12]: https://github.com/ivan-guerra/linux_device_drivers/blob/master/scripts/run.sh
[13]: https://pages.cs.wisc.edu/~remzi/OSTEP/
[14]: https://www.linuxjournal.com/content/oops-debugging-kernel-panics-0
[15]: https://www.starlab.io/blog/using-gdb-to-debug-the-linux-kernel
[16]: https://github.com/ivan-guerra/linux_device_drivers
[17]: https://en.wikipedia.org/wiki/Linux_kernel_oops

[^1]: View the [Linux Device Drivers Third Edition][1] text on the web or
    download the PDF.
[^2]: See the [QEMU][3] project page.
[^3]: [Dockerfile][4] of the kernel/initramfs build images.
[^4]: See the [ccache][5] project page.
[^5]: [Speeding Up Linux Kernel Builds With ccache][6]
[^6]: [Dockerfile][10] of the kernel build image.
[^7]: See Docker's [Volumes][11] docs for the full details on volumes in Docker.
[^8]: See the [busybox][7] project page.
[^9]: [Dockerfile][8] of the initramfs build image.
[^10]: [`runs.sh`][12]
[^11]: [OSTEP][13] is great resource to refresh yourself on OS theory.
[^12]: [Linux kernel oops][17]
[^13]: You can find more details in the "GDB Support" section of the project
    [README][16].
[^14]: [StarLabs][15] gives a great guide on how setup a kernel debug session.
