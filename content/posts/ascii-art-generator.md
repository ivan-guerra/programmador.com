---
title: "ASCII Art Generator"
date: 2023-02-26T13:25:04-07:00
description: "A JPEG/PNG to ASCII Art generator."
tags: ["ascii-art", "boost", "c++"]
toc: true
---

Who doesn't like ASCII art? If you're like me, you probably thought about making
your own ASCII art generator before. Also, if you're like me, you gave up on the
idea thinking that it must be extremely complicated and not worth the effort to
beable to draw ASCII versions of your favorite LOTR characters. Well, after some
Googling and Youtubing, I found out it's not all that bad and decided to give it
a try.

## Project Goals

I settled on the goal of writing a JPEG/PNG to ASCII art generator. As a side
goal, I wanted to implement this tool in C++ so I could get exposure to the
image libraries provided by that community (more on that later). I came across a
great Youtube tutorial by Raphson[^1] which shows how to construct the generator
in Python:

[![Raphson - Making An ASCII-ART GENERATOR!?][9]][10]

Raphson's video pointed out the key steps required to do the conversion:

1. Load JPEG/PNG RGB pixel data into the program.
2. Scale the image as necessary or as requested by the User.
3. Map individual pixels to ASCII character values.
4. Output and save character mappings to a User file.

Now, to be clear, 1-4 gets you a basic generator. Raphson goes on to add
features such as customizing fonts and adding color. I decided to keep it simple
and just get a basic ASCII text file as my output.

## Picking an Image Library

I had to do some searching to find what C++ libraries were out there to deal
with image data. There were a couple options I came across:

* Use `libpng` and `libjpeg` directly.
* C++ Template Image Processing Library[^2] (AKA CImg)
* Boost Generic Image Library[^3] (GIL)

Using the raw PNG/JPEG image libraries seemed unecessary given that I had
atleast two good image libraries that would handle `libpng`/`libjpeg` on my
behalf. I tried out CImg. CImg was a header-only library with great
documentation. The one downside and the reason I was turned off from it was that
my compilation times were pretty large. After doing some digging, I found folks
ran into similar compile time issues[^4]. That left me with Boost's GIL.  GIL's
not a bad option since its community is active, there's plenty of docs, and it's
easy to integrate into a CMake project. Most importantly, GIL supports PNG/JPEG
file formats and image scaling out of the box.

## Mapping Pixel Data to ASCII Characters

This is the secret sauce to this whole project. The process for pixel to
character conversion looks something like this:

1. Compute the average of a given pixel's R, G, and B value (i.e., the pixel's
   grayscale value).
2. Apply a scale factor to the grayscale value.
3. Use the integral value from (2) as the index into an array of printable ASCII
   chars.

The tricky part was defining the scaling factor. After thinking about it, I
found that there are 256 possible grayscale values (0 - 255). I also have N
ASCII chars in my array from which to choose from when printing. Therefore, a
scale factor of `N / 256` made sense. Below is the function I used to get the
ASCII char from the grayscale value:

```cpp
char AsciiGenerator::GetChar(int value) {
    static const std::string kAsciiChars =
        " .'`^\",:;Il!i><~+_-?][}{1)(|\\/"
        "tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
    static const float kInterval = kAsciiChars.size() / 256.f;

    return kAsciiChars[std::floor(value * kInterval)];
}
```

## Identifying File Types

Since the generator I was implementing was meant to operate only on PNG/JPEG
images, I wanted to have a means of checking that the input image actually had
one of those file types. File extensions are not a valid way of identifying file
formats since you could add any extension you like. Calling an external program
to query for file info also seemed like overkill.

After doing some Googling and looking into how programs like Unix's `file`[^5]
work, I found that PNG/JPEG images each include header info in the first few
bytes of the file. PNG's start with an 8-byte signature[^6] of
`0x89504E470D0A1A0A`. All JPEGs start with a 2-byte signature[^7] of `0xFFD8`.
This was all the information I needed to detect the file format.

## Conclusion

Putting it all together, I was able to write a utility called `asciigen` which
performs the ASCII art generation task. Unsurprisingly, my SLOC count exceeded
the ~45 lines of code used in the Python tutorial 😂. Surprisingly, the project
took about a day to complete from start to finish. Even more surprising was how
simple it was to get such a satisfying result (sweet ASCII images) with just a
handful of insights and freely available open source libraries.

You can find the complete source with build instructions, usage, etc. on my
GitHub page under [ascii_art_gen][8]. For those familiar with Docker, included
with the project are step-by-step instructions on how to run `asciigen` from
within a Docker container.

[1]: https://www.youtube.com/@Raphson
[2]: https://cimg.eu/
[3]: https://www.boost.org/doc/libs/1_76_0/libs/gil/doc/html/index.html
[4]: https://github.com/GreycLab/CImg/issues/169
[5]: https://linux.die.net/man/1/file
[6]: https://en.wikipedia.org/wiki/PNG#File_format
[7]: https://en.wikipedia.org/wiki/JPEG#Syntax_and_structure
[8]: https://github.com/ivan-guerra/ascii_art_gen
[9]: https://img.youtube.com/vi/2fZBLPk-T2Y/0.jpg
[10]: https://www.youtube.com/watch?v=2fZBLPk-T2Y

[^1]: Checkout [Raphson][1] on YouTube.
[^2]: See [The CImg Library][2] project page.
[^3]: See the [Boost GIL][3] docs.
[^4]: There was an [issue][4] submitted to the CImg project regarding compile
    times. The reply wasn't very satisfying and boiled down to turning down/off
    optimizations and reducing code complexity in the client code.
[^5]: Good ole manpages: [file][5].
[^6]: Wikipedia provides a summary of the [PNG File Format][6].
[^7]: Wikipedia provides a summary of the [JPEG File Format][7].
