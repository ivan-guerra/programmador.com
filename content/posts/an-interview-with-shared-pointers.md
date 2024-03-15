---
title: "An Interview with Shared Pointers"
date: 2024-03-09T20:39:30-08:00
description: "Implementing an interview grade shared pointer in C++."
tags: ["c++"]
---

In a recent interview, I got asked to complete the implementation of a shared
pointer class in C++. I am familiar with the STL `shared_ptr` and the fact that
many (all?) implementations of `shared_ptr` use reference counting to manage
the lifetime of a dynamically allocated object. That said, I have never really
thought about or tried to actually implement the concept myself. Needless to
say, it was a rough 30 minutes... Bothered by the fact that I couldn't come to
a base solution, I decided to give this one a shot on my own time and created
my own `SharedPtr` type.

## How to Reference Count 

When you think about implementing a shared pointer what comes to mind? For me it
was clear that I needed to wrap the user's pointer and count how many
`SharedPtr` objects in total where pointing at the wrapped pointer. Easy I
thought, I just needed two members to do the bookkeeping:

```cpp
template <typename T>
class SharedPtr {
 public:
    ...
 private:
    T* data_;
    std::size_t ref_count_;
};
```

The above declaration is mostly correct. The `T* data_` member is correct. You
need a way of sharing and accessing the data. What better way than a pointer to
the data. After all, a shared pointer is meant to be a lightweight wrapper
around a raw pointer. The `std::size_t ref_count_` variable **does not** work
for ref counting. Why? What happens when you copy, assign, destroy, or call
`Reset()` on a `SharedPtr`? In those instances, you need to decrement/increment
the `ref_count_`. You can certainly update the `ref_count_` in the object being
acted upon. However, there's no clear way to communicate the increment/decrement
to all other `SharedPtr` instances wrapping the same `data_` pointer.

I jacked this up in the interview but in hindsight the solution is pretty
straightforward. The trick... change the declaration of `ref_count_` to
`std::size_t* ref_count_`. That's right, the ref count itself is a pointer that
is shared by all `SharedPtr` instances wrapping the same `data_` pointer. The
first `SharedPtr` to wrap `data_` is responsible for allocating `ref_count_`.
When `ref_count_` hits 0, `ref_count_` should be deallocated along with `data_`.

Lets work an example. Consider the code below:

```cpp
void Nonsense() {
    SharedPtr<int> p1(new int(42));
    SharedPtr<int> p2 = p1;
}
```

How do `p1` and `p2` evolve from when we first enter the `Nonsense()` function's
scope until right before destruction? Let's go line-by-line starting with the
instantiation of `p1`:

```text
                                 +------------+      +-----------------+
                                 |     P1     |      |   Main Memory   |
                                 +------------+      +-----------------+
SharedPtr<int> p1(new int(42));  |  data_     +----->| 42              |
                                 +------------+      +-----------------+
                                 | ref_count_ +----->| 1               |
                                 +------------+      +-----------------+
```

Nothing too crazy here. We wrap a pointer to the value `42`. Our ref count
points to a value of `1`. What happens when we assign `p1` to `p2`?

```text
                         +------------+      +-----------------+     
                         |     P1     |      |   Main Memory   |     
                         +------------+      +-----------------+     
                         | data_      +----->| 42              |<-+  
                         +------------+      +-----------------+  |  
                         | ref_count_ +----->| 2               |<-+-+
                         +------------+      +-----------------+  | |
SharedPtr<int> p2 = p1;                                           | |
                         +------------+                           | |
                         |     P2     |                           | |
                         +------------+                           | |
                         | data_      +---------------------------+ |
                         +------------+                             |
                         | ref_count_ +-----------------------------+
                         +------------+
```

Here the `SharedPtr` works its magic. Both `p1` and `p2` point to the same data
in memory via a copy of the `data_` pointer. Bookkeeping is done on `ref_count_`
during the assignment in `p2`. Specifically, `*ref_count_` is incremented from
`1` to `2`. The key thing to note is that even though the increment to
`ref_count_` came from the `p2` object, `p1` sees the change since they both
manipulate and reference the same `ref_count_` value in memory (i.e., have
copies of the same pointer).

Let's now look at a basic `SharedPtr` API.

## The API

My `SharedPtr` API is similar in spirit to the STL's `shared_ptr`:

```cpp
template <typename T>
class SharedPtr {
 public:
  SharedPtr();
  explicit SharedPtr(T* data);
  ~SharedPtr();

  SharedPtr(const SharedPtr& sp);
  SharedPtr& operator=(SharedPtr rhs);
  SharedPtr(SharedPtr&& sp);
  SharedPtr& operator=(SharedPtr&& rhs);

  const T& operator*() const;
  T& operator*();

  bool Empty() const;
  std::size_t RefCount() const;
  void Reset(T* data);

  template <typename U>
  friend void Swap(SharedPtr<U>& a, SharedPtr<U>& b);
};
```

I know. `SharedPtr` is nowhere near as complex and feature complete as the STL.
That said, it suffices for learning purposes. Here are the key features starting
from the top:

* `SharedPtr` is templated so it can wrap a pointer to any type `T`.
* Default construction is supported.
* Included is a constructor that takes ownership of a raw pointer.
* Copy/move construction and assignment are implemented.
* The pointer dereference operator is overloaded.
* One can verify whether the pointer is empty or NULL.
* One can access the reference count. 
* A `SharedPtr` can be made to wrap another dynamically allocated object without
  leaking memory to the originally wrapped object via a `Reset()` call.

