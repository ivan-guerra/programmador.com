---
title: "Linux USB Serial Device Name Binding"
date: 2023-05-06T08:45:42-07:00
description: "How to set persistent USB serial device names in Linux."
tags: ["linux"]
showToc: false
---

Have you worked with USB serial devices on Linux? One annoyance you may have
come across is device name changes after each reboot. This problem gets solved
by binding a custom `/dev` name to a USB device. This post shows you how.

To be clear, this article walks through assigning USB **serial devices**
persistent names. If you have a USB **block device** and would like to give it a
persistent name, the [ArchWiki][1] has you covered.

## USB Serial Device Name Binding Using _udev_

The instructions below will work on a Linux distro that uses [`udev`][2] for
device management. **You will need `root` privileges to follow these
instructions!**

1. Plugin the USB serial device.
2. Identify the `/dev/ttyUSB*` name assigned to your device. There are many ways
   to do this. Perhaps the easiest is to `grep` the `dmesg` log to
   see what name the kernel gives the device:

```bash
dmesg | grep USB
```

3. List the device attributes using `udevadm`. Replace `<X>` with the USB number
   found in step 2:

```bash
udevadm info --name=/dev/ttyUSB<X> --attribute-walk
```

4. You'll see a list of attributes for your device on the console. Find one or
   more attributes that **uniquely** identify your device. The combination of
   vendor ID and product ID is a good choice.
5. Create or edit the `/etc/udev/rules.d/99-usb-serial.rules` file to include an
   entry like the one shown below. **Be sure to input your own attributes and
   set `SYMLINK` to the name you'd like the device to have.**

```text
SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", ATTRS{idProduct}=="2303", SYMLINK+="mydevice"
```

6. Load the new rules using `udevadm`:

```bash
udevadm trigger
```

7. Verify the USB serial device has its new name:

```bash
ls -l /dev/mydevice
```

8. On reboot or when you plugin the device, the new name will persist.

To bind more device names, simply add rules to `99-usb-serial.rules`. To undo
these changes, delete the device's corresponding rule in
`/etc/udev/rules.d/99-usb-serial.rules` and run `udevadm trigger`.

[1]: https://wiki.archlinux.org/title/persistent_block_device_naming
[2]: https://en.wikipedia.org/wiki/Udev
