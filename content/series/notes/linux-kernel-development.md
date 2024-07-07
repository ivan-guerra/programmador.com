---
title: Linux Kernel Development 3rd Edition
date: 2024-04-04T07:37:02-07:00
description: 'My collection of notes on Robert Love''s "Linux Kernel Development".'
tags: ["c", "linux", "notes"]
series: ["notes"]
ShowPostNavLinks: false
---

This is the third [installment][1] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading the book titled ["Linux Kernel
Development"][2] by Robert Love.

## Getting Started

The following are key differences between userspace application development and
Linux kernel development:

- No access to the C library or C headers. There are versions of certain libc
  functions included in the kernel under `lib/`.
- The kernel uses GNU C. Kernel code follows ISO C99 and relies on some of GCC's
  compiler extensions.
- The kernel lacks memory protection you might be use to in userspace. For
  example, illegal memory accesses in kernel code often leads to a fatal "oops"
  message.
- Kernel code can't perform floating point operations (not in a straightforward
  way).
- The kernel has a small, fixed-size stack. The stack is usually about 2-4 pages
  with a page typically being 4k on 32-bit systems or 8k on 64-bit systems.
- Synchronization and concurrency is always an issue. This is due to async
  interrupts, preemption, and SMP support.
- Portability is important. Kernel developers segregate architecture specific
  code. General kernel code makes no assumptions about word size, page size,
  etc.

## Processes

- In a Linux system using init, all processes all children of the init process
  with PID 1.
- Processes and threads are one and the same in Linux.
- The `task_struct` represents a process descriptor.
- Under the hood, the `clone()` function constructs a process or thread.
- The `clone()` function takes arguments which specify what process attributes
  get copied from the parent.
- When cloning, not all process data gets copied right away. Linux implements
  copy-on-write meaning pages aren't copied until the parent or child process
  have written to them and therefore each need a separate copy. Linux does a
  trick where after cloning the child, it lets the child to run first. This
  makes it so if the child calls `exec()` to load a new program into its address
  space, it will do so immediately avoiding the situation where the parent runs,
  writes to one or more pages triggering a copy, and then the child runs
  `exec()` meaning that copy was for nothing.
- The `current` macro acquires the `task_struct` of the running process.
  `current`'s implementation varies from platform to platform with some systems
  storing the process descriptor in a register and others, like x86, placing it
  at the bottom of the process's stack.
- Terminating a process doesn't necessarily mean its gone. Terminated processes
  enter a zombie state. Once the process's parent acknowledges the return code
  of the terminated child process, then the child process gets reaped.
- Zombie processes whose with a terminated parent are automatically re-parented.
  In the worst case they're made direct children of the init process and then
  released.

## Process Scheduling

- Linux supports multiple scheduling algorithms via its scheduling classes.
- The big `schedule()` function selects the next task to run by running the
  highest priority scheduler class with a runnable task.
- The O(1) scheduler and Completely Fair Schedule (CFS) scheduler are the most
  well known scheduling algorithms in the kernel.
- nice values are a measure of how nice a process is to the others. nice values
  range from -19 to 20. A lower value means a process is _less_ nice. The less
  nice a process is the higher priority it has and vice versa. The default nice
  value in Linux is 0.
- CFS is the dominant scheduling algorithm. Also known as `SCHED_OTHER`.
- CFS is unique in that it optimizes for fairness by giving processes a
  proportion of the CPU's time. That is, there is no hardcoded timeslice (other
  than a lower bound on the smallest amount of time any process could be
  allocated).
- CFS has two key parameters: target latency and minimum granularity. Target
  latency is an estimate of the infinitely small duration of time each process
  would get in an ideal system. Minimum granularity is a floor that's set on the
  timeslice since in a real system you can't have infinitely small timeslices.
- The nice values weight the proportion of CPU time each process gets. Each
  process runs for a “timeslice” proportional to its weight divided by the total
  weight of all runnable threads. See page 50-51 for an explanation of the
  benefit.
- At a high level, CFS tracks each process's virtual runtime (that is, the
  amount of time a process has spent running. A red-black tree stores the
  vruntimes (that is, a height balanced binary search tree). The process chosen
  to run next is the process with the smallest vruntime (that is, the leftmost
  process in the tree). Instead of incurring a \\(\\mathcal{O}(logn)\\) cost to
  retrieve this process, the kernel caches the left most node.
- `sched_entity` is the structure used by the kernel to account for a process's
  scheduling. `sched_entity` is a field in the process descriptor `task_struct`.
- The vruntime is a time in nanoseconds weighted by the number of runnable
  processes.
