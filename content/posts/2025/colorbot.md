---
title: "colorbot"
date: 2025-01-15T20:35:23-05:00
description: "A RuneScape colorbot."
tags: ["games", "rust"]
---

A [previous article][1] explored writing `rsbot`, a scriptable auto clicker
meant to automate training the most repetitive skills in RuneScape. As a recap,
that bot would take as input a script defining click events where each click
event includes an ID, click box, and delay range. The bot would continuously
execute each event. Executing an event means randomly clicking within the
click box and waiting a random amount of time within the delay range. Bonus
points, `rsbot` mouse movements look human.

`rsbot` works well. It allowed a main account to level fletching, firemaking,
herblore, crafting, and many other skills to 99 without catching even a temp
ban. However, certain skills require more than just an "intelligent" auto
clicker. For example, when training fishing, the fishing spot occasionally
moves. Or when woodcutting, you want to know when the tree gets cut and
immediately move to cutting another tree. The common thread amongst these skills
is that the resources aren't completely static. The bot needs to react to random
in game events.

A desire to continue botting tedious skills motivates the development of
`colorbot`. Much like `rsbot`, `colorbot` is scriptable meaning you can write
scripts to bot whichever skill you like. The key difference is that instead of
hard coding click boxes, `colorbot` uses color recognition to guide its clicks.

## Color Recognition

The color recognition aspect of the bot is stupid simple. The process is:

1. Take a screenshot.
2. Find all pixels in that screenshot matching a target color.
3. Click one of those pixels at random.

That's it. No fancy graph algorithms, probability, nothing. Of course, there are
a couple gotchas with this approach.

First, you must specify a color tolerance. You might get the color of a pixel in
game and then find that the bot can't detect it because you moved the camera
slightly. Shadow and lighting effects can change the color of a pixel. The
solution is to specify a color and a tolerance. The tolerance applies to each
RGB component of the pixel. The algorithm matches any pixel within tolerance.

Second, you may find that many objects on screen share the same color as your
target leading to false positives. One solution is to make the colors of the
objects distinctive. Most objects' pixels have color components with mixed
values. What you want is to have "unique" colors with respect to the common
colors in the game. For example, red \\((255,0,0)\\), green \\((0,255,0)\\), and
cyan \\((0,255,255)\\) don't occur in RuneScape. You might ask, if they don't
occur, how can you use these colors as targets? You can leverage features of the
game client to make a viable solution. This article provides examples of how to
do this.

## Performance

You want the color detection process to be quick. `rsbot` is a Python script.
Screen capturing and iterating over all pixels in a \\(1920 \times 1080\\) image
is noticeably slow in Python. Rather than optimizing the Python code, it's
easier to translate the useful parts of `rsbot` to a compiled language.
`colorbot` is a Rust application but any other compiled language such as C or
C++ would work just as well.

A benefit of using Rust is its package manager, Cargo. With Cargo, it's
straightforward to install a cross platform screen capture library. `colorbot`
uses the `scrap` crate to take screenshots. Below is the bulk of the color
matching code:

```rust
/// Captures the screen and finds all pixels matching a target color within a tolerance
pub fn get_pixels_with_target_color(
    target_color: &(u8, u8, u8, u8),
) -> Result<Vec<Point>, Box<dyn std::error::Error>> {
    // Get the primary display
    let display = Display::primary()?;
    let width = display.width();
    let mut capturer = Capturer::new(display)?;
    let mut matches = Vec::new();
    const TOLERANCE: u8 = 10;

    loop {
        // Try to capture a frame
        if let Ok(frame) = capturer.frame() {
            // Iterate over the pixels
            for (i, pixel) in frame.chunks(4).enumerate() {
                // Pixels are in BGRA format
                let b = pixel[0];
                let g = pixel[1];
                let r = pixel[2];
                let a = pixel[3];

                if color_matches((b, g, r, a), *target_color, TOLERANCE) {
                    // Calculate pixel coordinates
                    let x = i % width;
                    let y = i / width;
                    matches.push(Point::new(x as f64, y as f64));
                }
            }

            break; // Exit after one frame
        }
    }

    Ok(matches)
}
```

The code iterates over the BGRA pixels in the screenshot and checks if each
pixel matches the target color. After finding a match, the code stores the
pixel's coordinates in a vector. The function returns the vector of matching
pixels. For an \\(M \times N\\) image, this function has a time complexity of
\\(\mathcal{O}(MN)\\). Not winning any performance awards but it's fast enough
for this purpose.

## Scripting

Scripting is one of the most important features of `colorbot`. The bot accepts a
JSON file containing a list of click events. Each click event has a string ID, a
list of color components, and a list representing the post-click delay range.
Below is an example script for fishing:

```json
{
  "events": [
    {
      "id": "lure fish",
      "color": [252, 23, 35],
      "delay_rng": [75000, 80000]
    },
    {
      "id": "drop fish 1",
      "color": [171, 32, 253],
      "delay_rng": [100, 200]
    },
    {
      "id": "drop fish 2",
      "color": [171, 32, 253],
      "delay_rng": [100, 200]
    },
    ...
  ]
}
```

The script demonstrates three events. The first, lure fish, clicks a fishing
spot and waits between 75000 to 80000 milliseconds. The other events click to
drop a fish in the inventory and wait between 100 to 200 milliseconds. The delay
exists to accommodate certain long actions. The delay varies to avoid detection
by Jagex's bot detection system. Disclaimer, it's unknown whether randomizing
mouse gestures, delays, etc. actually helps but it's better to be safe than
sorry.

## Leveraging Game Client Features

It would be disingenuous to say that `colorbot` is a completely standalone bot.
For it to work, you need to use some plugin features of the game client.
Specifically, the [RuneLite][2] game client.

The first critical plugin is the [NPC Indicator][3] plugin. NPC Indicator
highlights NPCs on screen. You can customize the colors and the highlight
styles. Here's a short video from the developer's demonstrating how it works:

![NPC Indicator Plugin Demo](/posts/2025/colorbot/npc-indicators.webp#center)

RuneScape has many surprising elements that register as NPCs. For example,
fishing spots are all NPCs! Configure the plugin and your `colorbot`
script to use colors which don't occur in the game such as pure red, green, etc.
This guarantees you'll accurately click the object you're interested in.

What if you want to click non NPC objects? You can mark arbitrary objects using
the [Object Markers][4] plugin. You can customize the color and highlight style
here as well:

![Object Markers Plugin Demo](/posts/2025/colorbot/object-markers.webp#center)

Just shift click the object you want to mark and select the color and additional
options from the pop-up menu.

Next up, coloring items in your inventory. For this, the [Inventory Tags][5]
plugin is useful. Checkout this short clip demoing usage:

![Inventory Tags Plugin Demo](/posts/2025/colorbot/inventory-tags.webp#center)

Finally, the [Menu Entry Swapper][6] plugin lets you avoid right clicking and
searching through menus. This is useful in many ways. For example, say you
want to drop an inventory of logs. You can set the left click option on logs
to "drop."

![Menu Entry Swapper Plugin
Demo](/posts/2025/colorbot/menu-entry-swapper.webp#center)

Configuring four plugins alongside `colorbot` might sound like a lot of work.
However, you'll find that spending 45 minutes to an hour configuring the bot is
much less painless than manually skilling for 200 hours or more. Below is an
example of a fishing script in action (note, the video is a bit slow since the
PC was overloaded at the time of recording):

{{< video src="/posts/2025/colorbot/fishing-colorbot.mp4" type="video/mp4" preload="auto" >}}

The NPC Indicator Plugin highlights the fishing spots red. The Inventory Tags
Plugin highlights the fish in the inventory purple. `colorbot` runs a [fishing
script][7] which uses the information on screen to click a luring spot and drop
fish in the inventory. This script ran 12 hours a day for close to a month on
the journey from 67 to 99 fishing. You can do the math on how many hours that
saved.

## Conclusion

`colorbot` demonstrates how color-based automation can be both simple and
effective. While this approach has limitations, it works well for automating
skills with random elements in RuneScape. Client plugins play a crucial role in
this setup. Without plugins to highlight key elements with distinct colors,
`colorbot` would be unable to reliably identify and interact with game objects.

The complete project source is available on GitHub under [colorbot][8].

**Update**: `colorbot` nearly got a main account to max without a ban. Two
skills remained before a temporary two day ban was issued for a macro minor
offense. Agility and farming had to be leveled manually. The bot was banned 4
days into agility training. The bot ran for 12 hours a day in 3 hour sessions
with 1.5 to 2 hour breaks between sessions. This worked fine for all previous
skills. However, for agility, I started running 15 hours a day. I suspect this
is what triggered the ban. Moral of the story, don't run the bot excessively. I
speculate that running the bot for 9 hours a day with metered breaks is the
sweet spot. Despite the ban, I did suffer the last two skills to achieve my
childhood goal of maxing on RuneScape.

{{< video src="/posts/2025/colorbot/maxed.mp4" type="video/mp4" preload="auto" >}}

[1]: https://programmador.com/posts/2024/rsbot/
[2]: https://runelite.net/
[3]: https://github.com/runelite/runelite/wiki/NPC-Indicators
[4]: https://github.com/runelite/runelite/wiki/Object-Markers
[5]: https://github.com/runelite/runelite/wiki/Inventory-Tags
[6]: https://github.com/runelite/runelite/wiki/Menu-Entry-Swapper
[7]: https://github.com/ivan-guerra/colorbot/blob/master/scripts/fishing.json
[8]: https://github.com/ivan-guerra/colorbot
