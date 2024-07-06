---
title: "Docker Assisted Driver Dev and LDD3"
date: 2022-09-18T20:44:17-07:00
description: "Creating a containerized Linux dev environment with working LDD3 modules."
tags: ["docker", "linux"]
---

Where does a newbie start their journey into the Linux kernel? Device drivers is
the most common answer. Despite its age, [Linux Device Drivers 3rd Edition][1]
(LDD3) remains one of the best options for learning about device drivers. There
are challenges in using such an old text. LDD3's code examples target the
`2.6.10` kernel. At the time of this writing, the kernel is at version `5.19`!
That said, fixing API deltas just adds to the fun. This article talks about
setting up an environment for LDD3 experimentation and the LDD3 experience
itself.

## Containerizing the Kernel Dev Environment

Step one, you need a kernel development environment. When it comes to setting up
a Linux kernel dev environment, you get a couple of options:

1. Develop and test the dev kernel on a single dev machine (can be risky).
2. Develop on a dev machine and test the dev kernel on some target hardware.
3. Develop on a dev machine and test the dev kernel within an emulator such as
   [QEMU][3].

For LDD3 development, option #3 is the best choice. This project adds the twist
of containerizing the toolchain using Docker. Containerization has the added
advantage of allowing you to reliably replicate and share your build
environment.

What does the containerization of the initramfs and kernel build process look
like? You can split the task into three separate images:

- A common base image.
- A kernel build image.
- A initramfs build image.

Each image feeds into the next with the result being a kernel `bzImage` and
initramfs `initramfs-busybox-x86.cpio.gz` archive that work directly with QEMU.

### A Common Base Image

There is a lot of overlap in the tools required to build the initramfs and the
kernel. A [common image][4] built off the latest Debian slim release acts as a
base for the other images. The common image also includes [ccache][5] which
helps reduce kernel build times [significantly][6].

### The Kernel Build Image

The kernel build [Dockerfile][10] is straightforward. The magic happens in the
`kbuild.sh` script (shown below) which executes whenever a kernel build
container launches. `kbuild.sh` carries out the following three tasks:

1. Prompt the User to configure their kernel
2. Build the kernel
3. Build the LDD3 modules

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

You might notice there are a lot of environment variables. Where are they
defined? The environment variables are arguments to the container. The variables
each point to binary or source directories on the host system. Those
binary/source directories are also mounted as [volumes][11] in the container.
You want to keep those binary directories on the host otherwise you'd be
building the kernel and modules from scratch every time!

### The initramfs Build Image

QEMU a requires an initramfs with a basic userland. Creating the initramfs
breaks down into a five step process:

1. Generate basic userland utilities using a tool like [busybox][7].
2. Create the skeleton of the rootfs.
3. Copy over your utilities from (1) into (2).
4. Copy over the `init` script and custom module kobjects into (2).
5. Use `cpio` to package the filesystem up.

The initramfs [Dockerfile][8] implements the steps. The output of running
the initramfs container is a `initramfs-busybox-x86.cpio.gz`.

## Custom Kernel Modules In QEMU

With the bzImage and initramfs archive in hand, you are ready to boot the
kernel. The [`run.sh`][12] script shows the QEMU incantation needed to boot the
system and get dropped into a terminal at the root:

```bash
qemu-system-x86_64 \
    -kernel "${LDD3_BIN_DIR}/bzImage" \
    -initrd "${LDD3_BIN_DIR}/initramfs-busybox-x86.cpio.gz" \
    -nographic \
    -append "console=ttyS0,115200" \
    -enable-kvm
```

All LDD3 module kobjects are under the `/modules` directory. Load/unload scripts
exist for most modules. You won't have any issues following along with the book
when fiddling with the `/proc` filesystem or viewing kernel log messages through
`dmesg`.

With the ability to build modules and test them out in the emulator, you are
ready to dive into LDD3.

## The LDD3 Experience

LDD3 is a pleasant read given the subject matter. You'll get the most out of
this book if you come in with a solid grasp of the C programming language.
Moderate knowledge of Linux development and good [operating systems
fundamentals][13] are critical.

A strong selling point of this book is that you don't need actual hardware to
follow along. Throughout the book, you develop different types of Simple
Character Utility for Loading Localities (`scull`) device drivers. The `scull`
drivers manage an in memory device which removes the need for any specific
hardware. Each `scull` version illustrates a new driver programming concept.

One of the fun parts of working through LDD3 was resolving issues in the example
code. The examples run without modification on the `2.6.10` kernel. This project
targets a more recent kernel release: `5.19`. The choice of using a more modern
kernel breaks a few of the drivers. This forces you to navigate the kernel
source code and the LWN archives in search of answers which often times leads to
interesting threads regarding kernel design decisions.

Among the many demystifying chapters in this book, Chapter 4 stands out:
_Debugging Techniques_. As the title suggests, the authors walk you through a
number of driver debug techniques ranging from looking at system log messages to
firing up a kernel debugger. They even talk about how to decode the dreaded
[kernel oops][16] messages:

[![Kernel Oops](/posts/2022/linux-device-drivers/kernel_oops.webp#center)][14]

The ability to debug kernel code using a tool like GDB just as you would a
userland program feels like magic. The project includes support for debugging
the kernel and modules using GDB. Given a kernel built with the right debug
configurations, you can attach a GDB session to the [QEMU VM][15] and break,
step, etc. through driver/kernel code! It isn't absolutely necessary for
working through LDD3. That said, the debugger did come in handy on a few
occasions making it worth the effort to learn how to set it up.

## Conclusion

LDD3 still holds up in 2022. Sure the example code needs some tweaking and a
couple of the later chapters may be a bit dated. That said, the core concepts of
the book remain relevant. Containerizing the kernel toolchain is a fun task. Not
having to buy any specialty hardware to follow along with the examples in the
text is a big bonus. Highly recommend LDD3 in 2022!

The complete project source with build instructions, usage, etc. is available on
GitHub under [linux_device_drivers][17].

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
[15]: https://github.com/ivan-guerra/linux_device_drivers?tab=readme-ov-file#gdb-support
[16]: https://en.wikipedia.org/wiki/Linux_kernel_oops
[17]: https://github.com/ivan-guerra/linux_device_drivers.git