- A context switch involves two things.
  - Switching the memory mapping context meaning swapping one processes pages
    for another. \*
  - Switching the CPU context meaning one or more registers need the process
    info of the process being now set to run. Both of these steps are platform
    specific!
- `need_resched` is a per process flag that tells the kernel whether its time to
  switch processes. It's checked on a return to userspace after a system call or
  after an interrupt gets serviced.
- The Linux kernel is preemptible. The kernel will only preempt kernel tasks if
  they don't hold a lock. A task that doesn't hold a lock is reentrant. Kernel
  preemption can occur:
  - When an interrupt handler exits, before returning to kernel-space.
  - When kernel code becomes preemptible again.
  - If a task in the kernel explicitly calls `schedule()`.
  - If a task in the kernel blocks (which results in a call to `schedule()`).
- Page 65 gives a overview of how real-time priorities merge with nice values.
  Real-time priorities range from [0, 99]. Blended in are nice values which go
  from [100, 139].

## System Calls

- System calls are the only interface to the kernel provided to userspace.
- The kernel maintains a system call table. The table is architecture specific.
  If you add a new syscall, you have to add it to each architecture's syscall
  table!
- When a userspace application makes a system call, an exception gets triggered
  and the system call handler gets executed. The syscall handler is architecture
  specific. It will typically read the syscall code and parameters directly from
  CPU registers (means the caller loaded the registers up before trapping). A
  syscall return value also gets sent back via a specific register.
- System calls must be careful to validate all userspace parameters. Use the
  `copy_from/to_user()` when reading/writing data between spaces. They both
  block! Run the `capability()` method beforehand to check that the user has the
  right permissions to do what they'd like to do.
- It's rare to add a new system call. Prefer exposing kernel info using files in
  sysfs or appropriate drivers with `read()/write()` implemented.

## Kernel Data Structures

- The kernel includes linked lists, queues, maps, and binary trees for use by
  the developers. No need to write your own.
- The linked list provided is a circular doubly linked list. The struct
  `list_head` type gets embedded in a structure of your own. Then, a head node
  gets created using `LIST_HEAD` macros, finally you use the list manipulation
  functions and macros to add/remove/iterate.
- You can implement a queue or stack using the list API.
- Queues called kfifo are actually pretty vanilla and work much like you would
  expect in say C++.
- The maps are special. They're like std::map in that the data gets sorted by
  key. Keys are always UIDs. The values in the map are void pointers. Under the
  hood, the map gets implemented using a balanced search tree of some sort.
- The tree structure provided by the kernel is the red-black self balanced BST.
  If using this structure, you have to handle search and insertion yourself!
  Look up examples cause it ain't trivial.

## Interrupts and Interrupt Handlers

- Interrupts are signals generated by hardware routed to the processor. The
  processor signals the kernel so that it may service the interrupt. Interrupts
  have a number assigned to them and a interrupt service routine that's
  registered in the kernel to service specific IRQ numbers.
- Interrupts execute in an "atomic" context. Blocking isn't allowed in an ISR. A
  interrupt can interrupt another executing interrupt!
- Interrupts get split into top and bottom halves. The top half does
  time-critical work. It's meant to be quick and do just enough to service the
  HW and then return control to the kernel/process that was previously running.
  The bottom half is responsible for the actual processing of the received data
  and does the heavy lifting.
- `request_irq()` is the function used to register a interrupt handler.
  Interrupt handlers register from within the corresponding device driver.
  Interrupts are often shared. You enable interrupt sharing with the
  `IRQF_SHARED` flag.
- Interrupt handlers in Linux don't need to be reentrant. When an IRQ line is
  gets serviced by a handler, that line gets masked out by the processor meaning
  another interrupt of that type can't come in over the line.
- Interrupt handlers return `IRQ_NONE` or `IRQ_HANDLED`. `IRQ_NONE` gets
  returned when the interrupt handler detects an interrupt for which its device
  wasn't the originator. `IRQ_HANDLED` gets returned if the interrupt handler
  was correctly invoked, and its device did indeed cause the interrupt. Most
  modern day devices provide a means for a driver to check whether the received
  interrupt was theirs. If it wasn't, the ISR returns `IRQ_NONE`.
- Interrupt handlers can't sleep/block!
- Interrupt handlers historically shared their stack with the interrupted
  process. Nowadays, the interrupt handlers have their own stack that's one page
  in size.
- You can enable/disable interrupts on the current processor. This is typically
  done to support synchronization. Use `local_irq_save()` and
  `local_irq_restore()`. You must call these functions in the same stack frame
  (that is, within the same function)!
