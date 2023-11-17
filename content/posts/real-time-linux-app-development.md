---
title: "Real-time Linux App Development"
date: 2023-04-27T22:49:14-07:00
description: "A checklist for developing real-time applications in Linux."
tags: ["c", "c++", "linux", "realtime"]
---

If you a are programmer in the embedded space, you have likely touched on the
topic of real-time operating systems (RTOS). There are plenty of commercial
RTOSes available on the market: VxWorks, Integrity, DeOS, Helix, the list goes
on. Of course, as a hobbyist, you don't have thousands of dollars to spend
paying for commercial licenses. Real-time Linux can potentially fill the void by
providing a path to a soft real-time system.

This post takes a tour through the advice given in John Ogness's 2020
presentation: "A Checklist for Writing Linux Real-Time Applications"[^12]. We'll
explore how to optimize a Linux system and application for real-time execution
using John's handy real-time Linux development checklist.

# DO I NEED A REAL-TIME SYSTEM?

Before you go down the relatively time consuming path of setting up a real-time
Linux system, you might want to stop and ask yourself 'do I really need
real-time capabilities'. To help answer that question, consider what an RTOS
provides:

1. **Low Latency**: Latency is a measure of the delay from when you tell the
   system to perform an action until the system actually starts executing that
   action.
2. **Determinism**: An RTOS provides deterministic scheduling policies. You can
   orchestrate software components such that they run within specific
   timeframes.

If you can look at the requirements for your application and can confidently say
you need features (1) and (2), then the time investment in standing up a
real-time system may be justified.

Now, you must ask yourself another question: 'do I need a soft or a hard
real-time system'. What's the difference? It all relates to the application's
deadlines.

[![Soft vs Hard RT](/posts/real-time-linux-app-development/soft-vs-hard-rt.jpg)][2]

In hard real-time systems, **task deadlines must be met otherwise the system may
fail or fault**. In soft real-time systems, **the system is resilient to task
overruns and will not fail if a deadline is not met**.

Many control systems require hard real-time execution. For example, a flight
control application which continuously misses its deadlines could potentially
accumulate enough error to cause loss of control. In contrast, some applications
need only soft real-time. Take for example a weather station application
sampling an array of unsynchronized sensors at a steady interval. Missing a
deadline in this situation is not catastrophic as long as the sample time is
"close enough" to the other sensor samples. Again, you have to look at your
application requirements and decide which real-time variant makes sense.

In this post, we'll be aiming for a near optimal soft real-time Linux system.
Achieving hard real-time is, to my knowledge, not possible given that the Linux
kernel is not designed to guarantee deadlines. Ultimately, benchmarking and
performance monitoring will be critical in knowing if your timing requirements
are being met.

# RT KERNEL PATCHES

Our first step in standing up an RT Linux system involves applying a set of
patches to the kernel which among other things makes the kernel fully
preemptible[^2]. You can apply the `PREEMPT_RT` patches to your kernel using the
steps listed below:

1. Make note of the X.Y.Z kernel version you are interested in building.
   Typically, the git branch name will include the version number.
2. Go to kernel.org[^4] and download the `*.gz` containing the patch files for
   your particular kernel version.
3. Apply the patches:
```bash
cd linux/
gzip -cd /path/to/patch-4.19.94-rt39.patch.gz | patch -p1 --verbose
```
4. Verify there are no `*.rej` files in your linux source tree. The `*.rej`
   files indicate a patch was rejected[^5].

# KERNEL CONFIGURATION

Getting the right kernel configuration is critical in reducing latency. Below
is a table of the configurations you will want to enable/disable. See the config
option footnotes for more details.

| Config                                 | ON/OFF | Location                                                                                    |
|----------------------------------------|--------|---------------------------------------------------------------------------------------------|
| `CONFIG_PREEMPT_RT_FULL`               | ON     | General Setup -> Preemption Model -> Fully Preemptible Kernel (RT)                          |
| `CONFIG_SOFTLOCKUP_DETECTOR`[^6]       | OFF    | Kernel hacking -> Debug Lockups and Hangs -> Detect Soft Lockups                            |
| `CONFIG_DETECT_HUNG_TASK`[^7]          | OFF    | Kernel hacking -> Debug Lockups and Hangs -> Detect Hung Tasks                              |
| `HZ_1000`[^8]                          | ON     | Kernel Features -> Timer frequency -> 1000 Hz                                               |
| `CONFIG_NO_HZ_FULL`[^9]                | ON     | General Setup -> Timers subsystem -> Timer tick handling -> Full dynticks system (tickless) |
| `CONFIG_CPU_FREQ_GOV_PERFORMANCE`[^10] | ON     | CPU Power Management -> CPU Frequency Scaling -> 'performance' governor                     |
| `CONFIG_CPU_FREQ_GOV_POWERSAVE`        | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'powersave' governor                       |
| `CONFIG_CPU_FREQ_GOV_ONDEMAND`         | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'ondemand' cpufreq governor                |
| `CONFIG_CPU_FREQ_GOV_CONSERVATIVE`     | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'conservative' cpufreq governor            |
| `CONFIG_CPU_FREQ_GOV_SCHEDUTIL`        | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'schedutil' cpufreq policy governor        |
| `CONFIG_DEBUG`[^11]                    | OFF    | Kernel hacking -> *                                                                         |

