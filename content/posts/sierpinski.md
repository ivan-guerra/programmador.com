---
title: "The Sierpinski Triangle"
date: 2024-02-07T15:39:59-08:00
description: "Visualizing Sierpinski's triangle in your terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

Do you remember when you first learned about recursion? I asked myself this
question the other day. The thought triggered a memory from my CS101 Java course
back in 2013. I remembered reading the textbook and seeing some fractal triangle
thing the author generated with something like 20 lines of code. I also remember
being confused and not "getting it" at the time. It has been over a decade now.
I like to believe I understand the concept of recursion much better these day.
That said, the memory still bothered me so I decided to look up what that
program was about.

A quick search on Google for "fractal triangle recursion" led me straight to the
Sierpinski triangle[^1]. After skimming the wiki page, I figured writing a
Sierpinski triangle generator would be a fun afternoon task. Hell, I could even
redeem 2013 me a little bit by making a pretty terminal visualization using
ncurses.

## The Recursive Approach

The classic Sierpinski triangle algorithm shown on Wikipedia is what I remember
reading in my textbook:

1. Start with an equilateral triangle.
2. Subdivide it into four smaller congruent equilateral triangles and remove the
   central triangle.
3. Repeat step 2 with each of the remaining smaller triangles infinitely.

 A possible implementation of this algorithm is shown below:

```cpp
struct Point2D {
    int x;
    int y;
};

struct Triangle {
    Point2D vertices[3];
};

[[nodiscard]] int MidPoint(const Point2D& a, 
                           const Point2D& b) noexcept {
    return {.x = (a.x + b.x) / 2, .y = (a.y + b.y) / 2};
}

void Sierpinski(const Triangle& tri, int degree) noexcept {
    PrintTriangle(triangle);

    if (degree > 0) {
        Triangle t1;
        t1.vertices[0] = {.x = tri.vertices[0].x, tri.vertices[0].y};
        t1.vertices[1] = MidPoint(tri.vertices[0], tri.vertices[1]);
        t1.vertices[2] = MidPoint(tri.vertices[0], tri.vertices[2]);

        Triangle t2;
        t2.vertices[0] = {.x = tri.vertices[1].x, tri.vertices[1].y};
        t2.vertices[1] = MidPoint(tri.vertices[0], tri.vertices[1]);
        t2.vertices[2] = MidPoint(tri.vertices[1], tri.vertices[2]);

        Triangle t3;
        t3.vertices[0] = {.x = tri.vertices[2].x, tri.vertices[2].y};
        t3.vertices[1] = MidPoint(tri.vertices[2], tri.vertices[1]);
        t3.vertices[2] = MidPoint(tri.vertices[0], tri.vertices[2]);

        Sierpinski(t1, degree - 1);
        Sierpinski(t2, degree - 1);
        Sierpinski(t3, degree - 1);
    }
}
```

The code above implements a `Triangle` type where a `Triangle` is an array of
three vertices in 2D space. The `Midpoint()` function calculates the midpoint of
two 2D points. `Sierpinski()` is the recursive function where the magic happens.
The `degree` parameter controls the number of iterations of the algorithm we
perform. At each iteration, we subdivide the previous iteration's triangles into
three smaller triangles using the midpoint of each side of the "parent"
triangle. Each subtriangle then calls `Sierpinski()` with a reduced `degree`.
The base case is `degree = 0` where the input triangle is printed before exit.

If you have some experience with recursive algorithms, the above implementation
is not too hard to grok. If you are a newbie as I was 14 years ago, do a run on
paper with a small `degree`. You will quickly get a feel for how the execution
plays out. 

If you were paying attention in your algorithms course, you'd know the time
complexity of this implementation is not so great. Below is the call tree for a
`Sierpinski(2)` run.

![Sierpinski Call Stack](/posts/sierpinski/call_stack.png)

At each node in the tree above we make 3 calls to `Sierpinski()`. The depth of
this tree is equal to the degree of the top-level `Sierpinski()` call. You can
imagine for higher degree values, the tree just blows up. In fact, we can deduce
the `Sierpinski()` implementation has an exponential time complexity of
\\(\\mathcal{O}(3^{degree})\\). Ouch.

In comparison, the space complexity is \\(\\mathcal{O}(degree)\\) due to the
depth of
the call stack scaling linearly with the degree.

## Randomization to the Rescue

An exponential algorithm just isn't going to work. At \\(N = 10\\), the
algorithm took well over 5 seconds to finish on a PC with an Intel i5 processor.
So what can we do? Well, scroll a little further down that Wikipedia page and
you find a section labeled "Chaos Game"[^2]. You can read the wiki to get a
technical description of the algo. I find the for dummies version they provided
more enlightening:

