---
title: "The Game of Life"
date: 2023-12-01T13:13:04-08:00
description: "Visualize Conway's Game of Life in your terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

While grinding through some old Advent of Code[^1] problems, I noticed a
particular style of problem crop up more than once. In the Reddit solution
threads, people kept referring to their solutions to these problems as
variations on Conway's Game of Life[^2] (GoL). I went to Wikipedia and read up
on GoL. The animations there really caught my eye. My AoC solutions along with
the Wiki page motivated me to create a terminal app that would allow me to
visualize my own GoL simulations.

## Rules of the Game

Step one was making sure I had the rules of the game down. The setup is pretty
simple. You have an MxN grid of "cells". Each cell is always in one of two
states: live or dead. The grid transitions through states in what are called
ticks. At each tick, the following rules are applied: 

1. Any live cell with fewer than two live neighbours dies, as if by
   underpopulation.
2. Any live cell with two or three live neighbours lives on to the next
   generation.
3. Any live cell with more than three live neighbours dies, as if by
   overpopulation.
4. Any dead cell with exactly three live neighbours becomes a live cell, as if
   by reproduction.

The initial state of the game board dictates everything. You could have an
initial configuration that never changes, oscillates between a few different
shapes, and even ones that produce new shapes infinitely.

## Implementation Plan

My goal was to visualize the GoL on my terminal screen. I'd use the entire
terminal window as my MxN board. Each 1x1 square would represent a cell. An
empty square is a dead cell a live square would be populated with some marker
character. The program would run a game loop at a configurable speed. At each
cycle, the GoL rules would be applied to the current game board. All of the
above is achievable using ncurses[^3] and vanilla C++.

The one piece that's missing is configuration. Specifically, how does one tell
the game what the initial state of the game board is? My solution was to have
the user pass the program a text file defining the initial state on startup. The
configuration file would be a list of 2D coordinates defining which cells on the
screen are live:

```text
(x1, y1)
(x2, y2)
...
(xN, yN)
```

## Core Game Logic

There's many different ways of implementing the GoL "tick" function. I went the
stupid simple route and decided to represent the game board as a 2D array of
booleans. Those cells marked `true` are considered live. At each tick, the rules
are applied *simultaneously* to all cells. The easiest way to simulate the
simultaneous update is to copy the game board, perform updates on the copy while
using the original board as reference, and then overwrite the original board
with the updated copy. Below is my implementation:

```cpp
void GameOfLifeBoard::Tick() noexcept {
  /* Given the relatively small size of the screen, we go the unsophisticated
   * route of making a copy of the game board before performing the state
   * transformation. */
  CellStateMatrix tmp = state_;

  int num_live_neighbors = 0;
  for (std::size_t i = 0; i < Rows(); ++i) {
    for (std::size_t j = 0; j < Cols(); ++j) {
      num_live_neighbors = CountLiveNeighbors(i, j);
      if (state_[i][j]) {
        if (num_live_neighbors < 2) {
          /* death by underpopulation */
          tmp[i][j] = false;
        } else if (num_live_neighbors > 3) {
          /* death by overpopulation */
          tmp[i][j] = false;
        }
      } else if (num_live_neighbors == 3) {
        /* life by reproduction */
        tmp[i][j] = true;
      }
    }
  }
  state_ = std::move(tmp);
}
```

If the game board, labeled `state_` in the code above, has \\(M\\) rows and
\\(N\\) columns, the algorithm above has a time complexity of
\\(\mathcal{O}(MN)\\). There's actually a constant of 2 hidden in that big-oh
due to the copy of `state_` to `tmp`. We don't copy but move the resources of
`tmp` to `state_` at the end, otherwise the constant would be 3! My analysis
above assumes that the `CountLiveNeighbors()` function has a time complexity of
\\(\mathcal{O}(1)\\). Luckily, it does. Checkout the implementation:

```cpp
int GameOfLifeBoard::CountLiveNeighbors(std::size_t row,
                                        std::size_t col) const noexcept {
  using Offset = std::pair<int, int>;

  /* These are the eight 2D offsets: left/right, up/down, and diagonals. */
  static const std::vector<Offset> kDirections = {
      {0, 1}, {1, 0}, {0, -1}, {-1, 0}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1},
  };

  const int kRowLimit = Rows();
  const int kColLimit = Cols();
  int neighbor_row = 0;
  int neighbor_col = 0;
  int num_live_neighbors = 0;
  for (const Offset& direction : kDirections) {
    neighbor_row = row + direction.first;
    neighbor_col = col + direction.second;
    if ((neighbor_row >= 0) && (neighbor_row < kRowLimit) &&
        (neighbor_col >= 0) && (neighbor_col < kColLimit) &&
        state_[neighbor_row][neighbor_col]) {
      num_live_neighbors++;
    }
  }
  return num_live_neighbors;
}
```

The algorithm takes as input a source `row` and `col`. It counts the number of
adjacent, live neighbors to `state_[row][col]`. Despite having a loop, the
number of iterations is always constant and equal to the size of `kDirections`.

The algorithm certainly isn't particularly space efficient with a space
complexity of \\(\mathcal{O}(MN)\\). This is due to the copy of `state_` to
`tmp_`.

Given the relatively small size of my game board, the algorithms above were
sufficient for computing the next state of the board without causing any
noticeable delays or egregious memory consumption on the host PC.

## Rendering the Board

Ncurses made rendering the game board a breeze. The `mvaddchar()` function did
all the heavy lifting of drawing characters at the appropriate X/Y locations. A
simple wrapper function that iterated over the game board calling `mvaddchar()`
to draw the live cells was sufficient.

There are use cases for playing the simulation slow and fast. I made the
simulation speed a command line option by adding a `--update-rate-ms` option to
allow for simulation speed up/slow down. 

The complete game loop is shown below:

```cpp
static void RunDrawLoop(const gol::graphics::ScreenDimension &dim,
                        int update_rate_ms, gol::game::GameOfLifeBoard &board) {
  while (!gol::graphics::Quit()) {
    gol::graphics::Clear();
    gol::graphics::DrawBoard(board);
    gol::graphics::DrawInstructions(dim);

    board.Tick();

    std::this_thread::sleep_for(std::chrono::milliseconds(update_rate_ms));
  }
}
```

## Conclusion

Below is a video showing `life` in action. The initial state that's given forms
what's called a Gosper Glider Gun.

{{< video src="/posts/the-game-of-life/gol-demo.mp4" type="video/mp4" preload="auto" >}}<br>

Implementing the Game of Life was a fun mini project. I kept it pretty simple
and barebones so there weren't too many hurdles when it came to implementing the
core game logic. The rendering was made dead simple by the perfect match between
my main game data structure, a 2D board, and ncurses' window model.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [game_of_life][4].

[1]: https://adventofcode.com/
[2]: https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life
[3]: https://en.wikipedia.org/wiki/Ncurses
[4]: https://github.com/ivan-guerra/game_of_life

[^1]: [Advent of Code][1]
[^2]: [Conway's Game of Life][2]
[^3]: [ncurses][3]
