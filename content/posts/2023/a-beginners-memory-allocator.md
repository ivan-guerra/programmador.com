---
title: "A Beginner's Memory Allocator"
date: 2023-09-12T13:41:25-07:00
description: "On creating a crude Linux memory allocator."
tags: ["c++", "linux"]
---

While reading through the awesome ["Operating Systems: Three Easy Pieces"][1]
book, I came across the topic of memory allocators. While always having an
inkling of how functions like `malloc()` and `free()` work under the hood, I
never considered writing a custom allocator. To help demystify the topic, I
decided to write a basic allocator on Linux.

## The Interface

What does the API look like? The API is identical to that of
`malloc()`/`free()` with only two major deviations:

1. Compile time memory pool size specification.
2. The allocator accepts an optional alignment argument so that the user can
   retrieve a byte-aligned pointer.

Below is the `Malloc` template class declaration:

```cpp
template <std::size_t N>
    requires(N > 0)
class Malloc {
   public:
    Malloc();
    ~Malloc();

    Malloc(const Malloc&) = delete;
    Malloc& operator=(const Malloc&) = delete;

    Malloc(Malloc&& rhs);
    Malloc& operator=(Malloc&& rhs);

    std::size_t RegionSize() const;
    void* Alloc(std::size_t size, std::size_t alignment = 8);
    void Free(void* block);
};
```

The template argument, `N`, dictates the amount of memory `Malloc` requests from
the OS on construction. The `RegionSize()` method returns the actual amount of
memory provided by the OS. More on that later. `Alloc()`/`Free()` are identical
to the C runtime `malloc()/free()` with the exception that `Alloc()` gives the
option of setting the alignment of the returned address.

Lets explore the implementation of `Malloc` starting with construction and the
`RegionSize()` method.

## Getting Memory

In Linux, there are two options to explore for acquiring allocator memory:

- Expand/contract the running process's data segment using the `sbrk()`/`brk()`
  system calls.
- Request that the kernel map pages of memory into the process's virtual address
  space using the `mmap()` system call.

Which option's better? It depends. Some allocators use a combination of
both syscalls with the primary goal of reducing memory fragmentation. Freeing
an `mmap()`'ed chunk of memory basically tells the kernel "these pages, dirty
or not, can be re-purposed." In the case of `sbrk()`, it's possible to free
chunks of memory yet the kernel doesn't know unless you reduce the program
break.

Okay, so what does all that mean for `Malloc`? To keep things simple, a chunk of
memory allocated using `mmap()` serves as a memory pool. The size of the pool is
know at compile time and is the sole template parameter of the allocator class.
The memory requested would be in units of the page size. As an example, if the
OS has 4096 byte pages and a user requested a pool of 100 bytes, then `Malloc`
would request one page of memory from the OS. `Malloc` would implement a
strategy for the management of this pool of memory.

The `Malloc` constructor shows the `mmap()` call in action:

```cpp
template <std::size_t N>
    requires(N > 0)
Malloc<N>::Malloc() : region_size_(N), mmap_start_(nullptr), head_(nullptr) {
    const int kPageSize = ::getpagesize();
    if (region_size_ % kPageSize) {
        region_size_ = (region_size_ / kPageSize) * kPageSize + kPageSize;
    }

    head_ = reinterpret_cast<MemBlock*>(mmap(nullptr, region_size_,
                                             PROT_READ | PROT_WRITE,
                                             MAP_ANON | MAP_PRIVATE, -1, 0));
    if (!head_) {
        throw std::runtime_error(::strerror(errno));
    }

    mmap_start_ = head_;
    head_->size = region_size_ - sizeof(MemBlock);
    head_->next = nullptr;
}
```

`region_size_`, is initially set to `N` and then rounded up to the nearest
multiple of a page. A `RegionSize()` method returns `region_size_` so that the
caller knows exactly how many bytes this object instance of `Malloc` owns.

The `mmap()` call returns a page-aligned address to a region of memory. The
`PROT_READ` and `PROT_WRITE` protection flags enable page read/write. The
`MAP_ANON` flag guarantees the kernel provides anonymous, zero initialized
pages. `MAP_PRIVATE` ensures that changes made to the mapped pages are process
private.

That concludes the setup of the memory pool. The next section discusses
allocating chunks of pool memory.

## Allocate

There are a number of different strategies out there for managing a pool of free
memory. The most basic approach is to represent free memory as a linked list of
free blocks. To service an allocation request, traverse the free list and return
the first block that's large enough to accommodate the request. What if the
selected block is larger than the requested number of bytes? In this case, split
the block into a free block and allocated block and reinsert the free block back
into the list. Below is a graphic illustrating the process:

