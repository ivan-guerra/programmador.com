---
title: "The Practice of Programming 1st Edition"
date: 2024-08-03T19:47:09-04:00
description: 'Notes on "The Practice of Programming".'
categories: ["notes"]
---

This is the fourth [installment][1] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading the book titled ["The Practice
of Programming"][2] by Brian Kernighan and Rob Pike.

## Chapter 1: Style

- Use descriptive names for globals and short names for locals.
- Consistency with local coding conventions is key.
- Use active names for functions.
- Name boolean functions such that the return value is obvious.
- Indent to show structure. Be consistent with whatever style you choose.
- Use parentheses to resolve ambiguity. Don't expect the reader to be an expert
  in precedence rules.
- Break up complex expressions. Don't cram a bunch into one line just because
  you can.
- Clarity isn't the same as brevity. Ease of understanding is what distinguishes
  the two.
- In C/C++, avoid function macros. Just use a function. Inline or use
  `constexpr` as appropriate.
- Give names to magic numbers.
- Don't use macros for numeric constants. Use `enum`, `const`, and `constexpr`.
- Never hardcode sizes. Use features of the language such as `sizeof` or `size`
  members of a container.
- Comments should avoid stating the obvious, contradicting the code, and should
  only exist to enhance clarity.

## Chapter 2: Algorithms and Data Structures

- Most programs require some form of searching or sorting.
- Linear and binary search are common algorithms that handle searching for an
  element in a collection. If your language has built-ins for linear/binary
  search, use them.
- Similar to searching, use your language's sorting routines rather than rolling
  out your own. Read the docs to understand not only the API but any gotchas
  regarding runtime/space complexity.
- Big-oh notation is a tool for describing the time/space complexity of an
  algorithm. Below is a table of the most common complexities:

  | Notation       | Name        |
  | -------------- | ----------- |
  | \\(O(1)\\)     | constant    |
  | \\(O(logn)\\)  | logarithmic |
  | \\(O(n)\\)     | linear      |
  | \\(O(nlogn)\\) | nlogn       |
  | \\(O(n^2)\\)   | quadratic   |
  | \\(O(n^3)\\)   | cubic       |
  | \\(O(2^n)\\)   | exponential |

- Arrays are easy to use, provide \\(O(1)\\) access to any item, work well with
  binary search and quicksort, and have little space overhead. For fixed sized
  data sets, or for guaranteed small collections of data, arrays are unbeatable.
- Lists are useful when the container size isn't known at compile time and when
  insertions/deletions in the middle of the collection happen frequently. You
  can't index a list so operations like searching are always linear.
- Trees represent a hierarchical relationship between a collection of items. The
  structure of the tree often affects algorithm performance as is the case with a
  balanced versus unbalanced BST. You can traverse a tree in preorder, inorder,
  and postorder fashion. Each traversal introduces benefits depending on the
  contents of the tree.
- Hash tables provide fast (on average \\(O(1)\\)) insertion, deletion, and
  lookup. The performance of a hash table relies on the implementation of its
  hashing function and collision handling scheme.

## Chapter 3: Design and Implementation

- Try to handle irregularities, exceptions and special cases in data. Code is
  harder to get right so the control flow should be as simple and regular as
  possible.
- It's important to choose simple algorithms and data structures, the simplest
  that will do the job in reasonable time for the expected problem size.
- Start your detailed design thinking about the data structures guided by what
  algorithms you might use.
- Expect to iterate. Start with something simple and refine it.

## Chapter 4: Interfaces

- Creating a prototype that solves a problem is a good first step in
  understanding how to develop a more thorough design.
- Key concerns when designing are interfaces, information hiding, resource
  management, and error handling.
- Good interfaces follow a set of principles:
  - Hide implementation details.
  - Choose a small orthogonal set of primitives. Make your interfaces narrow.
    That is, provide only what's necessary. Don't expose multiple ways of doing
    the same thing.
  - Don't reach behind the user's back. Don't write secret files, variables, or
    change global data. Try not to modify the caller's input when possible. Make
    the interface as self-contained as possible. Don't inject dependencies where
    the user must call function A before function B etc.
  - Do the same thing the same way everywhere. Consistency and regularity are
    important.

- You should always consider how an interface manages resources.
  Construction, destruction, and copying are of key concern. Try to always free
  a resource at the same layer that allocated it.
- Try to write reentrant code meaning code that works regardless of the number
  of simultaneous executions. Avoid global variables, static local variables,
  and modifying anything that has potential for concurrent access.
- Detect errors at a low level, handle them at a high level. This is especially
  true for library code.
- Use exceptions for exceptional situations. Avoid using exceptions for control
  flow.

## Chapter 5: Debugging

- The authors don't recommend use of a debugger. This is counter personal
  experience in which interactive debugging has been invaluable. Stack traces,
  breakpoints, etc. make locating and understanding bugs easier. The trouble
  is in overcoming the learning curve of working with the debugger. It's worth
  learning if you program professionally.
- Tips for when you have plenty of "clues" to work with:
  - Look for familiar patterns. Does the bug look like something you've seen
    before?
  - Examine the most recent change. If you edit and test in small increments, a
    bug will likely be a direct result of the most recent change. Using a version
    control system makes this easier.
  - Don't make the same mistake twice. After you fix a bug, ask whether you
    might have made the same mistake somewhere else.
  - Debug it now not later. It's easy to forget a bug exists especially if it
    only appears under specific circumstances.
  - Get a stack trace.
  - Read before typing. Read the code and think about what it's doing and how
    your change would play out before making it.
  - Explain your code to someone else. If there's no one to talk to, just
    talking about the bug aloud might be good enough.

- Tips when there's not much information to go off of:
  - Make the bug reproducible.
  - Divide and conquer. Narrow down program inputs and code to the smallest you
    can while still reliably triggering the bug.
  - Study the numerology of failures. This basically means looking for a pattern
    in the erroneous output. The patterns can give hints that point you to the
    source of the issue.
  - Display output to localize your search. This means using print statements to
    narrow done the source of the error. You should only do this when a debugger
    isn't available or the problem would be hard to spot in a debugger (for
    example a bug to do with multithreaded execution).
  - Write a log file.
  - Draw a picture. Aside from just drawing the data structures or flow of the
    program, you can also add statistics to the code then generate plots from
    those statistics for further analysis.
  - Keep records. Write down what you've tried so you don't skip an idea or
    duplicate effort.

