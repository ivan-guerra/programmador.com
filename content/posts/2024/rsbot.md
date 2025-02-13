---
title: "rsbot"
date: 2024-09-05T20:36:14-04:00
description: "A basic RS3/OSRS auto clicker bot."
tags: ["games", "python"]
---

Are you a fan of the MMO [RuneScape][1]? Are you not a fan of the grinds
RuneScape subjects its players to? If you answered yes to these two questions,
it's likely botting has crossed your mind.

Put aside that botting is against the game's rules. Creating a scriptable bot
that can avoid RuneScape's bot detection system presents a number of interesting
technical problems. This article explores the creation of a rudimentary bot: an
auto clicker bot.

## Bot Taxonomy

People have been botting RuneScape for ages. In that time, there's been a number
of different flavors of bots. If you search the RS botting forums, you'll come
across references to color bots, injection bots, reflection bots, and more.

Below is a summary of the top three bot types taken directly from the [OSRS
Botting][2] wiki.

- **Color Bots**: Color bots are a primitive form of botting that uses colors in
  the game to perform tasks. The bot is told to recognise a certain type of color
  on the screen and then the bot clicks on that color.
- **Injection Bots**: An injection bot is a type of bot that utilises the
  RuneScape code itself. It injects itself into the RuneScape client and is able
  to read the client's code. It makes sense of the code and is able to make
  choices based on what the code states it will do.
- **Reflection Bots**: Reflection bots create a mirror image of the RuneScape
  applet by accessing the loaded classes and then reads the code of the
  "reflected" copy, without injecting any code.

Color, injection, and reflection bots are often overkill for automating basic
tasks. A surprising amount of RS gameplay amounts to clicking the same group of
pixels for hours on end. The obvious solution is to implement a scriptable auto
clicker. That said, a naive auto clicker will get you banned in the span of a
few hours. In the next section, you'll see what behaviors are _speculated_ to
trigger the bot detection system.

## Botting Red Flags

What actions lead to a ban? The short answer is, only Jagex's bot busting team
knows. Further, RuneScape 3 and Old School RuneScape have separate bot busting
teams. It's likely that their detection mechanisms have overlap but aren't
identical. What follows in this section are best guesses at what the bot
detection system considers red flags.

You can think of the bot detection system as a scale. On one side you have a
human player and on the other a bot. Tip the scale to the bot side beyond a
certain threshold and an automatic ban gets applied to your account. Listed
below are a few of the behaviors that are _thought_ to tip the scales towards
bot:

- **Account Age**: More scrutiny gets placed on new accounts as a measure to
  counter bot farms. Older accounts with hours of manual playtime face less
  pressure from the bot detection system.
- **Inhuman Playtime**: Few players can train a single skill for 24 hours
  straight. Inhuman play streaks are a good botting indicator.
- **IP Info**: Some speculate that Jagex analyzes IP information. If you play
  through a VPN used by botters, your IP may raise a red flag.
- **Perfect Clicks**: If you click the exact same pixel for hours on end,
  that's a good sign you're a bot.
- **Robotic Mouse Movement**: Jagex can certainly track mouse gestures. Whether
  they analyze the movements is unknown. A survivable bot must generate human like
  mouse movements.
- **In Game Reports**: Other players reporting your account for botting is
  undesirable.

These are just a few actions that could trigger the bot detection system. If you
employ one of the botting strategies that hooks into the game client, there are
even more dangers to avoid.

## Development Language

The goal is to write an auto clicker bot. Auto clickers don't hook into the game
client and therefore aren't limited to Java or C++ for development. You should
write your auto clicker bot in Python. Python is itself a scripting language
that supports a number of popular libraries. Those libraries include APIs for
identifying screen dimensions, manipulating the mouse, and random number
generation. You'll need these functions and more to build a survivable bot.
Python is also a portable language. Write the script once and it'll run on
Linux, Windows, and MacOS. The auto clicker script linked at the end of this
article is 366 lines of Python code with comments included.

## Auto Clicker Bot Design

The concept behind an auto clicker bot is simple. You define a set of click
events where each click event specifies the mouse button to press and a target
screen location. The bot continuously loops over the events until it's
terminated. Implementing such a program in Python takes minutes. It would also
only take the RuneScape bot detection system a few hours to ban such a bot. Lets
look at how to make this auto clicker bot more survivable.

### Randomized Delays

When you train a skill in RuneScape, you click a sequence of UI elements over
and over. Do you click those elements at the exact same cadence each time? Of
course not. The delay between clicks varies even if only by a few hundreds of
milliseconds. To decrease the chance of getting banned, you append a min and max
delay in seconds to each click event. After the bot performs a click, it will
wait \\(N\\) seconds where \\(N\\) gets chosen at random from the configured
delay range.

How big should the range be? Depends on the event and how risk tolerant you are.
Rule of thumb is make the bottom end of the range large enough to execute the
action to completion then add 5 seconds to that to get the max delay. For
example, if it takes 28 seconds to fletch an inventory of logs, you would
specify a delay range of \\([28, 33]\\).

### Random Idling

