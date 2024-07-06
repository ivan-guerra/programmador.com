---
title: "Keyboard Hell"
date: 2023-09-02T12:46:36-07:00
description: "Play a soundbite on keypress anywhere in the desktop."
tags: ["c++", "cli-tools", "sdl", "x11", "windows"]
---

Do you enjoy the sound of a mechanical keyboard? What if it was possible to
achieve the sound of the keys clacking without having an actual mechanical
keyboard? That was the idea that spawned this keyboard hell (kbhell) project.
That and trolling friends by playing a soundbite every time they press a key!

## Getting Started

When a user performs any keystroke, a audio file gets played. One of the main
kbhell requirements is that it runs on both Windows and Linux. That leaves you
with two problems to solve:

1. How do you capture global keystroke events without interfering with other
   apps?
2. How do you play audio on both Windows and Linux?

Lets look at how to answer these questions starting with cross-platform audio.

## SDL to the Rescue

You might recall the [Simple DirectMedia Layer (SDL)][2] library from a
[previous article][1]. SDL in conjunction with the [SDL_mixer][3] library
provides one with the ability to play WAV, MP3, FLAC, and ton of other audio
formats. More importantly, the SDL/SDL_mixer libraries are portable. You could
write a audio player utility that uses these libraries and it will work without
modification on Windows and Linux.

To keep things simple, kbhell will support only the WAVE/WAV audio file format.
The WAV format is arguably the most commonly used, lossless uncompressed audio
format. A `WavPlayer` utility class does what the name suggests. Below is an
excerpt from the `wav_player.hpp` header showing the public API:

```cpp
class WavPlayer {
   public:
    explicit WavPlayer(const std::string& sound_file);
    void Play();
};
```

The code provides a path to a WAV audio file on construction. The constructor
makes sure the file exists and that the host PC's audio subsystem is available.
`Play()` plays the WAV audio over the host's speakers. Successive calls to
`Play()` restart the WAV audio from the beginning if the previous calls' audio
didn't play to completion. Errors in both construction and play result in
exceptions.

You now have a cross-platform means of playing soundbites. All that remains is
capturing global keystroke events.

## Listening for Keyboard Events

There is no cross-platform way to listen for _global_ keystroke events. Its OS
specific. As a result, the main program loop requires some abstraction:

```cpp
int main(int argc, char** argv) {
    if (argc != 2) {
        PrintUsage();
        std::exit(EXIT_FAILURE);
    }

    try {
        kbhell::WavPlayer player(argv[1]);
        RunEventLoop(player);
    } catch (const std::exception& e) {
        std::cerr << "error: " << e.what() << std::endl;
        std::exit(EXIT_FAILURE);
    }

    std::exit(EXIT_SUCCESS);
}
```

The driver checks for a single positional argument, a WAV file path, constructs
a `WavPlayer` object, and passes the WAV player off to the `RunEventLoop()`
function.

Lets look at how to implement `RunEventLoop()` on each OS starting with Linux.

### Linux Event Loop

On Linux, a display server program coordinates IO with the many client programs
running on the desktop. The server is responsible for making the GUI possible.
The desktop environment (for example, i3, Unity, XFCE, etc.) works with the
display server to render what you see on screen. If you want to query global IO
events, you communicate with the display server. There are two mainstream
display servers: X11 and Wayland. You can find endless debates online over which
one's better than the other. Given X11 is the most popular display server
technology, kbhell's keystroke capture routine uses X11's API.

X11 is an ancient, complex beast. The [X Record Extensions Library][4] makes it
possible to capture _global_ key events. Luckily, an [example][5] demoing how to
pickup on global keystrokes using the record extension was available. The Linux
`RunEventLoop()` implementation is an adaptation of the example:

```cpp
void KeyCallback(XPointer closure, XRecordInterceptData* hook) {
    if (hook->category != XRecordFromServer) {
        ::XRecordFreeData(hook);
        return;
    }

    kbhell::WavPlayer* player = reinterpret_cast<kbhell::WavPlayer*>(closure);
    XRecordDatum* data = reinterpret_cast<XRecordDatum*>(hook->data);

    int event_type = data->type;
    BYTE keycode = data->event.u.u.detail;
    const int kEsc = 9;
    switch (event_type) {
        case KeyRelease:
            if (keycode == kEsc) { /* if ESC is pressed at any time, exit */
                exit_event_loop = true;
            } else {
                player->Play();
            }
            break;
        default:
            break;
    }
    ::XRecordFreeData(hook);
}

void kbhell::RunEventLoop(WavPlayer& player) {
    ...

    if (!::XRecordEnableContextAsync(data_disp, record_ctx, KeyCallback,
                                     reinterpret_cast<::XPointer>(&player))) {
        throw std::runtime_error("could not enable record context");
    }

    while (!exit_event_loop) {
        ::XRecordProcessReplies(data_disp);
    }

    ...
}
```

