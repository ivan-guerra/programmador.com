---
title: "A CLI Base Converter"
date: 2023-07-08T11:14:45-07:00
description: "A command line numerical base conversion utility."
tags: ["c++", "cli-tools", "gnu"]
---

When debugging an embedded system, it's common to work with raw data requiring
conversion between decimal, hexadecimal, binary, and sometimes octal number
systems. The Python REPL and `printf` shell utility do the job but are tedious
to use for the simple task of base conversion.

It would be nice to drop the overhead of format specifiers and fear of
numerical limits. To ease the pain, I decided to write a command line utility
that made conversion between positive binary, decimal, octal, and hexadecimal
numbers of arbitrary size.

## The Requirements

The use case is simple: take a positive integer in one base and convert it to
the equivalent value in another base. That's it. Support for negative values and
floating point values is out of scope.

The program usage would look something like

```bash
dhb [OPTION]... SRC_BASE TGT_BASE NUM
```

where `SRC_BASE`/`TGT_BASE` are one of `bin`, `dec`, `oct`, or `hex`. `NUM` is
some positive integer value.

Below are the requirements:

1. Support conversions to/from binary, decimal, hexadecimal, and octal.
2. Include an option for minimum output width.
3. Include an option to group digits into segments of size N.
4. Support arbitrarily large positive integers.

Requirement (1) is self explanatory. Requirement (2) means you can pad the
output value with zeroes to achieve a minimum width. For example, pad the binary
value `1111` to 8-bits leading to an output of `00001111`. Requirement (3) is
handy when you want to visualize binary or hex codes in groups of 4, 8, etc.
digits. Taking the previous binary value of `00001111`, maybe you want to group
the bits into nibbles `0000 1111` or into 2 digits codes `00 00 11 11`.
Requirement (4) seems a bit extra but it has its value. Visualizing a large
stream of hex values in binary is a common task. Exceeding the max integer limit
for the system/program is also a common occurrence. This `dhb` tool should
handle numbers outside the range of a `uint64_t` without breaking a sweat.

Lets look at how `dhb` meets each of these requirements starting with that
bignum requirement.

## Big, Huge Numbers

If you're familiar with C++, you know the range of positive integers a program
can work with is finite. There's no standard "big number" library either.

Google search revealed a number of big number libraries. Most of the libraries
are unmaintained, header-only libraries. The best option was the [GNU MP Library
(GMP)][1]. To quote the GMP homepage:

> GMP is a free library for arbitrary precision arithmetic, operating on signed
> integers, rational numbers, and floating-point numbers. There is no practical
> limit to the precision except the ones implied by the available memory in the
> machine GMP runs on. GMP has a rich set of functions, and the functions have a
> regular interface.

GMP has a convenient C++ class based interface. The docs for how to use the [C++
bindings][2] and for GNU MP in general are solid. GMP is a perfect fit for this
project.

## Conversions

The only info needed to perform a conversion is the number, that number's
current base, and a target base. The conversion API accommodates this spec using
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

The algorithm for conversion is the usual [change of base][3] method which uses
modulo and integer division to compute the digits of the output number
one-by-one. The `mpz_class` is a GMP C++ wrapper class used to construct and
manipulate big integral values. You can see `mpz_class` overloads the arithmetic
operators such that the code doesn't look much different than if one were to use
the C/C++ built-in types.

One neat feature of GMP is the ability to construct an `mpz_class` object from
a number represented as a string and its base. That feature makes
implementation easier because you don't have to massage the input into a format
GMP understands. The constructor does throw `std::invalid_arg` if given an
unsupported base argument. To avoid exceptions, the caller specifies the base
using a `NumSystem` type which limits the caller to the bases known to the
`mpz_class` constructor.

## Formatting Output

Looking back at the requirements, there's two formatting options to implement:
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

Not much to say here. The stream object will just slap zeroes onto the front of
the number until it meets the `width` argument.

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

A stack processes the digits in the number from right to left. The algorithm
pops characters off the stack into a `group` string. When that `group` string
hits the `grouping` limit, it's saved off in the `groups` vector and `group` is
reset. Rinse and repeat.

Processing happens from right to left meaning there's a reversal that needs to
happen for each `group` string and for the entire `groups` vector. Without this
reversal, the digits come out backwards in the output.

C++ doesn't have a nice `join()` method like Python. Instead, you get to use the
beautiful `std::accumulate` API to concatenate each string in `groups` using a
single space as a separator. The concatenated string is the output of the
function.

## Testing the Implementation

At this point, you have a working conversion utility! The rest of the
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

So far so good. Lets use a massive number like `2^64 * 12345` (AKA
`227725055589944414699520`). The tool should be able to handle that:

```bash
dhb --grouping 3 dec dec 227725055589944414699520 --> 227 725 055 589 944 414 699 520
dhb dec hex 227725055589944414699520 --> 30390000000000000000
dhb dec oct 227725055589944414699520 --> 60162000000000000000000000
dhb --grouping 8 hex bin --> 110000 00111001 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000
```

Nice, looks to be working with big integers too.

The project includes a more complete suite of tests that exercises all the
different conversion permutations.

## Conclusion

The `dhb` utility has been of great use. The process of implementing the tool
was relatively straightforward. I credit the simplicity to identifying early on
the primary use cases and not tacking on too many bells and whistles along the
way.

The complete project source with build instructions, usage, etc. is available on
GitHub under [dhb][4].

[1]: https://gmplib.org
[2]: https://gmplib.org/manual/C_002b_002b-Class-Interface
[3]: https://cs.stackexchange.com/questions/10318/the-math-behind-converting-from-any-base-to-any-base-without-going-through-base
[4]: https://github.com/ivan-guerra/dhb/tree/master
