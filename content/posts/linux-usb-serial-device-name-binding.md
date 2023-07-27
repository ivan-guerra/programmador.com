---
title: "Linux USB Serial Device Name Binding"
date: 2023-05-06T08:45:42-07:00
description: "How to set persistent USB serial device names in Linux."
tags: ["linux", "embedded", "serial", "usb"]
---

On a recent project, I was developing an app on Linux that gathered data from a
number of USB serial devices. One annoyance I came across was that oftentimes
when the machine was rebooted, the device names would get all mixed up! After
some searching, I was able to compile the steps needed to bind a custom `/dev`
name to a USB device.

To be clear, this article walks through assigning USB **serial devices**
persistent names. If you have a USB **block device** and would like to give it a
persistent name, the ArchWiki[^1] has you covered.

## USB Serial Device Name Binding Using *udev*

The instructions below will work on a Linux distro that uses the `udev`[^2]
device manager which is just about any modern distro. **`root` privileges will
be required to execute these instructions!**

1. Plugin the USB serial device.
2. Identify the `/dev/ttyUSB*` name assigned to your device. There are many ways
   to do this but, in my opinion, the easiest is to `grep` the `dmesg` log to
   see what name was assigned to the device:
```bash
dmesg | grep USB
```
3. List the device attributes using `udevadm`. Replace `<X>` with the USB number
   found in step (2):
```bash
udevadm info --name=/dev/ttyUSB<X> --attribute-walk
```
4. A list of attributes for your device will be printed to the console. Find one
   or more attributes that **uniquely** identify your device. The combination of
   vendor ID and product ID is a good choice.
5. Create and/or edit the `/etc/udev/rules.d/99-usb-serial.rules` file to
   include an entry like the one shown below. **Be sure to input your own
   attributes and set `SYMLINK` to the name you'd like the device to have.**
```text
SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", ATTRS{idProduct}=="2303", SYMLINK+="mydevice"
```
6. Load the new rules using `udevadm`:
```bash
udevadm trigger
```
7. Verify your USB serial device has been renamed:
```bash
ls -l /dev/mydevice
```
8. On reboot or when the device is plugged in, the new device name will
   automagically be applied. To bind more device names, simply add rules to
   `99-usb-serial.rules`. To undo these changes simply delete the device's
   corresponding rule in `/etc/udev/rules.d/99-usb-serial.rules`.


[1]: https://wiki.archlinux.org/title/persistent_block_device_naming
[2]: https://en.wikipedia.org/wiki/Udev

[^1]: ["Persistent block device naming"][1]
[^2]: The [`udev` Wikipedia page][2] gives a nice overview of the history and
    purpose of the tool.
