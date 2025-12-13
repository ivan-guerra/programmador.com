---
title: "NixOS Configuration"
date: 2025-12-13T11:47:43-05:00
description: "Basics of NixOS configuration."
categories: ["projects"]
tags: ["nixos"]
---

In this article, you'll learn how to improve performance, enable bluetooth, and
more in NixOS. The goal is to get you closer to a full desktop experience in
NixOS. Configurations provided in this article come from [NixOS Discourse][2]
and the [NixOS Wiki][3]. It's worth checking out both resources for more
information and help.

If you don't have a NixOS installation on your PC, you can experiment with these
configurations in a virtual machine. Check out [NixOS QEMU VM Setup][1] for
guidance. Keep in mind that some configurations may have no effect on a VM or
may require added configuration at VM launch time. The rest of this article
assumes you have a vanilla NixOS installation and are familiar with editing
`/etc/nixos/configuration.nix` and rebuilding your system via `sudo
nixos-rebuild switch`.

## Temperature Control (Intel CPUs)

To proactively prevent overheating of Intel CPUs, you can use the `thermald`
service. From the `thermald` man page:

> thermald is a Linux daemon used to prevent the overheating of platforms. This
> daemon monitors temperature and applies compensation using available cooling
> methods.
>
> By default, it monitors CPU temperature using available CPU digital
> temperature sensors and maintains CPU temperature under control, before HW
> takes aggressive correction action. 

Add the following line to your NixOS configuration file to enable `thermald`:

```nix
services.thermald.enable = true;
```

## Performance Governor

To balance performance and power consumption, you can set the CPU frequency
scaling using the `auto-cpufreq` service. Using the configuration below, you can
save power when on battery and maximize performance when plugged in:

```nix
services.auto-cpufreq.enable = true;
services.auto-cpufreq.settings = {
  battery = {
     governor = "powersave";
     turbo = "never";
  };
  charger = {
     governor = "performance";
     turbo = "auto";
  };
};
```

You can verify the current governor policy across all cores with the following
command:

```bash
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Audio

By default, NixOS uses PipeWire for audio management. Here's a basic audio
configuration using PipeWire with ALSA and PulseAudio support:

```nix
security.rtkit.enable = true;

services.pipewire = {
  enable = true;
  alsa.enable = true;
  alsa.support32Bit = true;
  pulse.enable = true;
};
```

You may also want to install `pavucontrol` for graphical volume control:

```nix
environment.systemPackages = with pkgs; [
  pavucontrol
];
```

## Bluetooth

To enable Bluetooth support in NixOS, you can use the following configuration:

```nix
hardware.bluetooth = {
  enable = true;
  powerOnBoot = true;
};
```

You can verify that the Bluetooth service is running with:

```bash
systemctl status bluetooth
```

Additionally, you may want to install packages to assist with Bluetooth
management:

```nix
environment.systemPackages = with pkgs; [
  bluez
  bluez-tools
  blueman
];
```

`blueman` provides a graphical interface for managing Bluetooth devices that
integrates with most desktop environments. `bluez-tools` includes useful
command-line utilities such as `bluetoothctl`.

## Docker

To enable Docker support in NixOS, you can use the following configuration:

```nix
virtualisation.docker.enable = true;
```

Additionally, you must add your user to the `docker` group:

```nix
users.users.<USERNAME> = {
  extraGroups = [ "wheel" "docker"];
};
```

**Be sure to replace `<USERNAME>` with your actual username.**

## sudo Without a Password

If you like to live dangerously, you can configure `sudo` to not require a
password for your user by adding the following to your NixOS configuration:

```nix
security.sudo.extraRules= [
    {
      users = [ "<USERNAME>" ];
      commands = [
        { command = "ALL" ;
          options= [ "NOPASSWD" ];
        }
      ];
    }
];
```

**Be sure to replace `<USERNAME>` with your actual username.**

## GPG Agent

GPG agent conveniently manages your GPG keys and can also handle SSH keys. To
enable the GPG agent with SSH support and a curses-based pinentry program, add
the following to your NixOS configuration:

```nix
programs.gnupg.agent = {
  enable = true;
  enableSSHSupport = true;
  pinentryPackage = pkgs.pinentry-curses; 
};
```

You can search NixOS packages for alternative pinentry options.

## OpenSSH

You can enable and configure the OpenSSH server in NixOS with the following:

```nix
services.openssh.enable = true;
services.openssh.ports = [ 54446 ];
services.openssh.settings.PasswordAuthentication = false;
```

This configuration enables the OpenSSH server, sets it to listen on port
`54446`, and disables password authentication for improved security.

You'll need to add your public SSH key to your user's `authorized_keys` file.
You can do that as follows:

```nix
  users.users.<USERNAME> = {
    openssh.authorizedKeys.keys = [
        "<YOUR_SSH_PUBLIC_KEY>"
    ];
  };
