---
title: "TigerVNC on Linux"
date: 2024-10-10T21:32:02-04:00
description: "A quick how-to on setting up TigerVNC on Linux."
tags: ["linux"]
---

Virtual Network Computing or VNC makes it possible to remotely access the
graphical desktop environment of another machine. There are a number of projects
out there that implement the VNC protocol. Typically, these projects provide two
applications: a VNC server and a VNC client. The remote target machine runs the
VNC server program. A VNC client instance connects to the target's VNC server.
The client application is a GUI application that renders the graphical display
of the remote target. The image below illustrates the concept:

![VNC Client/Server](/posts/2024/tigervnc-setup/clientserver.webp#center)

In this article, you'll see how to setup a VNC server and client on Linux using
[TigerVNC][1].

## Prerequisites and Assumptions

This article assumes you are on an Arch Linux machine with an Internet
connection. That said, the instructions that follow should work for any Linux
distro though the package installation commands will certainly need tweaking.

## Step-By-Step

TigerVNC is the recommended VNC implementation. TigerVNC provides both the
client and server application. To install TigerVNC, run the following command:

```bash
pacman -S tigervnc
```

### VNC Server Setup

1. Create a password by running `vncpasswd`. The password file saves to
   `$XDG_CONFIG_HOME/tigervnc/passwd`. Make sure `passwd` has its permissions
   set to `0600`.

2. Add users by editing `/etc/tigervnc/vncserver.users`. User entries consist of
   both a display number and username. You can spawn multiple server instances,
   one per display. Note, the display number is automatically associated with a
   TCP port. For example, display `:1` binds to port \\(5900 + 1 = 5901\\),
   display `:2` binds to port \\(5900 + 2 = 5902\\), etc. Below is an example
   `vncserver.users` file containing a single user:

```text
# TigerVNC User assignment
#
# This file assigns users to specific VNC display numbers.
# The syntax is <display>=<username>. E.g.:

:1=ieg
```

3. Start one or more server instances using systemd. Load the VNC server service
   for one or more displays. For example, to start the server for display `:1`:

```bash
sudo systemctl start vncserver@:1.service
```

### VNC Client Setup

1. Connect to the VNC server using the `vncviewer` application. The syntax is
   `vncviewer HOSTNAME::PORT`. `HOSTNAME` is the hostname or IPv4 address of the
   remote machine. `PORT` is the TCP port exposed by the server. The TCP port is
   always the display number plus \\(5900\\). As an example, suppose the VNC
   server is running on a machine with hostname `foo`. On the machine hosting
   the server, the VNC server systemd service is running for display `:1`. To
   connect the client to the server:

```bash
vncviewer foo::5901
```

2. Type your VNC password into the password prompt.
   ![Password Prompt](/posts/2024/tigervnc-setup/password-prompt.webp#center)

3. Optionally, adjust client settings by clicking the client window and then
   pressing `F8`.
   ![Options Menu](/posts/2024/tigervnc-setup/options-menu.webp#center)

Note, certain keystrokes aren't registered by the client. In particular, the mod
key (AKA windows/command key) is always intercepted by the host system. This is
particularly annoying if the remote's desktop environment is a window manager
like i3. The best solution at this time is to rebind the function of the mod key
on the remote host to some other key (for example, `Alt`).

## Secure Connections

Following the steps in the last section gives you a working VNC connection.
However, **that connection is insecure**! In TigerVNC, you can improve the
security of your connection by tunneling traffic through SSH. The benefit here
is that all VNC traffic travels through the port used by SSH. Of course, to
connect via SSH you have to authenticate with the machine hosting the VNC
server.

The next two sections describe the server and client side changes you need to
make to tunnel VNC traffic through SSH.

### Server Side Changes

1. Create `$XDG_CONFIG_HOME/tigervnc/config`. Below is an example configuration.
   Set `session` to the desktop environment installed on the server system. Set
   `geometry` to your desired screen dimensions. The `localhost` option makes it
   so only connections from localhost get to the server. This setting then
   implies only users SSH'ed to the VNC server host can establish a VNC session.

```text
session=i3
geometry=1920x1080
localhost
alwaysshared
```

2. Restart your VNC server service using systemd. For example:

```bash
sudo systemctl restart vncserver@:1.service
```

### Client Side Changes

The server at this point only accepts connections from localhost. On the client
side, you want to SSH to the remote host and connect to the server's VNC port.
The port used by SSH and the VNC port differ. However, it's possible to tunnel
traffic between the two ports. The following command does the trick:

```bash
vncviewer -via 10.1.10.2 localhost::5901
```

10.1.10.2 is the IP address of the remote machine. 5901 is the VNC port of the
server running on the remote. Adjust these values for your setup. The `-via`
switch creates an encrypted TCP tunnel to the remote machine. It does a bit of
magic in the background and is customizable via the `VNC_VIA_CMD` environment
variable. See the [docs][2] for the full details.

[1]: https://tigervnc.org/
[2]: https://tigervnc.org/doc/vncviewer.html
