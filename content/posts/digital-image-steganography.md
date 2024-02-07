---
title: "Digital Image Steganography"
date: 2023-06-25T22:13:54-07:00
description: "How to embed an image within another."
tags: ["c++", "boost", "cli-tools"]
---

While on a computerphile[^1] marathon, I came a across a pretty neat video of
theirs covering steganography[^2]. In the video, Mike Pound talks about a
technique for steganography on digital images: least significant bit
substitution. I found the simplicity of the technique to be cool given how
effective it is (atleast to the human eye). This seemed like a fun weekend
project so I set out to write a command line tool for embedding one image within
another.

## A Little Background on Digital Images

No fancy image manipulation techniques are needed to make this steganography
tool work. That said, we do need to know a little bit about how a digital image
is represented in our machine.

A digital image can contain thousands or more elements called pixels.  Below is
an image where the enhanced portion shows the individual pixels rendered as
small squares[^3].

[![Pixels](/posts/digital-image-steganography/pixels.png#center)][3]

In a color image, a pixel is made up of 3 to 4 channels. There's the classic
red, green, and blue (RGB) pixel and the cyan, magenta, yellow, and black (CYMK)
pixel. We'll be focusing on three channel or RGB pixels.

Each channel of an RGB pixel specifies the intensity of the color using an 8-bit
value. Combining the three channels, we're able to represent 2^24 or well over
16 million different colors. Often, each byte of an RGB color pixel will be
specified using hexadecimal notation as shown in the table below.

[![RGB Color Palette](/posts/digital-image-steganography/color-palette.gif#center)][4]

For our purposes, a digital image can be thought of as a two dimensional matrix
of pixel values. The steganography algorithm discussed here will encode the
pixel data of one secret image in the pixel data of another cover image using a
reversible process.

## Least Significant Bit Substitution

Least signifcant bit substitution works on the principal that the most
significant bits (MSBs) of a number have a much larger impact on the numerical
value than the least signifcant bits (LSBs). As an example, imagine you had the
16-bit value **1101010101001000** which in decimal is **54600**. If you flipped
the MSB, the binary number would be **0101010101001000** or **21832** decimal.
That's approximately a 60% difference from changing a single bit! Now say you
went crazy and flipped the lowest 8 bits producing **1101010110110111** or
**54711**.  Despite flipping 7 more bits, we only see an approximately 0.002%
difference in the numerical value.

So how does this apply to image steganography? We can hide the MSBs of our
secret image's pixels in the LSBs of our cover image. We apply this process to
each color channel in the pixel. If the cover image is a noisy one, then the
change will be unnoticeable to the human eye. We simply reverse the process to
extract the secret image: make the LSBs of the merged image the MSBs of the new
unmerged image with the lower bits zeroed out. The unmerged image will be
recognizable albeit some LSB info is lost in the merge/unmerge process.

Here's an example using the 4 least significant bits of each color channel.

Suppose we had a cover image pixel with the following RGB values represented in
hexadecimal:

| Channel | Value |
|---------|-------|
| R       | 0xFA  |
| G       | 0x1B  |
| B       | 0xC9  |

Our corresponding secret pixel might look something like:

| Channel | Value |
|---------|-------|
| R       | 0x12  |
| G       | 0x78  |
| B       | 0xFF  |

The merge operation would have us take the most significant hex digit (i.e.,
4-bits) of the secret pixel and place them as the **least significant** hex
digit of the cover image (the highlighted hex digits in the table below). The
merged pixel would then look like:

| Channel | Value     |
|---------|-----------|
| R       | 0xF**1**  |
| G       | 0x1**7**  |
| B       | 0xC**F**  |

To retrieve the secret pixel from a merge pixel, we take the least significant 4
bits of the merged pixel and concatenate it with zeroes on the right:

| Channel | Value     |
|---------|-----------|
| R       | 0x**1**0  |
| G       | 0x**7**0  |
| B       | 0x**F**0  |

How many bits should we use to conceal our image? I chose to use 4-bits. I'd say
4-bits is the upper limit, beyond that you can see some artifacts in the merged
image which make it obvious that it has been tampered with. I experimented with
going as low as 2-bits and still got half decent results. The examples and code
presented in this article use the 4 LSBs of each channel but the code can easily
be modified to work with different LSB counts.

## Making It Happen

The idea is to have a command line tool that could merge and unmerge two images.
That is, I expected the program take in a command with arguments and spit out an
image. Program usage would look something like:

```bash
$ steganography merge cover.jpg secret.jpg out.png
...
$ steganography unmerge out.png secret.jpg
```

If we ignore all the argument processing and error checking code, the program
boiled down to implementing two functions: `Merge()` and `Unmerge()`.

## Merging

Below is a snippet showing the interesting bits of the merge implementation:

```cpp
static boost::gil::rgb8_pixel_t MergePixels(
    const boost::gil::rgb8_pixel_t& cover_pix,
    const boost::gil::rgb8_pixel_t& secret_pix) {
    const int kHighNibble = 0xF0;
    boost::gil::rgb8_pixel_t merged_pix(0, 0, 0);
    for (int i = 0; i < 3; ++i) {
        merged_pix[i] =
            (cover_pix[i] & kHighNibble) | ((secret_pix[i] & kHighNibble) >> 4);
    }
    return merged_pix;
}

RetCode Merge(const std::string& cover, const std::string& secret,
              const std::string& outfile) {
    ...

    /* load images into GIL image type */
    boost::gil::rgb8_image_t cover_img(ReadImage(cover, cover_img_t));
    boost::gil::rgb8_image_t secret_img(ReadImage(secret, secret_img_t));
    boost::gil::rgb8_image_t output_img = cover_img;

    ...

    /* merge the secret image's pixels into the output image */
    const boost::gil::rgb8_pixel_t kBlackPixel(0, 0, 0);
    auto secret_view = boost::gil::const_view(secret_img);
    auto output_view = boost::gil::view(output_img);
    for (int row = 0; row < output_view.height(); ++row) {
        for (int col = 0; col < output_view.width(); ++col) {
            if ((row >= secret_img.height()) || (col >= secret_img.width())) {
                output_view(col, row) =
                    MergePixels(output_view(col, row), kBlackPixel);
            } else {
                output_view(col, row) =
                    MergePixels(output_view(col, row), secret_view(col, row));
            }
        }
    }

    ...
}
```

You can see the `Merge()` function iterates over the `output_view` which is
initialized to be a mutable Boost GIL image view into a deep copy of
`cover_img`. For each pixel in `output_view`, we call `MergePixels()` which
applies the 4-bit merge operation previously described to each of the three
color channels.

Since our secret image may be smaller in dimension than our cover image,
whenever a pixel in `output_view` is out of range of `secret_view`, we merge
`output_view`'s pixel with a black pixel. This means that when the secret
image's dimensions are less than that of the cover image, the image that is
later unmerged will have a black border.

Below are three images showing the output of a merge command. From left to right
we have the cover image, secret image, and merged image. You can view the actual
image files [here][5] if you're interested.

<div class="row" style="display:flex">
  <div class="column">
    <img src="/posts/digital-image-steganography/container.jpg"
         alt="Cover Image" style="width:100%">
  </div>
  <div class="column">
    <img src="/posts/digital-image-steganography/secret.jpg"
         alt="Secret Image" style="width:100%">
  </div>
  <div class="column">
    <img src="/posts/digital-image-steganography/merged.png"
         alt="Merged Image" style="width:100%">
  </div>
</div>

## Unmerging

Here are the critical parts of the unmerge implementation:

```cpp
static boost::gil::rgb8_pixel_t UnmergePixels(
    const boost::gil::rgb8_pixel_t& pixel) {
    const int kLowNibble = 0x0F;
    boost::gil::rgb8_pixel_t unmerged_pix(0, 0, 0);
    for (int i = 0; i < 3; ++i) {
        unmerged_pix[i] = (pixel[i] & kLowNibble) << 4;
    }
    return unmerged_pix;
}

RetCode Unmerge(const std::string& secret, const std::string& outfile) {
    ...

    /* load images into GIL image type */
    boost::gil::rgb8_image_t secret_img(ReadImage(secret, secret_img_t));
    boost::gil::rgb8_image_t output_img = secret_img;

    /* extract the hidden image into the output image */
    auto secret_view = boost::gil::const_view(secret_img);
    auto output_view = boost::gil::view(output_img);
    for (int row = 0; row < output_view.height(); ++row) {
        for (int col = 0; col < output_view.width(); ++col) {
            output_view(col, row) = UnmergePixels(secret_view(col, row));
        }
    }

    ...
}
```

Not too much to harp on here. This is the inverse of the `Merge()` function. The
key is that we know how many bits formed the secret during merging so that we
can pop the proper bits from the LSBs of the merged image to the MSBs of the
output image.

Below is the original secret image on the left and the unmerged image on the
right. Notice how some quality is lost in the unmerged image. This happens
because we lost the 4 LSBs of each pixels' color channels when performing the
merge operation.

<div class="row" style="display:flex">
  <div class="column">
    <img src="/posts/digital-image-steganography/secret.jpg"
         alt="Secret Image" style="width:100%">
  </div>
  <div class="column">
    <img src="/posts/digital-image-steganography/unmerged.jpg"
         alt="Unmerged Image" style="width:100%">
  </div>
</div>

## A Note on Image Formats

While implementing this tool, I ran into a fun a little bug. It turns out some
image formats are lossy. What this means is that when you format your image data
using one of these lossy formats, some pixel data is lost/altered. This is bad
news for our naive image steganography tool. Just take a look at what happens to
the poor guinea pig after being merged into a JPEG:

![Mangled Guinea Pig](/posts/digital-image-steganography/mangled.jpg#center)

The steganography tool presented here is meant to support just two image
formats: JPEG and PNG. **JPEG is a lossy format. PNG is a lossless format.** I
took the easy route and required that the output of a merge command always be a
PNG which in turn means the input to an unmerge command is always a PNG. The
output of an unmerge command can be either format.

## Conclusion

The least significant bit substitution method proved simple to implement and did
not disappoint in its effectiveness in secretly embedding one image within
another. There were lessons to be learned in how digital images are represented,
differences in image formats, and struggles undocumented here using C++ image
libraries. If you find yourself getting serious about steganography but aren't
too keen on reinventing the wheel, I recommend checking out a free and open
source tool such as steghide[^4].

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [steganography][8].

[1]: https://www.youtube.com/@Computerphile
[2]: https://www.youtube.com/watch?v=TWEXCYQKyDc
[3]: https://en.wikipedia.org/wiki/Pixel
[4]: https://en.wikipedia.org/wiki/RGB_color_model#/media/File:Palette_of_125_main_colors_with_RGB_components_divisible_by_64.gif
[5]: https://github.com/ivan-guerra/steganography/tree/master/resources
[6]: https://github.com/ivan-guerra/steganography/blob/master/resources/unmerged.jpg
[7]: https://steghide.sourceforge.net/documentation/manpage.php
[8]: https://github.com/ivan-guerra/steganography/tree/master

[^1]: If you tend to like learning about computer science stuff, the videos
    produced by the [computerphile][1] channel are a goldmine.
[^2]: In their [steganography][2] video, computerphile talks about the technique
    implemented in this article. They go on to show that this technique is not
    very effective if one's goal is to go undetected!
[^3]: [Pixel - Wikipedia][3]
[^4]: From the manpage: [Steghide][7] is a steganography program that is able to
    hide data in various kinds of image- and audio-files.