- With non reproducible bugs, you have to consider factors such as variable
  inputs, environment variables, startup files, random seeds, etc. You have to
  narrow down what can change between runs.

## Chapter 6: Testing

- Testing isn't the same as debugging.
- Testing can demonstrate the presence of bugs but not their absence.
- Test as you write the code:
  - Test code at its boundaries.
  - Test pre- and post conditions.
  - Use assertions.
  - Program defensively.
  - Check error returns.

- Systematic testing:
  - Test incrementally.
  - Test the simple parts first.
  - Know what output to expect.
  - Verify conservation properties. Some programs should leave properties of the
    input unchanged. You can use tools like `wc`, `diff`, `md5sum`, etc. to
    verify those properties.
  - Compare independent implementations.
  - Measure test coverage.

- Automate your testing. Testing frameworks such as GoogleTest and doctest are
  excellent for writing large test suites.
- Stress tests can introduced inputs that humans would avoid or would be
  unlikely to provide. The authors' characterization of stress testing is
  different than the usual definition where one sends large amounts of valid
  input to a program hoping to induce a crash.
- Testing tips:
  - Vary your test cases.
  - Don't keep on implementing new features or even testing existing ones if you
    know there are bugs.
  - Test output should include all input parameter settings, so the tests can be
    reproduced exactly.
  - Test on multiple machines, compilers, and operating systems.

## Chapter 7: Performance

- The first step in optimizing for performance is determining if there's a need
  to optimize at all.
- Use tools to identify bottlenecks. These tools should include timers and
  profilers.
- Focus your energy on the hotpots. The outputs of the profiler will guide you
  to the hotspot. Post optimization, measure again and repeat the process for
  any new hotpots observed.
- Plot benchmark data. Visualizing the data can call to your attention issues
  that otherwise wouldn't be apparent from just looking at the numbers.

- Strategies for speed:
  - Use a better algorithm or data structure.
  - Enable compiler optimizations.
  - Tune the code. See next section for tuning tips.
  - Don't optimize what doesn't matter.

- Tuning the code:
  - Collect common subexpressions.
  - Replace expensive operations by cheap ones.
  - Unroll or remove loops.
  - Cache frequently used values.
  - Write a special-purpose allocator. Authors refer to essentially object
    caches/slab allocation.
  - Buffer input and output.
  - Handle special cases separately.
  - Precompute results.
  - Use approximate values.
  - Rewrite in a lower level language.

- Space efficiency:
  - Save space by using the smallest possible data type.
  - Don't store what you can easily recompute.

## Chapter 8: Portability

- A program can be portable between compilers, operating systems, and processor.
- The techniques of portable programming relate to the techniques of good
  programming in general.

- Languages:
  - An easy way to achieve portability is to stick with the language's standard.
  - Program in the mainstream. This means give preference to the mature/stable
    parts of the language.
  - Beware of language trouble spots. These are parts of the language that are
    intentionally left ambiguous to give the language implementer more leeway in
    their design.
  - Make no assumptions about type sizes. Use the tools of the language to
    determine sizes (for example, `sizeof`).
  - Don't depend on order of evaluation.
  - Understand what type of shifting the `>>` and `<<` operators do. Logical
    versus arithmetic shifting. See [this link][3] for the details in C/C++.
  - Don't write endianness specific code.
  - Don't make assumptions about the alignment of structures and class members.

- Avoid conditional compilation where possible. Stick to the portable features
  of the language.
- When you do have nonportable sections of code, separate them into different
  files under a common interface.
- When it comes to endianness, the endianness of the sending and receiving
  machines doesn't matter. What matters is the agreed upon endianness of the
  data transmission.
- The authors recommend sending data as text. The argument being text is more
  portable than binary formats. Binary formats do have their place when it comes
  to saving space and processing efficiency.
- Consider whether a change that breaks portability is worth making. Try to
  remain backwards compatible whenever possible.

[1]: https://programmador.com/series/notes/
[2]: https://www.amazon.com/Practice-Programming-Addison-Wesley-Professional-Computing/dp/020161586X
[3]: https://stackoverflow.com/questions/7622/are-the-shift-operators-arithmetic-or-logical-in-c
