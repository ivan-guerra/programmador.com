---
title: "A Beginner's Memory Allocator"
date: 2023-09-12T13:41:25-07:00
description: "On creating a crude Linux memory allocator."
tags: ["c++", "linux"]
toc: true
cover:
    image: "/posts/a-beginners-memory-allocator/ram.jpg"
    alt: "Random Access Memory"
---

While reading through the awesome "Operating Systems: Three Easy Pieces"[^1]
book, I came across the topic of memory allocators. While always having an
inkling of how functions like `malloc()` and `free()` were implemented, I'd
never considered writing my own allocator. Learning the theory is important, but
nothing trumps hands on experience. To help demystify the topic further, I
decided to write a basic Linux memory allocator.

## The Interface

What kind of API did I want to provide? I decided to essentially keep the API
identical to the `malloc()`/`free()` specification with two major deviations:

1. The pool of memory from which the allocator would serve the running process
would be defined at compile time.
2. The allocator would accept an optional alignment argument so that the user
could retrieve a pointer whose address is byte-aligned to whatever boundary they
like.

With those two requirements in mind, I came up with the following `Malloc`
template class declaration:

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

The template argument, `N`, dictates the amount of memory `Malloc` shall
request from the OS on construction. The `RegionSize()` method returns the
actual amount of memory provided by the OS. More on that later.
`Alloc()`/`Free()` are identical to the C runtime's `malloc()/free()` with the
exception that `Alloc()` gives the option of setting the alignment of the
returned address.

Lets explore the implementation of `Malloc` starting with construction and the
`RegionSize()` method.

## Getting Memory

In Linux, there are two options we can explore for acquiring allocator memory:

* Expand/contract the running process's data segment using the `sbrk()`/`brk()`
system calls.
* Request that the kernel map pages of memory into the process's virtual address
space using the `mmap()` system call.

Which option's better? It depends[^2]. Some allocators use a combination of both
syscalls with the primary goal being to reduce memory fragmentation. `mmap()`'s
biggest advantage is its discardability. Freeing an `mmap()`'ed chunk of memory
basically tells the kernel "these pages, dirty or not, can be re-purposed". In
the case of `sbrk()`, you can get yourself in a situation where chunks of memory
can be freed yet the kernel can't know unless the program break is reduced. The
graphic below illustrates the issue.

