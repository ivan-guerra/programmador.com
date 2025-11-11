---
title: "Plasma"
date: 2025-02-13T10:48:16-05:00
description: "Old school plasma demo effects."
categories: ["projects"]
tags: ["cli-tools", "rust"]
---

If you're familiar with the [demo-scene][1], you've probably seen the plasma
effect:

![FRACTINT Plasma](/posts/2025/plasma/fractint.gif#center)

In this article, you'll learn how to implement plasma effects of your own.

## The Algorithm

To generate a plasma effect, you iterate the pixels in the screen buffer. For
each pixel:

1. Apply a function to the pixel's coordinate producing some value \\(v\\).
2. Use \\(v\\) to calculate the new RGB value of the pixel.
3. Update the pixel's RGB value in the screen buffer.
4. Repeat steps (1)-(3) until you have processed the entire image frame.
5. Display the updated frame.

Applying these steps at a high frequency creates the plasma animation. As you'll
see, the choice of function determines the shape and scale of the output image.

## Plasma Functions

What function should you use when generating plasma? The sine function is
popular due to its periodic nature. A vanilla sine function produces an image
like the one shown below.

![Sine](/posts/2025/plasma/sine.webp#center)

The white areas represent the peaks of the sine function, while the black areas
represent the troughs. To produce more interesting plasmas, you can play with
the function and its parameters.

The following sections describe a few functions you can use. In the equations
that follow:

- \\(d\\) is the distance from the center of the screen.
- \\(t\\) is the time.
- \\(s\\) is the scale factor.
- \\(\theta\\) is the angle from the center point.
- \\(p_x\\) and \\(p_y\\) are the pixel's coordinates relative to the center
  point.
- \\(d\_{min}\\) is half of the smallest screen dimension.

### Ripple

To produce a ripple effect, you can use the following function:

\\[ {f(d, t, s)} = \sin(ds - 2t) \\]

![Ripple](/posts/2025/plasma/ripples.webp#center)

### Spiral

To produce a spiral effect, you can use the following function:

\\[ {f(d, t, s, \theta)} = \sin(ds + 3\theta + t) \\]

![Spiral](/posts/2025/plasma/spiral.webp#center)

### Circle

To produce a circle effect, you can use the following function:

\\[ {f(d, t, s, \theta)} = \sin(ds + t) + \sin(2\theta + t) \\]

![Circle](/posts/2025/plasma/circles.webp#center)

### Checkerboard

To produce a checkerboard effect, you can use the following function:

\\[ {f(d, t, s, p_x, p_y, d_{min})} = \sin({sp_x \over d_{min}}) * \sin({sp_y \over d_{min}} + t) \\]

![Checkerboard](/posts/2025/plasma/checkerboard.webp#center)

## Adding Some Color

In ["The Algorithm"](#the-algorithm) section, it's mentioned you should use the
value returned by the plasma function to calculate a pixel's RGB color. How
exactly do you do that? One way is to call a `hsv_to_rgb()` function. The hue
argument to the `hsv_to_rgb()` varies as a function of the value returned by the
plasma function:

```rust
let v = match self.shape {
    Shape::Ripple => self.ripple(dist, time),
    Shape::Spiral => self.spiral(dist, time, angle),
    Shape::Circle => self.circle(dist, time, angle),
    Shape::Square => self.square(px, py, min_dim, time),
};
// Normalize the plasma value from [-1,1] to [0,1] range for color mapping
let v = v * 0.5 + 0.5;

let (r, g, b) = match self.palette {
    Palette::Rainbow => self.hsv_to_rgb(v * 360.0, 1.0, 1.0),
    Palette::BlueCyan => self.hsv_to_rgb(v * 120.0 + 180.0, 0.8, 1.0),
    Palette::Hot => self.hsv_to_rgb(v * 60.0, 1.0, 1.0),
    Palette::PurplePink => self.hsv_to_rgb(v * 60.0 + 270.0, 0.7, 1.0),
}
*pixel = alpha | ((r as u32) << 16) | ((g as u32) << 8) | (b as u32);
```

The critical bit in the code is the hue value calculation. Hue is circular. The
`hsv_to_rgb()` function expects the hue to be in the range [0,360]. The code
maps the plasma value to the hue range of the desired palette. For example, a
rainbow palette covers the full range of hues. In contrast, the blue/cyan
palette covers 180-300 degrees of the hue circle.

Here's a short clip showing the different plasma functions with various
palettes:

{{< video src="/posts/2025/plasma/demo.mp4" type="video/mp4" preload="auto" >}}

## Conclusion

Plasma effects demonstrate how simple mathematical functions can create
mesmerizing animations. By combining sine waves, distance calculations, and
color transformations, you can produce a variety of classic demo scene effects.

The complete project source is available on GitHub under [plasma][2].

[1]: https://en.wikipedia.org/wiki/Plasma_effect#
[2]: https://github.com/ivan-guerra/plasma.git
