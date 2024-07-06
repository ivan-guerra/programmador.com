---
title: "Cosmo: A Hobby x86 OS"
date: 2022-02-23T11:15:24-07:00
description: "On developing a hobby x86 OS."
tags: ["asm", "c++", "docker"]
---

At the beginning of 2022, I set a personal goal to implement a bare bones OS.
The first step was to define what success would look like for the project. The
goal is to create an OS that could allocate a single process that adds two
numbers and prints the result to the screen. It took a month long journey into
the world of x86 emulators, NASM assembly, and architecture reference manuals to
get remotely close.

## Getting the Right Resources

[![Little Book About OS Development](/posts/2022/cosmo/lbaod.webp#center)][2]

It's difficult to get started without the right references and resources. The
[OSDev wiki][1] is one of those gems. The OSDev wiki audience is in large part
hobbyist like myself looking to get started with their own OS. A number of the
articles give step-by-steps, example ASM/C code, and, perhaps most importantly,
links to other reference material. That said, more structure and hand holding
than what OSDev provides can be useful when starting out.

The ["Little Book About OS Development"][2] (LBAOD) is yet another treasure.
LBAOD is an online book written by two Graduate students at the Royal Institute
of Technology, Stockholm. The book details the authors' 6 week journey in
developing a basic x86 OS. The benefit of the book was that they provide an
outline to implementing various features of the OS along with links to resources
for the topic at hand.

Wikis and guides in hand, it's time to begin the journey.

## Setting Up the Toolchain

Step number one, get the toolchain stood up. This project targets the x86
platform. You build many of the cross compilation tools from source since
various tools require [specific compile time flags][3].

Containerizing the toolchain is a worthwhile endeavor. Included in the container
image is an [x86 emulator](#bochs-emulation). The key idea here is that you
launch a dev container with the OS source code on the host system mounted as a
volume. From within the container, you call the build/run scripts all the while
editing the source code using your IDE on the host.

The [Dockerfile][4] produces an image with the necessary toolchain and emulator.
Even with `make`'s multiple job support, the image takes upwards of 30 minutes
to build on a 4 core Intel i5! Downloading a prebuilt image from [DockerHub][5]
saves some time.

The script below shows how to launch the dev container:

```bash
#!/bin/bash

# Source the project configuration.
source config.sh

# Use the latest cosmo development container.
COSMO_IMAGE="iguerra130154/cosmo:latest"

XSOCK="/tmp/.X11-unix"
XAUTH="/tmp/.docker.xauth"
touch ${XAUTH}
xauth nlist $DISPLAY | sed -e 's/^..../ffff/' | xauth -f $XAUTH nmerge -

docker run --rm -it                      \
    -v ${XSOCK}:${XSOCK}                 \
    -v ${XAUTH}:${XAUTH}                 \
    -e XAUTHORITY=${XAUTH}               \
    -e DISPLAY=${DISPLAY}                \
    -u $(id -u ${USER}):$(id -g ${USER}) \
    -v "${COSMO_PROJECT_PATH}":/cosmo    \
    ${COSMO_IMAGE}
```

There's a number of X11 related volumes that get mounted. The volumes enable the
emulator GUI to appear on the host desktop. The user related option, `-u ...`,
guarantees all container writes use the host system's user permissions (that is,
you don't want all the output binaries to have user/group `root`).

## Bochs Emulation

[![Bochs IA-32 Emulator](/posts/2022/cosmo/bochs.webp#center)][6]

An emulator makes it convenient to test the OS. The OSDev wiki gives a nice
[summary table][7] comparing the different emulators available. I decided to go
with Bochs for this project for a few reasons:

1. Simple serial logging feature
2. Built in [debug features][9]
3. Comes with a graphical user interface

The Bochs configuration script below loads the OS and enables logging to four
virtual serial ports:

```txt
megs:            32
display_library: x
romimage:        file=/usr/share/bochs/BIOS-bochs-latest
vgaromimage:     file=/usr/share/bochs/VGABIOS-lgpl-latest
ata0-master:     type=cdrom, path=../bin/cosmo.iso, status=inserted
boot:            cdrom
clock:           sync=realtime, time0=local
cpu:             count=1, ips=1000000
com1:            enabled=1, mode=file, dev=./bochs_logs/com1.out
com2:            enabled=1, mode=file, dev=./bochs_logs/com2.out
com3:            enabled=1, mode=file, dev=./bochs_logs/com3.out
com4:            enabled=1, mode=file, dev=./bochs_logs/com4.out
```

For more information on `bochsrc` configurations, checkout the [Bochs User
Manual][10].

## Choosing an Assembly and Programming Language

[NASM Assembly][11] and C++ are the programming languages of choice.

When it came time to choosing an assembly language, there looked to be two front
runners: NASM Assembly (NASM) and GNU Assembly (GAS). What's the primary
difference between the two? Syntax. GAS uses AT&T syntax and is hard to read.
NASM on the other hand uses the more legible Intel syntax. NASM was a easy
choice.

The inherent modularity of the project drives you towards C++. The object
oriented features, templating, and interoperability with C made C++ a great
candidate. Being able to package concepts like the frame buffer, global
descriptor table, etc. into a neat little class led to more modular code.

There was no noticeable overhead to switching over to C++ beyond passing a few
additional flags to the compiler:

```bash
set(CMAKE_CXX_FLAGS "${CMAKE_C_FLAGS}
        -ffreestanding
        -O2
        -Wall
        -Wextra
        -fno-exceptions
        -fno-rtti
        -fno-threadsafe-statics" CACHE INTERNAL "")
```

## On Using CMake and Source Code Organization

Most OS tutorials assume you will being using C and writing Makefiles. Makefiles
can become tedious to write. As a result, Cosmo uses CMake to generate the OS
build files.

The philosophy put forward in ["An Introduction to Modern CMake"][12] is
interesting and worth a read. I stuck with the project structure recommended in
that article:

```txt
cosmo
├── cmake
├── docs
├── include
├── iso
├── kernel
├── res
├── scripts
└── src
```

Here's a table describing what each folder contains:

| Folder  | Description                                    |
| ------- | ---------------------------------------------- |
| cmake   | i686 CMake toolchain file                      |
| docs    | Doxygen generated HTML docs                    |
| include | OS headers                                     |
| iso     | GRUB bootloader configuration file             |
| kernel  | Kernel main, OS loader, and linker script      |
| res     | Screenshots and other misc resources           |
| scripts | Bochs config and build, run, etc. Bash scripts |
| src     | OS implementation files                        |

The usual `CMakeLists.txt` files define the recipe for building each target.
Each OS feature including `libc` is its own target under `src/`. `kernel/` is
where the OS ELF lives. The `kernel.elf` target's [CMakeLists.txt][13] was the
trickiest to get right since you need kernel loading assembly and custom linker
options and scripts.

Toolchain definition is important since you want CMake to be aware of your cross
compilation tools. Many articles walk through how to write a [toolchain file for
cross compilation][14]. Combining the information in the toolchain tutorial
along with the [OSDev Bare Bones][15] kernel guide makes writing the [toolchain
script][16] a less daunting task.

Makefile generation is now as simple as calling `cmake` with the
`-DCMAKE_TOOLCHAIN_FILE` option set to point to the `i686-elf-gcc.cmake` script!

## Generating an ISO

[![GNU GRUB](/posts/2022/cosmo/grub.webp#center)][17]

When you run Cosmo under Bochs, it's as if you were putting a CD with the OS ISO
image in a computer. The output of the Cosmo OS build system is a `kernel.elf`
file. That ELF file needs to get put in an ISO image along with a bootloader for
the OS. Writing your own bootloader is an undertaking of its own. Cosmo uses GNU
GRUB as its bootloader.

ISO generation requires the following tools:

- `grub-mkrescue`: Generates the ISO from the kernel ELF and a `grub.cfg`
  configuration file.
- `xorriso`: Utility required by `grub-mkrescue` for ISO generation.
- GNU Mtools: Utilities to access MS-DOS disks from GNU and Unix without
  mounting them. Another `grub-mkrescue` dependency.

`grub-mkrescue` combined with the `grub.cfg` and `kernel.elf` create the
`cosmo.iso` that Bochs can boot off of. [`generate_iso.sh`][18] gives the
details. The tools and scripts are all packaged into the [dev
container](#setting-up-the-toolchain) so there's no need to install them on the
host PC.

## Progress Report

Cosmo has yet to load a program that adds two numbers and outputs the sum to the
console. However, it's close. All the features leading up to [Chapter 11][19] of
the "Little Book About OS Development" exist:

| Feature                            | Completed |
| ---------------------------------- | --------- |
| Framebuffer Driver                 | Y         |
| Serial Port Driver                 | Y         |
| Logger                             | Y         |
| Global Descriptor Table            | Y         |
| Interrupt Descriptor Table         | Y         |
| Programmable Interrupt Card Driver | Y         |
| Physical Frame Allocator           | Y         |
| Virtual Memory Manager             | N         |
| User Mode Process                  | N         |

## Conclusion

Writing your own OS, even a primitive one, is a daunting task. Thankfully, there
are communities and plenty of resources out there to help get the job done.
Working a project like Cosmo teaches you about toolchains, the x86 architecture,
assembly, and more. Highly recommend anyone thinking about starting an OS
development project dive in. Even if you don't hit your mark, you'll pick up
some useful knowledge along the way. Just be wary that an OS project takes
patience and time!

The complete project source with build instructions, usage, etc. is available on
GitHub under [cosmo][20].

[1]: https://wiki.osdev.org/Expanded_Main_Page
[2]: https://littleosbook.github.io/
[3]: https://wiki.osdev.org/GCC_Cross-Compiler#The_Build
[4]: https://github.com/ivan-guerra/cosmo/blob/master/Dockerfile
[5]: https://hub.docker.com/repository/docker/iguerra130154/cosmo
[6]: https://bochs.sourceforge.io/
[7]: https://wiki.osdev.org/Emulator_Comparison
[8]: https://github.com/ivan-guerra/cosmo/blob/master/scripts/bochsrc.txt
[9]: https://bochs.sourceforge.io/doc/docbook/user/internal-debugger.html
[10]: https://bochs.sourceforge.io/doc/docbook/user/bochsrc.html
[11]: https://www.nasm.us/
[12]: https://cliutils.gitlab.io/modern-cmake/chapters/basics/structure.html
[13]: https://github.com/ivan-guerra/cosmo/blob/master/kernel/CMakeLists.txt
[14]: https://kubasejdak.com/how-to-cross-compile-for-embedded-with-cmake-like-a-champ
[15]: https://wiki.osdev.org/Bare_Bones#Implementing_the_Kernel
[16]: https://github.com/ivan-guerra/cosmo/blob/master/cmake/i686-elf-gcc.cmake
[17]: https://en.wikipedia.org/wiki/GNU_GRUB
[18]: https://github.com/ivan-guerra/cosmo/blob/master/scripts/generate_iso.sh
[19]: https://littleosbook.github.io/#user-mode
[20]: https://github.com/ivan-guerra/cosmo