1. Take three points in a plane to form a triangle.
2. Randomly select any point inside the triangle and consider that your current
   position.
3. Randomly select any one of the three vertex points.
4. Move half the distance from your current position to the selected vertex.
5. Plot the current position.
6. Repeat from step 3.

My implementation of the "chaos" approach is shown below:

```cpp
static void DrawSierpinskiTriangles(
    const sierpinski::graphics::ScreenDimension& screen_dim,
    unsigned int max_iterations, unsigned int refresh_rate_usec) noexcept {
  sierpinski::common::Triangle base;
  base.vertices[0] = {.x = 0, .y = 0};
  base.vertices[1] = {.x = screen_dim.width / 2, .y = screen_dim.height};
  base.vertices[2] = {.x = screen_dim.width, .y = 0};

  int xi = GetRandomInt(0, screen_dim.height);
  int yi = GetRandomInt(0, screen_dim.width);
  sierpinski::graphics::DrawChar({.x = xi, .y = yi}, '*', GetRandColor());

  int index = 0;
  for (unsigned int i = 0; i < max_iterations; ++i) {
    index = GetRandomInt(0, std::numeric_limits<int>::max()) %
            sierpinski::common::kTriangleVertices;

    xi = (xi + base.vertices[index].x) / 2;
    yi = (yi + base.vertices[index].y) / 2;

    sierpinski::graphics::DrawChar({.x = xi, .y = yi}, '*', GetRandColor());

    /* A delay inserted to speed or slow down the spawn rate of the points. */
    std::this_thread::sleep_for(std::chrono::microseconds(refresh_rate_usec));
  }
}
```

A couple of notes on the code above. The initial base triangle has its vertices
set to the edges of the terminal screen in an upside down orientation. The
implementation follows the steps outlined above but with added `max_iterations`
and `refresh_rate_usec` parameters. `max_iterations` controls how many points
will be drawn to the screen. `refresh_rate_usec` controls the speed at which
points are added to the screen. Using these two parameters you can control how
"full" the triangle looks as well as the speed at which the triangle is
generated (in case you wanted to slow it down for dramatic effect).

The chaos game approach is *fast*. Assuming we can generate random numbers in
\\(\\mathcal{O}(1)\\) time, the time complexity of `DrawSierpinskiTriangles()`
is \\(\\mathcal{O}(max\\_iterations)\\). A linear algorithm that scales with a
tunable iteration count is much nicer than the exponential we previously
encountered. The space complexity is also optimal here coming in at
\\(\\mathcal{O}(1)\\).

## Visualization Using ncurses

I am not going to dwell too long on the visualization aspect of this project.
The setup was pretty straightforward. Assume the screen is a quadrant of the 2D
coordinate plane. Everytime you generate a new point, draw it on the screen
using some marker symbol such as an asterisk. To make it look nice, bold the
character and randomly assign it a color.

Below is the relevant draw snippet:

```cpp
void DrawChar(const sierpinski::common::Point2D& pos, char symbol,
              Color color) noexcept {
  ::attron(COLOR_PAIR(color) | A_BOLD);
  mvaddch(pos.y, pos.x, symbol);
  ::attroff(COLOR_PAIR(color) | A_BOLD);

  ::refresh();
}
```

If you're interested in more of the gritty details of using ncurses, checkout
some of my other posts[^3] where I dive into more details.

## Conclusion

The end result looks pretty neat:

{{< video src="/posts/sierpinski/sierpinski.mp4" type="video/mp4" preload="auto" >}}

Generating the Sierpinski triangle was a problem with surprising complexity (pun
intended). I feel as if I got some redemption after all these years. I
implemented the naive solution and analyzed it's time/space complexity.
Following the analysis, I found an algorithm description which led me to a much
better solution using randomization as a technique to reduce complexity
significantly. To top it off, I got to flex on the original textbook's
`system.println()` triangle by making a ncurses based visualization.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [sierpinski][4].


[1]: https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#
[2]: https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#Chaos_game
[3]: https://programmador.com/posts/snake-in-the-terminal/
[4]: https://github.com/ivan-guerra/sierpinski 

[^1]: As always, Wikipedia has all the details: ["Sierpinski triangle"][1].
[^2]: This algorithm is worth implementing just based off the name along:
    ["Chaos Game"][2].
[^3]: I implemented the game Snake using ncurses not too long ago. That
    [post][3] is worth checking out if you want to learn more about ncurses
    itself.
