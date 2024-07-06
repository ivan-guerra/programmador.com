---
title: "Real-time Linux App Development"
date: 2023-04-27T22:49:14-07:00
description: "A checklist for developing real-time applications in Linux."
tags: ["c", "c++", "linux", "realtime"]
---

If you're an embedded systems programmer, you have likely touched on the topic
of real-time operating systems (RTOS). There are plenty of commercial RTOSes
available on the market: VxWorks, Integrity, DeOS, Helix, the list goes on. As a
hobbyist, you may not have thousands of dollars to spend paying for commercial
licenses. Real-time Linux can fill the void by providing a path to a soft
real-time system.

This post takes a tour through the advice given in John Ogness's 2020
presentation: ["A Checklist for Writing Linux Real-Time Applications"][11].
You'll explore how to optimize a Linux system and application for real-time
execution using John's real-time Linux development checklist.

## Who Needs a Real-time System

Setting up and tuning a Linux real-time system is a time consuming task. Before
diving in, consider what an RTOS provides:

1. **Low Latency**: Latency is a measure of the delay from when you tell the
   system to perform an action until the system actually starts executing that
   action.
2. **Determinism**: An RTOS provides deterministic scheduling policies. You can
   orchestrate software components such that they run within specific time
   frames.

If your application requires (1) and (2), then it's a worthy endeavor to setup a
real-time system.

Now, do you need a soft or a hard real-time system? What's the difference? It
all relates to the application's deadlines.

