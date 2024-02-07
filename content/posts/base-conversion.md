---
title: "A CLI Base Converter"
date: 2023-07-08T11:14:45-07:00
description: "A command line numerical base conversion utility."
tags: ["c++", "cli-tools", "gnu"]
---

When debugging an embedded system, I often find myself working with raw data
that has me converting between decimal, hexadecimal, binary, and (sometimes)
octal number systems. I have yet to find a Linux equivalent to the Windows
Calculator app in programming mode. It doesn't help that the systems I use have
no GUI. I've been resorting to using the Python REPL and `printf` shell utility
though I find using either tool tedious for the simple task of base conversion.

I wanted to drop the overhead of format specifiers and fear of numerical limits.
To ease the pain, I decided to write a command line utility that would allow me
to convert between positive binary, decimal, octal, and hexadecimal numbers of
arbitrary size.

## The Requirements

My use case is simple: take a positive integer in one base and convert it to the
equivalent value in another base. That's it. I don't want to support negative
values, figure out floating point representations, none of that.

The program usage would look something like

```bash
dhb [OPTION]... SRC_BASE TGT_BASE NUM
```

where `SRC_BASE`/`TGT_BASE` are one of `bin`, `dec`, `oct`, or `hex`. `NUM` is
some positive integer value.

To make this idea more concrete, I came up with some basic requirements I could
code to:

1. Support conversions to/from binary, decimal, hexadecimal, and octal.
2. Include an option for minimum output width.
3. Include an option to group digits into segments of size N.
4. Support arbitrarily large positive integers.

Requirement (1) is self explanatory. Requirement (2) means I can pad the output
value with zeroes to achieve a minimum width. For example, the binary value
`1111` can be padded to 8-bits and output as `00001111`. Requirement (3) is
handy when you want to visualize binary or hex codes in groups of 4, 8, etc.
digits. Taking the previous binary value of `00001111`, maybe we want to group
the bits into nibbles `0000 1111` or into 2 digits codes `00 00 11 11`.
Requirement (4) seems a bit extra but it has its value. Often, I want to
visualize a large stream of hex values in binary. If I am not careful and just
copy the hex number into a tool, I might exceed the max integer limit for the
system and the program prints gobbledegook. This `dhb` tool should handle
numbers outside the range of a `uint64_t` without breaking a sweat.

Lets look at how `dhb` meets each of these requirements starting with that
bignum requirement.

## Big, Huge Numbers

If you're familiar with C++, you know the range of positive integers a program
can work with is finite. There's no standard "big number" library either. To get
around this limitation, I needed some third party help.

I Googled around for big number libraries and hit on a lot of dead ends and
unmaintained header-only implementations. Eventually, I came across a post
recommending the GNU MP Bignum Library (GMP)[^1]. To quote the GMP homepage:

> GMP is a free library for arbitrary precision arithmetic, operating on signed
> integers, rational numbers, and floating-point numbers. There is no practical
> limit to the precision except the ones implied by the available memory in the
> machine GMP runs on. GMP has a rich set of functions, and the functions have a
> regular interface.

Even better, there is a GMP C++ class based interface I could use. The docs
for how to use the C++ bindings[^2] were a good read and enough to get me
rolling with GMP.

In this next section, we'll get to see GMP in action.

## Conversions

The only info we need to perform a conversion is the number, that number's
current base, and a target base. The conversion API accomodates this spec using
one function and an enum:

```cpp
enum NumSystem : int {
    kDec = 10,
    kHex = 16,
    kBin = 2,
    kOct = 8,
};

std::string ConvertBase(const std::string& num, const NumSystem src, const NumSystem target) {
    const mpz_class kTargetBase(static_cast<int>(target));
    const std::string kDigits("0123456789ABCDEF");

    std::string converted_num;
    mpz_class num_mp(num, static_cast<int>(src));
    while (num_mp) {
        mpz_class idx = num_mp % kTargetBase;
        converted_num += kDigits[idx.get_si()];
        num_mp /= kTargetBase;
    }
    std::reverse(converted_num.begin(), converted_num.end());

    return converted_num;
}
```

The algorithm for conversion is the usual change of base[^3] method which uses
modulo and integer division to compute the digits of the output number
one-by-one. The `mpz_class` is a GMP C++ wrapper class used to construct and
manipulate big integral values. You can see `mpz_class` overloads the arithmetic
operators such that the code doesn't look much different than had we limited
ourselves to the built-in types.