- You can disable an IRQ number for the entire system. You usually do this to
  configure a device. These are usually found in legacy ISA devices. Newer PCI
  devices share interrupts. Disabling interrupts for all devices on a line is
  not a good idea.

## Bottom Halves and Deferring Work

- The reason for deferring work to a bottom half is in large part to reduce the
  amount of time the system is operating without interrupts. When an interrupt
  gets serviced, interrupts on that line get disabled across all CPUs. Worse
  yet, interrupt handlers can disable _all_ interrupts on the local processor
  plus the interrupt of interest on _all_ processors. Separating interrupt
  handling into two halves minimizes system latency.
- When to perform tasks in the upper half:
  - If the work is time sensitive, perform it in the interrupt handler.
  - If the work relates to the hardware, perform it in the interrupt handler.
  - If the work needs to guarantee that another interrupt (particularly the
    same interrupt) doesn't interrupt it, perform it in the interrupt handler.
  - For everything else, consider performing the work in the bottom half.
- The bottom half facilities provided by the kernel are softirqs/tasklets and
  workqueues.
- softirqs are statically allocated bottom halves that can run on any CPU
  simultaneously.
- Tasklets are flexible, dynamically created bottom halves built on top of
  softirqs. Two different tasklets can run concurrently on different processors,
  but two of the same type of tasklet can't run simultaneously. Note tasklets
  have nothing to do with tasks/processes!
- Workqueues use kthreads under the hood and run in process context. Use
  workqueues if you need the ability to block/sleep.
- Prefer softirqs for performance critical applications. They take more care to
  implement because they can run concurrently. You also must register them
  statically.
- Tasklets are more common for bottom half handling. Use a softirq only if you
  want the bottom half to run on more than one processor simultaneously and are
  ready to likely deal with per processor variables and what that entails.
- The kernel enforces a limit of 32 registered softirqs. In reality, only about
  9 of those 32 softirqs are in use today. The others are reserves and can be
  taken by a programmer looking to implement a new softirq.
- A softirq never preempts another softirq. The only event that can preempt a
  softirq is an interrupt handler. In fact, softirqs get processed in sequence
  in the `do_irq()` function.
- Pending softirqs get checked for and executed in the following places:
  - In the return from hardware interrupt code path.
  - In the ksoftirqd kernel thread.
  - In any code that explicitly checks for and executes pending softirqs, such
    as the networking subsystem.
- Linux builds tasklets on top of the softirq system. The softirq flags
  differentiate between high and low priority tasklets. If the `do_softirq()`
  function finds a pending `HI_SOFTIRQ` or `TASKLET_SOFTIRQ`, then it will call
  the associated softirq action which happens to be one of `tasklet_action()` or
  `tasklet_hi_action()`. Either function will iterate over all their tasklets
  executing them only if the tasklet isn't running on another processor.
  Tasklets with differing types can run concurrently!
- Tasklets can't sleep/block.
- Tasklets run with interrupts enabled so be careful if you share data with an
  interrupt handler.
- If the system gets overloaded with softirqs, the kernel will spawn
  `softirqd/n` threads where n is the processor number. Idle CPUs will be able
  to service the softirqs.
- Work queues defer work as well. The most critical thing is that work queue
  tasks execute in a process context and can sleep/block.
- Work queues typically use generic kernel threads called worker threads. Worker
  threads have the label `event/n` where `n` is the CPU number.
- Work queues create a kernel thread on your behalf.
- Normal driver writers have two choices. First, do you need a schedulable
  entity to perform your deferred work? Do you need to sleep for any reason?
  Then work queues are your only option. Otherwise, use tasklets. Only if
  scalability becomes a concern do you investigate softirqs.
- Bottom halves can get disabled using the `local_bh_enable/disable()`
  functions.
- Bottom halve disabling usually comes up when process context code and bottom
  half code share data. You'll need to disable bottom half processing and
  acquire a lock before accessing the shared data.

## An Introduction to Kernel Synchronization

- The kernel provides facilities that support atomic variables.
- The kernel provides various forms of locks that protect a critical section.
- Concurrency is the root of all evil. There's technically two types of
  concurrency: pseudo and true. Pseudo concurrency is when two processes/tasks
  get interleaved (perhaps on a single processor) creating the effect of
  unprotected, concurrent access. True concurrency is when processes/tasks run
  simultaneously on separate processors and access shared data.
