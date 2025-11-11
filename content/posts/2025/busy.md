---
title: "Busy"
date: 2025-10-30T13:16:01-04:00
description: "A simple CLI tool to keep you looking busy."
categories: ["projects"]
tags: ["cli-tools", "rust"]
---

Workplace monitoring is a practice that has seen a significant rise since 2020
(a totally anecdotal claim). Maybe you've worked with one of these managers that
constantly checks if you're active on Discord, Teams, insert other company chat
app. A lot of people work from home these days. It's not uncommon for folks to
want to get out of their chair and stretch their legs, grab a coffee, or just
take a quick break from the screen. That break often means an idle system. If
you got a whacko boss that monitors status, you might find yourself in hot water
for being "inactive" for a few minutes.

It usually doesn't take much more than moving the mouse a little to keep the
status showing active. That's where a tool like `bz` (pronounced "busy") comes
in handy. `bz` is a simple CLI tool written in Rust that simulates mouse
movement at regular intervals to keep your system from going idle.

## How It Works

`bz` works by moving your mouse cursor from the location it's currently at, to
the center of the screen, and back again. How often the mouse moves is
configurable via a command line argument (default is every 5 seconds). There's
also an option to click at the end of each interval, which can be useful for
some applications that require more than just movement to stay active. The demo
below shows `bz` in action:

{{< video src="/posts/2025/busy/busy.mp4" type="video/mp4" preload="auto" >}}

It doesn't do anything fancy. Just a simple back and forth motion with optional
clicks. You can stop the program at any time by pressing the `ESC` key (the
terminal doesn't doesn't have to be in focus for the program to stop).

Here's the core part of the code that handles the mouse movement:

```rust
// Spawn main busy loop thread that moves the mouse
let busy_handle = std::thread::spawn(move || -> Result<()> {
    let mut enigo = Enigo::new(&Settings::default())?;
    let (width, height) = enigo
        .main_display()
        .context("Failed to get main display size")?;
    let interval = Duration::from_secs(args.update_interval);
    let mut start = enigo.location().context("Failed to get mouse location")?;
    let mut end = (width / 2, height / 2);

    // Continue moving mouse until ESC is pressed
    while rx.try_recv().is_err() {
        enigo
            .move_mouse(end.0, end.1, Coordinate::Abs)
            .context("Failed to move mouse")?;
        if args.click {
            enigo
                .button(Button::Left, Direction::Click)
                .context("Failed to click mouse")?;
        }
        // Swap start and end positions for next iteration
        std::mem::swap(&mut start, &mut end);

        // Check if ESC was pressed or if the sender was dropped (listen thread errored)
        match rx.recv_timeout(interval) {
            Ok(_) | Err(mpsc::RecvTimeoutError::Disconnected) => break,
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
        }
    }
    Ok(())
});
```

The [`enigo`][1] crate does the heavy lifting. Enigo provides a cross-platform
API for moving and clicking the mouse.

You'll notice that the code runs in a thread that's on the receiving end of a
channel. A second thread listens for a global escape key press and signals the
busy loop thread to stop when the user wants to exit the program. The
[`rdev`][2] crate makes it easy to listen for global key events. Here's the
code:

```rust
fn handle_esc_key(event: Event, tx: mpsc::Sender<()>) {
    if let EventType::KeyPress(Key::Escape) = event.event_type {
        tx.send(()).expect("Failed to send ESC key event");
    }
}

// Spawn keyboard listener thread to detect ESC key press
std::thread::spawn(move || -> Result<()> {
    listen(move |event| handle_esc_key(event, tx.clone()))
        .map_err(|e| anyhow::anyhow!("Error: {:?}", e))?;
    Ok(())
});
```

That's pretty much the whole program. One thread listens for the escape key,
while the other runs a loop that moves the mouse at regular intervals until it
receives a signal to stop.

## Usage

You should ideally build `bz` from source using the usual `cargo build
--release` command. If you like to live dangerously, download a pre-built binary
from the [releases][3] page on GitHub. The release contains pre-built binaries
for Linux and Windows x86_64 platforms.

`bz` is a command line application, so you should open up a terminal to run it.
That's true on both Windows and Linux. That said, on Windows you can double
click the executable in Explorer to run it with the default settings. It'll
popup a console window that you can minimize or just leave on screen.

Remember, you can stop the program at any time by pressing the `ESC` key from
anywhere on the desktop.

## Disclaimer

Use this tool at your own risk. If you do use it, try not be a complete goon and
abuse it. Silly people abusing software is how you got here in the first place!

[1]: https://crates.io/crates/enigo
[2]: https://crates.io/crates/rdev
[3]: https://github.com/ivan-guerra/busy/releases/tag/v0.1.0
