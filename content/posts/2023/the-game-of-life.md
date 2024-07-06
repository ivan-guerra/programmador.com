---
title: "The Game of Life"
date: 2023-12-01T13:13:04-08:00
description: "Visualize Conway's Game of Life in your terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

If you grind old [Advent of Code][1] problems, you might notice a particular
style of problem crop up more than once. The people of Reddit refer to their
solutions as a variation of [Conway's Game of Life][2] (GoL). Wikipedia has a
great article on GoL. The animations are eye catching. The Wiki serves as
motivation for a terminal app that visualizes GoL simulations.

## Rules of the Game

What are the GoL rules? The setup is simple. You have an MxN grid of "cells."
Each cell is always in one of two states: live or dead. The grid transitions
through states on a frame tick. You apply the following rule at each tick.

1. Any live cell with fewer than two live neighbours dies, as if by
   under population.
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

The goal is to visualize the GoL on the terminal screen. You use the entire
terminal window as an MxN board. Each 1x1 square represents a cell. An empty
square is a dead cell. You mark a live square with a special character. The
program runs a game loop at a configurable speed. At each cycle, you apply the
GoL rules to the current game board. This process is achievable using
[ncurses][3] and vanilla C++.

The one piece that's missing is configuration. Specifically, how does one tell
the game what the initial state of the game board is? A solution is to have the
user pass the program a text file defining the initial state on startup. The
configuration file can be a list of 2D coordinates defining which cells on the
screen are live:

```text
(x1, y1)
(x2, y2)
...
(xN, yN)
```

## Core Game Logic

There's many different ways of implementing the GoL "tick" function. The stupid
simple route is to represent the game board as a 2D array of booleans. Those
cells marked `true` are live. At each tick, the rules execute _simultaneously_
across all cells. The easiest way to simulate the simultaneous update is to copy
the game board. You perform updates on the copy while using the original board
as reference, and then overwrite the original board with the updated copy. Below
is an implementation:

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

If the game board, labeled `state_`, has \\(M\\) rows and \\(N\\) columns, the
algorithm has a time complexity of \\(\mathcal{O}(MN)\\). There's actually a
constant of 2 hidden in that big-oh due to the copy of `state_` to `tmp`. You
don't copy but move the resources of `tmp` to `state_` at the end, otherwise the
constant would be 3! This analysis assumes that the `CountLiveNeighbors()`
function has a time complexity of \\(\mathcal{O}(1)\\). Luckily, it does.
Checkout the implementation:

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

The state update algorithm certainly isn't particularly space efficient with a
space complexity of \\(\mathcal{O}(MN)\\). This is due to the copy of `state_`
to `tmp_`.

Since the game board is small, this algorithm is sufficient for computing the
next state of the board without causing any noticeable delay. Program memory
usage is also kept at a reasonable level.

## Rendering the Board

Ncurses makes rendering the game board a breeze. The `mvaddchar()` function does
all the heavy lifting of drawing characters at the appropriate X/Y locations. A
simple wrapper function that iterates over the game board calling `mvaddchar()`
to draw the live cells is sufficient.

There are use cases for playing the simulation slow and fast. You adjust
simulation speed via a command line option. Add the `--update-rate-ms <RATE_MS>`
option to speed up/slow down the simulation.

Here's the complete game loop:

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
what's called a [Gosper Glider Gun][5].

{{< video src="/posts/2023/the-game-of-life/gol-demo.mp4" type="video/mp4" preload="auto" >}}

Implementing the Game of Life is a fun mini project. Keeping the data structures
simple makes it so there aren't too many hurdles when it comes to implementing
the core game logic. Rendering is dead simple considering the perfect match
between the main game data structure, a 2D board, and ncurses' window model.

The complete project source with build instructions, usage, etc. is available on
GitHub under [game_of_life][4].

[1]: https://adventofcode.com/
[2]: https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life
[3]: https://en.wikipedia.org/wiki/Ncurses
[4]: https://github.com/ivan-guerra/game_of_life
[5]: https://conwaylife.com/wiki/Gosper_glider_gun
