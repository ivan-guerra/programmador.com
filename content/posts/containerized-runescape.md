---
title: "Containerizing Runescape"
date: 2023-01-14T21:29:52-07:00
description: "Containerizing OSRS and RS3 game clients."
tags: ["docker", "games"]
---

If you grew up gaming in the 00's and even into the 10's, you probably have
heard of Runescape. Some might be surprised to hear that people still play a
Java based MMO from early 2001. Don't worry, there is a large community of 25-30
year old gamers like myself that keep this point-and-click, grind fest of a game
alive! Jokes aside, the game has evolved significantly over the past 20-ish
years of its existence and continues to have one of the most active online
communities of any MMO.

There's two main forks of the game: Old School Runescape[^1] (OSRS) and
Runescape 3[^2] (RS3).[^3][^4] Both versions of Runescape have game clients.
There's a Java based, free, and open source client called RuneLite[^5] for OSRS.
Runescape 3 has the C++ NXT Client[^6]. I like to play both versions of the
game. I also daily a Fedora box and would rather not have to install a plethora
of dependencies to support either client (one of which is only officially
supported on Debian based distributions).

# PROJECT GOALS

I had been working with Docker[^7] for a minute. I figured containerizing the
clients would be a worthy endeavor. There were a couple of questions I needed to
answer to get this all working...

1. How do I write a Dockerfile for each client that ensures I get an image with
   all the needed dependencies and launch scripts?
1. Both games generate re-usable caches of game data. How do I get cache
   persistence between container runs?
2. How do I make a GUI work with Docker?
3. How do I get audio? I can't play OSRS without those [sweet tunes][6].

# DOCKERFILE SETUP

When it came to writing the Dockerfile, I decided to kick both client images off
with an Ubuntu base image. In the case of Runelite, the distro the client is
hosted on doesn't matter much since the client runs in the JVM. However, the NXT
C++ client only has official support on Debian based distros with most Linux
users seemingly happy running the client on Ubuntu machines.

Aside from installing the required client dependencies[^8], both images create a
local `runescape` user. The `runescape` user is made part of the `audio` group.
Making a user part of the `audio` group is not recommended on desktop
Ubuntu[^9], however, I found it necessary in order to get audio working along
with steps in [Audio Setup](#audio-setup).

# CACHE PERSISTENCE

This issue was actually fairly easy to tackle. Docker has support for what are
known as volumes[^10]. The gist of it is that you can mount a folder on the host
filesystem to the container filesystem. When the container shutdowns, any data
that was written to the volume by the container will persist. Volumes fit my use
case perfectly. The container launch scripts I developed for each client include
a `*_CACHE` variable that makes the cache name and location customizable.

# ON DOCKER CONTAINERS AND GUIS

Running a GUI from a Docker container is, in my opinion, a pain in the ass.
That said, there's plenty of docs you can slog through to piece together a
solution. The display server technology really matters here. There are two
mainstream Linux display server implementations out there: X11[^11] and
Wayland[^12]. I'm not really qualified to have an opinion on which is better
than the other. I do know that most of the distros I use stick with X11 so I
focused my effort on making my containers compatible with an X11 setup.

Here's a summary of the steps I took to get a GUI running in a container to
display on my host system running an X11 server:

* Ensure the container has `xorg-server` installed.
* Share the host X11 server socket with the container.
* Generate and share a .Xauthority[^13] file with the container.
* Set the container's `DISPLAY` environment variable to match the `DISPLAY`
  value on the host system.

Below is a snippet from the launch.sh[^14] file used to launch a RuneLite client
container. I left in those lines that implement each of the critical bits
mentioned above:

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

# AUDIO SETUP

I got lucky with the audio setup and came across an article[^15] that explains
how to get audio from a docker container to pass through to the host's speakers.
Similar to the X11 versus Wayland display server discussion, there are different
audio servers in Linux. PulseAudio seems to be the de facto audio server with
PipeWire[^16] the other contender of note.

Assuming PulseAudio is installed on the host, there are two ingredients to get
the container to host audio working:

* Ensure the container has a PulseAudio server installed.
* Expose the pulseaudio socket on the host to the container.

Below is a snippet of the RuneLite client launch script with the relevant bits
left in:

```bash
docker run --rm \
    -e PULSE_SERVER=unix:/run/user/${EUID}/pulse/native \
    -v /run/user/${EUID}/pulse/native:/run/user/${EUID}/pulse/native \
    ...
```

# RUNELITE GREMLINS...

![Goblins!](/posts/containerized-runescape/goblins.png#center)

No project is free of gremlins. While the RS3 container was working as expected,
the RuneLite client would seemingly load and then cut out before the login
screen! Turns out that the `RuneLite.jar` that's executed on container launch
goes through a two step process. The first step spawns a process with a GUI
where it shows you what client updates are being downloaded. That process is
then killed and a second process spawns which brings up the GUI for the client
itself. The killing of the first process would cause my container to shutdown
because docker thought that the process I told the container to run had finished
(which technically it had). The second process wouldn't even get a chance to
run...

Well I didn't have it in me to come up with a fancy solution. What I cooked up
was the following hack script:

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
When the docker container launches, it will run the script above. What happens
is that the first line will spawn the process which downloads updates. When the
first process terminates, within a few seconds (I give myself a big 20sec
buffer), the second, client process will spawn. I capture that client processes'
PID and "wait" on it until the user exits the client. It ain't elegant but it
works.

# CONCLUSION

Containerizing RS3 and OSRS turned out to be possible though I had to bleed a
bit getting there. I found getting the GUI and audio working to be the most
challenging part. The brightside is that the steps I discovered have been useful
on other projects where I needed those features. Performance on my admittedly
dated laptop has been good with no noticeable overhead to running inside the
container versus on the host. [Now we can finally play the game][19].

You can find the complete source with build instructions, usage, etc. on my
GitHub page: [containerized_runescape][20].

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

[^1]: [Old School Runescape][1]
[^2]: [Runescape 3][2]
[^3]: The [OSRS Wikipedia page][15] has a good summary of why there's two
    version of Runescape.
[^4]: If you have never player Runescape and are curious what it is and which
    version to play, [J1mmy's][16] video might help you decide.
[^5]: See the [Runelite Client][3] project page.
[^6]: See the [Runescape 3 NXT Client][4] project page.
[^7]: New to Docker? Luckily, [Docker][5] has great docs and tutorial to get you
    started.
[^8]: Checkout the [RuneLite][17] and [NXT][18] Dockerfiles to see what
    dependencies are required by each client.
[^9]: We're kinda taking a sledge hammer to a nail by adding our user to the
    `audio` group in our container. Ubuntu recommends against this:
    [TheAudioGroup][14].
[^10]: See Docker's [Volumes][7] docs for the full details on volumes in Docker.
[^11]: See the [X11][8] Wikipedia page.
[^12]: See the [Wayland][9] project page.
[^13]: The [X Window authorization][10] wiki gives a good explanation of
    `.Xauthority` and its function.
[^14]: RuneLite [`launch.sh`][11]
[^15]: [Passing audio into docker container][12]
[^16]: See the [PipeWire][13] project page.
