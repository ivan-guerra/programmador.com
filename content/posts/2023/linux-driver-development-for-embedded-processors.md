---
title: "Linux Driver Development for Embedded Processors"
date: 2023-10-07T17:56:16-07:00
description: 'A short review of "Linux Driver Development for Embedded Processors".'
tags: ["linux", "raspberrypi"]
---

If you've already read through ["Linux Device Drivers"][1], it may be worth your
time to read a more focused Linux driver development textbook. ARM driver
development has been popular for some time now and remains relevant today.
["Linux Driver Development for Embedded Processors"][2] (ELDD for short) gives a
modern look into the development of ARM drivers on Linux. ELDD has a number of
selling points:

- Labs targeting multiple ARM processors: NXP iMX7D, Microchip SAMA5D2 and
  Broadcom BCM2837.
- Excellent Device Tree introduction with many examples.
- Plenty of labs using real hardware.

This article dives into the details starting with processor support.

## Processor Options

ELDD gives you the choice of developing for one or more ARM processors: NXP
iMX7D, Microchip SAMA5D2, and the Broadcom BCM2837. Unless you're willing to
dish out well over $100, you will end up developing for the BCM2837. The BCM2837
comes in the famous Raspberry Pi. ELDD specifically recommends the [Raspberry Pi
Model 3B+][3].

[![Raspberry Pi Model 3B+][4]][3]

You can grab one these brand new off Amazon for just $60!

ELDD assumes you have the background to perform board bring up and basic Linux
administration solo. That said, there is some introductory material in Chapter 1
that walks through how to build, configure, and install the kernel. You will get
a description of how to install the kernel on each processor's platform. You
also get a walk through of how to setup an IDE (Eclipse) to build and deploy the
lab kernel modules you develop throughout the book.

Despite not having all three boards, it's nice to see how the lab
implementations vary from processor to processor. There are differences in the
device tree setup and driver source code. The book does a good job of pointing
those differences out where they matter.

## The Device Tree

There's plenty of content out there online explaining what the device tree is
and the role it plays in the kernel. Some good resources you can use in
conjunction with ELDD are eLinux's ["Device Tree Usage"][5] wiki and Thomas
Petazzoni's 2013 presentation ["Device Tree for Dummies"][6]. Petazzoni's
presentation is in particular worth the watch:

{{< youtube m_NyYEBxfn8 >}}

What does ELDD have to offer in this area? To be honest, the device tree
description and introduction of properties chapter to chapter is a little rough.
Additionally, the book has one make a habit of editing the kernel dts files
directly. DT overlays get introduced a bit late. All that said, the examples
work and serve as bases to build off of. The explanation of how drivers link to
nodes given in Chapter 2 is particularly insightful. Highly recommend you read
Chapter 2 at least twice!

## Hardware Labs

What makes this book shine are the hardware labs. Unlike the "Linux Device
Drivers" book which has you making in software devices, ELDD focuses on
developing basic drivers for a variety of GPIO, I2C, and SPI devices.

One gripe is that the book doesn't have an upfront listing of all the hardware
required so you can buy it before reading. This issue is now fixed. A [list of
lab hardware][7] exists on the book's GitHub repo. Unlike with the processors,
_most_ of the supporting hardware is affordable. A tip if you want to save some
money. Don't buy the MIKROE ColorClick and Button R Click devices (a savings of
over $50 after shipping). Using a $20 breadboard kit with LEDs, resistors, push
buttons, and some jumper wire, you can make the circuits required to replace
those items. Beyond the MIKROE products, an STMicroelectronics LED screen is the
only other expensive item. All other hardware was available on Amazon and
totaled less than $100 shipping included.

One thing to note, the book again assumes the reader has a good bit of knowledge
when it comes to reading datasheets and wiring a device to a dev board.
Data/signal pins get called out but ground, power, and resistor usage aren't.
Just be wary of this when following along.

The explanations in regards to how the drivers interact with devices are
excellent. Every chapter starts with a practical discussion of the available
APIs and ends with one or more labs. Each lab starts with an explanation of the
Device Tree setup followed by a detailed description of the driver's key
components. A number of chapters introduce the theory or details around the
Linux kernel concept associated with the driver. It's refreshing to read a book
that doesn't assume the reader is a complete OS theory novice. For example,
virtual memory isn't explained in the CS101 sense. Instead you get the VM
implementation on Linux for ARM with links to relevant code. The book does this
for many different topics including interrupts, synchronization, and deferred
work just to name a few.

## Conclusion

Linux Driver Development for Embedded Processors is a great option for anyone
interested in learning how to develop drivers for ARM devices in the modern day.
The book is particularly useful for those who learn through hands on work. The
many labs included use real hardware and do a lot to reinforce the previous
chapters' lessons. That said, this book is for an audience with prior experience
in programming, electronics, and Linux usage in general. For those completely
new to Linux kernel development, read ELDD in parallel to ["Linux Kernel
Development"][8] by Robert Love. The mixture of theory and practical application
complement each other.

You can find the ELDD project with complete source, build instructions, usage,
etc. on GitHub under [eldd][9].

[1]: https://programmador.com/posts/2022/linux-device-drivers/
[2]: https://www.amazon.com/Linux-Driver-Development-Embedded-Processors/dp/1729321828
[3]: https://www.raspberrypi.com/products/raspberry-pi-3-model-b-plus/
[4]: /posts/2023/linux-driver-development-for-embedded-processors/raspberry-pi-3b-plus.avif#center
[5]: https://elinux.org/Device_Tree_Usage
[6]: https://www.youtube.com/watch?v=m_NyYEBxfn8
[7]: https://github.com/ALIBERA/linux_book_2nd_edition/blob/master/Practical_labs_hardware.pdf
[8]: https://www.amazon.com/Linux-Kernel-Development-Robert-Love/dp/0672329468
[9]: https://github.com/ivan-guerra/eldd/tree/master