- The kernel has many causes of concurrency:
  - Interrupts: An interrupt can occur asynchronously at almost any time,
    interrupting the current executing code.
  - Softirqs and tasklets: The kernel can raise or schedule a softirq or
    tasklet at almost any time, interrupting the current executing code.
  - Kernel preemption: Because the kernel is preemptive, one task in the
    kernel can preempt another.
  - Sleeping and synchronization with userspace: A task in the kernel can
    sleep and thus invoke the scheduler, resulting in the running of a new
    process.
  - Symmetrical Multiprocessing: Two or more processors can execute kernel
    code at exactly the same time.
- Code that's safe from concurrent access from an interrupt handler is
  _interrupt-safe_.
- Code that's safe from concurrency on symmetrical multiprocessing machines is
  _SMP-safe_.
- Code that's safe from concurrency with kernel preemption is _preempt-safe_.
- Deadlock either self deadlock (double locking) or the ABBA deadlock is a real
  problem. The solution is to acquire resources with a fixed order and document
  that order.
- Lock contention can ruin performance. You need to balance how coarse/fine
  locking code is. Doing so can lend itself to making your code more scalable.

## Kernel Synchronization Methods

- The kernel offers the `atomic_t` and `atomic64_t` types along with a series of
  inlined functions that initialize, increment, decrement, etc. the values.
- Each architecture guarantees the `atomic_t` type.
- The `atomic64_t` is only implemented by 64-bit architectures and should be
  avoided unless writing architecture specific code that relies on 64-bit
  operations.
- Atomic, bitwise operations are also provided. The bitwise ops work on raw
  memory or pointers directly.
- There are non-atomic versions of the bitwise operations as well. If you don't
  have a requirement for atomicity, you should use the non-atomic versions
  because they're faster.
- The kernel implements the classic busy waiting locks: spinlocks.
- Spinlocks are the only locks that you can use in interrupt handlers since they
  don't cause the thread to sleep.
- When using a lock in an interrupt handler, one must disable interrupts. The
  spinlock interface in the kernel provides convenience functions that
  lock/unlock the lock and saves/restores the interrupt context. This prevents
  the double acquire deadlock from occurring.
- Because a bottom half might preempt process context code, if data gets shared
  between a BH process context, you must protect the data in process context
  with both a lock and the disabling of bottom halves.
- Because an interrupt handler might preempt a BH, if data gets shared between
  the two, you must both obtain a lock and disable interrupts.
- With Reader-Writer spinlocks, one or more readers to concurrently access
  shared data. When the writer acquires the lock, the writer gives exclusive
  access and the readers wait.
- Readers have priority in RW spinlocks! That is, it's possible to starve the
  writer with enough readers!
- The kernel implements counting semaphores. A semaphore with a count of 1 is a
  binary semaphore (AKA mutex).
- When downing a semaphore, prefer `down_interruptible()` because the `down()`
  function will make the waiting task be in the `TASK_UNINTERRUPTIBLE` state
  which is likely not ideal.
- RW semaphores similar to the RW spinlocks are available. The RW semaphores
  place waiting tasks in an uninterruptible sleep!
- The kernel implements the mutex locking mechanism. You can think of the mutex
  as something separate from the binary semaphore previously mentioned.
- Unlike the semaphore, you can only unlock a mutex from the context in which
  you locked it. The kernel mutex doesn't support recursive locking.
- There's a special completion variable type. Completion variables make it
  possible to signal between threads when an event has occurred. They're a
  lightweight alternative to semaphores.
- Sequential locks are RW locks that give preference to the writer. That is, the
  readers can never starve the writers.
- You can enable/disable preemption. See pages 201-202 for the reasoning.

## Timers and Time Management

- The hardware implements a system timer whose frequency relates to a digital
  clock, CPU frequency, etc. When the timer goes off, a interrupt gets sent to
  the kernel.
- The kernel knows the preprogrammed tick rate so it knows the time between two
  successive timer interrupts. This is a tick and is equal to \\(1 /
  tick_rate\\).
- The kernel uses this tick to track both wall clock time and system uptime.
- The timer interrupt performs the following tasks. Note some of these are
  executed every tick others every \\(N\\) ticks:
  - Update the system uptime.
  - Update the time of day.
  - On an SMP system, ensuring balance in the scheduler runqueues and, if
    unbalanced, balancing them.
  - Running any dynamic timers that have expired.
  - Update resource usage and processor time statistics.
- Tick rate is in units of HZ. Never hardcode the tick rate, use the kernel
  provided APIs for accessing the value.
- Pros of a higher tick rate:
  - The timer interrupt has a higher resolution and, consequently, all timed
    events have a higher resolution.
  - The accuracy of timed events improves.
  - System calls such as `poll()` and `select()` that optionally employ a
    timeout execute with improved precision.
  - Measurements, such as resource usage or system uptime, get recorded with a
    finer resolution.
  - Process preemption occurs more accurately.
