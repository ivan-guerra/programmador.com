---
title: "Beaglebone Black WiFi Setup"
date: 2023-05-14T12:07:51-07:00
description: "How to configure wifi on the Beaglebone Black."
tags: ["beaglebone", "wifi"]
showToc: false
---

When developing on the Beaglebone Black (BBB), it's handy to have the board on
the network for when you want to SSH into it, install packages, etc. That said,
you may not want to run an Ethernet cable from the BBB to a switch. Luckily, the
BBB has support for a number of [WiFi adapters][1]. I purchased the [EDIMAX
EQ-7811UN][2] adapter and set about trying to connect a BBB to my local network.
This article walks through the steps required to get connected. These
instructions also apply to the BBB wireless variants (that is, those BBBs with a
wireless chip).

## Beaglebone Black WiFi Configuration

The steps below assume use of a supported WiFi dongle on an official BBB image
and require `root` access.

1. Boot the BBB with the WiFi adapter plugged into the USB port. The official
   BBB site recommends running off DC power when utilizing the adapter due the
   adapter's current requirements.

2. Run the command line network manager:

```bash
sudo connmanctl
```

You can ignore the `Error getting VPN connections: The name net.connman.vpn was
not provided by any .service files` message.

3. Enable WiFi:

```bash
connmanctl> enable wifi
```

4. Scan for WiFi networks:

```bash
connmanctl> scan wifi
```

5. Show available WiFi services:

```bash
connmanctl> services
```

If you don't see any services, you can disable WiFi tethering and try again:

```bash
connmanctl> tether wifi off
connmanctl> services
```

6. Turn on the agent:

```bash
connmanctl> agent on
```

7. Connect to your WiFi/service. Replace `WIFI_HASH` with the string from step 5
   that corresponds to your WiFi network:

```bash
connmanctl> connect WIFI_HASH
```

8. Enter your WiFi password:

```bash
Passphrase?
```

9. Verify you have autoconnect enabled:

```bash
connmanctl> services
```

You should see `*AO` or `*AR` next to your network's name.

10. Exit `connmanctl`:

```bash
connmanctl> quit
```

11. Verify you're connected. Try pinging `gnu.org`:

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
