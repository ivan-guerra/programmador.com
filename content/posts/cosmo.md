---
title: "Cosmo: A Hobby x86 OS"
date: 2022-02-23T11:15:24-07:00
description: "On developing a hobby x86 OS."
tags: ["os-dev", "docker", "linux"]
toc: true
---

I've always been interested in the topic of OS development. At the beginning of
2022, I set a personal goal to implement a very barebones OS of my own.
Emphasis on barebones! The first step I took was to define what success would
look like for the project. I settled on targeting an OS that could allocate a
single process that would add two numbers and print the result to the screen.
With that seemingly humble goal in mind, I set off on a month long journey into
the world of x86 emulators, NASM assembler, and architecure reference manuals.

## Getting the Right Resources

[![Little Book About OS Development](/posts/cosmo/lbaod.png)][2]

I knew I wasn't going to get very far without the right references and
resources. Early on, I found the OSDev wiki[^1]. The OSDev wiki audience is in
large part hobbyist like myself looking to get started with their own OS. A
number of the articles give step-by-steps, sample ASM/C code, and, perhaps most
importantly, links to other reference material. All that said, I needed a little
more structure and hand holding to get on the right path.

Luckily, I came across the Little Book About OS Development[^2] (LBAOD).  LBAOD
is an online book written by two Graduate students at the Royal Institute of
Technology, Stockholm. The book details the authors' 6 week journey in
developing a basic x86 OS. The major benefit of the book was that they provide
an outline and approach to implementing various features of the OS along with
links to resources for the topic at hand.

Armed with these two resources and the power of the Internet, I was ready to get
started.

## Setting Up the Toolchain

Before writing my first line of code, I had to get my toolchain stood up. Early
on, I settled on developing for the x86 platform. I needed to create an x86 (AKA
i686) cross compilation toolchain. Many of the tools needed to be built from
source given that specific flags needed to be passed at configure time[^3].

As with most of my projects, I containerized the development environment. My
goal was to build a dev image that contained the cross compilation tools and an
[x86 emulator](#bochs-emulation). The CONOPS was that I would launch a dev
container with the OS source code on my host system mounted as a volume. From
within the container, I could call my build/run scripts all the while editing
the source code using my IDE on the host.

It took a minute, but I was able to develop a Dockerfile[^4] which produced an
image with the necessary toolchain and emulator. Be warned, even though I took
advantage of `make`'s multiple job support, the image took upwards of 30 minutes
to build on my 4 core machine! I recommend downloading the image from
DockerHub[^5] instead.

The script below shows how I launch the dev container:

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

There's a number of X11 related volumes that get mounted. Those are required to
allow the emulator GUI to show up on my desktop when I launch it from the
container. The user related option, `-u ...`, is necessary to ensure all
container writes use the host system's user permissions (i.e., I don't want all
the output binaries to have user/group `root`).

## Bochs Emulation

[![Bochs IA-32 Emulator](/posts/cosmo/bochs.png)][6]

I needed an emulator in which to run my OS. The OSDev wiki gives a nice summary
table comparing the different emulators available[^6]. I decided to go with
Bochs for this project for a few reasons:

1. Simple serial logging feature.
2. Built in debug features[^7].
3. Comes with a graphical user interface.

A 12 line configuration script was all I needed to get my OS up and running in
Bochs:

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

For more information on `bochsrc` configurations, checkout the Bochs User
Manual[^8].

## Choosing an Assembly and Programming Language

For my implementation, I rolled with using NASM Assembler[^9] and the C++
programming language.

When it came time to choosing an assembler, there looked to be two front
runners: NASM Assembler (NASM) and GNU Assembler (GAS). What's the primary
difference between the two? Syntax. GAS uses AT&T syntax and, in my opinion, is
quite hard to read. NASM on the otherhand uses the Intel syntax. Instructions in
NASM were more legible so I went with NASM.

The choice to use C++ actually came a bit later as I started implementing
different portions of the OS. I found that the object oriented features,
templating, and interoperability with C made it a great candidate for my
project. Being able to package concepts like the frame buffer, global descriptor
table, etc. into a neat little class led to more modular code.

There was no noticable overhead to switching over to C++ beyond passing a few
additional flags to the compiler in my CMake toolchain file:

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

Stepping into an OS project, it seems implied that everything will be written in
C and that you will inevitably have to write Makefiles to get it all building.
I've never been a big fan of writing Makefiles. As a result, I decided I would
use CMake to generate the OS build files.

