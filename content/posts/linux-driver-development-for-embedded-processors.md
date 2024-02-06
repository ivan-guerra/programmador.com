---
title: "Linux Driver Development for Embedded Processors"
date: 2023-10-07T17:56:16-07:00
description: "A short review of \"Linux Driver Development for Embedded Processors\"."
tags: ["linux", "raspberrypi"]
cover:
    image: /posts/linux-driver-development-for-embedded-processors/raspberry-pi-logo.png
    alt: Raspberry Pi Logo
---

After working through the infamous Linux Device Drivers[^1] book back in 2022,
I wanted to take another dive into Linux driver development. Specifically, I
wanted to get a modernish look into Linux driver development for ARM devices.
After much Googling, I came across a well reviewed book on Amazon: ["Linux
Driver Development for Embedded Processors"][2] (ELDD for short). ELDD had some
pretty good features that sold me:

* Labs targeting multiple ARM processors: NXP i.MX7D, Microchip SAMA5D2 and
  Broadcom BCM2837.
* Best Device Tree explanation through example I've been able to find thus far.
* Plenty of labs using *real* hardware not in software devices.

Lets review a couple of these points more closely starting with processor
support.

## Processor Options

ELDD gives you the choice of developing for one or more ARM processors: NXP
i.MX7D, Microchip SAMA5D2 and Broadcom BCM2837. However, when you go digging
around for dev kits/boards with these processors, you're really only left with
the BCM2837 unless you're willing to dish out well over a $100 on NXP's or
Microchip's kit. Luckily the BCM2837 comes in the famous Raspberry Pi. ELDD
specifically recommends the Raspberry Pi Model 3B+[^2].

[![Raspberry Pi Model 3B+][4]][3]

I was able to grab one these brand new off Amazon for just $60!

ELDD assumes you have the background to perform board bring up and basic Linux
administration solo. That said, the author does hand hold a good bit in Chapter
1 when he explains how to build, configure, and install the kernel. In
particular, he dives into the installation of the kernel on each processor's
platform. He goes further by showing how to setup an IDE (Eclipse) to build and
deploy the lab kernel modules you develop throughout the book.

Despite not having all three boards, it is nice to see how the lab
implementations vary from processor to processor. There are differences in the
device tree setup and driver source code. The author does a good job of
pointing those differences out where they matter.

## Talking About the Device Tree

There's plenty of content out there online explaining what the device tree is
and how it roughly gets loaded at boot time. Some good resources I used in
conjunction with ELDD are eLinux's "Device Tree Usage"[^3] wiki and Thomas
Petazzoni's 2013 presentation "Device Tree for Dummies"[^4]. Pettazoni's
presentation is in particular worth the watch:

{{< youtube m_NyYEBxfn8 >}}

What does ELDD have to offer in this area? To be honest, the device tree
description and introduction of properties chapter to chapter is a little
rough. Additionally, the author has one make a habit of editing the kernel dts
files directly. The concept of DT overlays is introduced much too late in my
opinion. All that said, the examples that are given work and can be built off
of if one is in need of a base for a project of their own. The explanation of
how drivers are linked to nodes given in Chapter 2 is particularly insightful.
I recommend one read Chapter 2 at least twice!

## Labs Using Real Hardware!

What really makes this book shine are the labs which use real hardware.
Unlike the Linux Device Drivers book which has you making in software devices,
ELDD focuses on developing basic drivers for a variety of GPIO, I2C, and SPI
devices.

One gripe I have was that the book does not have an upfront listing of all the
hardware required so you can buy it before reading. I think the author realized
this was a problem and added a list of lab hardware[^5] to their GitHub repo.
Unlike with the processors, *most* of the supporting hardware is affordable. A
tip if you want to save some money. Don't buy the MikRoe ColorClick and Button
R Click devices (a savings of over $50 accounting for shipping). If you have a
$20 breadboard kit with LEDs, resistors, push buttons, and some jumper wire,
you can make the circuits required to replace those items. Beyond the Mikroe
products, an STMicroelectronics LED screen is the only other expensive item. I
chose to skip on the LED screen. All other hardware was readily available on
Amazon and totaled less than $100 shipping included.

One thing to note, the author again assumes the reader has a good bit of
knowledge when it comes to reading datasheets and wiring a device to a dev
board. He'll often call out the data/signal pins but leave grounding, power,
and resistor usage up to the reader. Just be wary of this when following along.

The explanations in regards to how the drivers interact with devices are
excellent. Every chapter starts with a practical discussion of the available
APIs and ends with one or more labs. Each lab starts with an explanation of the
Device Tree setup followed by a detailed description of the driver's key
components. A number of chapters introduce the theory or details around some
Linux kernel concept associated with the driver. What I particularly like about
this book's approach is that author doesn't assume the reader is a complete OS
theory novice. For example, he explains how virtual memory functions but ties
the explanation explicitly to the VM implementation on Linux for ARM with links
to relevant code. He does this for many different topics including interrupts,
synchronization, and deferred work just to name a few.

## Conclusion

Linux Driver Development for Embedded Processors is a great option for anyone
interested in learning how to develop drivers for ARM devices in the modern
day. The book is particularly useful for those who learn through hands on work.
The many labs included use real hardware and do a lot to reinforce the current
and previous chapters' lessons. That said, the book is targeted at an audience
with prior experience in programming, electronics, and Linux usage in general.
If you're completely new to Linux kernel development, I would recommend reading
ELDD in parallel to Linux Kernel Development[^6] by Robert Love, the mixture of
theory and practical application complement each other nicely.

You can find my ELDD GitHub project with complete source, build instructions,
usage, etc. on my GitHub page under [eldd][9].

[1]: https://programmador.com/posts/linux-device-drivers/
[2]: https://www.amazon.com/Linux-Driver-Development-Embedded-Processors/dp/1729321828
[3]: https://www.raspberrypi.com/products/raspberry-pi-3-model-b-plus/
[4]: /posts/linux-driver-development-for-embedded-processors/raspberry-pi-3b-plus.avif
[5]: https://elinux.org/Device_Tree_Usage 
[6]: https://www.youtube.com/watch?v=m_NyYEBxfn8
[7]: https://github.com/ALIBERA/linux_book_2nd_edition/blob/master/Practical_labs_hardware.pdf
[8]: https://www.amazon.com/Linux-Kernel-Development-Robert-Love/dp/0672329468
[9]: https://github.com/ivan-guerra/eldd/tree/master

[^1]: [Docker Assisted Driver Dev and LDD3][1]
[^2]: [Raspberry Pi Model 3B+][3]
[^3]: [Device Tree Usage][5]
[^4]: [Device Tree for Dummies! - Thomas Petazzoni, Free Electrons][6]. Note,
    Pettazoni has more modern videos and slides published through Bootlin.
    You might consider checking those resources out first.
[^5]: [Practical Labs Hardware][7]
[^6]: [Linux Kernel Development][8]