Note, not included in this snippet are the myriad of resource allocate and
deallocate calls. Starting from the `RunEventLoop()` function, you see a call to
`::XRecordEnableContextAsync()`. `::XRecordEnableContextAsync()` registers a
callback function that gets triggered whenever an X event occurs. X events can
be just about any GUI event you can imagine: keystrokes, mouse movements, etc.
Notice how the `WavPlayer` object, `player`, is an argument to the callback.
That's critical because you want the callback to have a pointer to the player so
it can actually play the sound on a key event. `::XRecordEnableContextAsync()`
immediately returns causing the main loop to begin processing record events
until the `exit_event_loop` flag goes high.

`KeyCallback()` is where the magic happens. The callback function filters for
key release events and triggers the `player` object's `Play()` function whenever
the user releases a key. The only exception is the escape key which sets
`exit_event_loop` to `true` causing the kbhell application to terminate.

That's it on the Linux side. How does Windows compare?

### Windows Event Loop

The Windows event loop is a doozy. The Windows API provides [hooks][6] as a
mechanism for listening for general system messages including keyboard events.
Similar to the X11 Record extension, the Windows API has you register a
callback. The callback gets triggered every time a global keyboard event occurs.
That said, there are significant API differences. For one, you can't pass the
callback any custom data. Post callback registration, you have to run a message
pump. One caveat is that you can't do additional work in the message processing
thread.

A multithreaded approach makes sense here. The main application thread kicks off
a keyboard listener thread. The keyboard listener thread registers the low level
keyboard hook and runs the required message pump. The keyboard hook itself uses
a condition variable to signal the main thread when a key release event has
occurred. Below you can see the keyboard listener thread function and keyboard
callback.

```cpp
LRESULT CALLBACK KeyCallback(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode < 0) {
        return CallNextHookEx(nullptr, nCode, wParam, lParam);
    }

    KBDLLHOOKSTRUCT* kbinfo = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (wParam == WM_KEYUP) {
        std::unique_lock<std::mutex> lock(key_released_mtx);
        key_released = true;
        if (VK_ESCAPE == kbinfo->vkCode) {
            exit_event_loop = true; /* signal the main driver thread to exit */
            PostQuitMessage(0);     /* signal this kbd hook thread to exit */
        }
        key_released_cv.notify_one();
    }

    return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

void InstallHook() {
    HHOOK kbd_hook = SetWindowsHookEx(WH_KEYBOARD_LL, &KeyCallback, 0, 0);
    if (!kbd_hook) {
        return;
    }

    MSG message;
    while (GetMessage(&message, nullptr, 0, 0)) {
        DispatchMessage(&message);
    }

    UnhookWindowsHookEx(kbd_hook);
}
```

The `InstallHook()` function binds to a thread on kbhell startup.
`InstallHook()` installs the low level keyboard hook and then executes the
required message pump in the `while` loop. The `KeyCallback()` hook signals the
main thread when a key release has occurred via the `key_released_cv` condition
variable. The callback also signals program termination to both threads via
`exit_event_loop` and `PostQuitMessage()`. `exit_event_loop` tells the main
thread it's time to shutdown. `PostQuitMessage()` breaks out of the message loop
in `InstallHook()` unhooking `KeyCallback()` and terminating the key listener
thread in the process.

Below is the kbhell event loop:

```cpp
void kbhell::RunEventLoop(WavPlayer& player) {
    /* launch a seperate thread hosting a low level keyboard hook */
    std::thread kbd_event_thrd(InstallHook);

    while (!exit_event_loop) {
        std::unique_lock<std::mutex> lock(key_released_mtx);
        /* wait until a key release event has occurred */
        key_released_cv.wait(lock, [] { return key_released; });

        player.Play();
        key_released = false;
    }

    if (kbd_event_thrd.joinable()) {
        kbd_event_thrd.join();
    }
}
```

`RunEventLoop()` executes in the main application thread. It spawns the
`kbd_event_thrd` which registers and runs the low level keyboard hook code.
`RunEventLoop()` waits for signal from `kbd_event_thrd` indicating a key release
event has occurred before playing the soundbite.

The Windows code is a bit more complicated than the Linux side driver. That
said, you'll find that the Windows documentation is better than the X11
documentation. The difference in docs made the Windows code less painful to
write.

## Conclusion

Now bask in the glory of the end result:

{{< video src="/posts/2023/keyboard-hell/kbhell-demo.mp4" type="video/mp4" preload="auto" >}}

Overall, this project has a lot of hidden complexity. In particular,
understanding the API for processing global key events in Windows and Linux was
challenging. Both OSes provide conceptually similar solutions though the fine
details can bite you.

The complete project source with build instructions, usage, etc. is available on
GitHub under [kbhell][7].

[1]: https://programmador.com/posts/2023/morse-translator/
[2]: https://www.libsdl.org/
[3]: https://github.com/libsdl-org/SDL_mixer
[4]: https://www.x.org/releases/X11R7.7/doc/libXtst/recordlib.html
[5]: https://github.com/nibrahim/showkeys/blob/master/tests/record-example.c
[6]: https://learn.microsoft.com/en-us/windows/win32/winmsg/hooks
[7]: https://github.com/ivan-guerra/kbhell/tree/master