I like the philosphy put forward in An Introduction to Modern CMake[^10]. I
stuck with the project structure recommended in that article:

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
|---------|------------------------------------------------|
| cmake   | i686 CMake toolchain file                      |
| docs    | Doxygen generated HTML docs                    |
| include | OS headers                                     |
| iso     | GRUB bootloader configuration file             |
| kernel  | Kernel main, OS loader, and linker script      |
| res     | Screenshots and other misc resources           |
| scripts | Bochs config and build, run, etc. Bash scripts |
| src     | OS implementation files                        |

The usual `CMakeLists.txt` files define the recipe for building each target.  I
made each OS feature as well as `libc` its own target under `src/`. `kernel/` is
where the OS ELF is generated. The `kernel.elf` target's CMakeLists.txt[^11] was
the trickiest to get right since kernel loading assembly and custom linker
options and scripts had to be included.

Toolchain definition is important since we want CMake to be aware of our cross
compilation tools. I came across a great article that walks through how to write
a toolchain file for cross compilation[^12]. Combining the information in the
toolchain tutorial along with the OSDev Bare Bones[^13] kernel guide, I was able
to cookup an `i686-elf-gcc.cmake`[^14] toolchain script.

With all my target `CMakeLists.txt` scripted and a i686 toolchain in hand,
Makefile generation was as simple as calling `cmake` with the
`-DCMAKE_TOOLCHAIN_FILE` option set to point to the `i686-elf-gcc.cmake` script!

## Generating an OS ISO

[![GNU Grub](/posts/cosmo/grub.png)][17]

When we run our OS under Bochs, it's as if we were putting a CD with our OS ISO
image in a computer. The output of the Cosmo OS build system is a `kernel.elf`
file. That ELF file needs to get put in an ISO image along with a bootloader for
the OS. I never intended to write a bootloader for this project so I decided to
just use GNU GRUB.

A couple of tools are required to generate the ISO:

* `grub-mkrescue`: Generates the ISO from the kernel ELF and a `grub.cfg`
  configuration file.
* `xorriso`: Utility required by `grub-mkrescue` for ISO generation.
* GNU Mtools: Utilities to access MS-DOS disks from GNU and Unix without
  mounting them. Another `grub-mkrescue` dependency.

The `generate_iso.sh`[^15] script shows how `grub-mkrescue` is used to combine
the `grub.cfg` and `kernel.elf` into an output `cosmo.iso` that Bochs can boot
off of. The tools and scripts are all packaged into the [dev
container](#setting-up-the-toolchain) so there's no need to install them on the
host PC.

## Progress Report

I am sad to say I haven't yet hit my original goal of loading a program that
adds two numbers and outputs the sum to the console. However, I am getting
pretty damn close. I have implemented all the features leading up to Chapter 11
of the Little Book About OS Development[^16].

Below is a table listing what has been implemented in Cosmo OS and what remains:

| Feature                            | Completed |
|------------------------------------|-----------|
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

Writing your own OS, even a primitive one, is a daunting task. Thankfully,
there's communities and plenty of resources out there to help get the job done.
I've managed to learn quite a bit about toolchains, the x86 architecture,
assembly, and more. I recommend anyone thinking about starting an OS development
project dive in. Even if you don't hit your mark, you'll pick up some useful
knowledge along the way. Just be wary that an OS project takes patience and
time!

You can find the complete project source with build instructions, usage, etc.
on my GitHub page under [cosmo][20].

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

[^1]: [OSDev Wiki][1]
[^2]: [Little Book About OS Development][2]
[^3]: You can see what flags are required during tool configuration on the OSDev
    Wiki's [GCC Cross Compiler][3] wiki.
[^4]: [Cosmo OS Dev Image Dockerfile][4]
[^5]: In place of building the Cosmo OS dev image from the Dockerfile in the
    repo, you can also download the latest build from DockerHub:
    [iguerra130154/cosmo][5]
[^6]: [Emulator Comparison][7]
[^7]: [Chapter 8][9] of the Bochs User Manual goes in-depth on the internal
    debugger.
[^8]: [Section 4.3][10] of the Bochs User Manual covers the `bochsrc`
    configuration options in detail.
[^9]: [Netwide Assembler (NASM)][11].
[^10]: CMake is infamous for not having an official source showing the "right"
    way of writing CMake scripts. [An Introduction to Modern CMake][12] is the
    closest thing I've found to that.
[^11]: The `kernel.elf` target's [CMakeLists.txt][13].
[^12]: [How to cross-compile for embedded with CMake like a champ][14]
[^13]: [Bare Bones - Implementing the Kernel][15]
[^14]: [`i686-elf-gcc.cmake`][16]
[^15]: [`generate_iso.sh`][18]
[^16]: [Chapter 11: User Mode][19]