# SCHEDULING POLICIES

[![Linux Scheduling Policies](/posts/real-time-linux-app-development/scheduling.png)][13]

Linux provides three real-time scheduling policies.

* **`SCHED_FIFO`**: A scheduling policy based on static priorities (1-99). A
  task can only lose the CPU if a higher priority task comes or via hardware
  interrupts.
* **`SCHED_RR`**: The same as `SCHED_FIFO` with the added twist that if two
  tasks have the same priority, then they will execute in round robin fashion
  using a configurable timeslice.
* **`SCHED_DEADLINE`**: Each task is associated with a budget Q (aka runtime),
  and a period P, corresponding to a declaration to the kernel that Q time units
  are required by that task every P time units, on any processor.

**RT scheduling policies only apply to RT tasks!** All other tasks typically use
`SCHED_OTHER` and can have their CPU time controlled via nice values and/or
cgroups. A scheduling policy can be set in one of two ways: programmatically or
using the `chrt` utility.

If you prefer setting the scheduling policy from your boot or run scripts,
`chrt` is the way to go:
```text
Set Policy:
    chrt [opts] <policy> <prio> <pid>
    chrt [opts] <policy> <prio> cmd [<arg> ...]
Scheduling Policies
    -f, --fifo      set policy to SCHED_FIFO
    -r, --rr        set policy to SCHED_RR
```

You can also code the scheduling policy and priority directly:
```c
#include <sched.h>

struct sched_param param;

param.sched_priority = 80;
sched_setscheduler(0, SCHED_FIFO, &param);
```

`SCHED_FIFO` is, in my experience, the most common and easiest to reason about
policy. You'll want to be careful with any of the priority based policies to
**never set a task's priority to 99**. You don't want your application taking
time away from critical kernel threads.

Another thing to be aware of is by default the Linux kernel limits the amount of
time all real-time tasks are allowed to use the CPU. **If the total CPU time of
all RT tasks exceeds 95% of a second, then for the remaining 5% of that second
no RT task is allowed to run!** This is equivalent to some really bad priority
inversion and is guaranteed to break a real-time system. You can disable this
policy by writing -1 to `/proc/sys/kernel/sched_rt_runtime_us`:
```bash
echo "-1" > /proc/sys/kernel/sched_rt_runtime_us
```
This setting cannot be baked into the kernel at compile time. You will have to
repeat the above command everytime you reboot or write a boot script to clear it
for you!

# ISOLATING CPUS

On multicore systems, you can improve determinism by pinning tasks to specific
cores. There's a couple ways to do this:

* Explicitly set CPU affinities via the `taskset` utility or programmatically.
* Edit kernel boot parameters to set default CPU affinity masks for all tasks
  (including kernel tasks).
* Set CPU affinity masks for routing HW interrupt handling.

# SETTING CPU AFFINITIES

CPU affinities are a bitmask of the CPU(s) a task is allowed to run on. You can
control CPU affinity down to the thread level. You can use the `taskset` utility
to set affinities from your scripts:
```text
taskset [options] mask command [arg]...
taskset [options] -p [mask] pid
```
You can also set affinities programmatically:
```c
/* Need to define _GNU_SOURCE since sched_setaffinity() is not part of POSIX but
implemented in glibc. */
#define _GNU_SOURCE
#include <sched.h>

cpu_set_t set;

CPU_ZERO(&set);
CPU_SET(0, &set);
CPU_SET(1, &set);
sched_setaffinity(pid, CPU_SETSIZE, &set);
```

# ISOLATION VIA KERNEL BOOT PARAMS

The kernel provides two boot parameters to regulate CPU utilization:

1. **`maxcpus=n`**: Limits the kernel to bring up N CPUs.
2. **`isolcpus=cpulist`**: Specifies the CPUs to isolate from disturbances.

`maxpus` tells the kernel to at most use N CPUs. As an example, suppose you had
a 4 core system. With `maxcpus=2`, Linux would take two CPUs for itself and
leave the other two completely alone. This feature is useful when one wants to
run bare metal applications on the "reserved" CPUs that can communicate with the
processes running on the cores used by Linux.

`isolcpus` allows you to tell the kernel to be aware of the CPUs you specify in
the argument `cpulist`, but do not schedule any tasks including kernel tasks on
those CPUs. You can later tell Linux to schedule your RT tasks on those isolated
CPUs. Note the difference between `isolcpus` and `maxcpus` is that in the case
of `isolcpus`, Linux is still aware of the isolated CPUs and you are able to
tell Linux to assign tasks to them.

# HARDWARE INTERRUPT AFFINITIES

When a hardware interrupt enters the system, **any** CPU may service that
interrupt.  This can cause issues if the CPU your RT task is running on is
chosen to service the interrupt. So how do you re-route interrupts to CPUs not
running your RT tasks?

As a first step, you can set the default CPU affinity for HW interrupt handling
when new interrupt handlers are registered. You can view and configure these
settings via `/proc/irq/default_smp_affinity`.

For those interrupts that have already been registered, you can update their
affinities via `/proc/irq/<irq-number>/smp_affinity`. **Be aware, some hardware
cannot perform this IRQ re-routing. After making a change in `smp_affinity`,
always check that the setting stuck by querying
`/proc/irq/<irq-number>/effective_affinity`!**

# BEWARE OF CACHING

When partitioning your tasks among the different cores, you have to take into
consideration how caching is handled by your particular CPU. It may be the case
that two or more cores share a number of caches. If you isolate RT and non-RT
tasks on cores that share a cache, you could experience some adverse side
effects on the RT side as the non-RT processes may invalidate the cache! The
takeaway here is that you will want to look at the reference manual for your CPU
to see how caches are utilized by the different cores in order to come up with a
correct core-to-task assignment.

# MEMORY MANAGEMENT

[![Simplistic Virtual Address Space](/posts/real-time-linux-app-development/virtual-addr-space.png)][12]

How an RT application manages memory deserves some attention. Going back to
college and your OS course, you may remember that processes often are given
memory in 4kb chunks called pages. When the process requests memory or accesses
a page not currently in memory, a page fault is generated that must be serviced
by the OS's page fault handler routine to load that page from disk. This is a
very expensive operation and one we need to tightly control in our RT app.

You might ask, what are all the sources of a page fault our applications may
encounter? There are many memory accesses that may trigger page faults:

* Text Segment
* Initialized Data Segment
* Uninitialized Data Segment
* Stack(s)
* Heap

There's a couple of tricks we can employ to avoid page faults:

1. Tuning glibc's `malloc`
2. Locking Allocated Pages
3. Prefaulting

Lets look at each in a bit more detail.

# TUNING GLIBC'S `MALLOC`

glibc's `malloc` can request memory in more than one way.  Under the hood,
`malloc` will by default make `mmap` calls to the kernel to get memory which is
**not** part of the processes' heap. This is bad for the simple reason that when
this memory is released it **cannot be reused**.

Luckily for us, `malloc` is configurable via `mallopt`. We can disable memory
allocation via `mmap` by clearing the `M_MMAP_MAX` option:
```c
#include <malloc.h>

mallopt(M_MMAP_MAX, 0);
```
The above setting will tell `malloc` to never call `mmap` and instead always
allocate memory to the processes' heap. The memory in this heap area will be
available for reuse even when `free` is called during the processes' runtime.

There's one more glibc `malloc` behavior we want to disable and that is heap
trimming. By default, `malloc` will look at the heap and if there is a large
enough contiguous block of free memory, it will release that memory back to the
kernel effectively trimming down the size of the processes' heap. We don't want
to be losing page sized chunks of memory we previously payed to allocate.  To
disable this feature:
```c
#include <malloc.h>

mallopt(M_TRIM_THRESHOLD, -1);
```

# LOCKING ALLOCATED PAGES

It's important that we lock all current and future pages of our processes'
virtual address space to RAM. We can tell the kernel to do this using the
`mlockall` sys call:
```c
#include <sys/mman.h>

mlockall(MCL_CURRENT | MCL_FUTURE);
```

# PREFAULTING

