---
title: "Containerizing Runescape"
date: 2023-01-14T21:29:52-07:00
description: "Containerizing OSRS and RS3 game clients."
tags: ["docker", "games"]
---

If you grew up gaming in the 00's and even into the 10's, you probably have
heard of Runescape. Even in 2023, Runescape remains one of the world's most
popular MMOs. The game has evolved significantly over the past 20-ish
years of its existence and continues to have one of the most active online
communities of any MMO.

There's two main forks of the game: [Old School Runescape][1] (OSRS) and
[Runescape 3][2] (RS3). Both versions of Runescape have game clients. There's a
Java based, free, and open source client called [RuneLite][3] for OSRS.
Runescape 3 has the C++ [NXT Client][4]. I like to play both versions of the
game on a Fedora box. It would be nice not to have to install a plethora of
dependencies to support either client (one of which is only officially supported
on Debian based distributions).

## Project Goals

Recent experiences with [Docker][5] suggested that containerizing the game
clients would be a worthy endeavor. A couple of questions came up during a
brainstorming session:

1. How do you write a Dockerfile for each client that ensures you get an image
   with all the needed dependencies and launch scripts?
1. Both games generate re-usable caches of game data. How do you get cache
   persistence between container runs?
1. How do you make a GUI work with Docker?
1. How do you get audio? You can't play OSRS without those [sweet tunes][6].

## Dockerfile Setup

Both Dockerfiles build off an Ubuntu base image. In the case of RuneLite, the
host distro doesn't matter much since the client runs in the JVM. However, the
NXT C++ client only has official support on Debian based distros with most Linux
users happy running the client on Ubuntu machines.

Aside from installing the required client dependencies, both images create a
local `runescape` user. The `runescape` user belongs to the `audio` group.
Making a user part of the `audio` group [isn't recommended][14] on desktop
Ubuntu. That said, it's necessary to get audio working along with the steps in
[Audio Setup](#audio-setup).

## Cache Persistence

This issue was actually easy to tackle. Docker has support for what it calls
[volumes][7]. With a Docker volume you mount a folder on the host filesystem to
the container filesystem. When the container shutdowns, any data written to the
volume by the container will persist. Volumes fit the use case well. A per
client container launch script includes a `*_CACHE` variable that makes the
cache name and location customizable.

## On Docker Containers and GUIs

Running a GUI from a Docker container is a pain in the ass. That said, there's
plenty of docs you can slog through to piece together a solution. The display
server technology matters here. There are two mainstream Linux display server
implementations out there: [X11][8] and [Wayland][9]. Most distros stick with
X11. The scripts developed for this project target compatibility with X11.

Here's a summary of the steps required to get a GUI running in a container to
display on the host system running an X11 server:

- Verify the container has `xorg-server` installed.
- Share the host X11 server socket with the container.
- Generate and share a [.Xauthority][10] file with the container.
- Set the container's `DISPLAY` environment variable to match the `DISPLAY`
  value on the host system.

Below is a snippet from the [launch.sh][11] file used to launch a RuneLite
client container:

```bash
# Credit to this SO post that shows a method for generating an Xauthority file on the fly.
# https://stackoverflow.com/questions/16296753/can-you-run-gui-applications-in-a-linux-docker-container/25280523#25280523
XSOCK="/tmp/.X11-unix"
XAUTH="/tmp/.docker.xauth"
touch ${XAUTH}
xauth nlist $DISPLAY | sed -e 's/^..../ffff/' | xauth -f $XAUTH nmerge -

docker run --rm \
    -v ${XSOCK}:${XSOCK} \
    -v ${XAUTH}:${XAUTH} \
    -e XAUTHORITY=${XAUTH} \
    -e DISPLAY=${DISPLAY} \
    ...
```

## Audio Setup

Luckily, there is a great article explaining container to host [audio pass
through][12]. Similar to the X11 versus Wayland display server discussion, there
are different audio servers in Linux. PulseAudio seems to be the defacto audio
server with [PipeWire][13] the other contender of note.

There are two ingredients to get the container to host audio working:

- Verify the container has a PulseAudio server installed.
- Expose the PulseAudio socket on the host to the container.

Below is a snippet of the RuneLite client launch script with the relevant bits
left in:

```bash
docker run --rm \
    -e PULSE_SERVER=unix:/run/user/${EUID}/pulse/native \
    -v /run/user/${EUID}/pulse/native:/run/user/${EUID}/pulse/native \
    ...
```

## RuneLite Gremlins

![Goblins!](/posts/2023/containerized-runescape/goblins.webp#center)

No project is free of gremlins. While the RS3 container was working as expected,
the RuneLite client would load and then cut out before the login screen! Turns
out that the `RuneLite.jar` that's executed on container launch goes through a
two step process. The first step spawns a process with a GUI where it shows
client update downloads. That process is then killed and a second process spawns
which brings up the GUI for the client itself. The killing of the first process
causes the container to shutdown because docker believes the containerized
process has completed its run. The second process won't even get a chance to
run.

The following hack resolved the issue:

```bash
# Run RuneLite.
java -jar /usr/local/bin/RuneLite.jar

# Give RuneLite a few seconds to boot up.
sleep 20

# Find the PID of RuneLite client process.
RUNELITE_PID=$(pidof java)

# Wait until the User exits the RuneLite client session.
tail --pid=$RUNELITE_PID -f /dev/null
```

When the docker container launches, it will run this script. What happens is
that the first line will spawn the process which downloads updates. When the
first process terminates, within a few seconds (I give myself a big 20sec
buffer), the second client process will spawn. The second processes' PID gets
captured. The `tail` command causes the script to wait until the RuneLite PID is
no more (that is, the client has exited). It's ugly but it works.

## Conclusion

Containerizing RS3 and OSRS turned out to be possible with some effort. Getting
the GUI and audio working posed the largest challenge. The bright side is that
the information provided here is useful in many other containerization contexts.
Performance on an admittedly dated laptop has been good with no noticeable
overhead to running inside the container versus on the host. [Time to finally
play the game][19].

The complete source with build instructions, usage, etc. is available on GitHub
under [containerized_runescape][20].

[1]: https://oldschool.runescape.com/
[2]: https://play.runescape.com/runescape
[3]: https://runelite.net/
[4]: https://runescape.wiki/w/NXT
[5]: https://www.docker.com/
[6]: https://www.youtube.com/watch?v=BJhF0L7pfo8
[7]: https://docs.docker.com/storage/volumes
[8]: https://en.wikipedia.org/wiki/X_Window_System
[9]: https://wayland.freedesktop.org/
[10]: https://en.wikipedia.org/wiki/X_Window_authorization#Cookie-based_access
[11]: https://github.com/ivan-guerra/containerized_runescape/blob/master/osrs/launch.sh
[12]: https://comp0016-team-24.github.io/dev/problem-solving/2020/10/30/passing-audio-into-docker.html
[13]: https://pipewire.org/
[14]: https://wiki.ubuntu.com/Audio/TheAudioGroup
[15]: https://en.wikipedia.org/wiki/Old_School_RuneScape#Development_and_release
[16]: https://www.youtube.com/watch?v=-IJqwg0HWUI
[17]: https://github.com/ivan-guerra/containerized_runescape/blob/master/osrs/Dockerfile
[18]: https://github.com/ivan-guerra/containerized_runescape/blob/master/rs3/Dockerfile
[19]: https://www.youtube.com/watch?v=tg2PD-dwsIw
[20]: https://github.com/ivan-guerra/containerized_runescape