[![Blocked Free
Chunk](/posts/a-beginners-memory-allocator/blocked-free.jpg#center)][2]

Even though the blue "free but blocked chunk" is ready to be collected by the
kernel, it cannot be reclaimed because it is preceded by two (light orange)
allocated blocks. The allocated blocks must be freed and the program break moved
down before that giant chunk can be re-used by the kernel.

Okay, so what does all that mean for `Malloc`? This is an educational project. I
ain't sitting here writing a production or fine-tuned allocator. As a such, I
decided to use `mmap()` to allocate a compile time specified chunk of memory
from which the `Alloc()` calls could pull from. The memory requested would be in
units of the page size meaning if the OS has 4096 byte pages and a user
requested a pool of 100 bytes, then `Malloc` would request one page of memory
from the OS. `Malloc` would implement a strategy for the management of this
pool of memory.

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

There are some references in the code shown above to a `head_` variable and a
few other things that we'll talk about in the next section. Ignore them for now.

`region_size_`, is initially set to `N` and then rounded off to the nearest page
if it is not a multiple of the platform's page size in bytes (i.e., we always
request memory in units of a page). A `RegionSize()` method returns
`region_size_` so that the caller can know exactly how many bytes were allocated
to this object instance of `Malloc`.

The `mmap()` call returns a page-aligned address to a region of memory. The
`PROT_READ` and `PROT_WRITE` protection flags ensure the pages can be
read/written. The `MAP_ANON` flag ensures we are given anonymous, zero
initialized pages. `MAP_PRIVATE` ensures that changes made to the mapped pages
are process private.

Now we have a pool of memory from which we can service the user's `Alloc()`
requests. Let's look at how to do just that.

## Allocate

There's a number of different strategies out there for managing a pool of free
memory. For this project, I chose to take the most basic route which is
representing free memory as a linked list of free blocks. When an allocation
request comes in, the free list is traversed and the first block that fits the
request is selected. If the selected block is larger than the requested number
of bytes, then the block will be split into a free block and allocated block
with the free block being reinserted into the list. Below is a graphic
illustrating the process.

![First Fit
Allocation](/posts/a-beginners-memory-allocator/allocation.svg#center)

In the diagram above, a user requests 99 bytes. The allocator performs a linear
search through its free list until it finds the first block that can
satisfy the request which happens to be the 4th block of 200 bytes. Next, the
allocator splits the 200 byte free block into a 99 byte block and 101 byte
block. The 101 byte block is reinserted in the list. A pointer to the 99 byte
block is finally returned to the caller.

There are many other strategies for free block selection besides the first fit
approach illustrated above:

* **Worst Fit**: Finds the largest free block that can satisfy the the request.
* **Next Fit**: Same as first fit except subsequent allocations begin their
search from the location where the last allocation occurred.
* **Buddy Allocation**: Recursively divides free space by two until a block big
enough to satisfy the request is found and the next split would be too small.
* **Segregated Lists**: Maintain two or more free lists. One list is for general
allocations. All other lists have blocks sized to accomodate common requests.

For each of the above strategies, the perfomance of the approach is dependent on
the workload. That is, you can make a workload that makes any of the above
strategies look awesome or look terrible.

Okay, so we got a free list with a first fit allocation strategy in mind. Lets
look at how to implement this.

### The Data Structures

We'll start with the free list structure:

```cpp
struct MemBlock {
    std::size_t size = 0;
    MemBlock* next = nullptr;
};
```

Each free block tracks its size in bytes and keeps a pointer to the next free
block in the list. Initially, the list will contain one massive block
representing the complete pool of memory. After a combination of
`Alloc()`/`Free()` calls, the list will include more nodes. **Note, `MemBlock`
data is embedded in the memory returned by `mmap()`!** No additional memory is
used to store the metadata.

When it comes to allocating blocks, we'll need to attach a header:

```cpp
struct MemBlockHeader {
    int magic = 0;
    std::size_t size = 0;
};
```

The header will come in handy later when it comes time to free the allocated
block. Included in the header is a magic number used to determine whether this
memory was allocated by `Alloc()`. The `size` field tells us the size of the
allocated block. Unfortunately, inclusion of a header means that when a user
makes a request for `n` bytes, we'll have to find space in our free list for
`n + sizeof(MemBlockHeader)` bytes.

Let's update our previous allocation drawing to include these new structures:

![Allocation with
Metadata](/posts/a-beginners-memory-allocator/allocation-with-metadata.svg#center)

A couple of points worth noting in this updated drawing. On allocation, the 200
byte block is now split into a 107 byte allocated block and 93 byte free block.
Where does the extra 8 bytes come from in the allocated block? The
`MemBlockHeader` that is included (assuming it is an 8 byte structure) takes up
8 extra bytes. On return, `Alloc()` returns a pointer to the beginning of a 99
byte free chunk. Critically, the header to the chunk can be found at a negative
offset of `sizeof(MemBlockHeader)` bytes from the returned pointer.

Here's the snippet of code showing allocation in action with the address
alignment code excluded. We'll look at address alignment in the next section.

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

In the code above, we find the first block capable of satisfying our request via
a linear search of the free list. If no such block exists, we return `nullptr`.
Notice that the block we search for has a size equal to the sum `size +
sizeof(MemBlockHeader) + alignment  + 1`. We'll talk about where that
`alignment + 1` bit comes from in the following section on address alignment.
The key takeaway is that more space than is requested by the caller is needed
for bookkeeping of the allocated memory. Further along, we split the allocated
memory by simply updating pointers. The use of the `dummy` list node makes
edge cases like updates at the head of the list a nonissue. The final step
is to setup the contents of the header in the allocated block and return the
address just beyond the header. Aside from the linear search for a free block,
the algorithm is pretty efficient in that it's just doing constant time pointer
swaps/arithmetic.

Now, for the next piece of the allocation puzzle: address alignment.

### Address Alignment

Address alignment is important when it comes to performance[^3]. Similar to
`posix_memalign()`[^4], `Alloc()` returns a `alignment` aligned address where
`alignment` is a power of two. We'll once again need to use a little extra
memory to guarantee the user the desired alignment. The strategy used by
`Malloc` is to request an extra `alignment + 1` bytes per request. The
`alignment` bytes guarantees that we'll be able to find an aligned
address. The `+1` byte is used to store the actual number of bytes used for
alignment. We want to know how many bytes were used for alignment so that we can
walk back that many bytes plus the header offset when freeing the block.

Lets look at an example. Suppose someone called `Allocate()` as follows:

```cpp
void* foo = allocator.Alloc(1024, 8);
```

The graphic below shows the internals of the allocated block with alignment
taken into account:

![Aligned Allocation](/posts/a-beginners-memory-allocator/aligned-allocation.svg#center)

You have your `MemBlockHeader` at the very tip of the block with address
`0x7FFF0001`. While `MemBlockHeader` is 8 bytes long which would make you think
the search for the aligned address starts at `0x7FFF0009`, the search actually
starts one byte later at addess `0x7FFF000A`. The reason for this is that one
byte is always committed to store the alignment byte count.  Following the
header starting at address `0x7FFF000A` we have 8 bytes from which we can search
for an 8 byte aligned addressed. The next 8 byte aligned address is found 7
bytes in at address `0x7FFF0010`.  `0x7FFF00010` is the address we return to
the caller. Before returning, we place 7, the number of bytes used in
alignment, in the byte preceding the return address.

How do we find the next aligned address? C++ provides a nice utility for doing
just that: `std::align`[^5]. `std::align` has a tricky interface in the sense
that two of its arguments are in/out parameters. Below is the snippet of code
in `Alloc()` that performs alignment using `std::align`:

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

The arguments to `std::align` are interpreted as follows:

* `alignment`: The user supplied alignment argument. Must be a power of two.
* `total_space - alignment`: This argument tells `std::align` how many bytes we
have in our buffer to be aligned. The bytes reserved for alignment do not get
included in the count.
* `user_ptr`: The address of the free block.
* `total_space`: The total amount of space `std::align` has to work with. This
critically includes our additional alignment bytes. We want `std::align` to
return an address in the range [`user_ptr`, `user_ptr + alignment`].

Once `std::align` does its thing, `total_space` will have been decremented by
the number of bytes used in alignment. The following statements save that
alignment byte count in the byte preceding the aligned address:

```cpp
uint8_t* alignment_byte_cnt_addr = reinterpret_cast<uint8_t*>(user_ptr) - 1;
*alignment_byte_cnt_addr = total_space_copy - total_space;
```

Allocation is just the first half of the story. Lets look at how to free
allocated memory.

## Free

There are two problems to solve when it comes to freeing memory. First, we
need a means of knowing how much memory to release back to the allocator.
Second, we need to reduce the fragmentation of memory.

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

The code above solves the first problem of getting the address of the start of
an allocated block from the pointer supplied to `Free()`. Now, lets look at how
we get the block back on the free list.

Free memory can become so fragmented that despite having enough free memory to
service an allocation request, the allocator denies the request because no
single free block can satisfy the need. One solution to the problem is to
coalesce adjacent free blocks.  `Malloc`'s strategy for memory compaction is to
maintain a free list ordered by the addresses of the blocks.  That is, the free
list nodes are sorted in ascending order by address. When `Free()` is called, it
inserts the freed block into the ordered list and then merges adjacent blocks.
Two blocks are adjacent if the current blocks's address plus its size is equal
to the next block's address.  Below are the two methods implementing insertion
and memory compaction:

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

Both the functions are implementations of classic linked list algorithms.
Unfortunately, both algorithms have linear time complexity (i.e., `O(n)`). This
means that our `Free()` method has linear time complexity. It's actually a bit
worse than that, there's a constant of 2 hidden in the big-oh becuase in the
worst case `InsertFreeMemBlock()` and `MergeFreeBlocks()` both iterate the
entire list. You could probably combine them to get a single pass algorithm but
the increased code complexity wasn't worth it for this "toy"  memory allocator
implementation.

## Conclusion

That's it. With `Alloc()` and `Free()` implemented, we have a complete memory
allocation utility! I did some unit testing using the GoogleTest framework
to catch any immediate bugs. I also ran some randomized workloads to shakeout
additional issues that may be hard to detect via a unit test. If I had more
time, I would followup by collecting some performance metrics though given the
linear complexity of allocating/freeing I don't expect to break any records.

I highly recommend anyone curious about writing their own memory allocator go
ahead and give it a shot. There's so much history out there on the
implementation of memory allocators one could read through and learn from. Not
to mention the many tradeoffs you can make with regards to data structures and
algorithms you can experiment with.

You can find the complete project source with build instructions, usage, etc.
on my GitHub page under [malloc][6].

[1]: https://pages.cs.wisc.edu/~remzi/OSTEP/
[2]: https://www.linuxjournal.com/article/6390
[3]: https://developer.ibm.com/articles/pa-dalign/
[4]: https://linux.die.net/man/3/posix_memalign
[5]: https://en.cppreference.com/w/cpp/memory/align
[6]: https://github.com/ivan-guerra/malloc

[^1]: [Operating Systems: Three Easy Pieces][1] is by far the most digestible OS
book I have read to date. The authors' conversational writing style mixed with
the practical labs and exercises makes an often dry subject fun. Highly
recommend this text if you are a student or someone looking to brush up on OS
concepts.
[^2]: ["Advanced Memory Allocation"][2]
[^3]: ["Data alignment: Straighten up and fly right"][3]
[^4]: [`posix_memalign`][4]
[^5]: [`std::align`][5]