- Cons of a higher tickrate:
  - Increased power consumption.
  - Potential cache thrashing.
  - Increased overhead from the timer interrupt handler getting triggered.
- The global variable `jiffies` holds the number of ticks that have occurred
  since system boot.
- `jiffies` prototypes to `unsigned long volatile jiffies`. On 32-bit
  architectures it's 32-bits and 64-bits on 64-bit architectures.
- You have to be cautious of the fact that the `jiffies` value may wrap around!
  To avoid issues with wrapping, using the kernel provided macros when comparing
  to `jiffies`:
  - `time_after(unknown, known)`
  - `time_before(unknown, known)`
  - `time_after_eq(unknown, known)`
  - `time_before_eq(unknown, known)`
- Architectures provide two pieces of HW for timekeeping: the system timer and
  the real-time clock (RTC).
- The RTC is a nonvolatile device for storing the system time. The RTC continues
  to track time even when the system is off by way of a small battery.
- On boot, the kernel reads the RTC value into the `xtime` variable. This
  initializes the wall time.
- The system timer's key job is to provide a source of timer interrupts. What
  drive's the system timer is platform dependent. Some system timer's are
  programmable to specific rates.
- The timer interrupt has two parts: architecture dependent and independent
  routines.
- The architecture dependent routine gets registered as the ISR. Its tasking is
  platform specific. That said, they all do share some common functions:
  - Obtain the `xtime_lock` lock, which protects access to `jiffies_64` and
    wall time value, `xtime`.
  - Acknowledge or reset the system timer as required.
  - Periodically save the updated wall time to the RTC.
  - Call the architecture-independent timer routine, `tick_periodic()`.
- The architecture independent routine, `tick_periodic()`, performs much more
  work:
  - Increment the `jiffies_64` count by one.
  - Update the resource usages, such as consumed system and user time, for the
    currently running process.
  - Run any dynamic timers that have expired.
  - Execute `scheduler_tick()`.
  - Update the wall time, which gets stored in `xtime`.
  - Calculate the infamous load average.
- See page 222 for a description of how to use the timer API.
- Always use `mod_timer()` to update an active/inactive timer. If you don't,
  races may occur.
- If deactivating an active timer, prefer `del_timer_sync()` over `del_timer()`.
  As the name suggests, the sync version waits for an associated timer handler
  running on another CPU to complete before returning. This is a blocking call
  so don't use it from an interrupt context!
- Expired timers' handler get run by the BH of the timer interrupt. Implemented
  as the softirq `TIMER_SOFTIRQ`.
- If you need a _short_ delay (think microsecond delay) in a busy loop, use the
  `udelay()`, `ndelay()`, and `mdelay()` functions.
- A better solution is to call `schedule_timeout()` passing in the amount of
  time you would like to sleep in jiffies. The only guarantees here are that you
  don't waste CPU time spinning and that your task will sleep at least as many
  jiffies as requested. Only call this function from a process context.

## Memory Management

- The MMU deals with memory in terms of pages.
- The `page` struct tracks all physical pages in the system. It describes
  physical memory but not its contents. The goal is to indicate to the kernel
  whether a page is free. If a page is note free, the kernel can query the
  structure's fields to know who owns it:
  - userspace processes
  - dynamically allocated kernel data
  - static kernel code
  - etc.
- The kernel instantiates a `page` struct per physical page. It's a tiny bit
  wasteful of memory.
- Memory divides into zones. Below are four of the most popular zones:
  - `ZONE_DMA`: This zone contains pages that can undergo DMA.
  - `ZONE_DMA32`: LIke `ZONE_DMA`, this zone contains pages that can undergo
    DMA. Unlike `ZONE_DMA`, only 32-bit devices can access these pages. On
    some architectures, this zone is a larger subset of memory.
  - `ZONE_NORMAL`: This zone contains normal mapped pages.
  - `ZONE_HIGHMEM`: This zone contains "high memory," which are pages not
    permanently mapped into the kernel's address space.
- The kernel attempts to allocate memory from the appropriate zone. That said,
  if memory constrained, the kernel can pull memory from different zones.
  However, the kernel will never grab pages from two separate zones to satisfy a
  single request.
- Which zones are available is architecture dependent. Some architectures have
  only `ZONE_DMA` and `ZONE_NORMAL` because they can address the entire physical
  address space. Others like x86-32 have all four.
- `struct page* alloc_pages(gfp_t gfp_mask, unsigned int order)` is the kernel
  API for acquiring a list of \\(2^{order}\\) contiguous pages.
- You can call the `void* page_address(struct page* page)` API to get the
  logical address of a page.