```

**Be sure to replace `<USERNAME>` with your username and `<YOUR_SSH_PUBLIC_KEY>`
with your SSH public key.**

# XServer + Desktop Manager + Window Manager

To set up a graphical environment in NixOS, you can enable the X server,
a desktop manager, and a window manager. Here's an example configuration using
`lightdm` as the desktop manager and `i3` as the window manager:

```nix
services.xserver = {
  enable = true;
  exportConfiguration = true;
  windowManager.i3.enable = true;

  displayManager =  {
    lightdm.enable = true;
    lightdm.greeters.gtk.enable = false;
    lightdm.greeters.slick.enable = true;
  };
};
services.displayManager = {
  defaultSession = "none+i3";
};
security.pam.services = {
  i3lock.enable = true;
  i3lock-color.enable = true;
}; 
```

You'll want to further configure the window manager, status bars, etc. for your
user. A follow-up article will cover how that's done using the home-manager
module.

## Conclusion

Here's the full configuration in one single snippet for easy copy-pasting:

```nix 
{ config, pkgs, ... }:

{
  services.thermald.enable = true;

  services.auto-cpufreq.enable = true;
  services.auto-cpufreq.settings = {
    battery = {
       governor = "powersave";
       turbo = "never";
    };
    charger = {
       governor = "performance";
       turbo = "auto";
    };
  };

  security.rtkit.enable = true;

  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  environment.systemPackages = with pkgs; [
    pavucontrol
    bluez
    bluez-tools
    blueman
  ];

  hardware.bluetooth = {
    enable = true;
    powerOnBoot = true;
  };

  virtualisation.docker.enable = true;

  users.users.<USERNAME> = {
    extraGroups = [ "wheel" "docker"];
    openssh.authorizedKeys.keys = [
        "<YOUR_SSH_PUBLIC_KEY>"
    ];
  };

  security.sudo.extraRules= [
      {
        users = [ "<USERNAME>" ];
        commands = [
          { command = "ALL" ;
            options= [ "NOPASSWD" ];
          }
        ];
      }
  ];

  programs.gnupg.agent = {
    enable = true;
    enableSSHSupport = true;
    pinentryPackage = pkgs.pinentry-curses; 
  };

  services.openssh.enable = true;
  services.openssh.ports = [ 54446 ];
  services.openssh.settings.PasswordAuthentication = false;

  services.xserver = {
    enable = true;
    exportConfiguration = true;
    windowManager.i3.enable = true;

    displayManager =  {
      lightdm.enable = true;
      lightdm.greeters.gtk.enable = false;
      lightdm.greeters.slick.enable = true;
    };
  };
  services.displayManager = {
    defaultSession = "none+i3";
  };
  security.pam.services = {
    i3lock.enable = true;
    i3lock-color.enable = true;
  }; 
}
```

Integrate these configurations into your existing `configuration.nix` file as
needed. As always, refer to [NixOS Packages][4] and [NixOS Options][5] for more
information on available packages and configuration options.

[1]: https://programmador.com/posts/2025/nixos-qemu-vm-setup/
[2]: https://discourse.nixos.org/
[3]: https://nixos.wiki/
[4]: https://search.nixos.org/packages
[5]: https://search.nixos.org/options