To avoid page faults during runtime, we'll want to take the page faulting "hit"
early on at application startup. To do that we'll prefault our heap. To do this
correctly, you'll need to calculate your application's worst case space usage.
Here's how you prefault the heap:
```c
#include <stdlib.h>
#include <unistd.h>

void prefault_heap(int size)
{
    char *dummy;
    int i;

    dummy = malloc(size);
    if (!dummy)
        return;

    for (i = 0; i < size; i += sysconf(_SC_PAGESIZE))
        dummy[i] = 1;

    free(dummy);
}
```
Notice that we write to each page guaranteeing that a page fault is triggered
and that the page is actually loaded into RAM. In combination with our previous
`malloc` tuning and memory page locking, we can be confident all the heap memory
we'll need will be sitting in RAM ready for use by our app.

But wait, there's more! We need to similarly prefault the stack. Here's a
routine to do just that:
```c
#include <unistd.h>

#define MAX_SAFE_STACK (512 * 1024)

void prefault_stack(void)
{
    unsigned char dummy[MAX_SAFE_STACK];
    int i;

    for (i = 0; i < size; i += sysconf(_SC_PAGESIZE))
        dummy[i] = 1;
}
```
This function creates a massive 512kb stack frame and then touches each page
that forms that frame once. When the function returns, the pages that form the
now 512kb stack space will remain since we previously locked down memory with
`mlockall`.

# LOCKING AND SYNCHRONIZATION

Locks are important in any application that needs mutual exclusion.  When in
need of mutual exclusion in an RT Linux app, always go with `pthread_mutex`! You
might ask, 'well can't I also use semaphores'? Semaphores shouldn't be used
because semaphores are objects that do not have a notion of ownership. In
contrast, the kernel knows when a lower priority task owns/holds a
`pthread_mutex` and can temporarily boost the task's priority so that it may run
and free the lock when that lock is required by some higher priority task. This
is what's known as priority boosting or inheritance and it is how Linux resolves
the priority inversion problem[^14]. The image below illustrates this concept.
You can imagine Resource A is a lock under contention.

[![Priority Inheritance](/posts/real-time-linux-app-development/priority-inheritance.png)][15]

To get `pthread_mutex` to behave as described above, we have to tell the kernel
to employ priority inheritance. The latter can be done by setting the
`PTHREAD_PRIO_INHERIT`[^13] option via the `pthread_mutexattr_setprotocol` sys
call. Here's a basic example of how to setup and use your mutex:
```c
#include <pthread.h>

pthread_mutex_t lock;
pthread_mutexattr_t mattr;

pthread_mutexattr_init(&mattr);
pthread_mutexattr_setprotocol(&mattr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&lock, &mattr);

pthread_mutex_lock(&lock);
/* critical section */
pthread_mutex_unlock(&lock);

pthread_mutex_destroy(&lock);
```

# SIGNALING

When it comes to signaling within or among RT applications, there are two
approaches to consider:

* **Standard Signals[^15]**: These are the signals in the `SIG*` family that can
  be caught and handled by an application using `sigaction`.
* **`pthread_cond` Signals**: These are condition objects typically associated
  with a `pthread_mutex` that are used to provide synchronized notification
  between threads/processes.

**Standard signals should never be used in an RT application**. Why? The context
when a signal handler is triggered is very hard or near impossible to predict.
Are you holding a lock? Are you priority boosted? Worse yet, there are
differences in behavior among the different glibc implementations. Avoid signals
in your RT application.

`pthread_cond` condition variables are perfectly safe to use in your RT app. The
only caveat is that you make sure to notify waiting threads/processes **before**
releasing a lock! As an example of why it is important to notify waiters before
releasing locks, consider this scenario on a uniprocessor system:

1. Task 1 priority 50 is scheduled and acquires a shared lock.
2. Task 2 priority 60 is scheduled (Task 1 is descheduled due to lower prio).
3. Task 2 requests the lock.
3. Kernel boosts Task 1 priority to 60 and schedules it.
4. Task 1 completes its critical section and releases the lock.
5. Kernel de-boosts Task 1 back to priority 50 and schedules Task 2.
6. Task 2 acquires the lock.
7. Task 2 waits forever on a signal that will never come from Task 1!

To avoid this scenario, **always notify receivers before releasing a lock when
working with POSIX condition variables**. Here's a short code snippet
illustrating proper signaling:

