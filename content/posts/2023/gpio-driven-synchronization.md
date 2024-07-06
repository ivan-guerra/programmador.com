---
title: "GPIO Driven Synchronization"
date: 2023-05-29T21:24:12-07:00
description: "Synchronizing two single board computers using only GPIO."
tags: ["c++", "beaglebone", "realtime"]
math: true
---

Have you ever heard of the [Kuramoto Model][1]? The Kuramoto Model Wikipedia
page has an impressive video showing out of phase metronomes synchronizing:

{{< youtube QyX-Vs_mwsI >}}

Could two or more computers synchronize in a similar fashion? What would be the
common "fabric" between the machines? In the clip with the metronomes, the base
board is crucial in bringing the metronomes into phase. Perhaps you could use
GPIO signals to achieve a similar link between two computers.

## Architecting a Test

At a high level, you want to solve the problem of synchronizing two identical,
cyclic tasks running on separate but identical hardware. A 1Hz task that blinks
an LED would be an appropriate test program. The goal would be to run the blink
program on both machines and, through the magic of the Kuramoto Model, the two
LEDs would eventually blink in unison.

How would one computer communicate when it last ran to other? You can connect
the output GPIO that drives the LED to an input GPIO on the peer board! Below is
a sketch of the setup:

```text
                +-------------------------------------------+
                |BeagleBone Black 1                         |
  BBB2_GPIO_OUT |   +----------+               +---------+  | BBB1_GPIO_OUT
----------------+-->|  gtimer  |               |  gsync  +--+--------------->
                |   +----+-----+               +----^----+  |
                |        |                          |       |
                |        |                          |       |
                |   +----v--------------------------+----+  |
                |   |            Shared Memory           |  |
                |   +------------------------------------+  |
                |                                           |
                +-------------------------------------------+

                +-------------------------------------------+
                |BeagleBone Black 2                         |
  BBB1_GPIO_OUT |   +----------+               +---------+  | BBB2_GPIO_OUT
----------------+-->|  gtimer  |               |  gsync  +--+--------------->
                |   +----+-----+               +----^----+  |
                |        |                          |       |
                |        |                          |       |
                |   +----v--------------------------+----+  |
                |   |            Shared Memory           |  |
                |   +------------------------------------+  |
                |                                           |
                +-------------------------------------------+
```

Each BBB would host two processes: `gtimer` and `gsync`. The `gtimer` process
monitors an input GPIO. `gtimer` blocks on the GPIO waiting for a rising edge
event. When the input GPIO goes high, `gtimer` logs the time when the signal
arrived in shared memory. Here's a flowchart showing how `gtimer` does its
thing:

```text
+------------+     +-----------------+     +----------------------+     +----------------------+
| Init Shmem +---->| Init Input GPIO +---->| Wait for Rising Edge +---->| Write Wakeup Time to |
+------------+     +-----------------+     |        Event         |     |         Shmem        |
                                           +----------^-----------+     +----------+-----------+
                                                      |                            |
                                                      +----------------------------+
```

`gsync` is essentially the blink program. `gsync` runs at a configurable rate,
in this case 1Hz. `gsync` will immediately signal to its peer wakeup has
occurred using an output GPIO. `gsync` then proceeds to read shared memory to
know when its peer last ran. Using its own wakeup time and peer wakeup time,
`gsync` can run the Kuramoto Model to compute a wakeup timer delta. The next
wakeup time will be closer to bringing the process into sync with its peer.
Here's a flowchart showing how `gsync` works:

```text
+-------------------+       +------------------+
| Attached to Shmem +------>| Init Output GPIO |
+-------------------+       +--------+---------+
                                     |
                         +-----------v--------------+
                    +----> Get CLOCK_MONOTONIC Time |
                    |    +-----------+--------------+
                    |                |
                    |   +------------v---------------+
                    |   | Send Wakeup Signal to Peer |
                    |   +------------+---------------+
                    |                |
                    |    +-----------v--------------+
                    |    | Compute Next Wakeup Time |
                    |    +-----------+--------------+
                    |                |
                    |    +-----------v-------------+
                    +----+ Sleep Until Next Wakeup |
                         +-------------------------+
```

