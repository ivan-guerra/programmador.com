---
title: "ASCII Art Generator"
date: 2023-02-26T13:25:04-07:00
description: "A JPEG/PNG to ASCII Art generator."
tags: ["ascii-art", "boost", "c++", "cli-tools"]
---

Who doesn't like ASCII art? If you're like me, you probably thought about
making your own ASCII art generator before but gave up on the idea thinking
that it's too complicated. Is the time investment worth it to draw ASCII
versions of your favorite LOTR characters? Well, after some Googling, I found
out it's not all that bad and set to write a ASCII art CLI tool.

## Project Goals

The goal is simple: write a JPEG/PNG to ASCII art generator. I came across a
great Youtube tutorial by [Raphson][1] which shows how to construct the
generator in Python:

{{< youtube 2fZBLPk-T2Y >}}

Raphson's video pointed out the key steps required to do the conversion:

1. Load JPEG/PNG RGB pixel data into the program.
2. Scale the image as necessary or as requested by the User.
3. Map each pixel to an ASCII character value.
4. Output and save character mappings to a User file.

1-4 gets you a basic generator. Raphson goes on to add features such as
customizing fonts and adding color. The latter features aren't a part of this
project.

## Picking an Image Library

When it comes to C++ image libraries, you have limited options:

- Use `libpng` and `libjpeg` directly.
- [C++ Template Image Processing Library][2] (AKA CImg)
- [Boost Generic Image Library (GIL)][3]

Using the raw PNG/JPEG image libraries seemed unnecessary given two good image
libraries that handle `libpng`/`libjpeg` exist. CImg was a header-only library
with great documentation. However, project compilation time with CImg was
astronomical. CImg compile time woes are a [known issue][4] within the
community. That leaves Boost's GIL. GIL's not a bad option since its community
is active, there's plenty of docs, and it's easy to integrate into a CMake
project. Most importantly, GIL supports PNG/JPEG file formats and image scaling
out of the box.

## Mapping Pixel Data to ASCII Characters

This is the secret sauce to this whole project. The process for pixel to
character conversion looks something like this:

1. Compute the average of a given pixel's R, G, and B value (AKA the pixel's
   grayscale value).
2. Apply a scale factor to the grayscale value.
3. Use the integral value from (2) as the index into an array of printable ASCII
   chars.

The tricky part was defining the scaling factor. There are 256 possible
grayscale values (0 - 255). There are N chars in the ASCII array from which to
choose from when printing. Therefore, a scale factor of `N / 256` made sense.
Below is the function used to get the ASCII char from the grayscale value:

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

Since the generator operates only on PNG/JPEG images, it's worthwhile to have a
means of verifying that the input image is a PNG/JPEG. File extensions aren't a
valid way of identifying file formats since you could add any extension you
like. Calling an external program to query for file info also seemed like
overkill.

Unix's `file` manpage provided useful notes. Turns out PNG/JPEG images each
include header info in the first few bytes of the file. PNG's start with an
8-byte signature of `0x89504E470D0A1A0A`. All JPEGs start with a 2-byte
signature of `0xFFD8`. That's all the information needed to detect the file
format:

```cpp
AsciiGenerator::ImageType AsciiGenerator::GetImageType(
    const std::string& filename) const {
    static const uint64_t kPngSignature = 0x89504E470D0A1A0A;
    static const uint64_t kJpgSignature = 0xFFD8000000000000;

    /* Read the first 8 bytes of the file. */
    std::ifstream ifs(filename, std::ifstream::binary);
    if (!ifs.is_open()) {
        return ImageType::kUnknown;
    }
    std::vector<char> buffer(8, 0);
    ifs.read(&buffer[0], buffer.size());

    /* Construct an unsigned 64-bit word using the 8 bytes in buffer. */
    uint64_t word = 0;
    for (const char& c : buffer) {
        word = (word << 8) | static_cast<uint8_t>(c);
    }

    /* Check if the word matches a known image file type signature. */
    if (word == kPngSignature) {
        return ImageType::kPng;
    } else if ((word & kJpgSignature) == kJpgSignature) {
        return ImageType::kJpg;
    }
    return ImageType::kUnknown;
}
```

## Conclusion

The end result is a utility called `asciigen` which performs the ASCII art
generation task. Unsurprisingly, SLOC count exceeded the ~45 lines of code used
in the Python tutorial. The project took about a day to complete from start to
finish. Even more surprising was how simple it was to get such a satisfying
result (sweet ASCII images) with just a handful of insights and a number of open
source libraries.

The complete source with build instructions, usage, etc. is available on GitHub
under [ascii_art_gen][5]. For those familiar with Docker, included with the
project are step-by-step instructions on how to run `asciigen` from within a
Docker container.

[1]: https://www.youtube.com/@Raphson
[2]: https://cimg.eu/
[3]: https://www.boost.org/doc/libs/1_76_0/libs/gil/doc/html/index.html
[4]: https://github.com/GreycLab/CImg/issues/169
[5]: https://github.com/ivan-guerra/ascii_art_gen