```c
#include <pthread.h>

pthread_mutex_t lock;
pthread_cond_t cond;

/* receiver side */
pthread_mutex_lock(&lock);
pthread_cond_wait(&cond, &lock);
/* We have been signaled. */
pthread_mutex_unlock(&lock);

/* sender side */
pthread_mutex_lock(&lock);
/* critical section */
pthread_cond_broadcast(&cond);
pthread_mutex_unlock(&lock);
```

# CLOCKS AND CYCLIC TASKS

When it comes to clocks in an RT app, you want to stick with the POSIX functions
that allow clock specification (i.e., the `clock_*` family of functions). There
are a number of clock types that are supported:

* `CLOCK_REALTIME`: System-wide realtime clock.
* `CLOCK_MONOTONIC`: Clock that cannot be set and represents monotonic time
  since some unspecified starting point.
* `CLOCK_PROCESS_CPUTIME_ID`: High-resolution per-process timer from the CPU.
* `CLOCK_THREAD_CPUTIME_ID`: Thread-specific CPU-time clock.

**`CLOCK_MONOTONIC` is what you want to use in your app.** The monotonic clock
always moves forward and respects the human definition for seconds. There's no
adjustment due to NTP, accounting for daylight savings, etc. It provides a
constant tick from some starting point.

When working with time, you want to **use absolute time values**. Calculating
relative times is risky because the execution itself takes time. It's best to
compute when you next want to wakeup and then wakeup at that time. Here's a
short snippet that shows a cyclical task using `CLOCK_MONOTONIC` and absolute
time calculations to set its next wakeup.

```c
#include <time.h>

#define CYCLE_TIME_NS (100 * 1000 * 1000)
#define NSEC_PER_SEC (1000 * 1000 * 1000)

static void norm_ts(struct timespec *tv)
{
    while (tv->tv_nsec >= NSEC_PER_SEC) {
        tv->tv_sec++;
        tv->tv_nsec -= NSEC_PER_SEC;
    }
}

void cyclic_task_main(void)
{
    struct timespec tv;

    clock_gettime(CLOCK_MONOTONIC, &tv);

    while (1) {
        /* do stuff */

        /* wait for the next cycle */
        tv.tv_nsec += CYCLE_TIME_NS;
        norm_ts(&tv);
        clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &tv, NULL);
    }
}
```

# EVALUATING A REAL-TIME SYSTEM

Cyclictest[^16] is one of the best tools to use in evaluating your real-time
system.  What is Cyclictest?

> Cyclictest accurately and repeatedly measures the difference between a
> thread's intended wake-up time and the time at which it actually wakes up in
> order to provide statistics about the system's latencies.

Here are a couple key points to keep in mind when working with Cyclictest:

* **Test parameters matter.** The parameters you pass to Cyclictest determine
  the latencies that are being measured by the test. Read the manpage, checkout
  examples, and make sure you understand what latency(s) you are interested in
  measuring.
* **Reduce the "observer effect" as much as you can.** The execution of
  Cyclictest itself can affect the latencies measured. There's ways to combat
  this issue such as isolating the Cyclictest main thread to a unused CPU. See
  the [FAQ][19] for more details.
* **System load matters.** You are going to want to test with a representative
  system load. Representative in this case means simulating CPU use, memory use,
  I/O, network use, etc. There are tools like hackbench[^17] and existing
  strategies[^18] that can assist you in crafting realistic loads.

A resource worth mentioning is the [OSADL website][22].

> OSADL (Open Source Automation Development Lab) uses Cyclictest to continuously
> monitor the latencies of several systems.

On the OSADL site, they share a script[^19] that you can run on your system to
generate a histogram plot of latencies as shown below.

[![Latency Histogram](/posts/real-time-linux-app-development/latency-plot.png)][23]

If you choose to use the OSADL script, **make sure you update cyclictest
parameters so that you are testing for the right latencies on your system!**
OSADL latency plots include the parameters used to run Cyclictest on the
platform under test. You can take those parameters and try them out on your
system to see how one platform compares to another.

Ultimately, the value of interest that Cyclictest outputs is the maximum worst
case latency detected. When interpreting this value, keep in mind that this is
the worst latency that was **measured**. The measured maximum does not
necessarily equal the system's worst case latency!

# CONCLUSION

In the world of embedded development, some applications have tight timing and
scheduling requirements that necessitate the use of a real-time system. Linux
provides a path to a soft real-time system via its `PREEMPT_RT` patches which
make the kernel fully preemptible. However, the story doesn't end there. In this
quest to reduce latencies and improve determinism, one must carefully configure
the kernel and their application to avoid pitfalls which could lead to system
failure. Luckily, folks like John Ogness have outlined strategies such as the
ones I have summarized here in this post to help us navigate setting up a
realiable real-time application in Linux.