One really neat feature of GMP employed above is the ability to construct an
`mpz_class` object from a number represented as a string and its base. That
feature made my life way easier because I didn't have to massage the input into
a format GMP understands. This constructor does throw `std::invalid_arg` if
given an unsupported base argument. I get around that by having the caller
specify bases using a `NumSystem` type which I know can be cast to one of the
bases the `mpz_class` constructor supports.

## Formatting Output

Looking back at our requirements, we have two formatting options to implement:
minimum character width and digit grouping.

The minimum character width function was trivial to implement using a
`stringstream` object in combination with stream modifiers:

```cpp
std::string SetWidth(const std::string& num, int width) {
    if (width <= 0) {
        return num;
    }

    std::stringstream ss(num);
    ss << std::setfill('0') << std::setw(width) << num;

    return ss.str();
}
```

Not much to be said here. The stream object will just slap zeroes onto the front
of the number until it meets the `width` argument.

Segmenting the output's digits into groups was a bit of a CS101 exercise:

```cpp
std::string GroupDigits(const std::string& num, int grouping) {
    if ((grouping <= 0) || (grouping >= static_cast<int>(num.size()))) {
        return num;
    }

    std::stack<char> digits;
    for (const char& c : num) {
        digits.push(c);
    }

    std::string group;
    std::vector<std::string> groups;
    while (!digits.empty()) {
        group += digits.top();
        digits.pop();

        if (static_cast<int>(group.size()) == grouping) {
            std::reverse(group.begin(), group.end());
            groups.push_back(group);
            group = "";
        }
    }

    if (!group.empty()) {
        std::reverse(group.begin(), group.end());
        groups.push_back(group);
    }

    std::reverse(groups.begin(), groups.end());
    return std::accumulate(groups.begin(), groups.end(), std::string(),
                           [](const std::string& a, const std::string& b) {
                               return a + (a.empty() ? "" : " ") + b;
                           });
}
```

I use a stack to process the digits in the number from right to left. The
algorithm pops characters off the stack into a `group` string. When that `group`
string hits the `grouping` limit, we save it off in the `groups` vector and
reset `group`. Rinse and repeat.

Since we process from right to left, there's a reversal that needs to happen for
each `group` string and for the entire `groups` vector, otherwise, the digits
would be backwards in the output.

C++ doesn't have a nice `join()` method like Python. Instead, we get to use the
beautiful `std::accumulate` API to concatenate each string in `groups` using a
single space as a seperator. The concatenated string is the output of the
function.

## Testing the Implementation

At this point, we have a working conversion utility! The rest of the
implementation focuses on command line argument parsing and input validation.
You can check out the full source linked at the end of this article if you're
interested in those bits.

Lets test drive this tool:

```bash
dhb hex dec 0xDEADBEEF --> 3735928559
dhb dec bin 3735928559 --> 11011110101011011011111011101111
dhb dec oct 3735928559 --> 33653337357
dhb -g 4 dec hex 3735928559 --> DEAD BEEF
dhb -g 4 -w 12 dec hex 3735928559 --> 0000 DEAD BEEF
```

So far so good. Lets use a massive number like `2^64 * 12345` (aka
`227725055589944414699520`). The tool should be able to handle that:

```bash
dhb --grouping 3 dec dec 227725055589944414699520 --> 227 725 055 589 944 414 699 520
dhb dec hex 227725055589944414699520 --> 30390000000000000000
dhb dec oct 227725055589944414699520 --> 60162000000000000000000000
dhb --grouping 8 hex bin --> 110000 00111001 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000
```

Nice, looks to be working with big integers too.

The project includes a more complete suite of tests that exercises all the
different conversion permutations[^4].

## Conclusion

The `dhb` utility has been serving me well for the past few days. The process of
implementing the tool was relatively straightforward. I credit the simplicity to
identifying early on the primary use cases and not tacking on too many bells and
whistles along the way.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [dhb][5].

[1]: https://gmplib.org
[2]: https://gmplib.org/manual/C_002b_002b-Class-Interface
[3]: https://cs.stackexchange.com/questions/10318/the-math-behind-converting-from-any-base-to-any-base-without-going-through-base
[4]: https://github.com/ivan-guerra/dhb/blob/master/tests/base_conversions/base_conversions_test.cc
[5]: https://github.com/ivan-guerra/dhb/tree/master

[^1]: [The GNU Multiple Precision Arithmetic Library][1]
[^2]: [GMP: C++ Class Interface][2]
[^3]: A clear and oddly philosophical explanation of how to convert a number
    from one base to another can be found on the [CS StackExchange][3].
[^4]: [`ConvertBase()` Unit Tests][4]