- Use `unsigned long get_zeroed_page(unsigned int gfp_mask)` to get the address
  of a single, zeroed out page.
- Table 12.2 shows all the low-level page allocation functions.
- There's analogous page free functions for returning the pages that were
  acquired.
- Note, page allocation may fail. Try to allocate pages early and always check
  for allocation failure.
- The low-level page allocation functions only make sense to use if you need
  page sized chunks of memory.
- `kmalloc()/kfree()` is appropriate for allocating/freeing byte sized chunks of
  memory. It behaves much like `malloc()/free()`. The only difference is the
  added `gfp_t flags` parameter which controls how allocation.
- _gfp_ stands for get free pages.
- gfp flags fall into three categories:
  - Action Modifiers: Specify how the kernel allocates the memory.
  - Zone Modifiers: Specify which zone the memory will come from.
  - Types: Acts as a combination of action and zone flags. There's a couple of
    these like, `GFP_KERNEL` which define and OR of one or more action and
    zone flags.
- You only want to deal with type flags. Table 12.6 on Pg. 241 shows the
  available type flags and their description.
- `vmalloc()` acquires logically contiguous memory. It's not typical that one
  uses `vmalloc()` due to its performance overhead or the need by the HW that
  memory acquired be physically contiguous. The function can sleep so it may
  only call it from a process context. Note, `kmalloc()` provides both
  physically and logically contiguous memory!
- The slab layer acts as a generic data structure-caching layer. It builds on
  the concept of free-lists where programmers maintain one or more lists of
  containing structures of commonly dynamically allocated types.
- The slab layer divides different objects into groups called _caches_, each of
  a different type of object. There's once cache per object type.
- Caches divide into slabs where each slab is one or more contiguous pages of
  memory.
- Each slab contains some number of objects of a specific type.
- Slabs are always in one of three states: full, empty, or partial. Partial
  slabs allocations happen before empty slab allocations.
- You can make your own slab allocator caches for some custom object type.
- Kernel stack size is customizable ranging from 1 to 2 pages of memory.
- In the past, interrupt handlers shared the running process's stack. Nowadays,
  each interrupt handler gets its own page for a stack. This requires one page
  per processor.
- Stack overflows occur silently in the kernel. There is no check for it! Keep
  stack usage to a few hundred bytes. If you need more memory, dynamically
  allocate it!
- You can map a limited number of pages from high memory into the kernel's
  address space. Do this sparingly. Blocking and nonblocking interfaces are
  available to do this mapping.
- The kernel provides interfaces for statically and dynamically allocating
  per-cpu variables. There are also APIs for getting/putting CPU variables that
  take care of any preemption issues.
- Never access a per-cpu variable across CPUs without some form of
  synchronization.
- Reasons to use per-cpu variables:
  - A reduction in locking requirements.
  - Improved cache behavior.
  - Enable access from interrupt and process context.
- Never sleep when working on a per-cpu variable!

## The Virtual Filesystem

- The virtual filesystem (VFS) provides an interface by which one can use the
  usual system calls (for example, `open()`, `write()`, `read()`, etc.) to
  interact with myriad filesystems and devices. You never need to rewrite or
  recompile your program to work with ext2 versus ext4 filesystem thanks to the
  VFS.
- The VFS provides an abstraction. New filesystems must implement the VFS
  interface and use its data structures to "plugin" to the kernel.
- An inode or index node is just file metadata (for example, time of creation,
  owner, permissions, etc.).
- The VFS has a OOP architecture.
- The four primary object types of the VFS are:
  - **superblock**: Represents a specific mounted filesystem.
  - **inode**: Represents a specific file.
  - **dentry**: Represents a directory entry which is any component of a path
    (file or directory).
  - **file**: Represents an open file associated with a process.
- Each object has a `*_operations` structure which contains function pointers to
  specific operations on that object. The kernel provides a default
  implementation of a few of the methods. However, filesystem developers likely
  have to implement their own operations so that they "make sense" for their
  specific use case.
- Each filesystem implements the superblock object and uses it to store
  information describing that specific filesystem (AKA the filesystem control
  block).
- An inode represents each file on the filesystem, but the inodes object
  constructs in memory only as files get accessed. inodes can even represent
  special files like pipes, block devices, or char devices (but only one at a
  time).
- Unix inodes typically separate file data from its control information (for
  example, metadata).
- dentries get cached in the dcache. When a file path is first resolved, each
  component in the path is a dentry and gets cached in the dcache.
- dentry accesses exhibit temporal and spatial locality similar to program
  instructions and data. This makes the dcache effective in reducing file access
  times.