[1]: https://beagleboard.org/black
[2]: https://techdifferences.com/difference-between-hard-and-soft-real-time-systems.html
[3]: https://en.wikipedia.org/wiki/Linux_kernel#Scheduling_and_preemption
[4]: https://programmador.com/posts/building-and-deploying-a-real-time-kernel-to-the-beaglebone-black/
[5]: https://mirrors.edge.kernel.org/pub/linux/kernel/projects/rt/4.19/older/
[6]: https://cateee.net/lkddb/web-lkddb/LOCKUP_DETECTOR.html
[7]: https://cateee.net/lkddb/web-lkddb/DETECT_HUNG_TASK.html
[8]: https://ubuntu.com/blog/industrial-embedded-systems-ii
[9]: https://github.com/torvalds/linux/blob/master/Documentation/timers/no_hz.rst
[10]: https://www.kernel.org/doc/Documentation/cpu-freq/governors.txt
[11]: https://www.youtube.com/watch?v=NrjXEaTSyrw
[12]: https://en.wikipedia.org/wiki/Virtual_address_space
[13]: http://retis.sssup.it/luca/TuToR/sched_dl-presentation.pdf
[14]: https://linux.die.net/man/3/pthread_mutexattr_setprotocol
[15]: https://www.embedded.com/how-to-use-priority-inheritance/
[16]: https://en.wikipedia.org/wiki/Priority_inversion
[17]: https://man7.org/linux/man-pages/man7/signal.7.html
[18]: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start
[19]: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/faq
[20]: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/hackbench
[21]: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/worstcaselatency
[22]: https://www.osadl.org/Continuous-latency-monitoring.qa-farm-monitoring.0.html
[23]: https://www.osadl.org/Create-a-latency-plot-from-cyclictest-hi.bash-script-for-latency-plot.0.html?&no_cache=1&sword_list[0]=script
[24]: https://www.osadl.org/Create-a-latency-plot-from-cyclictest-hi.bash-script-for-latency-plot.0.html?&no_cache=1&sword_list[0]=script

[^1]: The [BeagleBone Black][1] is a relatively affordable (~$60) development
    platform for hobbyists. The hardware and the software is open source!
[^2]: [Kernel Preemption][3]
[^3]: [Building and Deploying a Real-Time Kernel to the BeagleBone Black][4]
[^4]: You have to be careful to download patches that match your kernel version
    number exactly! This sometimes mean you have to dig into the folder labeled
    "older" under one of the X.Y folders in order to get the right patch (Z)
    number.
[^5]: If you see rejected patches, double check that you downloaded a patch set
    that *exactly* matches your kernel version.
[^6]: See the [CONFIG_LOCKUP_DETECTOR][6] for more info on this option.
[^7]: See the [CONFIG_DETECT_HUNG_TASK][7] for more info on this option.
[^8]: ["Low Latency Linux for Industrial Embedded Systems"][8] gives good
    coverage on why you would want to configure the timer to 1000 Hz.
[^9]: You must specify which CPUs will be tickless via the `no_hz_full` boot
    parameter. There are also additional gotchas with this option. See the
    kernel's [NO_HZ][9] docs for all the details.
[^10]: The kernel docs give an overview of each of the CPU frequency governors
    and their behavior: ["CPUFreq Governors"][10].
[^11]: You'll want to parse through the debug options and leave only those that
    you find to be most critical on.
[^12]: John's 48min presentation is the inspiration for this post. His final
    slide is particularly handy as a checklist for anyone developing a real-time
    app on Linux. I recommend watching his video on [YouTube][11] before reading
    this post.
[^13]: Checkout the [manpage][14] for `pthread_mutexattr_setprotocol` option
    descriptions.
[^14]: See [priority inversion problem][16]. Priority inheritance is the
    solution Linux implements, there are many other approaches!
[^15]: The [Linux Programmer's Manual's page on signals][17] is worth a read. I
    wouldn't recommend the use of real-time signals given that the behavior is
    at least in part implementation dependent.
[^16]: The [Cyclictest][18] homepage provides an overview of the tool, its use
    cases, and more.  The [FAQ][19] page is also worth a read.
[^17]: [hackbench][20] is a benchmark and a stress test for the kernel scheduler
    that is part of the rt-tests suite.
[^18]: [Worst Case Latency Test Scenarios][21]
[^19]: [Create a latency plot from cyclictest histogram data][24]
