---
title: "Linkers and Loaders"
date: 2025-09-14T21:09:31-04:00
description: 'Notes on John Levine''s "Linkers and Loaders".'
tags: ["notes"]
series: ["notes"]
ShowPostNavLinks: false
---

This is the seventh [installment][1] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading the book titled ["Linkers and
Loaders"][2] by John Levine. The book includes exercises that have you
incrementally build a linker. A partial implementation is available on GitHub:
[mild][3].

## Chapter 1: Linking and Loading

- The basic job of any linker or loader is simple: it binds more abstract names
  to more concrete names, which permits programmers to write code using the more
  abstract names.
- Linkers assign relative addresses within a program. Loaders do final
  relocation to assign actual addresses in memory.
- Program loading is the process of copying a program from secondary storage
  into main memory. This may involve allocating storage, setting protection bits,
  or arranging for virtual memory to map virtual addresses to disk pages.
- Relocation is the process of assigning load addresses to the various parts of
  the program, adjusting the code and data in the program to reflect the assigned
  addresses.
- Symbol resolution is just as the name suggests: take a symbol name and resolve
  it to an address in the code or a library.
- There's a lot of overlap between linker and loader responsibilities. In
  general, the loader loads the program into memory. The linker performs symbol
  resolution. Either can do relocation. It's also possible to have an all in one
  tool that does all three functions.
- Both linkers and loaders patch object code.
- Linking is a two pass process. The linker takes as its input a set of input
  object files, libraries, and perhaps command files, and produces as its result
  an output object file, and perhaps ancillary information such as a load map or
  a file containing debugger symbols.
- Each input contains segments, contiguous chunks of code or data that are
  merged in the output file. Each input file also contains at least one symbol
  table.
- You can import symbols. These are names that must be present in one of the
  other input files. You can export symbols. This makes the symbol name visible to
  code in the other input files.
- All linkers support object code libraries. A library is just a collection
  of object files. The linker resolves undefined names in the input files by
  looking at the library's object code for exported names that match.
- With dynamic linking, the linker leaves hints for the loader of the symbols
  required and what libraries they're found so the loader can patch the code at
  runtime.
- Typically, you invoke the linker through the compiler driver.
- The various linkers can take commands. This includes command line switches and
  special scripts which can give the programmer control of where sections get
  loaded.

## Chapter 2: Architectural Issues

- Two aspects of hardware architecture affect linkers: program addressing and
  instruction formats. One thing the linker does is modify addresses and offsets
  both in data memory and in instructions.
- The aspect of the Abstract Binary Interface that most often affects the linker
  is the definition of a standard procedure call.
- Usually addresses are byte aligned. This means that if you have an \\(N\\)
  byte datum, its address should have at least \\(log_2(N)\\) least significant
  zero bits.
- Unaligned accesses can degrade performance on some systems. On others,
  unaligned access leads to faults.
- The instruction format is of concern to the linker. Specifically those
  instructions surrounding addressing data. Instructions can be of fixed or
  variable length. They usually consist of an opcode followed by operands.
- Every ABI defines a standard procedure call sequence using a combination of
  hardware-defined call instructions and conventions about register and memory
  use.
- Within a procedure, data addressing falls into four categories:
  - A caller can pass **arguments** to the procedure.
  - **Local variables** get allocated within the procedure and freed before
    the procedure returns.
  - **Local static** data gets stored in a fixed location in memory and is
    private to the procedure.
  - **Global static** data gets stored in a fixed location in memory and can be
    referenced from many different procedures.
- There's usually a frame pointer pointing to the return address of the
  procedure. There's also a stack pointer pointing to the top of the stack.
  Arguments to the procedure are at negative offsets to the frame pointer (higher
  memory addresses). Local variables are at positive offsets to the frame pointer
  (lower memory addresses). The OS usually sets the initial stack pointer before
  a program starts.
- The compiler generates a table of pointers to local and global static data.
  The address of that table gets loaded into a register. You require another
  register to calculate offsets from that base address.
- Within some architectures, the linker must create a table of pointers that
  captures static data across all modules/object files. In other systems,
  procedures within a module have their own table. A register gets loaded with the
  procedure's table address **before** that procedure gets called.
- There's a bootstrapping problem here where the first procedure called needs to
  have its static data table pointer set up. This is usually done by the linker
  via some special code.
- Modern computers support virtual memory. On these machines, paging hardware
  divides the program's address space into fixed size **pages**, typically 4KB in
  size. The same hardware divides the physical memory into **page frames** of the
  same size. The hardware contains **page tables** with an entry for each page in
  the address space.
- A page table entry can contain the real memory page frame for the page, or
  flag bits to mark the page "not present." When a program attempts to use a page
  that isn't present, hardware generates a **page fault**. Page faults get handled
  by the OS which can copy content from disk into a free page frame. Moving data
  back and forth between disk and memory makes it seem like the system has more
  memory than it actually does (virtual memory).
- Page tables are usually hierarchical. The hardware divides the virtual address
  into three parts: a top-level page table index, a second-level page table
  index, and an offset within the page. The hardware uses the top-level index to
  find the second-level page table, then uses the second-level index to find the
  page table entry. This can vary by architecture.
- Every application runs in an address space defined by a combination of the
  computer's hardware and OS. The linker or loader needs to create a runnable
  program that matches that address space.
- Address space layouts vary from system to system. Some systems have a single
  address space where the OS and all programs share the same address space. Others
  partition the address space and allocate a free chunk large enough to hold the
  program.
- Many systems provide a memory mapping mechanism for mapping a file into the
  address space of a program. The OS sets up the page tables so that when the
  program accesses a page in the mapped region, the OS loads the page from the
  file on disk. Policies for mapping files include read-only, read-write, and
  copy on write (COW). COW is interesting because it means changes made in the
  address space are only visible to that process.
- Shared libraries often use position independent code (PIC). This means you can
  load the code at any address in memory without modification. Only data pages
  still usually contain pointers which need relocation, but since data pages
  map COW anyway, there's little sharing lost.
- Embedded systems pose special challenges for linkers and loaders. They often
  have address spaces that divide into regions for ROM, RAM, and peripherals.
  The linker needs to know about these regions and place code and data
  appropriately.
- On some embedded systems, there's references to on-chip and off-chip memory.
  The linker needs to know which addresses are on-chip and which are off-chip so
  it can place code and data appropriately. You can also use tricks to copy code
  or data from slow memory to fast memory as needed. To do this, you have to
  tell the linker "put this code at location X but link it as though it's at
  location Y." The code gets copied from X to Y at runtime.

## Chapter 3: Object Files

- An object file contains five kinds of information:
  - **Header Information**: Overall information about the file, such as the size
    of the code, name of the source file it derives from, and creation date.
  - **Object Code**: Binary instructions and data generated by a compiler or
    assembler.
  - **Relocation**: A list of the places in the object code that have to be
    fixed up when the linker changes the addresses of the object code.
  - **Symbols**: Global symbols defined in this module, imported symbols from
    other modules or defined by the linker.
  - **Debugging Information**: Other information about the object code not
    needed for linking but of use to a debugger. This includes source file and
    line number information, local symbols, and descriptions of data structures.
- A object file may be:
  - **Linkable**: Used as input by a link editor or linking loader.
  - **Executable**: Loads into memory and runs as a program.
  - **Loadable**: Loads into memory as a library along with a program.
  - A combination of the three is also possible.
- An object file could be all binary code. This is how MS DOS .COM files work.
- In UNIX, the `a.out` format introduces separate sections for instructions and
  data. Instructions live in a `.text` section. Data lives in a `.data` section.
  Uninitialized data lives in a `.bss` section. Read-only text sections are
  shareable amongst multiple processes.
- The `a.out` format also includes a header. The header contains sizes of the
  different sections. Also at the start of the header is a magic number that tells
  the loader how to load the file into memory.
- On a BSD system using the QMAGIC load format, the layout in memory looks like:
  - The object exists as a file on disk. The text section of that file will be
    loaded as read-only pages into the address space of the process. The data
    sections load as read-write pages that are COW.
  - The first page of the address space is blank to catch NULL pointer
    dereferences.
  - The header and text section follow next in the address space.
  - The data section follows next with the BSS section concatenated on the end.
  - The heap follows the BSS section with stack pages allocated some ways down.
  - Note, all sections are page aligned meaning text/data sections get rounded
    up to the next page boundary.
- The key thing with the BSD formats is that they assign a fresh address space
  to each process so that every program loads at the same logical address. These
  object formats are simple because they can be directly loaded to memory. No
  need for a linker.
- Executable Link Format (ELF) is a modern object file format used on many
  UNIX-like systems. ELF comes in three slightly different flavors: relocatable,
  executable, and shared object.
- Compilers and assemblers create relocatable files. The linker needs to process
  these before they can run.
- Executable files have all relocation done and all symbols resolved except
  perhaps shared library symbols that get resolved at runtime.
- Shared objects contain both symbol information for the linker and directly
  runnable code for runtime.
- Compilers, assemblers, and linkers treat an ELF file as a set of logical
  sections described by a section header table, while the system loader treats the
  file as set of segments described by a program header table.
- Here's a capture of the ELF header with descriptions:

![ELF Header](/series/notes/linkers-and-loaders/elf-header.webp#center)

- A relocatable or shared object is a collection of sections defined in section
  headers. The notes that follow apply to relocatable ELF files.
- Each section contains a single type of information, such as program code,
  read-only data, read-write data, relocation entries, or symbols.
- Every symbol in a module is relative to a section.
- Here's a capture of the section header table with descriptions:

![ELF Section Header](/series/notes/linkers-and-loaders/elf-section-header.webp#center)

- Here's a list of sections and their attributes:
  - `.text` which is type `PROGBITS`with attributes `ALLOC+EXECINSTR`. It's the
    equivalent of `a.out`'s text section.
  - `.data` which is type `PROGBITS` with attributes `ALLOC+WRITE`. It's the
    equivalent of `a.out`'s data section.
  - `.rodata` which is type `PROGBITS` with attribute `ALLOC`. It's read-only
    data hence no `WRITE` attribute.
  - `.bss` which type `NOBITS` with attributes `ALLOC+WRITE`. The BSS section
    takes no space in the file, hence `NOBITS`, but gets allocated at runtime,
    hence `ALLOC`.
  - `.rel.text`, `.rel.data`, and `.rel.rodata` each of which type `REL` or
    `RELA`. The relocation information for the corresponding text or data section.
  - `.init` and `.fini` which are type `PROGBITS` with attributes
    `ALLOC+EXECINSTR`. These are similar to `.text`, but they execute when the
    program starts up or terminates. These factor in with C++ which has global
    data with executable initializers and finalizers.
  - `.symtab` and `.dynsymb` types `SYMTAB` and `DYNSYM` regular and dynamic
    linker symbol tables. The dynamic linker symbol table is `ALLOC` since it
    loads at runtime.
  - `.strtab` and `.dynstr` are both type `STRTAB`, a table of name strings, for
    a symbol table or section names for the section table.
- Here's a capture of an ELF symbol table entry with descriptions:

![ELF Symbol Table Entry](/series/notes/linkers-and-loaders/elf-symtab-entry.webp#center)

- A ELF executable has the same general format as a relocatable ELF file, but
  the data gets arranged so that the file can map into memory and run. The notes
  that follow describe executable ELF files.
- An ELF executable contains a program header that follows the ELF header. The
  program header defines the sections of the file that get mapped to process
  memory.
- Here's a capture of the ELF program header with descriptions:

![ELF Program Header](/series/notes/linkers-and-loaders/elf-program-header.webp#center)

- An executable has a handful of segments, a read-only one for the code and
  read-only data, and read-write one for the read-write data. All the loadable
  sections pack into the appropriate segments so the system can map the file with
  one or two operations.
- An ELF shared object contains all the baggage of a relocatable and an
  executable. It has the program header table at the beginning, followed by the
  sections in the loadable segments, including dynamic linking information.
  Following sections comprising the loadable segments are the relocatable symbol
  table and other information that the linker needs while creating executable
  programs that refer to the shared object, with the section table at the end.

## Chapter 4: Storage Allocation

- A linker or loader's first major task is storage allocation. Once storage gets
  allocated, the linker can proceed to subsequent phases of symbol binding and
  code fixups.
- Storage layout is a two-pass process since the location of each segment can't
  get assigned until the sizes of all segments that logically precede it are
  known.
- Linkers will usually take the text segments of all modules and merge them
  together one after the other. Space gets allocated to house the merged text
  segments making sure to respect the alignment requirements of the target. The
  same gets done for data and BSS segments where data always follows text and BSS
  follows data.

![Storage Layout](/series/notes/linkers-and-loaders/storage-layout.webp#center)

- When you add paging, the same process happens with the distinction that the
  first data page follows the last text page. BSS gets interpreted as data so some
  BSS data actually lives on data pages.
- With C++ there's a duplicate removal problem created by virtual function
  tables, templates, and extern inline functions. There are several solutions:
  - Live with the duplication. Downside here is significant code bloat for large
    projects.
  - Compilers generate the duplicate code and linkers are "smarter" in the sense
    they can identify and remove duplication. Usually "link once" sections get
    emitted by the compiler. The linkers see these sections and discard all but
    the first one. Some linkers will inspect the content of the sections before
    discarding. This isn't perfect since type information gets lost at this point.
    For example, a template taking pointer to `int` and one taking pointer to
    `float` may look identical at the binary level.
- C++ also exacerbates the initializer/finalizer problem. In C++, you have
  static variables. The variables may have constructors and destructors. The
  linker needs to arrange for the constructors to run before `main()` and
  destructors to run after `main()` exits. The common solution is to create
  special sections `.init_array` and `.fini_array` which contain pointers to the
  constructors and destructors. The startup code runs the constructors in order
  before calling `main()`. The exit code runs the destructors in reverse order
  after `main()` returns. Within the init and fini sections, there's further
  ordering. Often library routines need to run before constructors and vice versa
  for the cleanup code. In this case, there might be several init/fini sections
  ordered by the linker appropriately.
- The last source of linker-allocated storage is the linker itself. When a
  program uses shared libraries, the linker creates segments with pointers,
  symbols, etc. for runtime support of the libraries. Once these segments get
  created, the linker allocates storage for them the same way it does for the
  other segments.
- Many linkers support control scripts that let the programmer control
  storage allocation. The scripts can specify the order of segments, their
  alignment, and even their absolute addresses. This is especially useful for
  embedded systems where code and data need to go in specific memory regions.

## Chapter 5: Symbol Management

- Symbol management is the linker's key function. All linkers handle symbolic
  references from one module to another.
- Each input module includes a symbol table. The symbols includes:
  - Global symbols defined and perhaps referenced in the module.
  - Global symbols referenced but not defined in this module (called
    externals).
  - Segment names which are usually also considered to be global symbols defined
    to be at the beginning of the segment.
  - Non-global symbols usually for debuggers and crash dump analysis. These
    aren't symbols needed for the linking process, but sometimes they're
    mixed in with global symbols so the linker has to at least skip over them.
  - Line number information to tell source language debuggers the correspondence
    between source lines and object code.
- Within a linker, there's one symbol table listing the input files and library
  modules, keeping the per-file information. A second symbol table handles global
  symbols, the ones that the linker has to resolve among input files. A third
  table may handle intra-module debugging symbols, although more often than not
  the linker need not create a full-fledged symbol table for debug symbols.
- On the first pass, the linker reads each input file's symbol table and stores
  each table in some program data structure. The linker also creates a single
  global symbol table for every symbol referenced or defined in _any_ input file.
- During the second pass, the linker resolves symbol references as it creates
  the output file.
- The output file usually contains a symbol table of its own. This is because
  the output file can be a relocatable object file.
- Some linkers output special symbols such as `etext`, `edata`, and `end` to
  mark the end of the text, data, and BSS segments respectively. The system
  `sbrk()` routine uses `end` to find the start of the heap. A similar strategy
  gets used with constructors and destructors so that the program start up stub
  can call a list of routines on startup and shutdown.
- Names get mangled for three reasons:
  - Avoiding name collisions
  - Name overloading
  - Type checking
- Many object formats can qualify a reference as weak or strong. A strong
  reference must get resolved while a weak reference may get resolved if there's a
  definition, but it's not an error if it's not. Linker processing of weak
  symbols is much like that for strong symbols except that at the end of the first
  pass an undefined reference to one isn't an error.
- Debugging symbols are sometimes included in the output module sometimes placed
  in a separate file. The debug info often includes line number information as
  well as names, types, and locations of program variables.
- With ELF in particular, the DWARF debugging format is common. You can strip
  the object of its debug info using the `strip` command.

## Chapter 6: Libraries

- The term libraries in this chapter refers to collections of object files that
  get included as needed in a linked program (statically linked libraries).
- UNIX linker libraries use an "archive" format which you can use for
  collections of any type of files, although in practice it's used just for object
  files.
- The archive consists of a text header with an extension for long names and a
  directory called `/`.
- `a.out` archives store the directory in a member called `__.SYMDEF`. Which is
  the first member of the archive following the header. In contrast, COFF/ELF
  files name the directory `/`.
- A COFF/ELF directory looks like this:
  ![COFF/ELF
Directory](/series/notes/linkers-and-loaders/coff-elf-directory.webp#center)
  The first four byte value is the number of symbols. What follows is an array
  of file offsets of archive members, and a set of NULL terminated strings. The
  first offset points to the member that defines the symbol named by the first
  string, and so forth.
- For COFF and ELF files, `ar` is the utility which creates a symbol directory
  if any of the members appears to be an object module.
- Library search happens during the first linker pass after the individual input
  files get read. If the library or libraries have symbol directories, the linker
  reads in the directory and checks for each symbol in the linker's symbol table.
  For each undefined symbol, the linker includes that symbol's file from the
  library. It's not enough to mark the file for later loading; the linker has to
  process the symbols in the segments in the library file just like those in an
  explicitly linked file. The segments then go in the segment table, and the
  symbols, both defined and undefined, go in the global symbol table.
- Linkers almost always process the objects and libraries in the order they
  appear on the command line. This means that if two libraries `A` and `B` form a
  circular dependency, you have to list one of them twice on the command line: `A
-> B -> A`. The problem becomes worse when there's three or more libraries
  exhibiting this behavior.
- Weak symbols are symbols that get resolved only if they're referenced.
  Unreferenced weak symbols are not defined and this is not considered an error.
  This is useful for libraries where you have optional routines that get used only
  if needed.

## Chapter 7: Relocation

- Relocation refers to both the process of adjusting program addresses to
  account for non-zero segment origins, and the process of resolving references to
  external symbols, since the two are frequently done together.
- Hardware relocation enables the operating system to give each process a
  separate address space that starts at a fixed known address, which makes program
  loading easier and prevents buggy programs in one address space from damaging
  programs in other address spaces.
- Software linker or loader relocation combines input files into one large
  file that's ready to get loaded into the address space provided by hardware
  relocation, frequently with no load-time fixing up at all.
- UNIX systems never relocate ELF programs although they do relocate ELF shared
  libraries. That is, programs get linked so that they load at a fixed address
  which is usually available, and no load-time relocation gets done except in the
  unusual case that the standard address is already in use by something else.

- Load-time relocation is simple compared to link-time relocation. At link time,
  different addresses get relocated different amounts depending on the size and
  locations of the segments. At load time, on the other hand, the entire program
  is invariably treated as a single big segment for relocation purposes, and the
  loader needs only to adjust program addresses by the difference between the
  nominal and actual load addresses.
- The requirements of relocation and symbol resolution are slightly different.
  For relocation, the number of base values is small, the number of segments in an
  input file, but the object format has to permit relocation of references to any
  address in any segment. For symbol resolution, the number of symbols is far
  greater, but the only action the linker needs to take with the symbol is to plug
  the symbol's value into a word in the program.
- Relocation falls into two categories: absolute and PC-relative. Absolute
  relocation means adding the base address of the related segment to the address.
  PC-relative relocation means adjusting an offset relative to the program counter
  to reflect the distance between the instruction and its target.
- The linker must implement a different number of relocation strategies
  depending on the target architecture. This is due to how the different
  instructions encode addresses and offsets.
- Relocation tables are usually stripped from the output object. If the
  relocation table isn't stripped, then the output object is a relocatable.
  Load-time relocation is possible with a relocatable object.
- Many object formats define special segment formats that require special
  relocation processing.

## Chapter 8: Loading and Overlays

- Loading is the process of bringing a program into memory so it can run.
- On most modern systems, each program gets loaded into a fresh address space,
  which means that all programs get loaded at a known fixed address and can be
  linked for that address.
- Here's the basic process:
  - Read enough header information from the object file to find out how much
    address space you need.
  - Allocate that address space in separate segments if the object format has
    separate segments.
  - Read the program into the segments in the address space.
  - Zero out any BSS space at the end of the program if the virtual memory
    system doesn't do so automatically.
  - Create a stack segment if the architecture needs one.
  - Set up any runtime information such as program arguments or environment
    variables.
  - Start the program.
- Load time relocation is sometimes done and is usually a simple process.
  Suppose the program gets linked to load at address 0. Then if the program
  actually gets loaded at 15000, then all fixup address just need to have 15000
  added to them.
- Load time relocation can present a performance problem because code loaded at
  different virtual addresses can't usually get shared between address spaces
  since the fixups for each address space are different. One popular solution is
  position independent code (PIC).
- The idea is to separate the code from the data and generate code that won't
  change regardless of the address at which it's loaded. That way the code can
  shared among all processes with only data pages being private to each process.
- The advantages of PIC are straightforward: it makes it possible to load code
  without having to do load-time relocation and to share memory pages of code
  among processes even though they don't all have the same address space
  allocated.
- The possible disadvantages are slowdown at load time, in procedure calls, in
  function prolog and epilog, and overall slower code.
- At load time, although the code segment of a PIC file needn't get relocated,
  the data segment does. In large libraries, the table of contents or Global
  Offset Table may be large and it can take a long time to resolve all the
  entries.
- PIC code is bigger and slower than non-PIC. The slowdown varies by
  architecture.
- Overlays are mostly obsolete in world a with virtual memory. What's important
  to know is that overlays originated the important technique of "wrapping" call
  instructions in the linker to turn a simple procedure call into one that did
  more work. Linkers use wrapping in a variety of ways. The most important is
  dynamic linking to link a called routine in a library that may not have been
  loaded yet.

## Chapter 9: Shared Libraries

- A program that uses a shared library depends on having that shared library
  available when the program runs. In this case, printing an error message is all
  you can do.
- With static shared libraries, symbols get bound to addresses at link time.
  This means that the library must not change or it will break linked programs.
- The most difficult aspect of shared libraries is address space management.
  Each shared library occupies a fixed piece of address space in each program in
  which it's gets used.
- Creating a shared library involves three steps:
  - Determine at what address the library's code and data will load.
  - Scan through the input library to find all the exported code symbols.
  - Make up the jump table with an entry for each exported code symbol. The jump
    table is just a sequence of jump instructions to the actual code.
  - If there's initialization or a loader routine at the beginning of the
    library, compile or assemble that.
  - Create the shared library. Run the linker and link everything together into
    one big executable format file.
  - Create the stub library. Copy the necessary symbols from the newly created
    shared library, reconcile those symbols with the symbols from the input
    library, create a stub routine for each library routine, then compile or
    assemble the stubs and combine them into the stub library.

## Chapter 10: Dynamic Linking and Loading

- Benefits of dynamic linking include:
  - Easier to create than static linked shared libraries.
  - Easier to update than static linked shared libraries.
  - The semantics of dynamically linked shared libraries can be much closer to
    those of unshared libraries.
  - Dynamic linking permits a program to load and unload routines at runtime, a
    facility that can otherwise be difficult to provide.
- Disadvantages of dynamic linking include:
  - The runtime performance cost of dynamic linking is greater than static
    linking. This is because a large part of the linking process gets done each
    time the program runs.
  - Every dynamically linked symbol used in a program gets looked up in a symbol
    table and resolved.
  - Dynamic libraries are also larger than static libraries since the dynamic
    ones have to include symbol tables.
  - There's also an administrative cost. It's easy to install a shared library
    that breaks existing programs.
- ELF shared libraries can get loaded at any address so they invariably use
  position independent code so that the text pages of the file need not be
  relocated and get shared among multiple processes.
- ELF linkers support PIC code with a Global Offset Table (GOT) in each shared
  library that contains pointers to all the static data referenced in the program.
  The dynamic linker resolves and relocates all the pointers in the GOT. This can
  be a performance problem mostly for large libraries.
- Similar to the GOT which points to static data in the SO, the Procedure
  Linkage Table (PLT) contains pointers to all the external functions called by
  the program. The PLT permits lazy evaluation, that is, procedure addresses
  don't get resolved until the first time they're called.

![PLT and GOT](/series/notes/linkers-and-loaders/plt-and-got.webp#center)

- An ELF dynamically linked file contains all the linker information that the
  runtime linker will need to relocate the file and resolve any undefined
  symbols:
  - The `.dynsym` section, the dynamic symbol table, contains all the file's
    imported and exported symbols.
  - The `.dynstr` section contains the name strings for the symbols.
  - The `.hash` section contains a hash table the runtime linker can use to look
    up symbols.
  - The `.dynamic` section contains information the runtime dynamic linker uses
    to find the information about the file the linker needs. It's loaded as part
    of the data segment, but gets pointed to from the ELF file header so the
    runtime dynamic linker can find it. The `.dynamic` section is a list of
    tagged values and pointers (see page 250 for details).
- Here's the structure of a ELF shared library:

![ELF Dynamic File
Structure](/series/notes/linkers-and-loaders/elf-shared-lib.webp#center)

- The first time a library function gets called, the PLT entry points to a GOT
  entry which actually points back to a special PLT entry: `PLT0`. `PLT0` calls
  the runtime dynamic linker with the index of the function. The dynamic linker
  looks up the function in the symbol table, finds the address, and patches the
  GOT entry to point directly to the function. The dynamic linker then jumps to
  the function. Subsequent calls to the function go directly to the function since
  the GOT entry now points directly to it.
- The takeaway here is that the dynamic linker (for example, `ld.so` on Linux)
  gets invoked not only at program startup but also each time a new function in a
  shared library gets called for the first time.
- A program can call the dynamic linker directly using `dlopen()`. Similarly,
  the program can resolve the address of a symbol (usually a procedure) using
  `dlsym()`. This permits users to add extra functionality to programs without
  access to the source code of the programs and without even having to stop and
  restart the programs.

# Chapter 11: Advanced Techniques

- The C++ section is worth reading directly. See page 273.
- Unlike the compiler, the linker has access to the entire program's object
  code. This means global optimizations are possible. There have been various link
  time strategies for optimizing code:
  - Link time optimization that applies to object code. Some of these optimizers
    decompile the code into an intermediate representation. Some decompile to
    assembly and perform optimization on the assembly.
  - Sometimes, the compiler doesn't produce object code. Instead, assembly or an
    intermediate language gets output.
- Linkers can also perform code instrumentation. This is useful for profiling
  and coverage analysis.
- Some linkers support incremental linking. This is useful for large programs
  where only a few modules change between builds. The linker can reuse the
  overloading of unchanged modules.
- Link time garbage collection is a technique where the linker discards
  unreferenced code and data. This is especially useful for C++ where templates
  can lead to significant code bloat.
- There's a discussion of the Java linking model that's worth a read starting on
  page 287.

[1]: https://programmador.com/series/notes/
[2]: https://www.amazon.com/Linkers-Kaufmann-Software-Engineering-Programming/dp/1558604960#customerReviews
[3]: https://github.com/ivan-guerra/mild/tree/master
