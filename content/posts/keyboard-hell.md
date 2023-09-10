---
title: "Keyboard Hell"
date: 2023-09-02T12:46:36-07:00
description: "Play a soundbite on keypress anywhere in the desktop."
tags: ["c++", "cli-tools", "sdl", "x11", "windows"]
toc: true
cover:
    image: "/posts/keyboard-hell/keyboard-on-fire.jpg"
    alt: "Keyboard on Fire"
---

I was talking with a few people at work about mechanical keyboards. We were
rating key switch setups from least to most annoying. One of the guys mentioned
they'd pay extra to buy switches that made gag sounds just to bug their SO.  His
comment set me on a path to write the most annoying piece of software I have
written to date. The thought was to play a silly soundbite everytime someone
pressed a key anywhere on the desktop. I'd call this masterpiece Keyboard Hell
or kbhell for short.

## Getting Started

I wanted an app that would run on both Windows and Linux that could play a user
specified audio file on global keypress events. Despite the simplicity of the
concept, getting this to work just the way I wanted would take some work. There
were two big problems to solve:

1. How do I play audio on both Windows and Linux?
2. How do I capture global keypress events without interfering with other apps?

Lets look at how to answer these questions starting with cross-platform audio.

## SDL to the Rescue

I've had recent experience[^1] working with the Simple DirectMedia Layer
(SDL)[^2] library. SDL in conjunction with the SDL_mixer[^3] library provides
one with the ability to play WAV, MP3, FLAC, and ton of other audio formats.
More importantly, the SDL/SDL_mixer libs are portable. I could write a audio
player utility that uses these libs and it would work without modification on
Windows and Linux.

I decided on providing support only for the WAVE/WAV audio file format. The WAV
format is arguably the most commonly used, lossless uncompressed audio format. A
`WavPlayer` utility class would suffice. Below is an excerpt from the
`wav_player.hpp` header showing the public API:

```cpp
class WavPlayer {
   public:
    explicit WavPlayer(const std::string& sound_file);
    void Play();
};
```

I kept it simple. You provide a path to a WAV audio file on construction. The
constructor makes sure the file exists and that the host PC's audio subsystem is
available. Then, the `Play()` method can be called to play the WAV audio over
the host's speakers. `Play()` is programmed such that successive calls to
`Play()` will restart the WAV audio from the beginning if the previous calls'
audio did not play to completion. Errors at both construct and play time are
reported as exceptions.

With `WavPlayer` in hand, I had a cross-platform means of playing soundbites.
All that remains is capturing global keypress events.

## Listening for Keyboard Events

So this is where it got a little tricky. There is no cross-platform way to
listen for *global* keypress events. Its OS specific. With that in mind, I made
a simple program driver that abstracted the main run loop:

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
The desktop environments you are used to (e.g., i3, Unity, XFCE, etc.) are all
working with the display server to render what you see on screen. If you want to
query global IO events, it can be done through communication with the display
server.  There are two mainstream display servers: X11 and Wayland. You can find
endless debates online over which one's better than the other. Given I only had
a Linux box running Fedora with X11, I chose to go with writing a driver that
uses the X11 API.

X11 is an ancient, complex beast. After spending time digging through the docs,
I came across an X11 extension that would allow me to listen for *global* key
events: X Record Extensions Library[^4]. I lucked out and found this awesome
example[^5] demoing how to pickup on global keypresses using the record
extension. Using the example code, I implemented the Linux side `RunEventLoop()`
function as shown below:

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

I took out the myriad of resource alloc and dealloc calls and left the
interesting bits in. Starting from the `RunEventLoop()` function itself, we see
a call to `::XRecordEnableContextAsync()`. `::XRecordEnableContextAsync()`
registers a callback function that gets triggered whenever an X event occurs. X
events can be just about any GUI event you can imagine: keypresses, mouse
movements, etc. Notice how we pass the `WavPlayer` object, `player`, in along
with the callback. That's critical because we want the callback to have a
pointer to the player so it can actually play the sound on the key event. Given
that we use the async version of the function, `::XRecordEnableContextAsync()`
immediately returns and drops us into our main loop where we process record
events until the `exit_event_loop` flag is set.

