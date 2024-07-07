---
title: "Binary Rain"
date: 2023-07-23T16:16:47-07:00
description: "A Matrix inspired terminal screensaver."
tags: ["c++", "cli-tools", "ncurses"]
---

Most programmers young and old have seen the cyberpunk sci-fi film [The
Matrix][1]. One of the most outstanding parts of the movie is the closing scene
where Neo sees the Matrix when battling the Agents:

[![Neo Sees the Matrix](/posts/2023/binary-rain/matrix.webp#center)][2]

The visual effect with the code running along all the surfaces is iconic. Seems
other people thought so too to the point that the effect has a name: [Matrix
Digital Rain][3].

Wouldn't it be neat to create a terminal screensaver that mimicked the effect
seen in the movie?

## How to Make It Rain

Studying a few video compilations helps with understanding the details behind
the scrolling effect:

{{< youtube E8y3eDUMb4Q >}}

Here are some features that pop out in the video:

- The characters printed on the screen are a mix of Japanese kana and Latin
  letters/numeral characters.
- Each column or stream has a fixed length with the first character in the
  stream having a bright white color.
- Character streams spawn at random.
- Once a stream of characters has begun, a new stream won't begin on that
  column until all the previous characters have "fallen" off screen.

Fundamentally, a stream of characters scrolls down the screen. You can imagine
the screen is a two dimensional matrix of characters. Each screensaver frame
tick will scroll the screen down a single row such that the characters at the
bottom row "fall off" the screen. The higher the framerate, the faster the
characters fly down the screen.

## Building a Scrolling Buffer

A handful of data structures implement the scrolling buffer effect. The first
is the `Char` type:

```cpp
struct Char {
    char c = '\0';
    bool first = false;
};
```

`Char` represents a single on-screen character. The only oddity here is the
boolean `first`. You will see the purpose of the `first` field later.

The `CharStream` type represents the individual columns or streams of
characters.

```cpp
class CharStream {
   public:
    CharStream() = delete;

    CharStream(int capacity, int char_limit);
    ~CharStream() = default;
    CharStream(const CharStream&) = default;
    CharStream& operator=(const CharStream&) = default;
    CharStream(CharStream&&) = default;
    CharStream& operator=(CharStream&&) = default;
    void InsertChar(const Char& c);
    void RemoveChar();
    bool Empty() const { return (size_ <= 0); }
    int Size() const { return size_; }
    int Capacity() const { return static_cast<int>(chars_.capacity()); }
    int CharLimit() const { return char_limit_; }
    const Char& operator[](int i) const { return chars_[i]; }

   private:
    int size_;
    int char_limit_;
    bool limit_reached_;
    std::vector<Char> chars_;
};
```

`CharStream` is a fixed sized container type storing a limited number of non
NULL `Char` objects. `CharStream` supports two primary operations: insert and
remove.

`InsertChar()` inserts a `Char` at the beginning of the stream. The caller can
only add up to `char_limit_` characters to the stream. `RemoveChar()` removes
the last `Char` in the stream by shifting all elements right a cell.

Below is a sequence of calls to a `CharStream` object demonstrating scrolling
using the `InsertChar()` and `RemoveChar()` methods of the class:

```text
CharStream stream(5, 3) -> [NULL, NULL, NULL, NULL, NULL]

stream.InsertChar('a')  -> [ 'a', NULL, NULL, NULL, NULL]
stream.RemoveChar()     -> [NULL,  'a', NULL, NULL, NULL]
stream.InsertChar('b')  -> [ 'b',  'a', NULL, NULL, NULL]
stream.RemoveChar()     -> [NULL,  'b',  'a', NULL, NULL]
stream.InsertChar('c')  -> [ 'c',  'b',  'a', NULL, NULL]

/* this insert is ignored because we have already reached the char limit of 3 */
stream.InsertChar('d') -> [ 'c',  'b',  'a', NULL, NULL]

stream.RemoveChar() -> [NULL,  'c', 'b',   'a', NULL]
stream.RemoveChar() -> [NULL, NULL, 'c',   'b',  'a']
stream.RemoveChar() -> [NULL, NULL, NULL,  'c',  'b']
stream.RemoveChar() -> [NULL, NULL, NULL, NULL,  'c']
stream.RemoveChar() -> [NULL, NULL, NULL, NULL, NULL]
```

Finally, `ScreenBuffer` implements the vertically scrolling buffer:

```cpp
class ScreenBuffer {
   public:
    ScreenBuffer(int width, int height);
    ScreenBuffer() = delete;
    ~ScreenBuffer() = default;
    ScreenBuffer(const ScreenBuffer&) = default;
    ScreenBuffer& operator=(const ScreenBuffer&) = default;
    ScreenBuffer(ScreenBuffer&&) = default;
    ScreenBuffer& operator=(ScreenBuffer&&) = default;

    void Update();
    CharBuffer GetBuffer() const;

   private:
    std::size_t GetRandomNumInRange(int lower_bound, int upper_bound) const;
    char GetRandomBinDigit() const;
    void InsertChar(std::size_t stream_idx);
    void ScrollScreen();

    int width_;
    int height_;
    std::vector<CharStream> streams_;
};
```

At its core, `ScreenBuffer` is an array of `CharStream` objects where each
`CharStream` represents a single screen column. The `ScreenBuffer` constructor
ensures there are `width` many streams each with capacity and char limit of
`height`. `ScreenBuffer`'s API updates the internal screen buffer
and retrieves a read-only view of the buffer's contents.

`Update()` is the heavy lifter which performs the following operations:

1. Shifts all rows down by one. This deletes the bottom row and introduces a
   new, empty top row.
2. If a column of characters hasn't yet met its character limit, `Update()` will
   insert a character at the top of that column.
3. `Update()` will select a random column index and will insert a character only
   if that column is empty.

With the data structures in place, all that's left to do is render the
`ScreenBuffer`'s contents using the ncurses API.

## Rendering the Screensaver

The goal is to create a terminal screensaver. This limits your graphical library
options. Good old ncurses will do.

For this project, binary digits are the only characters printed to the screen.
No Japanese or Latin characters as in the original. This choice removed a lot of
headaches while still keeping with the cyber theme of the original.

The `ScreenSaver` class renders the `ScreenBuffer` contents in a single ncurses
window:

```cpp
class ScreenSaver {
   public:
    ScreenSaver();
    ~ScreenSaver();
    ScreenSaver(const ScreenSaver&) = default;
    ScreenSaver& operator=(const ScreenSaver&) = default;
    ScreenSaver(ScreenSaver&&) = default;
    ScreenSaver& operator=(ScreenSaver&&) = default;

    void Draw();
    bool Quit() const { return (getch() != ERR); }

   private:
    enum Color {
        kWhite = 1,
        kGreen = 2,
    };

    ScreenBuffer buffer_;
};
```

The `ScreenSaver` API is simple: `Draw()` and `Quit()`.

`Quit()` returns true if the User has pressed any key. It's the mechanism by
which the user can terminate the screensaver.

`Draw()` renders the `ScreenBuffer`'s contents in the window. Binary digits
render in green with their dimness altered at random. The first character in
each stream is the exception. If a `Char`'s `first` field is `true`, then that
character is white and rendered in bold giving a visual cue as to where each
stream starts.

The main screensaver loop ends up being simple:

```cpp
int main() {
    const int kDefaultRefreshRateUsec = 75000;

    neo::ScreenSaver screensaver;
    while (!screensaver.Quit()) {
        screensaver.Draw();
        usleep(kDefaultRefreshRateUsec);
    }
    return 0;
}
```

The main loop continuously draws the screensaver with a delay between updates.
If the user presses any key, the application exits.

Here's what the screensaver looks like in action:

![Binary Rain](/posts/2023/binary-rain/neo.gif#center)

## Conclusion

Making the `neo` screensaver had its challenges. In particular, this was one of
those classic problems where if you have the right data structures its simple.
Well sort of, implementing a tweaked scrolling buffer does take some thought.
The setup presented here certainly cuts many corners with respect to efficiency.
All that said, the screensaver has been fun to use at home and a great
conversation piece amongst the Matrix nerds at work.

The complete project source with build instructions, usage, etc. is available on
GitHub under [neo][4].

[1]: https://en.wikipedia.org/wiki/The_Matrix
[2]: https://tinyurl.com/yc7p7285
[3]: https://en.wikipedia.org/wiki/Matrix_digital_rain
[4]: https://github.com/ivan-guerra/neo
