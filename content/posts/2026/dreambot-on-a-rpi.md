---
title: "DreamBot on a Raspberry Pi"
date: 2026-07-03T11:37:14-04:00
description: "How to setup the DreamBot OSRS Botting Client on a Raspberry Pi."
categories: ["projects"]
tags: ["hardware", "linux"]
---

This is a short guide walking you through the process of setting up the DreamBot
Old School RuneScape Botting Client on a Raspberry Pi. While this guide uses a
[Raspberry Pi Model 3 B+][1], the steps are near identical on later models of
the Pi. **Note, that you'll want a Raspberry Pi 4 or later with at least 2GB of
RAM to run DreamBot with reasonable performance**.

1. Download and flash the latest [Raspberry Pi OS][2] image to a microSD card.
   You can use [Raspberry Pi Imager][3] to simplify this process. Here's a video
   showing how to do this:

{{< youtube MepM1juFYzA  >}}

2. Login to your Raspberry Pi and open a terminal.
3. Update the system and install the latest Java Runtime Environment:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install default-jre -y
   ```
4. Download the latest [DreamBot client JAR file][4]:
   ```bash
   curl https://downloads.dreambot.org/launcher/Launcher.jar -o Launcher.jar
   ```
5. Run the DreamBot client:
   ```bash
   java -jar Launcher.jar
   ```

Optionally, you can adjust a couple of DreamBot client settings to improve
performance. The recommended Game Settings to adjust are:

- **CPU Saver**: Check this box and the "Enable only when Script is Running"
  sub-option.
- **Adjust the FPS**: Move the slider left or right to decrease/increase FPS. A
  lower FPS will reduce CPU usage.
- **Disable Game Drawing**: Check this box to disable game drawing. **This will
  make it so you can't see what the bot is doing so only use this option with
  reliable scripts!**

Here's a screen cap of the recommended settings:

![DreamBot Client Settings](/posts/2026/dreambot-on-a-rpi/game-settings.webp#center)

[1]: https://www.raspberrypi.com/products/raspberry-pi-3-model-b/
[2]: https://www.raspberrypi.com/software/operating-systems/
[3]: https://www.raspberrypi.com/software/
[4]: https://downloads.dreambot.org/launcher/Launcher.jar