- dentries associate with an inode. The dcache serves as an icache since
  actively used inodes get pinned along with their dentry in the dcache.

## The Block I/O Layer

- Block devices are hardware devices distinguished by the random access of fixed
  sized chunks of data.
- Block devices mount a filesystem. As a user, you interact with the block
  device via the filesystem.
- In contrast to block devices, char devices provide a sequential stream of char
  data. It doesn't make sense to random access the data of a char device. That's
  where the block device comes in.
- The smallest addressable unit on a block device is a sector. Typically a power
  of two with the most common size being 512 bytes.
- Although a device is addressable at the sector level, the kernel usually
  operates on blocks. The block is an abstraction of the filesystem and can be
  only be a multiple of the sector size, no larger than the page size, and must
  be a power of two.
- Each block gets its own buffer. The buffer is an in memory representation of
  the block. Each block gets a buffer head which is essentially a descriptor
  describing the block (which device owns the buffer, page info, etc.).
- The buffer head's `bh_state` flag (see page 292) tells one the state of the
  buffer. Within `bh_state` there's a number of bits reserved for driver authors
  to use.
- Block buffers benefit from storing block data on a page. That said the block
  buffer approach is a bit wasteful since you need multiple buffers/block heads
  to for example write large amounts of data.
- The `bio` struct is the block buffer's replacement. The struct represents
  block IO operations that are active as a list of segments. A segment is a
  chunk of a buffer that's contiguous in memory. Segments make scatter/gather IO
  possible in the kernel. See page 295 for a illustration.
- With the `bio` struct, the buffer is now represented as an array of `bio_vec`
  structs where each `bio_vec` includes a page, offset, and length. The full
  array of `bio_vec` structs is the buffer.
- The way to think of all this is that each block IO request gets represented as
  a `bio` struct. Each request is one or more blocks stored in the array of
  `bio_vec` structures of the `bio` struct (these are the segments). As the
  block IO layer submits request, the `bi_index` gets updated to point to the
  next `bio_vec` struct.
- Buffer heads are still relevant. They're required for describing the device's
  blocks.
- Block devices maintain request queues to store their pending block IO
  requests. The filesystem adds requests to the queue and dispatches them to the
  block device's driver for processing.
- The kernel includes a block IO scheduler to merge and sort requests. The idea
  here is that IO performance would be terrible if requests were simply serviced
  in the order received. You want to reduce seek times and optimize the order in
  which requests are services. The IO schedule does the latter by virtualizing
  the block devices similar to how the process scheduler virtualizes the CPU.
- The IO scheduler works by managing a block device's request queue. It decides
  the order of requests in the queue at what time each request gets dispatched
  to the block device. It optimizes on seek to improve \*global throughput\*\*.
  That is, the IO scheduler doesn't care much for fairness.
- The IO scheduler performs two primary actions to minimize seeks:
  - Merging is the coalescing of two or more request into one.
  - Sorting refers to how the IO scheduler keeps requests in the queue sorted
    sector wise so that all seeking activity moves as close to sequential as
    possible.
- There are many different IO scheduler algorithms supported by the kernel:
  - **The Linus Elevator**: Performs both the merge and sort operations. Uses
    an insertion sort to maintain the sector ordering of the request queue and
    will merge adjacent sectors on insertion. There's an issue with requests
    starving with this algorithm if requests cluster around one area of the
    disk leaving the far off requests to starve.
  - **The Deadline IO Scheduler**: This algorithm uses three queues: a queue
    sorted on sector just like the previous one, a write FIFO, and read FIFO.
    The write/read FIFO queues are essentially sorted on time. Write request
    have an expiration of about 5 seconds into the future while read requests
    have an expiration delta of about 500 milliseconds. When the Deadline
    scheduler dispatches a request, it first checks if there is an expired
    request in one of the FIFO queues before issuing a request from the sorted
    queue. In this way, you avoid starvation. Also note the bias towards read
    requests. If you delay read requests significantly, application
    performance would degrade notably (imagine all the time spent blocking on
    `read()`)!
  - **The Anticipatory IO Scheduler**: This algorithm is identical to the
    Deadline IO scheduler except there is an added heuristic: the anticipation
    heuristic. It's meant to resolve the delay in write heavy systems that
    occasionally read. In the latter scenario with a Deadline IO scheduler,
    the seek head would bounce back and forth as infrequent reads would be
    immediately serviced triggering a long seek. The trick here is that after
    servicing a read request, the algorithm will wait for a configurable
    amount of time before returning to the previous request. This makes it
    such that if another read requests comes in during the wait, it can
    immediately get serviced with a reduction in the time spent seeking. The
    algorithm uses per process block IO statistics to improve its behavior
    over time. The algorithm avoids starvation, reduces read latency, and
    increases overall throughput through the reduction of seeks/seek time.
  - **The Completely Fair Queueing IO Scheduler**: This one's a bit different
    than the rest. CFQ gives each process an IO request queue. The queue are
    serviced round robin. The number of requests consumed at each queue visit
    is configurable. CFQ works well with specific workloads particularly those
    associated with multimedia.
  - **NOOP IO Scheduler**: This algorithm does little more than insertion sort
    incoming request by sector size. Beyond that, it's basically a FIFO
    algorithm. NOOP works well with block devices such as flash memory which
    have no overhead with seeking and thus don't need all the bookkeeping and
    added overhead of the other algorithms.

