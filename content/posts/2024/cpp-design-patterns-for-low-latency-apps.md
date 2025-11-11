---
title: "C++ Design Patterns for Low Latency Applications Including High
Frequency Trading"
date: 2024-10-19T16:11:48-04:00
description: 'Notes on John Bilokon''s and Burak Gunduz''s 2023 publication "C++
Design Patterns for Low Latency Applications Including High Frequency Trading".'
categories: ["notes"]
---

This is the fifth [installment][1] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading the article titled ["C++ Design
Patterns for Low-Latency Applications Including High-Frequency Trading"][4] by
Paul Bilokon and Burak Gunduz.

## Section 2: Background

### 2.1 HFT

- High-frequency trading (HFT) is an automated trading strategy that utilises
  technology and algorithms to execute numerous trades at high speeds.
- The SEC Concept Release on Equity Market Structure outlines five key elements
  that define this discipline:
  - High-speed computing.
  - Co-location practices.
  - Short time frames for position establishment and liquidation.
  - The submission of multiple orders followed by cancelled orders.
  - The objective of concluding the trading day with minimal unhedged positions
    and near-neutral exposure to overnight.
- HFT systems are mainly built from five main components:
  - **Data Feed**: Responsible for receiving and processing real-time market data
    from various sources, enabling the algorithms to make buy, sell, or wait
    decisions.
  - **Order Management System (OMS)**: Handles the submission, routing, and
    monitoring of trade orders, ensuring efficient execution and management of
    trading activities.
  - **Trading Strategies**: Employ automated algorithms to identify market
    opportunities, make trading decisions, and execute trades at high speeds.
  - **Risk management**: Implements measures to assess and mitigate potential risks
    associated with high-speed trading, ensuring the preservation of capital and
    minimizing losses.
  - **Execution Infrastructure**: Provides the necessary technological framework for
    low-latency communication and trade execution in HFT systems. Networking
    infrastructure falls in this category.
- HFT firms make strong use of Field Programmable Gate Arrays (FPGAs) to achieve
  low-latency targets. Four key characteristics of FPGAs are programmability,
  capacity, parallelism, and determinism.

### 2.2 C++

- HFT shops prefer C++ for low-latency applications due to its compiled nature,
  close proximity to hardware, and control over resources, which enables you to
  optimize performance and efficiently manage resources.
- C++ offers various techniques to shift processing tasks from runtime to
  compile-time. Examples include:
  - Using templates to move the runtime overhead associated with dynamic
    polymorphism to compile-time in exchange for flexibility.
  - Inline functions which insert a function's code at the call site.
  - The `constexpr` keyword evaluates computations at compile time instead of
    runtime, resulting in quicker and more efficient code execution.
- Factors such as the compiler (and its version), machine architecture, 3rd
  party libraries, build and link flags can also affect latency.
- It's often necessary to view the generated assembly when benchmarking C++.
  Tools such as Matt Godbolt's Compiler Explorer help you do just that.

### 2.3 Design Patterns

Design patterns in this paper don't refer to object oriented design patterns.
Instead, the authors use the term "design patterns" to refer to a number of
programming strategies. Here's a list of the different programming strategies:

- **Cache Warming**: To minimize memory access time and boost program
  responsiveness, preload data into the CPU cache before it’s needed.
- **Compile-time Dispatch**: Through techniques like template specialization or
  function overloading, the compiler can choose optimised code paths at compile
  time based on type or value, avoiding runtime dispatch and early optimisation
  decisions.
- **Constexpr**: Computations marked as constexpr evaluate at compile time,
  enabling constant folding and efficient code execution by eliminating runtime
  calculations.
- **Loop Unrolling**: Loop statements expand during compilation to reduce loop
  control overhead and improve performance, especially for small loops with a
  known iteration count.
- **Short-circuiting**: Logical expressions cease evaluation after computing the
  final result, reducing unnecessary computations and improving performance.
- **Signed vs Unsigned Comparisons**: Ensuring consistent signedness in
  comparisons avoids conversion related performance issues and maintains efficient
  code execution.
- **Avoid Mixing Float and Doubles**: Consistent use of float or double types in
  calculations prevents implicit type conversions, potential loss of precision,
  and slower execution.
- **Branch Prediction/Reduction**: Accurate prediction of conditional branch
  outcomes enables speculative code execution, reducing branch misprediction
  penalties and improving performance.
- **Slowpath Removal**: Optimisation technique aiming to minimize execution of
  rarely executed code paths, enhancing overall performance.
- **SIMD**: Single Instruction, Multiple Data (SIMD) enables a single
  instruction to operate on multiple data points simultaneously, significantly
  accelerating vector and matrix computations.
- **Prefetching**: Explicitly loading data into cache before it's needed can
  help in reducing data fetch delays, particularly in memory-bound applications.

### 2.4 LMAX Disruptor

- The LMAX Disruptor addresses the specific requirements of their high
  performance, low-latency trading system.
- The LMAX Disruptor offers a highly optimised and efficient messaging framework
  that enables concurrent communication between producers and consumers with
  minimal contention and latency.
- The LMAX Disruptor addresses the issue of shared resource contention between
  multiple threads. The cost comes from context switches. Those context switches
  can invalidate the cache or even lead to a cache flush which hurts performance.
  When the new thread starts, the cache for that task likely needs to build up
  which incurs some additional latency.
- Another way to tackle contention is the use of Compare And Swap (CAS)
  operations. CAS is an atomic instruction used in concurrent programming to
  implement synchronization and guarantee data integrity in multi-threaded
  environments.
- You can implement lock-free data structures using CAS instructions.
- Using CAS instructions directly comes at a cost:
  - Orchestrating a complex system using CAS operations can be harder than the
    use of locks.
  - To guarantee atomicity, the processor locks its instruction pipeline, and a
    memory barrier ensures that changes made by a thread become visible to other
    threads.
- Producer/consumer queues are common in HFT code. Unbounded queues are
  problematic due to the possibility of memory exhaustion caused by producers
  outpacing consumers. Bounded queues solve the memory issue at the cost of
  increased write contention on the head, tail, and size variables. This can be
  made worse by cache coherency issues.
- The LMAX Disruptor uses a preallocated ring buffer. In most use cases, there
  is one producer (for example, a file reader or network listener) and multiple
  consumers. A single producer means there's no contention on entry allocation.
  Producers notify waiting consumers when data is available. Many read-only
  consumers can safely access the data simultaneously. Notice, how the LMAX
  Disruptor strategy avoids CAS contention present in other multi-producer
  multi-consumer queues.
- Producers and consumers interact with the ring buffer based on sequencing.
  Producers claim the next available slot in the sequence. Once the producer
  claims a slot, the producer can write to it and update a cursor representing the
  latest entry available to consumers. Consumers wait for a specific sequence by
  using memory barriers to read the cursor, ensuring visibility of changes.
  Consumers maintain their own sequence to track their progress and coordinate
  work on entries.
- The Disruptor offers an advantage over queues when consumers wait for an
  advancing cursor in the ring buffer. If a consumer notices that the cursor has
  advanced multiple steps since it last checked, it can process entries up to that
  sequence without involving concurrency mechanisms. This enables the consumer to
  catch up with producers during bursts, balancing the system. This batching
  approach improves throughput, reduces latency, and provides consistent latency
  regardless of load until the memory system becomes saturated.

![UML of Disruptor Framework](/series/notes/cpp-design-patterns-for-low-latency-apps/uml-of-disruptor-framework.webp#center)

### 2.5 Benchmarking

- Google Benchmark is a benchmarking library offering support for CPU-bound and
  real-time modes. The library performs multiple iterations of specific code
  snippets or functions, thereby generating accurate performance metrics.
- Google Benchmark might not cover some specifics unique to HFT scenarios, such
  as network latency, co-location effects, and hardware timestamping, among
  others. You must supplement with other performance analysis tools that can
  analyze these additional factors.
- Performance Counter for Linux or _perf_ is a sophisticated performance
  monitoring utility that integrates into the Linux kernel. It provides a rich set
  of commands and options for profiling and tracing software performance and
  system events at multiple layers, from hardware-level instruction cycles to
  application-level function calls.
- The authors of this paper used perf for cache analysis.

### 2.6 Cache Analysis

- The ratio of cache hits to total access attempts is often used as an important
  metric for evaluating the effectiveness of a cache system.

### 2.7 Networking

- Low-latency networks are the linchpin of high-frequency trading. The
  propagation delays in transmitting information can have immediate financial
  implications.
- Most HFT firms opt for fiber-optic communication to enable data transmission
  at speeds close to the speed of light.
- Colocation remains a crucial strategy for HFT firms, providing them the
  benefit of proximity to a stock exchange’s data center, thus further minimizing
  latency.
- Another critical aspect is the network topology used within the trading
  infrastructure. The design of these networks focuses on maximizing speed and
  minimizing the number of hops between network nodes. This often involves direct
  connections between key components in the trading infrastructure, thereby
  avoiding potential points of latency and failure.
- Redundancy measures are usually put in place, including dual network paths,
  failover systems, and backup data centers to maintain a 100% uptime.
- Additionally time is a critical factor in high-frequency trading, and the use
  of precise time-synchronization protocols like Precision Time Protocol (PTP) is
  becoming increasingly important. Accurate timestamping of events enables for
  fairer market conditions and is often a regulatory requirement.

## Section 3: Low-Latency Programming Repository

The Low-Latency Programming Repository divides into five categories:
compile-time features, optimization techniques, data handling, concurrency, and
system programming.

### 3.1 Compile-Time Features

- In HFT, the execution path that reacts to a trade signal is the hot path.
- Cache warming pre-loads the necessary data and instructions for the hot path
  into the cache. The hotpath is typically kept warm by executing the hot path
  code frequently. Orders are actually only released when a trade executes.
- Runtime dispatch and compile-time dispatch are two techniques in
  object-oriented programming that determine which specific function gets
  executed.
- Runtime dispatch, also known as dynamic dispatch, resolves function calls at
  runtime.
- Compile-time dispatch determines the function call during the compilation
  phase and is frequently used in conjunction with templates and function
  overloading.
- The benefit of compile-time dispatch stems from the ability of the compiler to
  inline the functions that would have been virtual. Inlining can unlock further
  optimizations. See ["The cost of dynamic (virtual calls) vs. static (CRTP)
  dispatch in C++"][2] for more info.
- Sources of the runtime cost of virtual calls:
  - Extra indirection (pointer dereference) for each call to a virtual method.
  - Virtual methods usually can’t be inlined, which may be a significant cost
    hit for some small methods.
  - Additional pointer per object. On 64-bit systems which are prevalent these
    days, this is 8 bytes per object. For small objects that carry little data
    this may be a serious overhead.
- Constexpr is a keyword in C++ facilitating the evaluation of expressions
  during compilation rather than runtime.
- The primary objective of the constexpr keyword is to shift computations from
  runtime to compile-time, not necessarily to boost runtime velocity.
- Inlining refers to a compiler optimisation method in which a function call is
  replaced by the actual content of the function. This procedure aims to reduce
  the overhead typically linked with function calls, such as parameter
  transmission, stack frame handling, and the function call return process.

### 3.2 Optimization Techniques

- Loop unrolling is a technique used in computer programming to optimise the
  execution of loops by reducing or eliminating the overhead associated with loop
  control. It’s a form of trade-off between processing speed and program size.
- Short-circuiting is a logical operation in programming where the evaluation of
  boolean expressions stops as soon as you have the final result. Short-circuiting
  consistently results in faster execution. Short-circuit where possible.
- Separating slowpath code from the hotpath can significantly enhance latency in
  code execution. The strategy is encapsulate the slow path operations (for
  example, error handling) so as to keep the hotpath lean. The end result is that
  the instruction cache gets used more efficiently leading to a reduction in
  execution time. It's recommended to **not** inline the slow path functionality
  so as to not unintentionally bloat the icache.
- By minimising unnecessary branches and avoiding potential branch
  mispredictions, you can reduce program latency significantly.
- Prefetching is a technique used by computer processors to boost execution
  performance by fetching data and instructions from the main memory to the cache
  before it's actually needed for execution. Functions like `__builtin_prefetch`
  can assist in the prefetching of data.

### 3.3 Data Handling

- Unsigned comparisons take longer than signed comparisons. This caused by the
  fact the compiler must insert instructions to check for wrap around on the
  unsigned value. This can be costly when loop control uses unsigned values.
- Mixing data types specifically `float` and `double` can introduce additional
  latency. `float` types are automatically promoted to `double` when in a
  computation with at least one `double` type. According to the article, the
  conversion to and from `float` can cause an up to 50% slow down compared to
  using `float` directly.

### 3.4 Concurrency

- SIMD, or Single Instruction Multiple Data, is a category of parallel computing
  architectures where a single instruction can act upon multiple data points
  simultaneously.
- The SIMD architecture’s capability to process multiple data points
  concurrently leads to increased data throughput and reduced latency, features
  especially beneficial for operations involving large data sets or arrays.
- Lock-free programming is a concurrent programming paradigm that centers around
  the construction of multi-threaded algorithms which don't employ the usage of
  mutual exclusion mechanisms, such as locks, to arbitrate access to shared
  resources.
- The process of locking can be computationally expensive, necessitating system
  calls and occasionally leading to the suspension of the calling thread if the
  lock is presently held by an alternate thread. In contrast, atomic operations
  are typically implemented using CPU instructions and don't demand context
  switches, thus conferring upon them a superior speed profile.
- Performance improvements gained through lock-free programming may vary based
  on numerous factors, including hardware specifications, number of threads, and
  the workload’s contention level.

![Speed Improvement Table](/series/notes/cpp-design-patterns-for-low-latency-apps/speed-improvement-by-optimization-technique.webp#center)

## Closing Remarks

The rest of the article goes on to show the design patterns applied to a
statistical arbitrage pairs trading strategy. The authors also implement a queue
following the LMAX disruptor pattern. They conclude with data showing how the
combination of the design patterns and LMAX disruptor produce a significant
reduction in their strategies' latency compared to a naive/unoptimized approach.

Perhaps the design patterns described by the authors aren't particularly ground
breaking. That said, their ["Low Latency Programming Repository"][3] is unique.
Having not only the descriptions of the design patterns in the article, but a
repository with clear examples is the true highlight.

[1]: https://programmador.com/categories/notes/
[2]: https://eli.thegreenplace.net/2013/12/05/the-cost-of-dynamic-virtual-calls-vs-static-crtp-dispatch-in-c
[3]: https://github.com/0burak/imperial_hft
[4]: https://arxiv.org/abs/2309.04259v1