You'll notice a friend `Swap()` method towards the end of the declaration.
`Swap()` is used to implement the copy-and-swap[^1] idiom. `Swap()` simplifies
the implementation of copy assignment and move construction/assignment. More on
that later.

## The Basics

Construction, dereferencing, ref counting, and empty/null checks are pretty
straightforward to implement:

```cpp
template <typename T>
SharedPtr<T>::SharedPtr() : data_(nullptr), ref_count_(nullptr) {}

template <typename T>
SharedPtr<T>::SharedPtr(T* data)
    : data_(data), ref_count_(new std::size_t(1)) {}

template <typename T>
bool SharedPtr<T>::Empty() const { return (!data_ && !ref_count_); }

template <typename T>
std::size_t SharedPtr<T>::RefCount() const {
  if (Empty()) {
    throw std::runtime_error("cannot return ref count of NULL SharedPtr");
  }
  return *ref_count_;
}

template <typename T>
const T& SharedPtr<T>::operator*() const {
  if (Empty()) {
    throw std::runtime_error("cannot dereference NULL SharedPtr");
  }
  return *data_;
}

template <typename T>
T& SharedPtr<T>::operator*() {
  if (Empty()) {
    throw std::runtime_error("cannot dereference NULL SharedPtr");
  }
  return *data_;
}
```

One thing worth noting is that this implementation throws `std::runtime_error`
when a user attempts to access the reference count or data of an uninitialized
`SharedPtr`. This was a decision I made to make the class more test friendly and
avoid any undefined behavior. It's also worth mentioning that the call to `new`
in the nondefault constructor has the potential to throw `std::bad_alloc` along
with introducing the overhead of an allocation. Since we're already using
exceptions for error handling and wrapping dynamically allocated objects, the
latter "issues" are probably negligible in most codebases opting to use
`SharedPtr`.

## Reference Counter Bookkeeping

The core of the `SharedPtr` implementation is how the `ref_count_` member is
updated. That is, we need to manage `ref_count_` increment/decrement and ensure
the wrapped resource is released when `ref_count_` reaches 0. To do this right,
lets enumerate all the places the `ref_count_` is updated.

`ref_count_` is incremented:

* On nondefault construction.
* On copy construction.

`ref_count_` is decremented:

* On destruction.
* On copy or move assignment.
* After a call to `Reset()`.

Decrement happens more often and has the added overhead of checking whether the
`ref_count_` reached 0. In the interest of not duplicating the decrement and
ref count check code, I implemented a utility method: `DecrementRefCount()`:

```cpp
template <typename T>
void SharedPtr<T>::DecrementRefCount() {
  if (Empty()) {
    return;
  }

  *ref_count_ -= 1;
  if (0 == *ref_count_) {
    delete data_;
    delete ref_count_;
    data_ = nullptr;
    ref_count_ = nullptr;
  }
}
```

`DecrementRefCount()` makes the implementation of the remaining API methods
relatively straightforward:

```cpp
template <typename T>
SharedPtr<T>::~SharedPtr() {
  DecrementRefCount();
  data_ = nullptr;
  ref_count_ = nullptr;
}

template <typename T>
SharedPtr<T>::SharedPtr(const SharedPtr<T>& sp)
    : data_(sp.data_), ref_count_(sp.ref_count_) {
  *ref_count_ += 1;
}

template <typename T>
SharedPtr<T>& SharedPtr<T>::operator=(SharedPtr rhs) {
  DecrementRefCount();
  Swap(*this, rhs);

  return *this;
}

template <typename T>
SharedPtr<T>::SharedPtr(SharedPtr&& sp) : SharedPtr<T>() {
  Swap(*this, sp);
}

template <typename T>
SharedPtr<T>& SharedPtr<T>::operator=(SharedPtr&& rhs) {
  DecrementRefCount();

  Swap(*this, rhs);

  return *this;
}

template <typename T>
void SharedPtr<T>::Reset(T* data) {
  DecrementRefCount();

  data_ = data;
  ref_count_ = new std::size_t(1);
}
```

The copy-and-swap[^1] idiom is used to implement copy/move assignment and the
move constructor. Critical to the use of this idiom is the implementation of a
`Swap()` function that can swap the state of two `SharedPtr` objects:

```cpp
template <typename U>
friend void Swap(SharedPtr<U>& a, SharedPtr<U>& b) {
  using std::swap;
  swap(a.data_, b.data_);
  swap(a.ref_count_, b.ref_count_);
}
```

The post linked at the end of this article explains the rationale behind the
idiom and dives into the gritty details.

## Conclusion

While I would never ask this "implement a shared pointer" question in a 30min
virtual interview, it is an interesting problem with some fun edge cases and
quirks. I get why someone would want to ask a question like this. Getting a
proper implementation requires some diagramming and careful bookkeeping.
Questions around error handling and memory management also come up. It was a
worthy afternoon endeavor to implement and test my own `SharedPtr` API. That
said, I'd probably still mess this question up in a live interview :).

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [shared_ptr][2].


[1]: https://stackoverflow.com/questions/3279543/what-is-the-copy-and-swap-idiom
[2]: https://github.com/ivan-guerra/shared_ptr 

[^1]: ["What is the copy-and-swap idiom?"][1]
