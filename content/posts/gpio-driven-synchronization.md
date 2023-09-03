---
title: "GPIO Driven Synchronization"
date: 2023-05-29T21:24:12-07:00
description: "Synchronizing two single board computers using only GPIO."
tags: ["c++", "beaglebone", "realtime"]
toc: true
math: true
---

![Synchronized BeagleBone Computers](/posts/gpio-driven-synchronization/synced.jpg#center)

I happened to stumble across a pretty neat Wikipedia page: [Kuramoto Model][1].
I was impressed by a video on the page showing out of phase metronomes
synchronizing seemingly by magic:

{{< youtube QyX-Vs_mwsI >}}

I guess I didn't pay enough attention in physics because everyone and I showed
this to was aware this was a thing...

The thought occurred to me that two or more computers could likely be
synchronized using this model. The tricky part would be having the computers
share a common "fabric". In the clip with the metronomes, the base board is
crucial in bringing the metronomes into phase. I figured two computers could
similarly be synced using GPIO as the link.

## Architecting a Test

At a high level, the problem I wanted to solve was synchronizing two identical,
cyclic tasks running on seperate but identical hardware. I figured a 1Hz task
that blinks an LED would be an appropriate test program. My goal would be to run
the blink program on both machines and, through the magic of the Kuramoto Model,
the two LEDs would eventually blink in unison.

How would one computer communicate when it last ran to other? I could connect
the output GPIO that drives the LED to an input GPIO on the peer board! Below is
a sketch of the setup:


![High Level Design](/posts/gpio-driven-synchronization/high-level-overview.png#center)

Each BBB would host two processes: `gtimer` and `gsync`. The `gtimer` process
monitors an input GPIO. `gtimer` blocks on the GPIO waiting for a rising edge
event. When the input GPIO goes high, `gtimer` logs the time when the signal
arrived in shared memory. Here's a flowchart showing how `gtimer` does its
thing:

![gtimer State Machine](/posts/gpio-driven-synchronization/gtimer-state-machine.png#center)

`gsync` is what was described above as the blink program. `gsync` runs at a
configurable rate, in this case 1Hz. `gsync` will immediately signal to its peer
wakeup has occurred using an output GPIO. `gsync` then proceeds to read shared
memory to know when its peer last ran. Using its own wakeup time and peer wakeup
time, `gsync` can run the Kuramoto Model to compute a delta to be applied to
its next wakeup time. If all goes well, on our next wakeup we'll be closer to
phase locking with the peer. Here's a flowchart showing how `gsync` works:


![gsync State Machine](/posts/gpio-driven-synchronization/gsync-state-machine.png#center)

The best&trade; implementation of `gsync` and `gtimer` is not immediately
obvious.  However, the hardware setup is pretty straighforward so lets look at
that first.

## Hardware Test Setup

I needed two computers with which to test. Luckily for me, I was able to get my
hands on two BeagleBone Black[^1] (BBB) single board computers. The BBB is a
good candidate because

1. Its what I had available.
2. The BBB has a ton of unallocated GPIOs.
3. The BBB runs Linux and so we can use the usual dev tools to build and deploy
   software.

The circuit I built looks like what's shown below:

![Sync Circuit](/posts/gpio-driven-synchronization/gsync-circuit.jpg#center)

I chose `P9_15` as the input GPIO and `P9_23` as the output GPIO. Notice that
the input and output GPIOs cross. **That is, BBB1's output GPIO is BBB2's input
GPIO and vice versa**. I used a 470 Ohm resistor to limit current to the LED.
The resistor also serves as short circuit protection in the case the connected
GPIOs are misconfigured to both be output with one side set high and the other
set low.

Speaking of GPIO configuration, many of the pins on the BBB support multiple
functions. Chapter 6 of the book "Exploring BeagleBone"[^2] gives nice coverage
of how to configure the GPIOs on the BBB. I made sure that `P9_15` and `P9_23`
were unallocated pins configured as GPIO (mux mode 7) with internal pull down
resistors enabled. **If you choose to use different pins, make sure they are
configured correctly before powering the circuit!**

## Doing Things Real-Time

To achieve half decent sync results, I decided to have `gtimer` and `gsync`
execute as real-time processes on a Linux kernel supporting preemption. The task
of configuring and building an RT Linux kernel is nontrivial even in 2023. I
have a small project, [bbb_kernel_builder][4], that streamlines the process of
building a Linux kernel for the BBB with the `PREEMPT_RT` patches applied.

There's more to setting up a real-time Linux application than configuring and
building the kernel. A lot more. In ["Real-Time Linux App Development"][5] I go
into detail and provide a checklist of all the little tweaks that can/should be
made at the system and source code level in order to achieve deterministic
behavior. Both the `gtimer` and `gsync` implementations follow the guidelines
given in the linked article:

* Heap and stack memory are pre-faulted.
* All allocated memory pages are locked and `mmap` usage is disabled.
* Inter-process mutexes are configured with the `PTHREAD_PRIO_INHERIT` and
  `PTHREAD_PROCESS_SHARED` attributes.
* Cyclic tasks use absolute time values to set their next wakeup. The
  `CLOCK_MONOTONIC` clock is referenced for time.

The scheduling policy and priorities are not hardcoded in the source but are
instead set using the `chrt` utility from the project run script:

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
`gtimer` is set to have a higher priority than `gsync` because we want to log
the time when the peer signal arrives ASAP. That means that `gtimer` may have to
preempt a running `gsync`.

One thing I'd usually do on a multicore system is allocate my cores among the
real-time processes. Unfortunately, the BBB is a **single core** system meaning
my RT processes get to run on the same core as all the peasant `SCHED_OTHER`
tasks. There's not much we can do about this. That said, the code is portable to
other systems running Linux. An interesting follow-up experiment would be
getting this project on a platform on which we could dedicate a core to each RT
process and comparing the measured latencies with those presented at the end of
this article.

## GPIO Woes

One of the more tedious parts of implementing this sync concept was getting
software control of the GPIOs right. I mistakenly started out using the legacy
sysfs API for GPIO control. If you're unfamiliar, the general idea is that you
can control the behavior and state of a GPIO pin by writing/reading data in a
number of different text files associated with the pin. GPIOs can be exported to
`/sys/class/gpio/export` where the GPIO numbers are computed using the formula
`GPIO_NUM = (32 * CHIPNUM) + OFFSET`. After exporting the GPIO, you get a nice
file structure like the one shown below:

```bash
root@gsync:~# ls /sys/class/gpio/gpio48
active_low device direction edge label power subsystem uevent value
```

In the snippet above, we have the property files for `gpio48` AKA `GPIO1_16`
(chip 1/offset 16) associated with the BBB header pin labeled `P9_15`. If we
wanted to set the pin to be an output pin, we could write `out` to the
`direction` file:

```bash
echo out > /sys/class/gpio/gpio48/direction
```

If we wanted to set the pin high, we could write `1` to the `value` file:
```bash
echo 1 > /sys/class/gpio/gpio48/value
```

You get the idea. The sysfs method of GPIO control is nice for one-and-done
configurations. That said, you can imagine that opening and closing a file
everytime you want to toggle a pin is pretty inefficient. We might get away with
it running at 1Hz but if we ever decide to up the rate, repeated file IO is
going to hurt performance.

So what's the approved way of controlling GPIOs these days? The answer is
`libgpiod`[^3]. `libgpiod` uses the character device interface to the GPIOs exposed
by the kernel since at least version 4.8. You don't lose any of the
functionality you had with the sysfs API and you don't have to deal with the at
times challenging ioctl-based kernel-userpace interaction directly. It even gets
bonus points for coming with C++ bindings and a set of useful examples. Unless
you misuse the API (which is pretty hard when using the C++ bindings because it
throws exceptions for every imaginable error), it does the job and is as
efficient as possible[^4].

## The Kuramoto Model

Finally, we get to talk about implementing the Kuramoto Model. Step one was to
translate the equation from the wiki page to something I could manage in the
code. Here's the original equation:

\\[ {d\theta \over dt} = \omega_i + {K \over N}\sum_{i=1}^N \sin(\theta_j -
\theta_i) \\]

## Phase Angles and Time

One thing was immediately apparent: I needed a way to convert time to phase
angles and vice versa. Our blink task has a known frequency of 1 Hertz meaning
one complete task cycle takes 1 second. We can map portions of the cycle in
seconds to angles on the unit circle. For example,

* 0.00 -> \\( 0 \\) radians
* 0.25 -> \\( \pi \over 2 \\) radians
* 0.50 -> \\( \pi \\) radians
* 0.75 -> \\( 3 \pi \over 2 \\) radians
* 1.00 -> \\( 2 \pi \\) radians

The relationship between time, \\(t\\), and frequency, \\(F\\), is
\\( t = {1 \over F} \\). We're interested in the time it takes to move some
angle \\( \theta \\) in radians. What we find is that

\\[ t = {\theta \over {2 \pi F}} \\]

To go from an angle to time we can solve for \\(\theta\\):

\\[ \theta = {2 \pi F t} \\]

Note, the \\( t \\) above is in units of seconds. The `gsync` implementation
tracks time in units of nanoseconds. The conversion equations used in [the
code][9] account for the units change.

## The Wakeup Delta

At this point, we're ready to plug some numbers into the base equation to
compute \\( d\theta \over dt \\)! Let's fill in the blanks on the terms:

* \\( \omega_i \\) -> This is our base frequency. In radians, the base frequency
is \\( 2 \pi \\).
* \\( K \\) -> This is the coupling constant and is a tuneable parameter. We'll
look more closely at this value later. `gsync` defaults to \\( K = 0.5 \\).
* \\( N \\) -> This is the number of participants. Since we are syncing 2
computers, \\( N = 2 \\).
* \\( \theta_j \\) -> This is our peer's phase offset from the ideal base
frequency. We can compute \\( \theta_j \\) by taking our peer's reported wakeup
time and converting to a phase angle using the conversion function we previously
derived.
* \\( \theta_i \\) -> This our own phase offset. Similar to \\( \theta_j \\),
\\( \theta_i \\) is computed by converting our *actual* wakeup time to a phase
angle. To explain a bit further, we have an expected and an actual wakeup time
on the computer. The expected time is the time we would execute if there were no
additional latencies imposed by the system. The actual wakeup time is the
measured time after we resume execution. In short, we are off phase from the
desired base frequency and the model uses \\( \theta_i \\) to account for that.

In the code, the sync function takes as input the computer's actual wakeup time
and the last reported peer wakeup time extracted from shared memory. Using the
latter information, along with frequency and coupling constant info given at
program startup, `gsync` computes \\( d\theta \over dt\\) and converts it to a
time in nanoseconds. That time is an offset to the next `gsync` wakeup time.

As an example, suppose `gsync` ran with a frequency of 1 Hz or every 1 seconds.
Also suppose the sync function returned time deltas in seconds. If the sync
function returned a time delta of \\( -0.5 \\), then `gsync` would next sleep
for \\( 1 - 0.5 = 0.5 \\) seconds (i.e., `gsync` will wakeup *earlier* by half a
second). Maybe the sync function over shot. In the next run, the sync function
returns a delta of \\( 0.8 \\), then `gsync` will sleep for \\( 1.0 + 0.8 = 1.8
\\) seconds (i.e., it will wakeup *later*). Essentially, the delta in the wakeup
time of the computers oscillates about \\( 0 \\)! The smaller the oscillations,
the better the sync.

## The End Result

In the end, what do we see? Well, running `gtimer` and `gsync` on both BBBs with
the frequency of `gtimer` set to 1 Hz and the coupling constant set to \\(
0.5\\), we see our two LEDs blinking synchronously. It takes maybe 3 to 4 cycles
(blinks) before they flash in unison. I let the processes run for about a day
and I didn't see any noticeable hiccups in the sync.

I also played a bit with the coupling constant to see what sort of effect it
has. I incremented the coupling constant in steps of \\( 0.1 \\) starting at \\(
K = 0.1 \\). What I found is that if \\( K \\) is too low, the LEDs never seem
to synchronize. After crossing a threshold value, synchronization always seems
to occur. I didn't experiment much more with this value but I imagine the value
of \\( K \\) can vary with the base frequency that is chosen.

So the sync at 1Hz "looked good enough". Still, I thought it would be
interesting to measure using an oscilliscope the delay between the rising edge
of one computer's signal versus the other's. I experimented with a number of
different rates starting at 1Hz and ramping up to about 500Hz in increments of
50Hz. Below is a histogram of the time deltas for the 100Hz run:

![100Hz Run](/posts/gpio-driven-synchronization/100hz-0.5.png#center)

With about 20,000 samples, the average delay was ~100 usec. More interesting
than the average is the absolute maximum delay which was rougly 572 usec. These
observations more or less held true for all test runs in the range [1, 400]
Hertz.

Beyond the 400Hz run rate, I started to see some oddball results. Below is a
capture of a 500Hz run:

![500Hz Run](/posts/gpio-driven-synchronization/500hz-0.5.png#center)

The average delta was still roughly 100 usec. The maximum delta saw huge spikes
around 2.7 ms. Worse yet, these were more than just a few outliers, there were
multiple hits in the 2.5 ms range. I can't quite explain why this happens. I'd
have to use some tracing tools to track down the source of the issue. While it
would be cool to own a $30k Tektronix MSO68B, I was working with borrowed
equipment meaning I didn't have my hands on the oscope long enough to do
additional testing.

Could the spikes be caused by weak coupling? Is there a timing bug between
`gtimer` and `gsync`?  Questions for another day I guess.

## Conclusion

So what did we learn? Synchronizing at least two computers linked via only GPIO
is possible. Better yet, the Kuramoto Model used to bring the two machines into
phase is relatively straightforward to code and reason about. Moreover, we were
able to achieve submillisecond synchronization for rates below 500Hz on bargain
hardware using free and open source software.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [gsync][10].

[1]: https://en.wikipedia.org/wiki/Kuramoto_model
[2]: https://beagleboard.org/black
[3]: https://www.amazon.com/Exploring-BeagleBone-Techniques-Building-Embedded/dp/1118935128#:~:text=Exploring%20BeagleBone%20provides%20a%20reader,and%20modules%2C%20with%20practical%20examples
[4]: https://github.com/ivan-guerra/bbb_kernel_builder
[5]: https://programmador.com/posts/real-time-linux-app-development/
[6]: http://www.lartmaker.nl/lartware/port/devmem2.c
[7]: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/
[8]: https://github.com/brgl/libgpiod
[9]: https://github.com/ivan-guerra/gsync/blob/master/src/sync/sync.cc
[10]: https://github.com/ivan-guerra/gsync

[^1]: The [BeagleBone Black][2] (BBB) is a low cost (~$60), ARM board capable of
    running Linux. The BBB has a ton of configurable GPIOs and so is nicely
    suited in that regard for this project.
[^2]: ["Exploring BeagleBone"][3] is an awesome book not only for understanding
    all the ins and outs of the BBB, but in general as an introduction to
    development on an embedded platform. Chapter 6 is especially useful if you
    find yourself needing to configure the BBB's GPIOs.
[^3]: [libgpiod][7] development now lives at [kernel.org](kernel.org). That
    said, I found the old [GitHub][8] repo easier to browse. Just be wary when
    looking at the GH repo, you're looking at potentially outdated code!
[^4]: Well that's kinda BS. You could control the pins [directly in memory][6].
    I thought about trying that before learning about `libgpiod`. However, the
    complexity added by this optimization did not seem necessary for the task of
    toggling a GPIO at a 1Hz rate.
