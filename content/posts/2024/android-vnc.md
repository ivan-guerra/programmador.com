---
title: "androidVNC and Linux"
date: 2024-10-12T12:04:29-04:00
description: "How to connect your Android phone to your Linux PC from anywhere."
tags: ["linux"]
---

Have you been away from your PC and wished you could login and start a job or
view a file? Do you run Linux on your PC and use an Android phone? If you
answered yes to these questions, you came to the right place. In this article,
you'll see how to connect to and control your Linux PC from anywhere in the
world using your Android phone.

## Required Software

On your Linux PC, install the following packages using your distro's package
manager:

- [TigerVNC][1]
- [OpenSSH][2]

On your Android device, install the following apps via the Google PlayStore:

- [ConnectBot][3]
- [androidVNC][4]

## PC Side Setup

On the PC side, you need to standup the VNC server and the OpenSSH service.

### VNC Server

The ["TigerVNC on Linux"][5] article goes into detail on setting up a TigerVNC
client/server on Linux. In this case, you only need to configure and launch the
TigerVNC server. Follow the steps below to setup the server on your Linux PC:

1. Create a password by running `vncpasswd`. The password file saves to
   `$XDG_CONFIG_HOME/tigervnc/passwd`. Make sure `passwd` has its permissions
   set to `0600`.

2. Add users by editing `/etc/tigervnc/vncserver.users`. Below is an example
   `vncserver.users` file containing a single user, `ieg`, assigned to display
   `:1`:

```text
:1=ieg
```

3. Create `$XDG_CONFIG_HOME/tigervnc/config`. Below is an example configuration.
   Set `session` and `geometry` according to your needs. Note, `session` is the
   name of the desktop environment installed on your PC. You can run `echo
$XDG_CURRENT_DESKTOP` to retrieve the desktop name.

```text
session=i3
geometry=1920x1080
localhost
alwaysshared
```

4. Start your VNC server service using systemd. Set the display number to match
   the display number you configured in `vncserver.users`. For example:

```bash
sudo systemctl start vncserver@:1.service
```

### OpenSSH

1. Edit `/etc/ssh/sshd_config` (requires `sudo`) and set the `GatewayPorts`
   setting to `yes`.
2. `start`/`enable` the `sshd` service:

```bash
sudo systemctl start sshd
```

To add a bit of security to your SSH config, apply these settings to
`sshd_config`:

- Specify what users may SSH to the PC by defining `AllowUsers`. For example,
  `AllowUsers foo bar` makes it so only the users `foo` and `bar` can SSH to the
  PC.
- Disallow root login by setting `PermitRootLogin no`.
- Change the SSH port from the default \\(22\\) to some random, unused port. You
  can set the option using the `Port` config item. For example, `Port 31456`.
  Valid ports are in the range \\([1024, 65535]\\). Just be sure to pick a port
  that isn't used by some other application.
- Set `PasswordAuthentication no`. This makes it so you can only enable login
  via public key authentication.

After saving your settings, restart the `sshd` service:

```bash
sudo systemctl restart sshd
```

## Router Setup

You will need to configure port forwarding on your home router to enable SSH
traffic into your home network. If you have you're own router, you can login
into the router and setup the rule. If you rent a router from an ISP, most ISPs
provide an app that includes an "Advanced Settings" section from which you can
setup port forwarding rules. Download the app and create the rule.

Below is an example of how you would setup SSH port forwarding using an Xfinity
provided router:

1. Sign in to the Xfinity app with your Xfinity ID and password.
2. Select "WiFi" from the bottom navigation.
3. Select "View WiFi" equipment.
4. Select "Advanced Settings."
5. Select "Port forwarding."
6. Select "Add Port Forward" and continue to the next screen.
7. Select the home equipment to redirect ports from the menu of connected
   devices.
