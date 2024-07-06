---
title: "The Sierpinski Triangle"
date: 2024-02-07T15:39:59-08:00
description: "Visualizing Sierpinski's triangle in your terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

Do you remember when you first learned about recursion? The thought triggered a
memory from an old CS101 Java course. The textbook had some fractal triangle
thing made with only 20 lines of code. At the time, it was a confusing 20 lines
of code.

A quick search on Google for "fractal triangle recursion" led straight to the
[Sierpinski triangle][1]. A Sierpinski triangle generator with an ncurses
visualization is a fun afternoon project.

## The Recursive Approach

Here's the description of the Sierpinski triangle algorithm straight from
Wikipedia:

1. Start with an equilateral triangle.
2. Subdivide it into four smaller congruent equilateral triangles and remove the
   central triangle.
3. Repeat step 2 with each of the remaining smaller triangles infinitely.

Below is one possible implementation of the algorithm:

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

The code implements a `Triangle` type where a `Triangle` is an array of three
vertices in 2D space. The `Midpoint()` function calculates the midpoint of two
2D points. `Sierpinski()` is the recursive function where the magic happens. The
`degree` parameter controls the number of algorithm iterations. At each
iteration, you subdivide the previous iteration's triangles into three smaller
triangles using the midpoint of each side of the "parent" triangle. Each
subtriangle then calls `Sierpinski()` with a reduced `degree`. `degree = 0` is
the base case. In the base case, you print the input triangle before returning.

If you have some experience with recursive algorithms, the implementation isn't
too hard to grok. If you are a newbie, do a run on paper with a small `degree`.
You'll get a feel for how the execution plays out.

If you were paying attention in your algorithms course, you'd know the time
complexity of this implementation isn't so great. Below is the call tree for a
`Sierpinski(2)` run.

```text
                                                                              +----------------+
                                                                              | Sierpinski(2)  |
                                                                              +-------+--------+
                                                                                      |
                           +----------------------------------------------------------+----------------------------------------------------------+
                           |                                                          |                                                          |
                   +-------v--------+                                         +-------v--------+                                                 |
                   | Sierpinski(1)  |                                         | Sierpinski(1)  |                                         +-------v--------+
                   +-------+--------+                                         +-------+--------+                                         | Sierpinski(1)  |
                           |                                                          |                                                  +-------+--------+
                           |                                      +-------------------+-----------------+                                        |
       +-------------------+-----------------+                    |                   |                 |                     +------------------+-----------------+
       |                   |                 |                    |                   |                 |                     |                  |                 |
+------v---------+ +-------v--------+ +------v---------+   +------v---------+ +-------v--------+ +------v---------+   +-------v--------+ +-------v--------+ +------v---------+
| Sierpinski(0)  | | Sierpinski(0)  | | Sierpinski(0)  |   | Sierpinski(0)  | | Sierpinski(0)  | | Sierpinski(0)  |   | Sierpinski(0)  | | Sierpinski(0)  | | Sierpinski(0)  |
+----------------+ +----------------+ +----------------+   +----------------+ +----------------+ +----------------+   +----------------+ +----------------+ +----------------+
```

At each node in the tree you make 3 calls to `Sierpinski()`. The depth of this
tree is equal to the degree of the top-level `Sierpinski()` call. You can
imagine for higher degree values, the tree just blows up. In fact, you can
deduce the `Sierpinski()` implementation has an exponential time complexity of
\\(\\mathcal{O}(3^{degree})\\). Ouch.

The space complexity is \\(\\mathcal{O}(degree)\\) due to the depth of the call
stack scaling linearly with the degree.

## Randomization to the Rescue

An exponential algorithm just isn't going to work. At \\(N = 10\\), the
algorithm takes well over 5 seconds to finish on a PC with an Intel i5
processor. So what can you do? Well, scroll a little further down that Wikipedia
page and you'll find a section labeled ["Chaos Game"][2]. You can read the wiki
to get a technical description of the algorithm. Here's the for dummies version:

1. Take three points in a plane to form a triangle.
2. Randomly select any point inside the triangle and consider that your current
   position.
3. Randomly select any one of the three vertex points.
4. Move half the distance from your current position to the selected vertex.
5. Plot the current position.
6. Repeat from step 3.

Here's an implementation of the "chaos" approach:

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

A couple of notes on the code. The initial base triangle has its vertices set to
the edges of the terminal screen in an upside down orientation. The
implementation follows the steps outlined previously with the addition of
`max_iterations` and `refresh_rate_usec` parameters. You control the total
number of points via `max_iterations`. You control the draw speed via
`refresh_rate_usec`.

The chaos game approach is _fast_. Assuming you can generate random numbers in
\\(\\mathcal{O}(1)\\) time, the time complexity of `DrawSierpinskiTriangles()`
is \\(\\mathcal{O}(max\\\_iterations)\\). A linear algorithm that scales with a
tunable iteration count is much nicer than the exponential previously
encountered. The space complexity is also optimal here coming in at
\\(\\mathcal{O}(1)\\).

## Visualization Using ncurses

The setup is mostly straightforward. Assume the screen is a quadrant of the 2D
coordinate plane. Every time you generate a new point, draw it on the screen
using some marker symbol such as an asterisk. To make it look nice, bold the
character and randomly assign it a color.

Below is the relevant ncurses draw snippet:

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
this [other post][3] that dives into the details.

## Conclusion

The end result looks pretty neat:

{{< video src="/posts/2024/sierpinski/sierpinski.mp4" type="video/mp4" preload="auto" >}}

Generating the Sierpinski triangle was a problem with surprising complexity (pun
intended). The naive solution is easy to implement but has impractical
time/space complexity. Randomization saved the day, reducing the complexity
significantly making it possible to generate higher degree triangles in a
reasonable amount of time. It's also nice to flex on the original textbook's
`System.out.println()` triangle by making a ncurses based visualization.

The complete project source with build instructions, usage, etc. is available on
GitHub under [sierpinski][4].

[1]: https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#
[2]: https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#Chaos_game
[3]: https://programmador.com/posts/2023/snake-in-the-terminal/
[4]: https://github.com/ivan-guerra/sierpinski