![First Fit
Allocation](/posts/2023/a-beginners-memory-allocator/allocation.webp#center)

In the illustration, a user requests 99 bytes. The allocator performs a linear
search through its free list until it finds the first block that can satisfy the
request. The 4th block of 200 bytes exceeds the need. The allocator splits the
200 byte free block into a 99 byte block and 101 byte block. The allocator
reinserts the 101 byte block back into the list. A pointer to the 99 byte block
is finally returned to the caller.

There are many other strategies for free block selection besides the first fit
approach:

- **Worst Fit**: Find the largest free block that can satisfy the request.
- **Next Fit**: Same as first fit except subsequent allocations begin their
  search from the location where the last allocation occurred.
- **Buddy Allocation**: Recursively divide free space by two until you have a
  block big enough to satisfy the request and the next split would be too small.
- **Segregated Lists**: Maintain two or more free lists. One list is for general
  allocations. All other lists have blocks sized to accommodate common requests.

For each strategy, the performance of the approach is dependent on the workload.
It's easy to craft a workload that makes any strategy look awesome or look
terrible.

## The Data Structures

The first data structure of interest is the `MemBlock`:

```cpp
struct MemBlock {
    std::size_t size = 0;
    MemBlock* next = nullptr;
};
```

Each free block tracks its size in bytes and keeps a pointer to the next free
block in the list. Initially, the list will contain one massive block
representing the complete pool of memory. After a combination of
`Alloc()`/`Free()` calls, the list will include more nodes. **As you'll soon
see, `MemBlock` lives inside the memory chunk returned by `mmap()`!**

Block allocation requires the use of a header:

```cpp
struct MemBlockHeader {
    int magic = 0;
    std::size_t size = 0;
};
```

The header will come in handy later when it comes time to free the allocated
block. Included in the header is a magic number used to identify a block
allocated by `Alloc()`. The `size` field defines the size of the allocated
block. Inclusion of a header requires that a free block be at least `n +
sizeof(MemBlockHeader)` bytes in size.

Below is an updated allocation example that accounts for the block header:

![Allocation with
Metadata](/posts/2023/a-beginners-memory-allocator/allocation-with-metadata.webp#center)

A couple of points worth noting in this updated drawing. On allocation, the 200
byte block is now split into a 107 byte allocated block and 93 byte free block.
Where does the extra 8 bytes come from in the allocated block? The
`MemBlockHeader` (assuming it's an 8 byte structure) takes up 8 extra bytes. On
return, `Alloc()` returns a pointer to the beginning of a 99 byte free chunk.
Critically, the header to the chunk sits at a negative offset of
`sizeof(MemBlockHeader)` bytes from the returned pointer.

Here's the snippet of code showing allocation in action with the address
alignment code excluded:

```cpp
template <std::size_t N>
    requires(N > 0)
void* Malloc<N>::Alloc(std::size_t size, std::size_t alignment) {
    /* precondition checks excluded */

    /* we must add additional space to accomodate the block header, alignment
     * requirement, and a byte to store the number of bytes used in alignment */
    std::size_t req_space = size + sizeof(MemBlock) + alignment + 1;

    /* dummy simplifies the splitting of the free list */
    MemBlock dummy = {.size = 0, .next = head_};
    MemBlock* prev = &dummy;
    MemBlock* curr = head_;
    while (curr) { /* taking a first fit approach */
        if (curr->size >= req_space) {
            break; /* found a large enough chunk */
        }
        prev = curr;
        curr = curr->next;
    }

    if (!curr) { /* not enough mem available, unable to satisfy request */
        return nullptr;
    }

    /* split off the user's memory chunk from the free list node */
    if (req_space < curr->size) { /* current free node is being split */
        MemBlock* split_node = reinterpret_cast<MemBlock*>(
            reinterpret_cast<char*>(curr) + req_space);
        split_node->size = curr->size - req_space;
        split_node->next = curr->next;

        prev->next = split_node;
    } else { /* current free node is being entirely consumed */
        prev->next = curr->next;
    }

    head_ = dummy.next; /* update the head of the free list */

    /* configure the block header */
    MemBlockHeader* header = reinterpret_cast<MemBlockHeader*>(curr);
    header->size = req_space - sizeof(MemBlockHeader);
    header->magic = kMemMagicNum;

    void* user_ptr = header + 1; /* user space starts just passed the header */

    /* alignment code excluded, see next section */

    return user_ptr
}
```

First, you search for the first block capable of satisfying the request via a
linear search of the free list. If no such block exists, return `nullptr`.
Notice that the block search requires a size equal to the sum `size +
sizeof(MemBlockHeader) + alignment  + 1`. The key takeaway: you need more space
than the caller asks for to satisfy the request because of your allocation
bookkeeping requirements. Further along, the allocated memory gets split via
pointer updates. The use of the `dummy` list node makes edge cases like updates
at the head of the list a nonissue. The final step is to setup the contents of
the header in the allocated block and return the address just beyond the header.
Aside from the linear search for a free block, the algorithm is pretty efficient
in that it's just doing constant time pointer swaps/arithmetic.

Now, for the next piece of the allocation puzzle: address alignment.

## Address Alignment

Address alignment is important when it comes to performance. Similar to
`posix_memalign()`, `Alloc()` returns a `alignment` aligned address where
`alignment` is a power of two. The allocator takes a negligible amount of extra
memory to meet the desired alignment. The strategy used by `Malloc` is to
request an extra `alignment + 1` bytes per request. The `+1` byte stores the
actual number of bytes used for alignment. The number of bytes used for
alignment is critical knowledge. You need this information to offset the user
pointer when freeing the block.

Lets look at an example. Suppose someone called `Alloc()` as follows:

```cpp
void* foo = allocator.Alloc(1024, 8);
```

The graphic below shows the internals of the allocated block with alignment
taken into account:

![Aligned Allocation](/posts/2023/a-beginners-memory-allocator/aligned-allocation.webp#center)

You have your `MemBlockHeader` at the tip of the block with address
`0x7FFF0001`. While `MemBlockHeader` is 8 bytes long which would make you think
the search for the aligned address starts at `0x7FFF0009`, the search actually
starts one byte later at address `0x7FFF000A`. The reason for this is that one
byte is always committed to store the alignment byte count. If you follow the
header starting at address `0x7FFF000A`, you have 8 bytes from which you can
search for an 8 byte aligned addressed. The next 8 byte aligned address is 7
bytes in at address `0x7FFF0010`. `0x7FFF00010` is the address you return to
the caller. Before returning, place 7, the number of bytes used in alignment, in
the byte preceding the return address.

How do you find the next aligned address? C++ provides a nice utility for doing
just that: `std::align`. `std::align` has a tricky interface in the sense that
two of its arguments are in/out parameters. Below is the snippet of code in
`Alloc()` that performs alignment using `std::align`:

```cpp
template <std::size_t N>
    requires(N > 0)
void* Malloc<N>::Alloc(std::size_t size, std::size_t alignment) {
    ...

    MemBlockHeader* header = reinterpret_cast<MemBlockHeader*>(curr);
    header->size = req_space - sizeof(MemBlockHeader);
    header->magic = kMemMagicNum;

    void* user_ptr = header + 1; /* user space starts just passed the header */

    /* shift the user pointer up a byte to make room for the alignment count */
    user_ptr = reinterpret_cast<char*>(user_ptr) + 1;

    /* the -1 is used to account for the alignment byte's space */
    std::size_t total_space = header->size - 1;
    std::size_t total_space_copy = header->size - 1;
    user_ptr =
        std::align(alignment, total_space - alignment, user_ptr, total_space);

    /* save how many bytes were used for alignment in the byte just before
     * user_ptr */
    uint8_t* alignment_byte_cnt_addr = reinterpret_cast<uint8_t*>(user_ptr) - 1;
    *alignment_byte_cnt_addr = total_space_copy - total_space;

    return user_ptr;
}
```

You interpret the arguments to `std::align` as follows:

- `alignment`: The user supplied alignment argument. Must be a power of two.
- `total_space - alignment`: Tells `std::align` how many bytes you have in your
  buffer. The bytes reserved for alignment don't get included in the count.
- `user_ptr`: The address of the free block.
- `total_space`: The total amount of space `std::align` has to work with. This
  critically includes your additional alignment bytes. You want `std::align` to
  return an address in the range [`user_ptr`, `user_ptr + alignment`].

Once `std::align` does its thing, `total_space` will decrement by the number of
bytes used in alignment. The following statements save that alignment byte count
in the byte preceding the aligned address:

```cpp
uint8_t* alignment_byte_cnt_addr = reinterpret_cast<uint8_t*>(user_ptr) - 1;
*alignment_byte_cnt_addr = total_space_copy - total_space;
```

Allocation is just the first half of the story. Lets look at how to free
allocated memory.

## Free

There are two problems to solve when it comes to freeing memory. First, you need
a means of knowing how much memory to release back to the allocator. Second, you
need to reduce the fragmentation of memory.

You'll remember that each allocated block has a handy header with an identifying
magic number and size field. Additionally, included in the allocated block at a
negative offset of 1 byte is the count of bytes used in the alignment of the
memory block. Getting a handle to the "true" start of a block from the user's
pointer just involves some pointer arithmetic as shown in the `Free()` snippet
below:

```cpp
template <std::size_t N>
    requires(N > 0)
void Malloc<N>::Free(void* block) {
    if (!block) {
        throw std::runtime_error("cannot free NULL mem block");
    }

    uint8_t* alignment_byte_cnt_addr = reinterpret_cast<uint8_t*>(block) - 1;
    uint8_t alignment_byte_cnt = *alignment_byte_cnt_addr;

    MemBlockHeader* header = reinterpret_cast<MemBlockHeader*>(
        reinterpret_cast<char*>(block) - sizeof(MemBlockHeader) -
        alignment_byte_cnt - 1);
    if (header->magic != kMemMagicNum) {
        throw std::runtime_error("invalid mem block magic number");
    }

    MemBlock* insert_block = reinterpret_cast<MemBlock*>(header);
    insert_block->size = header->size + sizeof(MemBlockHeader);
    insert_block->next = nullptr;

    InsertFreeMemBlock(insert_block);
    MergeFreeBlocks();
}
```

The snippet shows the solution to the problem of getting the address of the
start of an allocated block from the pointer supplied to `Free()`. Now, lets
look at how you get the block back on the free list.

Free memory can become severely fragmented. It's possible that despite having
enough free memory to service an allocation request, the allocator denies the
request because no single free block can satisfy the need. One solution to the
problem is to coalesce adjacent free blocks. `Malloc`'s strategy for memory
compaction is to maintain a free list ordered by the addresses of the blocks.
That is, the free list nodes are in ascending order by address. `Free()` inserts
the freed block into the ordered list and then merges adjacent blocks. Two
blocks are adjacent if the current block's address plus its size is equal to the
next block's address. Below are the two methods implementing insertion and
memory compaction:

```cpp
template <std::size_t N>
    requires(N > 0)
void Malloc<N>::InsertFreeMemBlock(MemBlock* block) {
    MemBlock dummy = {.size = 0, .next = head_};
    MemBlock* prev = &dummy;
    MemBlock* curr = head_;
    bool inserted = false;
    std::uintptr_t block_end_addr =
        reinterpret_cast<std::uintptr_t>(block) + block->size;
    while (curr) {
        std::uintptr_t curr_block_addr = reinterpret_cast<std::uintptr_t>(curr);
        if (block_end_addr <= curr_block_addr) { /* insert block before curr */
            block->next = curr;
            prev->next = block;
            inserted = true;
            break;
        }
        prev = curr;
        curr = curr->next;
    }

    if (!inserted) { /* insert at the tail of the free list */
        prev->next = block;
        block->next = nullptr;
    }

    head_ = dummy.next;
}

template <std::size_t N>
    requires(N > 0)
void Malloc<N>::MergeFreeBlocks() {
    MemBlock* curr = head_;
    while (curr->next) {
        std::uintptr_t adj_addr =
            reinterpret_cast<std::uintptr_t>(curr) + curr->size;
        std::uintptr_t next_addr = reinterpret_cast<std::uintptr_t>(curr->next);
        if (adj_addr == next_addr) { /* current and next block are adjacent */
            MemBlock* old_next = curr->next;
            curr->next = curr->next->next;
            curr->size += old_next->size;
        } else {
            curr = curr->next;
        }
    }
}
```

Both the functions are implementations of classic linked list algorithms. Both
algorithms have linear time complexity. This means that the `Free()` method has
linear time complexity. It's actually a bit worse than that, there's a constant
of 2 hidden in the big-oh because in the worst case `InsertFreeMemBlock()` and
`MergeFreeBlocks()` both iterate the entire list. You could probably combine
them to get a single pass algorithm but the increased code complexity wasn't
worth it for this "toy" memory allocator implementation.

## Conclusion

That's it. With `Alloc()` and `Free()` implemented, you have a complete memory
allocation utility! Unit testing using the GoogleTest framework revealed some
simple bugs. Randomized workloads helped shakeout additional issues that were
hard to detect via a unit test. Given more time, a followup collecting some
performance metrics would be interesting.

Highly recommend anyone curious about writing their own memory allocator go
ahead and give it a shot. There's so much history out there on the
implementation of memory allocators one could read through and learn from. Not
to mention the many tradeoffs you can make with regards to data structures and
algorithms.

You can find the complete project source with build instructions, usage, etc.
on GitHub under [malloc][2].

[1]: https://pages.cs.wisc.edu/~remzi/OSTEP/
[2]: https://github.com/ivan-guerra/malloc
