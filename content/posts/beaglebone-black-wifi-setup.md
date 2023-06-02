---
title: "Beaglebone Black Wifi Setup"
date: 2023-05-14T12:07:51-07:00
image: "/posts/beaglebone-black-wifi-setup/wifi-dongle.png"
alt: "Beaglebone Logo"
description: "How to configure wifi on the Beaglebone Black."
tags: ["linux", "beaglebone-black", "usb", "wifi"]
comments: true
---

### Motivation

When developing on the Beaglebone Black (BBB), it's handy to have the board on
the network for when you want to SSH into it, install packages, etc. That said,
I don't always want to run an Ethernet cable from the BBB to a switch. Luckily,
the BBB has support for a number of wifi adapters[^1]. I purchased the EDIMAX
EQ-7811UN[^2] adapter and set about trying to connect my BBB to my home network.
This article walks through the steps I followed to get connected. These
instructions also apply to the BBB wireless variants (i.e., those BBBs with a
wireless chip).

### Beaglebone Black Wifi Configuration

The steps below assume use of a supported wifi dongle on an official BBB image.
**`root` or `sudo` access is required to execute these instructions!**

1. Boot the BBB with the wifi adapter plugged into the USB port. The official
   BBB site recommends running off DC power when utilizing the adapter due the
   adapter's current requirements.

2. Run the commandline network manager:
```bash
sudo connmanctl
```
You can safely ignore the `Error getting VPN connections: The name
net.connman.vpn was not provided by any .service files` message.

3. Enable wifi:
```bash
connmanctl> enable wifi
```

4. Scan for wifi networks:
```bash
connmanctl> scan wifi
```

5. Show available wifi services:
```bash
connmanctl> services
```
If you don't see any services, you can disable wifi tethering and try again:
```bash
connmanctl> tether wifi off
connmanctl> services
```

6. Turn on the agent:
```bash
connmanctl> agent on
```

7. Connect to your wifi/service. Replace `WIFI_HASH` with the string prefixed
   with `wifi_` from step 5 that corresponds to your wifi network:
```bash
connmanctl> connect WIFI_HASH
```

8. Enter your wifi password:
```bash
Passphrase?
```

9. Check that the network is set for auto-connect:
```bash
connmanctl> services
```
You should see `*AO` or `*AR` next to your network's name.

10. Exit `connmanctl`:
```bash
connmanctl> quit
```

11. Verify you're connected. Try pinging [gnu.org][3]:
```bash
ping gnu.org
```

12. By default, `connman` will use DHCP to retrieve an IP. If instead you'd like
    to set a static IP, run the command below replacing the `WIFI_HASH`,
    `IP_ADDR`, `SUBNET_MASK`, and `GATEWAY_ADDR` with values corresponding to
    your network:
```bash
connmanctl> config WIFI_HASH --ipv4 manual IP_ADDR SUBNET_MASK GATEWAY_ADDR
```

[1]: https://elinux.org/Beagleboard:BeagleBoneBlack#WIFI_Adapters
[2]: https://www.amazon.com/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY
[3]: https://www.gnu.org/

[^1]: [BBB elinux.org][1] has a table summarizing what dongle/distro combos are
    officially supported. I have used the [EDIMAX EW-7811UN][2] adapter with
    success.
[^2]: The [EDIMAX EW-7811UN][2] might be a little hard to come by these days. At
    the time of this writing, there's still a couple up for sale on Amazon.