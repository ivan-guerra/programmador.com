---
title: "Ulam Spiral"
date: 2024-05-02T14:32:27-05:00
description: "Visualizing the Ulam spiral."
tags: ["c++", "cli-tools"]
---

The Ulam spiral is a graphical depiction of a set of prime numbers devised by
the mathematician [Stanislaw Ulam][1]. To quote the Wiki, it's constructed by
writing the positive integers in a square spiral and specially marking the prime
numbers. The outcome is a square with distinct diagonal, horizontal, and
vertical lines. This post will walk through the development of a Ulam spiral
visualization tool.

## Creating a Ulam Spiral

Take a look at the 4x4 Ulam spiral below:

```text
 0  0  0  7
11  2  0  0
 0  3  0  5
13  0  0  0
```

In this spiral, the composite numbers are output as zero and the prime numbers
are output as themselves. The spiral grows counter clockwise from the center.

How do you programmatically generate this spiral? [GeeksForGeeks][2] suggests
two methods: generation via simulation and generation via dividing the matrix
into cycles.

Below is a C++ implementation of the simulation approach:

```cpp
using RowVect = std::vector<int>;
using SquareLattice = std::vector<RowVect>;

std::optional<SquareLattice> GenerateUlamSpiral(int dim) {
  /* The implementation that follows is a slightly tweaked version of the
   * algorithm given here:
   * https://www.geeksforgeeks.org/print-a-given-matrix-in-spiral-form/# */

  if (dim <= 0) { /* invalid dimension */
    return std::nullopt;
  }

  const std::vector<Position> kDirections = {
      {.row = 0, .col = -1}, /* west */
      {.row = -1, .col = 0}, /* north */
      {.row = 0, .col = 1},  /* east  */
      {.row = 1, .col = 0},  /* south */
  };

  std::unordered_set<int> primes = SieveOfEratosthenes(dim * dim);
  SquareLattice spiral(dim, RowVect(dim, 0));
  Position pos = {.row = dim - 1, .col = dim - 1};
  int dir_index = 0;
  int value = dim * dim;
  std::unordered_set<Position, PositionHash> visited;
  for (int i = 0; i < dim * dim; ++i) {
    /* We always write a number. If value is prime, we write value, otherwise,
     * we write 0 as a placeholder. */
    if (primes.contains(value)) {
      spiral[pos.row][pos.col] = value;
    } else {
      spiral[pos.row][pos.col] = 0;
    }
    value--;

    visited.insert(pos);

    Position candidate = kDirections[dir_index] + pos;
    if (IsInBounds(candidate, dim) && !visited.count(candidate)) {
      pos = candidate;
    } else { /* A change in direction is required. */
      dir_index = (dir_index + 1) % kDirections.size();
      pos = kDirections[dir_index] + pos;
    }
  }
  return spiral;
}
```

Lets analyze this function starting with the function signature.
`GenerateUlamSpiral()` takes as its only parameter the dimension, `dim`, of the
Ulam spiral matrix. The function returns a `std::optional<SquareLattice>`. On
failure, `GenerateUlamSpiral()` will return `std::nullopt`. Failure in this case
corresponds to an invalid `dim` value.

The function makes use of the `Position` type which is nothing more than a 2D
coordinate:

```cpp
struct Position {
  int32_t row = 0;
  int32_t col = 0;
};
```

The simulation starts at the bottom right of the matrix as shown in the
initialization of `pos`:

```cpp
Position pos = {.row = dim - 1, .col = dim - 1};
```

The main loop iterates `dim * dim` times. Each iteration, you inspect `value`.
If `value` is prime, `value` gets written to the current matrix position `pos`,
otherwise, 0 is output. You will see the implementation of the
`SieveOfEratosthenes()` function in the next section. For now, just know that
`SieveOfEratosthenes()` provides the complete set of prime numbers less than
`dim * dim`.

The trickiest part is simulating the clockwise spiral motion from the bottom
right edge of the square in towards the center. To do so, you first create
directional increments:

```cpp
const std::vector<Position> kDirections = {
  {.row = 0, .col = -1}, /* west */
  {.row = -1, .col = 0}, /* north */
  {.row = 0, .col = 1},  /* east  */
  {.row = 1, .col = 0},  /* south */
};
```

Moving `pos` in any one of the cardinal directions is as simple as adding
`kDirections[i]` to `pos`.

When do you change direction? **You change direction when the updated `pos`
value, `candidate`, is either out of matrix bounds or intersects a previously
visited position.** Below is the relevant code snippet:

```cpp
Position candidate = kDirections[dir_index] + pos;
if (IsInBounds(candidate, dim) && !visited.count(candidate)) {
  pos = candidate;
} else { /* A change in direction is required. */
  dir_index = (dir_index + 1) % kDirections.size();
  pos = kDirections[dir_index] + pos;
}
```

What's the time complexity of `GenerateUlamSpiral()`? You iterate
\\(\mathcal{O}(N^2)\\) times where \\(N\\) is the `dim` value passed to
`GenerateUlamSpiral()`. The time complexity of each iteration is equivalent to
the time complexity of a `std::unordered_set` lookup which on average is
\\(\mathcal{O}(1)\\) plus a number of other constant time operations. Putting it
all together the overall time complexity of `GenerateUlamSpiral()` is
approximately \\(\mathcal{O}(N^2)\\).

`GenerateUlamSpiral()`'s space complexity is \\(\mathcal{O}(N^2)\\). Storing
each `Position` in the `visited` set requires \\(\mathcal{O}(N^2)\\) additional
space.

## Checking Primality

According to [Wikipedia][3], a prime number (or a prime) is a natural number
greater than 1 that's not a product of two smaller natural numbers. You can test
for primality in polynomial time.

The naive, linear time approach is to iterate from \\(2\\) to \\((N - 1)\\) and
check if any number in this range divides \\(N\\). If the number divides
\\(N\\), then it's not a prime number:

```cpp
bool IsPrime(int n) {
  if (n <= 1) {
    return false;
  }

  for (int i = 2; i < n; ++i) {
    if (0 == (n % i)) {
      return false;
    }
  }
  return true;
}
```

There is a more efficient \\(\mathcal{O}(\sqrt{N})\\) method. Below is the
algorithm description from [GeeksForGeeks][4]:

> Iterate through all numbers from 2 to ssquare root of n and for every number
> check if it divides n (because if a number is expressed as n = xy and any of
> the x or y is greater than the root of n, the other must be less than the root
> value). If we find any number that divides, we return false.

```cpp
bool IsPrime(int n) {
  if (n <= 1) {
    return false;
  }

  for (int i = 2; i <= std::sqrt(n); i++) {
    if (n % i == 0) {
      return false;
    }
  }
  return true;
}
```

Given the upper limit of the numbers in the Ulam spiral is \\(N^2\\), you can
use a third approach to reduce the overall time complexity of
`GenerateUlamSpiral()`. A modified [Sieve of Eratosthenes][5] generates the set
of prime numbers less than \\(N\\) in \\(\mathcal{O}(N)\\) time and
\\(\mathcal{O}(N)\\) space:

```cpp
[[nodiscard]] static std::unordered_set<int> SieveOfEratosthenes(int n) {
  std::unordered_set<int> primes;
  for (int i = 2; i < n + 1; ++i) {
    primes.insert(i);
  }

  for (int p = 2; p * p <= n; p++) {
    if (primes.contains(p)) {
      for (int i = p * p; i <= n; i += p) {
        primes.erase(i);
      }
    }
  }
  return primes;
}
```