`KeyCallback()` is where the magic happens. The callback function filters for
key release events and triggers the `player` object's `Play()` function whenever
the user releases a key. The only exception is the escape key which sets
`exit_event_loop` to `true` causing the kbhell application to terminate.

I think the core of the implementation shown here is not too hard to grok. The
trouble was in setting up the right structures so that we could register our
callback (checkout the complete source linked at the end of the article if you
are interested in those details). Lets look at how Windows compares.

### Windows Event Loop

The Windows event loop was a doozy. The Windows API provides hooks[^6] as a
mechanism for listening for general system messages including keyboard events.
Similar to the X11 Record extension, the Windows API has you register a
callback. The callback gets triggered everytime a global keyboard event occurs.
That said, there are significant API differences. For one, you cannot pass the
callback any custom data. Post callback registration, you are required to
run a message pump very much like X11. However, the thread running the pump
processes messages but doesn't allow one to do additional processing in between
(at least I couldn't find a way to execute my code in the message loop).

Considering the requirements of the API, I decided to take a multithreaded
approach. I would have my main application thread kick off a keyboard listener
thread. The keyboard listener thread would register the low level keyboard hook
and run the required message pump. The keyboard hook itself would use a
condition variable to signal the main thread when a key release event had
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

The `InstallHook()` function is the function bound to a thread on kbhell
startup. `InstallHook()` installs the low level keyboard hook and then executes
the required message pump in the `while` loop. The `KeyCallback()` hook signals
the main thread when a key release has occurred via the `key_released_cv`
condition variable. The callback also signals program termination to both
threads via `exit_event_loop` and `PostQuitMessage()`. `exit_event_loop` tells
the main thread it's time to shutdown. `PostQuitMessage()` breaks us out of the
message loop in `InstallHook()` allowing `KeyCallback()` to be unhooked and the
key listener thread to exit.

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
Beyond that, `RunEventLoop()` waits to be signaled by the `kbd_event_thrd` when
a key release event has occurred and, at that time, plays the soundbite.

While a bit more complicated in design than the Linux side driver, I didn't have
to battle with finding documentation like I did with X11 making the Windows side
code less painful to write.

## Conclusion

Let us bask in the glory of the end result:

{{< video src="/posts/keyboard-hell/kbhell-demo.mp4" type="video/mp4" preload="auto" >}}

Overall, this project had a lot of hidden complexity. In particular,
understanding the APIs for processing global key events was challenging.
Somewhat surprisingly, both OSes provide conceptually similar solutions though
the fine details really got me at times.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [kbhell][7].

[1]: https://programmador.com/posts/morse-translator/
[2]: https://www.libsdl.org/
[3]: https://github.com/libsdl-org/SDL_mixer
[4]: https://www.x.org/releases/X11R7.7/doc/libXtst/recordlib.html
[5]: https://github.com/nibrahim/showkeys/blob/master/tests/record-example.c
[6]: https://learn.microsoft.com/en-us/windows/win32/winmsg/hooks
[7]: https://github.com/ivan-guerra/kbhell/tree/master

[^1]: I developed a [text to Morse code translator][1] recently which used the
    SDL library under the hood to generate the Morse dit/dah sound effects.
    During the beginning phases of that project, I experimented with playing
    sound effects using WAV files. Lucky for me, that code was still in the git
    history so I was able to lift it and use it to develop kbhell!
[^2]: [Simple DirectMedia Layer][2] (SDL) has been around since the 90s. SDL
    provides low level access to not just audio but the keyboard, mouse,
    joystick, and graphics hardware as well. Unfortunately, their keyboard
    functionality didn't make sense for kbhell given that I wanted to capture
    key event info from *anywhere* on the desktop, not just the running app
    window.
[^3]: Checkout the [SDL_mixer][3] project on GitHub.
[^4]: [X Record Extension Library][4]
[^5]: Bless this man for demoing how to use the X11 record extension:
    [record-example.c][5].
[^6]: Microsoft's dev docs are some of the best out there in my opinion. Their
    [Hooks][6] documentation did not disappoint.