The best implementation of `gsync` and `gtimer` isn't immediately obvious.
However, the hardware setup is pretty straightforward so lets look at that
first.

## Hardware Test Setup

You need two computers with which to test. The [Beaglebone Black][2] (BBB)
single board computer is a good choice. The BBB is a good candidate for the
following reasons:

1. High availability.
2. The BBB has a ton of unallocated GPIOs.
3. The BBB runs Linux and so you can use the usual dev tools to build and deploy
   software.

The circuit below describes the hardware interconnect:

![Sync Circuit](/posts/2023/gpio-driven-synchronization/gsync-circuit.webp#center)

`P9_15` is the input GPIO and `P9_23` is the output GPIO. You can choose other
pins if you like. Notice that the input and output GPIOs cross. **That is,
BBB1's output GPIO is BBB2's input GPIO and vice versa**. A 470 Ohm resistor
limits current to the LED. The resistor also serves as short circuit protection
in case the GPIOs mistakenly are both outputs with one side set high and the
other set low.

Speaking of GPIO configuration, many of the pins on the BBB support multiple
functions. Chapter 6 of the book ["Exploring BeagleBone"][3] gives nice coverage
of how to configure the GPIOs on the BBB. Verify `P9_15` and `P9_23` are free.
You must configure the pins as GPIO with internal pull down resistors enabled
(mux mode 7). **If you choose to use different pins, make sure you configure
them correctly before powering the circuit!**

## Doing Things Real-time

To achieve half decent sync results, execute `gtimer` and `gsync` as real-time
processes on a Linux kernel supporting preemption. The task of configuring and
building an RT Linux kernel is nontrivial even in 2023. The
[bbb_kernel_builder][4] project streamlines the process of building a Linux
kernel for the BBB with the `PREEMPT_RT` patches applied.

There's more to setting up a real-time Linux application than configuring and
building the kernel. A lot more. ["Real-Time Linux App Development"][5] goes
into the details. The article provides a checklist of all the tweaks you can
make at the system and source code level to achieve deterministic behavior. Both
the `gtimer` and `gsync` implementations follow the guidelines given in the
linked article:

- Prefault heap and stack memory.
- Lock pages to memory and disable `mmap` usage.
- Configure inter-process mutexes with the `PTHREAD_PRIO_INHERIT` and
  `PTHREAD_PROCESS_SHARED` attributes.
- Set cyclic tasks to use absolute time values as their next wakeup. Reference
  the `CLOCK_MONOTONIC` clock for time.

You don't need to hardcode the scheduling policy and priorities in the source.
Instead, you can use the `chrt` utility to set those parameters up from the run
script:

```bash
#!/bin/bash

GPIO_DEVNAME="/dev/gpiochip1"
GPIO_IN_OFFSET=16
GPIO_OUT_OFFSET=17
SHMEMKEY=57005
GTIMER_PRIO=80
GSYNC_PRIO=70
FREQ_HZ=1
COUPLING_CONST=0.5

chrt --fifo $GTIMER_PRIO ./gtimer $GPIO_DEVNAME $GPIO_IN_OFFSET $SHMEMKEY &

chrt --fifo $GSYNC_PRIO \
    ./gsync -f $FREQ_HZ -k $COUPLING_CONST $GPIO_DEVNAME $GPIO_OUT_OFFSET \
            $SHMEMKEY &
```

`SCHED_FIFO` was the most appropriate RT scheduling policy for this application.
`gtimer` has a higher priority than `gsync` because you want to log
the time when the peer signal arrives ASAP. That means that `gtimer` may have to
preempt a running `gsync`.

One thing you'd usually do on a multicore system is allocate your cores among
the real-time processes. The BBB is a **single core** system meaning your RT
processes get to run on the same core as all the `SCHED_OTHER` tasks. There's
not much you can do about this. That said, the code is portable to other systems
running Linux. An interesting follow-up experiment would be porting this project
to a multicore platform. You could dedicate a core to each RT process and
compare the measured latencies with those presented at the end of this article.

## GPIO Woes

One of the more tedious parts of implementing this sync concept is getting
software control of the GPIOs right. You might start with the legacy sysfs API
for GPIO control. The general idea is that you can control the behavior and
state of a GPIO pin by writing/reading data in a number of different text files.
You can export GPIOs to `/sys/class/gpio/export`. You compute the GPIO number
using the formula `GPIO_NUM = (32 * CHIPNUM) + OFFSET`. After exporting the
GPIO, you get a nice file structure like the one shown below:

```bash
root@gsync:~# ls /sys/class/gpio/gpio48
active_low device direction edge label power subsystem uevent value
```

In the snippet, you have the property files for `gpio48` AKA `GPIO1_16` (chip
1/offset 16) associated with the BBB header pin labeled `P9_15`. If you wanted
to set the pin to be an output pin, you could write `out` to the `direction`
file:

```bash
echo out > /sys/class/gpio/gpio48/direction
```

If you wanted to set the pin high, you could write `1` to the `value` file:

```bash
echo 1 > /sys/class/gpio/gpio48/value
```

You get the idea. The sysfs method of GPIO control is nice for one-and-done
configurations. That said, you can imagine that opening and closing a file every
time you want to toggle a pin is pretty inefficient. You might get away with it
running at 1Hz but if you ever decide to up the rate, repeated file IO is going
to hurt performance.

So what's the best way of controlling GPIOs from userspace these days? The
answer is `libgpiod`. `libgpiod` uses the character device interface to the
GPIOs. You don't lose any of the functionality you had with the sysfs API and
you don't have to deal with the ioctl-based kernel-userpace interaction
directly. It even gets bonus points for coming with C++ bindings and a set of
useful examples. It's hard to misuse the API since it throws exceptions for
every imaginable error. The time efficiency in toggling a GPIO is also optimal.

## The Kuramoto Model

Finally, it's time to implement the Kuramoto Model. Step one is to translate the
equation from the wiki page to something manageable in the code. Here's the
original equation:

\\[ {d\theta \over dt} = \omega_i + {K \over N}\sum_{i=1}^N \sin(\theta_j -
\theta_i) \\]

## Phase Angles and Time

One thing is immediately apparent: you need a way to convert time to phase
angles and vice versa. Your blink task has a known frequency of 1 Hertz meaning
one complete task cycle takes 1 second. You can map portions of the cycle in
seconds to angles on the unit circle. For example,

- 0.00 -> \\( 0 \\) radians
- 0.25 -> \\( \pi \over 2 \\) radians
- 0.50 -> \\( \pi \\) radians
- 0.75 -> \\( 3 \pi \over 2 \\) radians
- 1.00 -> \\( 2 \pi \\) radians

The relationship between time, \\(t\\), and frequency, \\(F\\), is
\\( t = {1 \over F} \\). You're interested in the time it takes to move some
angle \\( \theta \\) in radians. What you find is that

\\[ t = {\theta \over {2 \pi F}} \\]

To go from time to angle you can solve for \\(\theta\\):

\\[ \theta = {2 \pi F t} \\]

Note, the \\( t \\) is in units of seconds. The `gsync` implementation tracks
time in units of nanoseconds. The conversion equations used in [the code][6]
account for the units change.

## The Wakeup Delta

At this point, you're ready to plug some numbers into the base equation to
compute \\( d\theta \over dt \\)! Fill in the blanks on the terms:

- \\( \omega_i \\) -> This is your base frequency. In radians, the base
  frequency is \\( 2 \pi \\).
- \\( K \\) -> This is the coupling constant and is a tuneable parameter.
  `gsync` defaults to \\( K = 0.5 \\).
- \\( N \\) -> This is the number of participants. Since you are syncing 2
  computers, \\( N = 2 \\).
- \\( \theta_j \\) -> This is your peer's phase offset from the ideal base
  frequency. You can compute \\( \theta_j \\) by taking your peer's reported
  wakeup time and converting to a phase angle using the conversion function
  previously derived.
- \\( \theta_i \\) -> This is your own phase offset. Similar to \\( \theta_j
  \\), \\( \theta_i \\) converts your actual wakeup time to a phase angle. To
  explain a bit further, you have an expected and an actual wakeup time on the
  computer. The expected time is the time you would execute if there were no
  additional latencies imposed by the system. The actual wakeup time is the
  measured time after you resume execution. In short, you're off phase from the
  desired base frequency and the model uses \\( \theta_i \\) to account for that.

In the code, the sync function takes as input the computer's actual wakeup time
and the last reported peer wakeup time extracted from shared memory. Using the
latter information, along with frequency and coupling constant info given at
program startup, `gsync` computes \\( d\theta \over dt\\) and converts it to a
time in nanoseconds. That time is an offset to the next `gsync` wakeup time.

As an example, suppose `gsync` ran with a frequency of 1 Hz or every 1 seconds.
Also suppose the sync function returned time deltas in seconds. If the sync
function returned a time delta of \\( -0.5 \\), then `gsync` would next sleep
for \\( 1 - 0.5 = 0.5 \\) seconds (that is, `gsync` will wakeup _earlier_ by
half a second). Maybe the sync function over shot. In the next run, the sync
function returns a delta of \\( 0.8 \\), then `gsync` will sleep for \\( 1.0 +
0.8 = 1.8 \\) seconds (that is, it will wakeup _later_). Essentially, the delta
in the wakeup time of the computers oscillates about \\( 0 \\)! The smaller the
oscillations, the better the sync.

## The End Result

In the end, what do you see? Well, running `gtimer` and `gsync` on both BBBs
with the frequency of `gtimer` set to 1 Hz and the coupling constant set to \\(
0.5\\), you see two LEDs blinking synchronously. It takes maybe 3 to 4 cycles
(blinks) before they flash in unison. Running both processes for a day and
doesn't produce any noticeable hiccups in the sync!

You can also play a bit with the coupling constant to see what sort of effect it
has. You can increment the coupling constant in steps of \\( 0.1 \\) starting at
\\( K = 0.1 \\). What you'll find is that if \\( K \\) is too low, the LEDs
never seem to synchronize. After crossing a threshold value, synchronization
always seems to occur.

So the sync at 1Hz "looks good enough." Still, it would be interesting to
measure using an oscilloscope the delay between the rising edge of one
computer's signal versus the other's. You can experiment with a number of different
rates starting at 1Hz and ramping up to about 500Hz in increments of 50Hz. Below
is a histogram of the time deltas you would encounter on a 100Hz run:

![100Hz Run](/posts/2023/gpio-driven-synchronization/100hz-0.5.webp#center)

With about 20,000 samples, the average delay was ~100 usec. More interesting
than the average is the absolute maximum delay which was approximately 572 usec.
These observations more or less held true for all test runs in the range [1,
400] Hertz.

Beyond the 400Hz run rate, you start to see some oddball results. Below is a
capture of a 500Hz run:

![500Hz Run](/posts/2023/gpio-driven-synchronization/500hz-0.5.webp#center)

The average delta was still approximately 100 usec. The maximum delta saw huge
spikes around 2.7 ms. Worse yet, these were more than just a few outliers, there
were multiple hits in the 2.5 ms range. Are the spikes driven by weak coupling?
Is there a timing bug between `gtimer` and `gsync`? Questions for another day.

## Conclusion

Synchronizing at least two computers linked via only GPIO is possible. Better
yet, the Kuramoto Model used to bring the two machines into phase is relatively
straightforward to code and reason about. Moreover, submillisecond
synchronization is achievable for rates below 500Hz on bargain hardware using
free and open source software.

The complete project source with build instructions, usage, etc. is available on
GitHub under [gsync][7].

[1]: https://en.wikipedia.org/wiki/Kuramoto_model
[2]: https://beagleboard.org/black
[3]: https://www.amazon.com/Exploring-BeagleBone-Techniques-Building-Embedded/dp/1118935128#:~:text=Exploring%20BeagleBone%20provides%20a%20reader,and%20modules%2C%20with%20practical%20examples
[4]: https://github.com/ivan-guerra/bbb_kernel_builder
[5]: https://programmador.com/posts/2023/real-time-linux-app-development/
[6]: https://github.com/ivan-guerra/gsync/blob/master/src/sync/sync.cc
[7]: https://github.com/ivan-guerra/gsync