With the square root approach, you would pay a \\(\mathcal{O}(\sqrt{N})\\) cost
on each primality check on the \\(N^2\\) elements in the Ulam Spiral. This means
`GenerateUlamSpiral()` would have a time complexity of \\(\mathcal{O}(\sqrt{N} \*
N^2) = \mathcal{O}(N^{2.5})\\)! Using the sieve approach reduces the time
complexity to \\(\mathcal{O}(N^2)\\). Why? The primality check in the main loop
gets reduced to an \\(O(1)\\) time lookup into a precomputed set of prime
numbers. The space complexity remains linear though the constant hidden by the
big O notation does grow.

Is the theoretical speed up worth the increased space and code complexity? In
the case of this Ulam spiral visualization tool, yes. The graph below compares
the runtime of `GenerateUlamSpiral()` using the Sieve of Eratosthenes versus the
Square Root method for primality testing. The graph shows dimensions in the
range \\([0, 4096]\\). The plotted dimension values are at increments of
\\(256\\). The y-axis shows `GenerateUlamSpiral()`'s runtime. To minimize the
effect of system delays on runtime measurements, the graph shows the average of
\\(10\\) samples at each dimension value.

![Sieve of Eratosthenes vs Square Root
Method](/posts/2024/ulam-spiral/sieve-vs-sqrt.webp#center)

As the dimension value increases, you can see the two lines start to diverge.
That \\(0.5\\) difference in the exponent has a significant effect on runtime
even with small values of \\(N\\)!

## Visualization

There's a couple of different approaches you could take to visualizing the
spiral. Generating a square, grayscale image is one of the simplest strategies.
Each pixel in the image represents a cell in the Ulam Spiral matrix. You can
color composite numbers' pixels white and prime numbers' pixels black. The
output is an image with the expected diagonal, vertical, and horizontal lines
characteristic of the Ulam Spiral.

The [Boost Generic Image Library][6] provides all the tools you need to write a
Ulam Spiral to a grayscale PNG:

```cpp
void WriteLatticeToPng(const std::string& filename,
                       const ulam::SquareLattice& ulam_mat) {
  boost::gil::gray8_image_t img(ulam_mat.size(), ulam_mat.size());

  auto output_view = boost::gil::view(img);
  for (int row = 0; row < output_view.height(); ++row) {
    for (int col = 0; col < output_view.width(); ++col) {
      /* Prime numbers are output as black pixels whereas composite numbers are
       * output as white pixels. */
      if (ulam_mat[row][col]) {
        output_view(col, row) = boost::gil::gray8_pixel_t(0);
      } else {
        output_view(col, row) = boost::gil::gray8_pixel_t(255);
      }
    }
  }

  boost::gil::write_view(filename, boost::gil::const_view(img),
                         boost::gil::png_tag{});
}
```

Below is 1024x1024 Ulam spiral grayscale image:

![Ulam Spiral 1024](/posts/2024/ulam-spiral/uspiral-1024.webp#center)

[Wikipedia][7] has a digestible explanation of the meaning behind the lines you
see in the image.

## Conclusion

Visualizing a Ulam spiral presents a number of challenges. Programmatically
creating a square spiral through simulation is a nontrivial task. Similarly,
deciding how to best test primality among the myriad of algorithms out there
requires thought. Visualization is the least of your worries when libraries such
as Boost's GIL make writing images pixel-by-pixel a breeze. The end result is
satisfying though. The lines in the Ulam spiral image are striking.

The complete project source with build instructions, usage, etc. is available on
GitHub under [ulam_spiral][8].

[1]: https://en.wikipedia.org/wiki/Ulam_spiral#
[2]: https://www.geeksforgeeks.org/print-a-given-matrix-in-spiral-form/
[3]: https://en.wikipedia.org/wiki/Prime_number
[4]: https://www.geeksforgeeks.org/prime-numbers/
[5]: https://www.geeksforgeeks.org/sieve-eratosthenes-0n-time-complexity/?ref=lbp
[6]: https://www.boost.org/doc/libs/1_76_0/libs/gil/doc/html/index.html
[7]: https://en.wikipedia.org/wiki/Ulam_spiral#Explanation
[8]: https://github.com/ivan-guerra/ulam_spiral