## Debugging

- Unsurprisingly, `printk()` is one of the key debug tools.
- `printk()` is robust in that you can call it _anywhere_ and _anytime_ within
  kernel code.
- `printk()` supports eight different log level macros. Use the one that's
  appropriate for the situation (or example, if debugging, use `KERN_DEBUG`).
  You will need to set the console log level accordingly to see the messages in
  the kernel logs.
- A kernel oops occurs when the kernel encounters an error condition from which
  it can't proceed/recover.
- The Oops message contains info such as the contents of CPU registers, a stack
  trace, and more.
- Sometimes the oops that's printed isn't decoded (that is, the stack trace is
  just a bunch of addresses). You can save the oops message in a text file.
  Then, using the `ksymoops` program, you can decode the oops message.
- In place of `ksymoops` shenanigans, you can enable `CONFIG_KALLSYMS_ALL` at
  kernel config time. This decodes the entire oops message at the cost of an
  increased kernel image (probably worth it unless you need a min size kernel
  image).
- In the "Kernel Hacking" section of the kernel config editor, you can enable
  many debug options. Enable as many as needed to solve your problem.
- The `BUG_ON(condition)` macro triggers an oops purposefully.
- `panic()` is another developer macro that will halt the kernel at the call
  site.
- `dump_stack()` will do what the name suggests. Useful with an added `printk()`
  message to give context to the dump.
- You can use the `kgdb` features of the kernel to run `gdb` on a live kernel.
  See the StarLabs article for the details.
- Git bisect is your friend when tracking down kernel bugs.

## Portability

- One of the key goals of Linux is portability.
- The majority of the core/subsystem code in the kernel is portable/platform
  agnostic. Architecture specific code lives in `arch/`
- Some code must be platform specific. For example, context switch code for
  registers and address space switches are platform specific.
- The kernel has a number of APIs that each platform must implement. For
  example, each platform implements `switch_to()` and `switch_mm()`.
- Architectures that support both 32 and 64-bit word sizes have their codebases
  tied together under one architecture. For example, x86 holds x86-32 and x86-64
  platform code.
- The `long` type always has a size equal to the platform's word size. Don't
  assume the size of long to be 32-bits or 64-bits. Use the macro
  `BITS_PER_WORD` to compute word size portably.
- Only use opaque types such as `pid_t` and `atomic_t` as specified by their
  API. Never assume anything about their size or underlying type. Don't convert
  opaque types to some C built-in type.
- Use the fixed size types when appropriate (for example, u32, s32, u8, s8,
  etc.). You can't export the fixed size types to userspace. Instead, you must
  use the userspace friendly versions that prefixed with double underscores (for
  example, \_\_u32).
- On a N-bit system, data should be (N/8) byte aligned. For example, a 32-bit
  system is usually 32/8 = 4 byte aligned. The bottom 3 bits of each address
  should be zero.
- Alignment is usually handled by the compiler and not a concern to the
  programmer. One place worth being aware of alignment is in structures where
  the compiler adds padding automatically to meet alignment requirements.
  Sometimes you can avoid the overhead of padding by re-arranging the members of
  the struct to meet padding requirements. The compiler will never reorder
  structure members on your behalf!
- If you have concerns over endianness and need to convert to/from the CPU
  ordering and LE/BE, use the kernel's endianness conversion API.
- Never assume the frequency of the timer interrupt. Always use the `HZ` macro
  to compute an estimate for time.
- Never assume the page size. Use the `PAGE_SIZE` macro instead. If you need the
  number bits to left shift an address to derive its page number, use the
  `PAGE_SHIFT` macro.
- Always assume and program for an SMP/preempt/highmem system. This keeps you
  safe in any kernel/HW configuration.

[1]: https://programmador.com/series/notes/
[2]: https://www.amazon.com/Linux-Kernel-Development-Robert-Love/dp/0672329468
