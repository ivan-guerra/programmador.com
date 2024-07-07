---
title: What Every Programmer Should Know About Memory
date: 2024-02-14T20:47:58-08:00
description: "My collection of notes on Drepper's 2007 LWN article on memory."
tags: ["c", "c++", "linux", "notes"]
series: ["notes"]
ShowPostNavLinks: false
---

This is the first [installment][5] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading a series of articles by Ulrich
Drepper titled ["What Every Programmer Should Know About Memory"][1].

## Part 1: Introduction

- There are a number of different computer architectures each with their own
  tradeoffs.
- The commodity HW setup has the CPUs attached via a Frontside Bus (FSB) to a
  Northbridge and indirectly via the Northbridge to a Southbridge. The
  Northbridge typically houses the memory controller and attaches directly to
  RAM. The Southbridge hosts the various buses such as USB, PCI, PCI-E, SATA,
  etc.
- The bottleneck in modern systems often is the time required to access memory.
- An alternative to the commodity setup is to have a memory controller per RAM
  module. Then you get additional channels and thus increased bandwidth.
  However, the bottleneck then becomes the speed of the Northbridge.
- A third alternative is to have RAM directly attached to each CPU. This removes
  the Northbridge bottleneck. However, there is additional latency when one CPU
  requires data from the RAM of another. In this scenario, one or more hops to
  access the data. In a real system, the number hops can be large and the
  latency noticeable. This kind of architecture is what's known as Non-Uniform
  Memory Access (NUMA).
- There are two key types of RAM: Static RAM and Synchronous Dynamic RAM.
- Static RAM (SRAM) is more expensive and typically used for CPU caches and the
  like.
- ~6 transistors make up an SRAM cell. The cell state doesn't require recharge
  and you read/write the state immediately. Of course, the cell requires
  constant power.
- A DRAM cell is a transistor and capacitor combo. DRAM cells require recharge
  about every 64ms. When reading a DRAM cell, sense amplifying circuits help
  distinguish between a 0 and a 1. The latter adds significant delay. The
  advantage of DRAM is the cost and the fact that the form factor of the cell
  means you can pack many of them on a single die.
- Memory cells are individually accessed. To cut down on the number of address
  lines, you arrange cells in a 2D matrix form. A row address is first selected
  followed by a column address.
- The S in SDRAM stands for synchronous and means that the RAM runs at a
  frequency controlled by the memory controller's clock. This clock determines
  the speed of the Frontside Bus.
- Each SDRAM transfer is about 8 bytes.
- There are different SDRAM types each offering different effective bus rates:
  - **Single Data Rate SDRAM**: There's a one-to-one mapping between the bus
    frequency and the data transfer frequency. For example, a 100MHz bus
    implies you can transfer 100Mb/s.
  - **Double Data Rate 1**: Double the data transfers per cycle. Data
    transfers on both the rising and falling edge of a cycle. Also known as a
    "double-pumped" bus. DDR modules have their transfer rates calculated in
    bytes. For example, a 100MHz DDR1 module has a data transfer speed of
    `100MHz - 64 bits - 2 = 1600MB/s`.
  - **Double Data Rate 2**: Here you increase the frequency of the IO buffer
    (same IO buffer like the one used in DDR1). The frequency increase on the
    IO buffer doesn't cause a large amount of additional power consumption.
    This leads to a quad pumped bus. Following the previous example, the
    transfer rate of a DDR2 module would be `100MhZ - 64 bits - 4 = 3200MB/s`.
  - **Double Data Read 3**: DDR3 is like a further revision of DDR2. No real
    innovation there?
  - **FB-DRAM**: Similar to DDR2 except serial lines connect to the memory
    controller. Fully Buffered DRAM modules run the serial lines at high
    frequencies. FB-DRAM modules can have more channels per module, more
    channels per Northbridge/memory controller, and the serial lines are full
    duplex. The required pin count also drops from 240 for DDR2 to 69 for
    DDR3.
- Direct Memory Access (DMA) is in use with many devices. DMA means more
  competition for the FSB bandwidth. If there's a lot of DMA traffic, a CPU
  might stall more than usual when accessing RAM.

## Part 2: CPU Caches

- CPUs can have sometimes up to 3 caches made of small SDRAM. The caches in
  ascending size are usually named L1, L2, and L3 cache.
- It's often the case there are two L1 caches. One cache stores instructions,
  the icache, the other stores data, the dcache. L2 and L3 caches store a mix.
- Caches divide up into cache lines where each line is about 8 bytes.
- The number of cycles increase dramatically as you go up the levels of cache.
  The cycles required once you reach main memory are much higher than the L3
  cache.
- The icache often exhibits good behavior inspite of the program since most code
  has good spatial and temporal locality.
- The icache on some processors caches not the original instruction but the
  decoded instruction. This can save a significant number of cycles in the CPUs
  instruction processing pipeline.
- The dcache's behavior can be more directly controlled by the programmer. TBD
  exactly how but you can imagine certain data access patterns are more cache
  friendly. For example, row major access of a 2D matrix versus column major.