Random idles or breaks can help approximate human like RuneScape gameplay. For
example, maybe every 30 minutes you take a 5 minute break to get a snack or load
another Youtube video. The auto clicker bot should do the same. Every \\(N\\)
minutes, an idle of \\(M\\) seconds gets inserted. Similar to the click event
delays, you can specify a range from which to select \\(M\\).

### Click Boxes

By now you know that clicking the exact same pixel is a bad idea. An easy way
around this is to not hardcode a pixel location but instead define a click box.
When the click event executes, a random pixel in the bounds of the box gets
selected. A click box doesn't necessarily need to be a set of four vertices that
form a perfect square. It can be any set of four unique vertices. Below is a
Python class, `ClickBox`, that takes four vertices and exposes an API for
generating a random point within the quadrilateral formed by those points.

```python
class ClickBox:
    """Define a quadrilateral representing an in game click box.

    To avoid bot detection, don't click the exact same pixel location for hours on end.
    ClickBox provides an API for consistently clicking a target object (e.g., bank chest, NPC, etc.)
    without hardcoding a specific pixel location.
    """

    def __init__(self, vertices: list[tuple[int]]) -> None:
        """Construct a quadrilateral.

        Args:
            vertices: A list of four 2D points representing the corners of the click box.
        Throws:
            ValueError: When the length of the parameter vertices list is not exactly four.
        """
        num_vertices = 4
        if len(vertices) != num_vertices:
            raise ValueError(
                f"invalid number of vertices, expected {num_vertices} got {len(vertices)}")
        self._vertices = vertices

    def _random_point_in_triangle(self, v1, v2, v3) -> tuple[int]:
        """Return a point within the bounds of the triangle formed by the paramater vertices."""
        s = random.random()
        t = random.random()

        # Ensure the point is inside the triangle.
        if s + t > 1:
            s = 1 - s
            t = 1 - t

        x = v1[0] + s * (v2[0] - v1[0]) + t * (v3[0] - v1[0])
        y = v1[1] + s * (v2[1] - v1[1]) + t * (v3[1] - v1[1])

        return (x, y)

    def get_rand_point(self) -> tuple[int]:
        """Return a random point within click box bounds."""
        if random.random() < 0.5:
            # Generate a point in the first triangle.
            return self._random_point_in_triangle(
                self._vertices[0], self._vertices[1], self._vertices[2])
        # Generate a point in the second triangle.
        return self._random_point_in_triangle(
            self._vertices[0], self._vertices[2], self._vertices[3])
```

The `get_rand_point()` method selects a random point from one of two triangles
formed using the input vertices. The animation below illustrates the concept
using a set of vertices that happen to form a perfect square:

{{< video src="/posts/2024/rsbot/click-box-point-gen.mp4" type="video/mp4" preload="auto" >}}

### Moving the Mouse

You want your mouse movements to be as human like as possible. There are a couple
of different Python projects that solve this problem:

- [WindMouse][3]: Models mouse movement using an imaginary wind and
  gravitational force. The implementation is tunable allowing you to adjust the
  mouse speed and overshoot.
- [bezmouse][4]: Models mouse movement using Bezier curves. The mouse moves from
  point A to B along a random Bezier curve.
- [pyHM][5]: Though the implementation isn't well documented, a quick look at
  the source shows this is yet another implementation that uses Bezier curves to
  model mouse movement.

pyHM stands out as the best choice since it's easiest to use and tune. pyHM's
mouse motions look convincing as well. Below is an animation showing a couple of
pyHM mouse gestures with their trace:

{{< video src="/posts/2024/rsbot/mouse-movement.mp4" type="video/mp4" preload="auto" >}}

Its worth mentioning you can adjust the speed at which the mouse moves from A to
B using a multiplier. You should randomize the speed of the mouse movements via
an interval.

## Conclusion

The [rsbot][6] project puts the ideas from the previous sections into practice.
The [README][7] includes instructions on how to configure and run the bot.
The bot has successfully allowed a main account to level fletching, firemaking,
and crafting to 99 all in the last month.

The bot has a few shortcomings. In particular, if you change the game camera
orientation or screen resolution, you have to regenerate all those click boxes.
The project includes a helper script to reduce the tedium around creating an
`rsbot` click event script.

**Use the `rsbot` auto clicker at your own risk**. Don't run the script on an
account you wouldn't be okay losing. Don't run the bot for inhuman amounts of
time. Don't test your scripts or run the bot in highly populated areas where you
can get reported. Do tune the delays and random intervals before setting the bot
to run without supervision. Follow these basic rules and you too can save hours
in maxing the most tedious skills in RuneScape.

[1]: https://runescape.com
[2]: https://oldschool.runescape.wiki/w/Botting#:~:text=An%20injection%20bot%20is%20a,code%20states%20it%20will%20do.
[3]: https://ben.land/post/2021/04/25/windmouse-human-mouse-movement/
[4]: https://github.com/vincentbavitz/bezmouse
[5]: https://pypi.org/project/pyHM/
[6]: https://github.com/ivan-guerra/rsbot.git
[7]: https://github.com/ivan-guerra/rsbot/blob/master/README.md