[![Soft vs Hard RT](/posts/2023/real-time-linux-app-development/soft-vs-hard-rt.webp#center)][2]

In hard real-time systems, **the OS must meet task deadlines otherwise the
system may fail or fault**. In soft real-time systems, **the system is resilient
to task overruns and won't fail if a deadline isn't met**.

Many control systems require hard real-time execution. For example, a flight
control application which continuously misses its deadlines can accumulate
enough error to cause loss of control. In contrast, some applications need only
soft real-time. Take for example a weather station application sampling an array
of unsynchronized sensors at a steady interval. Missing a deadline in this
situation isn't catastrophic as long as the sample time is "close enough" to the
other sensor samples. Again, you have to look at your application requirements
and decide which real-time variant makes sense.

The aim of this post is to provide tips for the setup of a near optimal soft
real-time Linux system. Achieving hard real-time isn't possible given that the
Linux kernel isn't designed to guarantee deadlines. Benchmarking and performance
monitoring are critical in verifying timing requirements on RT Linux system.

## Real-time Kernel Patches

The first step to setting up a RT Linux system is to make the kernel [fully
preemptible][3] via the real-time kernel patches. You can apply the `PREEMPT_RT`
patches to your kernel using the steps listed below:

1. Make note of your kernel's X.Y.Z version number. Typically, the git branch
   name will include the version number.
2. Go to kernel.org and download the `*.gz` containing the patch files for
   your particular kernel version.
3. Apply the patches:

```bash
cd linux/ gzip -cd
/path/to/patch-4.19.94-rt39.patch.gz | patch -p1 --verbose
```

4. Verify there are no `*.rej` files in your Linux source tree.

## Kernel Configuration

Getting the right kernel configuration is critical in reducing latency. Below is
a table of the configurations you will want to enable/disable. See the config
option footnotes for more details.

| Config                                  | ON/OFF | Location                                                                                    |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `CONFIG_PREEMPT_RT_FULL`                | ON     | General Setup -> Preemption Model -> Fully Preemptible Kernel (RT)                          |
| [`CONFIG_SOFTLOCKUP_DETECTOR`][6]       | OFF    | Kernel hacking -> Debug Lockups and Hangs -> Detect Soft Lockups                            |
| [`CONFIG_DETECT_HUNG_TASK`][7]          | OFF    | Kernel hacking -> Debug Lockups and Hangs -> Detect Hung Tasks                              |
| [`HZ_1000`][8]                          | ON     | Kernel Features -> Timer frequency -> 1000 Hz                                               |
| [`CONFIG_NO_HZ_FULL`][9]                | ON     | General Setup -> Timers subsystem -> Timer tick handling -> Full dynticks system (tickless) |
| [`CONFIG_CPU_FREQ_GOV_PERFORMANCE`][10] | ON     | CPU Power Management -> CPU Frequency Scaling -> 'performance' governor                     |
| `CONFIG_CPU_FREQ_GOV_POWERSAVE`         | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'powersave' governor                       |
| `CONFIG_CPU_FREQ_GOV_ONDEMAND`          | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'ondemand' cpufreq governor                |
| `CONFIG_CPU_FREQ_GOV_CONSERVATIVE`      | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'conservative' cpufreq governor            |
| `CONFIG_CPU_FREQ_GOV_SCHEDUTIL`         | OFF    | CPU Power Management -> CPU Frequency Scaling -> 'schedutil' cpufreq policy governor        |
| `CONFIG_DEBUG`                          | OFF    | Kernel hacking -> \*                                                                        |

## Scheduling Policies

[![Linux Scheduling Policies](/posts/2023/real-time-linux-app-development/scheduling.webp#center)][13]

Linux provides three real-time scheduling policies.

- **`SCHED_FIFO`**: A scheduling policy based on static priorities (1-99). A
  task can only lose the CPU if a higher priority task comes or via hardware
  interrupts.
- **`SCHED_RR`**: The same as `SCHED_FIFO` with the added twist that if two
  tasks have the same priority, then they will execute in round robin fashion
  using a configurable timeslice.
- **`SCHED_DEADLINE`**: Each task gets a budget Q (AKA runtime) and a period P
  telling the kernel that the task requires Q time units every P time units on
  any processor.

**RT scheduling policies only apply to RT tasks!** All other tasks use
`SCHED_OTHER` and have their CPU time controlled via nice values. You set an RT
the scheduling policy in one of two ways: programmatically or using the `chrt`
utility.

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

`SCHED_FIFO` is the most common and easy to reason about policy. You'll want to
be careful with any of the priority based policies to **never set a task's
priority to 99**. You don't want your application taking time away from critical
kernel threads.

By default the Linux kernel limits the amount of time all real-time tasks get on
the CPU. **If the total CPU time of all RT tasks exceeds 95% of a second, then
for the remaining 5% of that second no RT task runs!** This is equivalent to bad
priority inversion and breaks a real-time system. You can disable this policy by
writing -1 to `/proc/sys/kernel/sched_rt_runtime_us`:

```bash
echo "-1" > /proc/sys/kernel/sched_rt_runtime_us
```

This setting isn't a kernel configuration option. You have to repeat the command
every time you reboot or write a boot script to clear it for you!

## Isolating CPUs

On multicore systems, you can improve determinism by pinning tasks to specific
cores. There's a couple ways to do this:

- Explicitly set CPU affinities via the `taskset` utility or programmatically.
- Edit kernel boot parameters to set default CPU affinity masks for all tasks
  (including kernel tasks).
- Set CPU affinity masks for routing HW interrupt handling.

### Setting CPU Affinities

A task's CPU affinity is a bitmask specifying what CPU cores the scheduler can
put the task on. You can control CPU affinity down to the thread level. You can
use the `taskset` utility to set affinities from your scripts:

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

### CPU Isolation via Kernel Boot Parameters

The kernel provides two boot parameters to regulate CPU utilization:

1. **`maxcpus=n`**: Limits the kernel to bring up N CPUs.
2. **`isolcpus=cpulist`**: Specifies the CPUs to isolate from disturbances.

`maxcpus` tells the kernel to at most use N CPUs. As an example, suppose you
have a 4 core system. With `maxcpus=2`, Linux would take two CPUs for itself and
leave the other two completely alone. This feature is useful when one wants to
run bare metal applications on the "reserved" CPUs that can communicate with the
processes running on the cores used by Linux.

`isolcpus` tells the kernel to be aware of the CPUs you specify in the argument
`cpulist`, but don't schedule any tasks including kernel tasks on those CPUs.
You can later tell Linux to schedule your RT tasks on those isolated CPUs.

### Hardware Interrupt Affinities

When a hardware interrupt enters the system, **any** CPU may service that
interrupt. This can cause latency increases if the CPU your RT task is running
on services the interrupt. So how do you re-route interrupts to CPUs not running
your RT tasks?

As a first step, set the default CPU affinity for HW interrupt handling on
interrupt handler registration. You can view and configure these settings via
`/proc/irq/default_smp_affinity`.

For registered interrupts, you can update their affinities via
`/proc/irq/<irq-number>/smp_affinity`. **Be aware, some hardware can't perform
this IRQ re-routing. After making a change in `smp_affinity`, always check that
the setting stuck by querying `/proc/irq/<irq-number>/effective_affinity`!**

### Beware of Caching

When partitioning your tasks among the different cores, take into consideration
caches and their layout. Two or more cores may share a number of caches. You may
experience adverse side effects on the RT side as the non-RT processes
invalidate portions of the cache! You want to look at the reference manual for
your CPU to see the cache layout. Afterward, create a core-to-task assignment
that reduces cache contention.

## Memory Management

[![Simplistic Virtual Address Space](/posts/2023/real-time-linux-app-development/virtual-addr-space.webp#center)][12]

How an RT application manages memory deserves some attention. Going back to
college and your OS course, you may remember that processes work with memory in
chunks called pages. When a process requests memory or accesses a page not
currently in memory, a page fault occurs. The OS's page fault handler services
the fault by loading the missing page to memory. This is an expensive operation
and one you want to avoid in a RT application.

What are all the sources of a page fault your applications may encounter? There
are many memory accesses that may trigger page faults:

- Text Segment
- Initialized Data Segment
- Uninitialized Data Segment
- Stack
- Heap

There's a couple of tricks you can employ to avoid page faults:

1. Tuning glibc's `malloc`
2. Locking Allocated Pages
3. Prefaulting

The following sections look at each strategy in more detail.

### Tuning glibc's `malloc`

glibc's `malloc` can request memory in more than one way. Under the hood,
`malloc` will by default make `mmap` calls to the kernel to get memory which is
**not** part of the processes' heap. When this `mmap`'ed memory gets released,
it's not immediately available for reuse by the process.

Luckily, `malloc` is configurable via `mallopt`. You can disable memory
allocation via `mmap` by clearing the `M_MMAP_MAX` option:

```c
#include <malloc.h>

mallopt(M_MMAP_MAX, 0);
```

This setting will tell `malloc` to never call `mmap` and instead always allocate
memory using the processes' heap. The memory in this heap area will be available
for reuse even after a call to `free`.

There's one more glibc `malloc` behavior you want to disable and that's heap
trimming. `malloc` will look at the heap and trim large contiguous blocks of
free memory. You don't want to be losing page sized chunks of memory you
previously payed the page fault tax to access. To disable this feature:

```c
#include <malloc.h>

mallopt(M_TRIM_THRESHOLD, -1);
```

### Locking Allocated Pages

It's important that you lock all current and future pages of your processes'
virtual address space to RAM. you can tell the kernel to do this using the
`mlockall` sys call:

```c
#include <sys/mman.h>

mlockall(MCL_CURRENT | MCL_FUTURE);
```

### Prefaulting

To avoid page faults during runtime, you'll want to take the page faulting "hit"
early on at application startup. To do that you prefault the heap. To do this
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

Notice the write to each page. The write guarantees that a page fault gets
triggered and that the page is actually loaded into RAM. The combination of
`malloc` tuning and memory page locking ensures all the heap memory your
application needs will be sitting in RAM.

But wait, there's more! You should similarly prefault the stack. Here's a
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
now 512kb stack space will remain since you previously locked down memory with
`mlockall`.

## Locking and Synchronization

Locks are important in any application that needs mutual exclusion. When in need
of mutual exclusion in an RT Linux app, always go with `pthread_mutex`! What
about semaphores? Semaphores are a no go since they don't have a notion of
ownership. In contrast, the kernel knows when a lower priority task owns/holds a
`pthread_mutex`. The kernel temporarily boosts the task's priority so that it
runs and frees the lock allowing a higher priority task to acquire the lock.
This is what's known as priority boosting or inheritance and it's how Linux
resolves the [priority inversion problem][16]. The image below illustrates this
concept. You can imagine Resource A is a lock under contention.

[![Priority Inheritance](/posts/2023/real-time-linux-app-development/priority-inheritance.webp#center)][15]

To get `pthread_mutex` to behave as described, you have to tell the kernel to
employ priority inheritance. Set the [`PTHREAD_PRIO_INHERIT`][14] option via the
`pthread_mutexattr_setprotocol` system call. Here's an example of how to setup
and use your mutex:

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

## Signaling

When it comes to signaling within or among RT applications, there are two
approaches to consider:

- **[Standard Signals][17]**: These are the signals in the `SIG*` family that
  get caught by an application using `sigaction`.
- **`pthread_cond` Signals**: These are condition objects typically associated
  with a `pthread_mutex` that synchronize notification between threads/processes.

**Avoid standard signals in an RT application**. Why? The context when a signal
handler executes is hard or near impossible to predict. Are you holding a lock?
Are you priority boosted? Worse yet, there are differences in behavior among the
different glibc implementations. Avoid signals in your RT application.

`pthread_cond` condition variables are safe to use in your RT app. The only
caveat is that you make sure to notify waiting threads/processes **before**
releasing a lock! As an example of why it's important to notify waiters before
releasing locks, consider this scenario on a uniprocessor system:

1. Task 1 priority 50 gets scheduled and acquires a shared lock.
2. Task 2 priority 60 gets scheduled (Task 1 gets descheduled due to lower
   priority).
3. Task 2 requests the lock.
4. Kernel boosts Task 1 priority to 60 and schedules it.
5. Task 1 completes its critical section and releases the lock.
6. Kernel de-boosts Task 1 back to priority 50 and schedules Task 2.
7. Task 2 acquires the lock.
8. Task 2 waits forever on a signal that will never come from Task 1!

To avoid this scenario, **always notify receivers before releasing a lock when
working with POSIX condition variables**. Here's a code snippet illustrating
proper signaling:

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

## Clocks and Cyclic Tasks

When it comes to clocks in an RT app, you want to stick with the POSIX functions
for clock specification (that is, the `clock_*` family of functions). There are
a number of clock types:

- `CLOCK_REALTIME`: System-wide real-time clock.
- `CLOCK_MONOTONIC`: Clock representing monotonic time since some unspecified
  starting point.
- `CLOCK_PROCESS_CPUTIME_ID`: High-resolution per-process timer from the CPU.
- `CLOCK_THREAD_CPUTIME_ID`: Thread-specific CPU-time clock.

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

## Evaluating a Real-time System

[Cyclictest][18] is one of the best tools to use in evaluating your real-time
system. What's Cyclictest?

> Cyclictest accurately and repeatedly measures the difference between a
> thread's intended wake-up time and the time at which it actually wakes up in
> order to provide statistics about the system's latencies.

Here are a couple key points to keep in mind when working with Cyclictest:

- **Test parameters matter.** The parameters you pass to Cyclictest determine
  the latencies measured by the test. Read the manpage, checkout examples, and
  make sure you understand what latencies get measured.
- **Reduce the "observer effect" as much as you can.** The execution of
  Cyclictest itself can affect the latencies measured. There's ways to combat
  this issue such as isolating the Cyclictest main thread to a unused CPU. See
  the [FAQ][19] for more details.
- **System load matters.** You are going to want to test with a representative
  system load. Representative in this case means simulating CPU use, memory use,
  I/O, network use, etc. There are tools like [hackbench][20] and [existing
  strategies][21] that can assist you in crafting realistic loads.

A resource worth mentioning is the [OSADL website][22].

> OSADL (Open Source Automation Development Lab) uses Cyclictest to continuously
> monitor the latencies of several systems.

On the OSADL site, they share a [script][24] that you can run on your system to
generate a histogram plot of latencies as shown below.

[![Latency Histogram](/posts/2023/real-time-linux-app-development/latency-plot.webp#center)][23]

If you choose to use the OSADL script, **make sure you update Cyclictest
parameters so that you are testing for the right latencies on your system!**
OSADL latency plots include the parameters used to run Cyclictest on the
platform under test. You can take those parameters and try them out on your
system to see how one platform compares to another.

The value of interest that Cyclictest outputs is the maximum worst case latency
detected. When interpreting this value, keep in mind that this is the worst
latency that was **measured**. The measured maximum doesn't necessarily equal
the system's worst case latency!

## Conclusion

In the world of embedded development, some applications have tight timing and
scheduling requirements that necessitate the use of a real-time system. Linux
provides a path to a soft real-time system via its `PREEMPT_RT` patches which
make the kernel fully preemptible. In the quest to reduce latencies and improve
determinism, one must configure the kernel and their application to avoid
pitfalls which could lead to system failure. Luckily, there are plenty of
techniques, tools, and resources to help you standup a RT Linux system that
meets your needs.

[1]: https://beagleboard.org/black
[2]: https://techdifferences.com/difference-between-hard-and-soft-real-time-systems.html
[3]: https://en.wikipedia.org/wiki/Linux_kernel#Scheduling_and_preemption
[4]: https://programmador.com/posts/2023/building-and-deploying-a-real-time-kernel-to-the-beaglebone-black/
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