- On SMP or multicore systems, each core gets its own set of caches. Within a
  core, however, threads may get their own L1 I/D cache and will share L2/L3
  cache. The sharing of L2/L3 by the threads can be a source of bottlenecks
  since if not careful they will trample each others caches. There's additional
  HW to balance cache use between two threads but it doesn't always work that
  well.
- Takeaway of this part is to take a look at the architecture of the HW you are
  running on. Knowing the memory layout can help you organize your program more
  both within the source and at the system level. For example, accessing data in
  a cache friendly way and segregating processes judiciously across the cores of
  the machine.

## Part 3: Virtual Memory

- The primary benefits of virtual memory include freeing applications from
  having to manage a shared memory space, ability to share memory used by
  libraries between processes, increased security due to memory isolation, and
  being able to conceptually use more memory than might be physically available
  using the technique of paging or segmentation.
- Virtual memory requires HW support for translation of virtual addresses to
  physical addresses.
- The Memory Management Unit (MMU) assists with translation.
- A virtual address splits into up to 5 fields with 4 of those being page table
  indices and the 5th being a offset into the page itself. The multiple levels
  of indirection make it possible for multiple processes to have their own page
  tables, otherwise, the memory cost would be too high.
- The process of virtual address to physical address translation is costly (up
  to 4 memory accesses). In response, HW designers have added specialized caches
  called Translation Lookaside Buffers (TLBs) to cache recent translations.
- TLBs are separate from the other caches used by the CPU. However, similar to
  CPU caches, there are instruction TLBs and data TLBs that leverage the
  spatial/temporal locality of the addresses used in a program.
- TLBs have their own costs associated with them. Namely, the TLB must be
  flushed whenever a context switch occurs or when the kernel
  acquires/relinquishes control of the CPU. There's HW specific tricks to avoid
  this overhead.

## Part 4: NUMA Support

- This article describes how the topology in a NUMA architecture affects the
  memory access performance.
- A hypercube topology is most effective. The topology has CPU nodes in powers
  of two (for example, nodes = \\(2^C\\)). The \\(C\\) value dictates the
  maximum number of interconnects between the different CPUs.
- The OS is responsible for acknowledging the NUMA architecture and allocating
  process memory to account for the hops that occur when process memory usage
  exceeds the memory available at the host node.
- Some OSes use the strategy of striping process memory. This means memory
  spreads across all nodes' memory. The advantage is that no one node is
  saturated by the high memory demand of a single process and it makes migrating
  a process from one node to another more cost effective. The downside is that
  you have more hops on average.
- In Linux on a NUMA system, the programmer can select an allocation strategy
  different than striping for a given process and its children.

## Part 5: What Programmers Can Do

- The theme for all memory access is the same: improve locality (spatial and
  temporal) and align the code and data.
- Modern CPUs optimize **sequential** uncached write and (more recently) read
  accesses.
- This comes in handy when accessing large data structures that you use only
  once.
- The CPU automatically prefetches relevant cache lines when accessing data
  sequentially. This is where the performance boost comes from.

## Part 6: More Things Programmers Can Do

This section is incomplete. I took notes only on what I felt was most relevant
to at the time which was the tips Drepper provides on concurrent optimization:

1. If you use a variable in multiple threads, but every use is independent, move
   the variable into TLS.
2. Separate at least read-only (after initialization) and read-write variables.
   Maybe extend this separation to read-mostly variables as a third category.
3. Group read-write variables together into a structure. Using a structure is
   the only way to guarantee the memory locations for those variables are close
   together in a way which translates consistently across all gcc versions.
4. Move read-write variables which are often written to by different threads
   onto their own cache line. This might mean adding padding at the end to fill
   a remainder of the cache line. If combined with step 3, this is often not
   wasteful. Extending the example, you might end up with code as follows
   (assume you use `bar` and `xyzzy` together):

```c
  int foo = 1;
  int baz = 3;
  struct {
    struct al1 {
      int bar;
      int xyzzy;
    };
    char pad[CLSIZE - sizeof(struct al1)];
  } rwstruct __attribute__((aligned(CLSIZE))) =
    { { .bar = 2, .xyzzy = 4 } };
```

You need to change the code some. Replace references to `bar` with
`rwstruct.bar`, likewise for `xyzzy`. The compiler and linker do the rest.
Compile the code with `-fms-extensions` on the command line.

## Part 7: Memory Performance Tools

This section is a bit outdated. Probably the most relevant tool mentioned is
[Cachegrind][2]. Couple notes about Cachegrind:

- Cachegrind simulates the CPU caches whilst running your program (that is, a
  run of your program through Cachegrind can be many times slower than normal).
- The default cache setup used by Cachegrind is dependent on the system hosting
  the Cachegrind run.
- You can tune the cache setup using a number of Cachegrind options.
- [KCachegrind][4] is a tool that can help you visualize the output of a
  Cachegrind run.

[1]: https://lwn.net/Articles/250967/
[2]: https://valgrind.org/docs/manual/cg-manual.html
[3]: https://valgrind.org/docs/manual/cl-manual.html
[4]: https://kcachegrind.sourceforge.net/html/Home.html
[5]: https://programmador.com/series/notes/