8. Setup the forwarding rule. If you followed the advice at the end of
   [OpenSSH](#openssh) and changed the SSH port from the default \\(22\\), then
   enter the port number you set in `sshd_config`.

Here's an example Xfinity port forwarding rule for SSH:

![Xfinity Port
Fowarding](/posts/2024/android-vnc/xfinity-port-fwding.webp#center)

`prim` is the name of the Linux PC on the LAN. \\(54446\\) is the port
configured for SSH on the PC. It's fine to leave the protocol set to the
"TCP/UDP" option.

## Android Device Setup

On the Android device, you only need to configure settings within the ConnectBot
and androidVNC applications.

### ConnectBot

1. Open the ConnectBot app, and tap the "+" symbol at the bottom right to add a
   new host.
2. Fill in the details in the "username@hostname:port" field. Username is the
   username of a whitelisted SSH user on the Linux PC. Hostname is the IPv4
   address of your PC. You can find this information by logging into the PC and
   going to [whatismyip.com][6]. Port is the SSH port. The default value is
   \\(22\\). If you followed the security advice at the end of [OpenSSH](#openssh),
   then be sure to set the port to match the `Port` setting in your PC's
   `sshd_config`.
3. Tap "Use pubkey authentication" and select the "Use any unlocked key" option.
4. Save your settings and return to the ConnectBot home screen.
5. Select the vertical ellipses at the top right of the screen and tap on
   "Manage Pubkeys."
6. Add a new key by tapping "+" at the top right of the screen. The default 2048
   bit RSA key settings are fine. Tap "Generate Key" when you're done making
   your selections and follow the prompts to generate entropy.
7. In the Pubkeys page, unlock your key by tapping it until the icon changes to
   that of an unlocked lock. Press and hold your key in the drop down and select
   "Copy public key."
   ![ConnectBot Pubkey](/posts/2024/android-vnc/connectbot-pubkey.webp#center)
8. Transfer the public key to your Linux PC via email or some other means. On
   your Linux PC, add the public key to the SSH users' `~/.ssh/authorized_users`
   file.
9. Back on the Android device, verify you can login to your PC via ConnectBot.
   Tap your host on the hosts page. You should see a shell like the one shown
   below.
   ![ConnectBot Session](/posts/2024/android-vnc/connectbot-session.webp#center)
10. From within the shell session, tap the vertical ellipses in the top right
    corner and select "Port Forwards."
11. Add a new port forwarding rule with type set to "Local," source port set to
    \\(5901\\) and destination set to "127.0.0.1:5901."
    ![ConnectBot Port Fwding](/posts/2024/android-vnc/connectbot-port-fwd.webp#center)

### androidVNC

1. Open the androidVNC app. You should be immediately prompted to create a new
   connection.
2. Fill out the following fields. Set "Nickname" to whatever you would like to
   call this connection. "Password" is the VNC password you set on the server.
   "Address" is \\(127.0.0.1\\). "Port" is \\(5901\\). All other settings can be
   left at their defaults.
   ![androidVNC Config](/posts/2024/android-vnc/androidvnc-config.webp#center)
3. Tap "Connect" in the top left to connect to your VNC server.
4. You should see your PC desktop loading. The first frame may take awhile to
   load.
   ![OSRS VNC](/posts/2024/android-vnc/osrs-vnc.webp#center)

After following the steps, did you get the following error message?

![androidVNC Connection Error](/posts/2024/android-vnc/androidvnc-conn-err.webp#center)

Verify in the ConnectBot app your SSH connection to the Linux PC is active. The
SSH connection must be active with the port forwarding rule enabled, else the
androidVNC connection won't make its way through to the server.

[1]: https://tigervnc.org/
[2]: https://wiki.archlinux.org/title/OpenSSH
[3]: https://play.google.com/store/apps/details?id=org.connectbot&hl=en_US
[4]: https://play.google.com/store/apps/details?id=android.androidVNC&hl=en_US&pli=1
[5]: https://programmador.com/posts/2024/tigervnc-setup/
[6]: https://www.whatismyip.com/
