---
title: "Snake in the Terminal"
date: 2023-06-17T17:04:23-07:00
description: "An implementation of the classic snake game for the terminal."
tags: ["c++", "cli-tools", "ncurses", "games"]
---

Are you a text user interface enjoyer? Have you always wondered how difficult is
it to write an [ncurses][1] UI? What better way to find out than to write a
program of your own that explores ncurses' API. Of course, you have to keep it
interesting. Why not implement a scaled down version of a retro arcade game:
[snake][2].

## The Rules of Snake

Step one of this project is to look up what the rules for a game of snake are.
Specifically, what does the play "arena" look like, how do you win, and how do
you lose?

The play arena is simple: it's a 2D rectangle divvied up into 1x1 tiles. The
arena is static meaning once the game starts the dimensions of the play area
don't change. There are two objects in the arena at any given time: a target and
the snake. The target consumes a single tile and spawns randomly on any tile
except those occupied by the snake. The snake is one or more adjacent tiles with
no more than two tiles being adjacent to one another. Below is a target (red
diamond) and snake made up of 13 tiles.

![Snake Objects](/posts/2023/snake-in-the-terminal/snake-objects.webp#center)

To win the game, the snake must cover all tiles that make up the play arena.
Each time the snake's head intersects or "eats" a target, the snake grows in
length by a single tile. The player controls the snake and can only move it up,
down, left, or right. If the player manages to cover the whole arena in snake
tiles, they win.

There's two ways to lose:

1. The snake goes out of the play arena bounds.
2. The snake tries to eat itself.

Targets just keep spawning on open tiles until the snake gets itself in a losing
situation or wins by taking over all the tiles. That's it! That's all there is
to this game.

## Implementing the Game

The key goal here is to learn about the ncurses library not necessarily
implement the most theoretically space/time efficient version of snake. With
that in mind, you can take the stupid simple approach to implementing the game.

The core data structure is the `Tile` type:

```cpp
enum class Direction {
    kUp,
    kDown,
    kLeft,
    kRight,
    kNone,
};

struct Tile {
    int row = 0;
    int col = 0;
    Direction direction = Direction::kNone;

    friend bool operator==(const Tile& a, const Tile& b) {
        return ((a.row == b.row) && (a.col == b.col));
    }
};
```

The snake itself is a 1D vector of `Tile` objects. Similarly, a 1D vector of
`Tile` objects represents all the possible locations a target can spawn:

```cpp
using Snake = std::vector<Tile>;
using Targets = std::vector<Tile>;
Snake snake_;
Target targets_;
```

With these simple data structures, implementing the core logic of the game is
relatively straightforward. These next few sections will cover the core
algorithms and their implementations.

### Initialization

Initializing the game involves two key steps: generating all possible target
locations and spawning the snake. You can bundle both these steps into a single
`Reset()` function that resets the game to its initial state.

Generating all possible targets requires creating a `Tile` object for each 1x1
tile on the screen. The added twist is that the `targets_` vector must get
shuffled. The reasoning behind the shuffling is to make the selection of a
random target tile easier in the main game loop.

The snake itself initially consists of one `Tile` located in the center of the
screen with a random direction. One thing to be wary of is that you don't want
the initial target tile intersecting the snake. Hence the `while` loop that
updates the current target tile index if it overlaps with the snake's initial
spawn `Tile`:

```cpp
void SnakeGame::SpawnSnake() {
    /* create a random shuffle of the possible directions the snake can go */
    std::vector<Direction> directions = {Direction::kUp, Direction::kDown,
                                         Direction::kLeft, Direction::kRight};
    auto rd = std::random_device{};
    auto rng = std::default_random_engine{rd()};
    std::shuffle(directions.begin(), directions.end(), rng);

    /* spawn the snake head in the center of the screen with a random direction
     */
    snake_.push_back({.row = screen_dim_.height / 2,
                      .col = screen_dim_.width / 2,
                      .direction = directions[0]});
}

void SnakeGame::Reset() {
    game_over_ = false;
    score_ = 0;

    /* generate a randomly shuffled vector of potential target locations */
    targets_.clear();
    for (int i = border_; i < (screen_dim_.height - border_); ++i) {
        for (int j = border_; j < (screen_dim_.width - border_); ++j) {
            targets_.push_back(
                {.row = i, .col = j, .direction = Direction::kNone});
        }
    }
    auto rd = std::random_device{};
    auto rng = std::default_random_engine{rd()};
    std::shuffle(targets_.begin(), targets_.end(), rng);
    curr_target_ = 0;

    /* respawn the snake */
    snake_.clear();
    SpawnSnake();

    /* ensure the target does not overlap the snake head */
    while (targets_[curr_target_] == snake_.front()) {
        curr_target_ = (curr_target_ + 1) % static_cast<int>(targets_.size());
    }
}
```

### Moving the Snake

Moving the snake is tricky. The snake head `Tile` updates its `row` or `col`
depending on the value of its `direction` field. All other `Tile` objects assume
the position and values of the `Tile` that precedes it.

```cpp
void SnakeGame::MoveSnake(const Direction& new_direction) {
    /* shift all but the head tiles into their predecessor's position */
    Snake tmp = snake_;
    for (std::size_t i = 1; i < snake_.size(); ++i) {
        snake_[i] = tmp[i - 1];
    }

    /* walk the head forward in whatever direction it's facing */
    Tile& head = snake_.front();
    head.direction = new_direction;
    switch (snake_.front().direction) {
        case Direction::kUp:
            head.row--;
            break;
        case Direction::kDown:
            head.row++;
            break;
        case Direction::kLeft:
            head.col--;
            break;
        case Direction::kRight:
            head.col++;
            break;
        case Direction::kNone:
            break;
    }
}
```

You'll notice there's a copy of the entire `snake_` vector into a temporary
vector, `tmp`. There's tricks to avoid this overhead, but they're all overkill
considering how lightweight the game objects are. This pattern of going with the
less computationally efficient but more obvious implementation is one you'll see
repeating here.

### Snake Extension

Growing the snake is funky as well. You technically want to extend from the
tail. The question is, in which direction? One approach is to add a new tile
just one tile _opposite_ the current tail.

```cpp
void SnakeGame::ExtendSnake() {
    Tile new_snake_tile = snake_.back();

    /* the new tile's location is the current snake tail's location shifted
     * opposite the snake tail's direction */
    switch (new_snake_tile.direction) {
        case Direction::kUp:
            new_snake_tile.row++;
            break;
        case Direction::kDown:
            new_snake_tile.row--;
            break;
        case Direction::kLeft:
            new_snake_tile.col++;
            break;
        case Direction::kRight:
            new_snake_tile.col--;
            break;
        case Direction::kNone:
            break;
    }
    snake_.push_back(new_snake_tile);
}
```

### Winning

To win, the snake must cover every possible arena tile. Since the `targets_`
vector has every possible arena `Tile` contained within it, checking for a win
means checking whether the `snake_` vector equals the `targets_` vector.

```cpp
bool SnakeGame::SnakeWins() const {
    /* check whether the snake is occupying every possible target location */
    for (const Tile& target_tile : targets_) {
        bool found = false;
        for (const Tile& snake_tile : snake_) {
            if (snake_tile == target_tile) {
                found = true;
                break;
            }
        }
        if (!found) { /* looks like there's at least one open target location */
            return false;
        }
    }
    return true;
}
```

This good old \\(\mathcal{O}(N^2)\\) time complexity double nested loop does the
trick.

### Losing

Another \\(\mathcal{O}(N^2)\\) algorithm determines whether a player lost. In
this case, the majority of the time goes into checking whether the snake is
overlapping with itself.

```cpp
bool SnakeGame::IsGameOver() const {
    /* check if the snake overlaps itself at any tile */
    for (std::size_t i = 0; i < snake_.size(); ++i) {
        for (std::size_t j = i + 1; j < snake_.size(); ++j) {
            if (snake_[i] == snake_[j]) {
                return true;
            }
        }
    }

    /* verify the head snake tile is in bounds */
    bool is_in_row_bounds =
        (snake_.front().row >= border_) &&
        (snake_.front().row < (screen_dim_.height - border_));
    bool is_in_col_bounds =
        (snake_.front().col >= border_) &&
        (snake_.front().col < (screen_dim_.width - border_));

    return (!is_in_row_bounds || !is_in_col_bounds);
}
```

You might have noticed a `border_` value in the bounds checks. The game arena
can optionally include a border. With the border included, the snake can't make
contact with the border else the game is over. Hence why the `border_` variable
is part of the bounds check logic.

### The Game Tick

This version of snake operates using game ticks. On a single game tick the snake
will move and logic will execute to determine whether the player has won, lost,
ate a target, etc. The `Tick()` method only accepts a `Direction` value
indicating the direction the player commanded the snake to move.

```cpp
void SnakeGame::Tick(const Direction& new_direction) {
    MoveSnake(new_direction);

    if (IsGameOver()) { /* do nothing if the game has already ended */
        game_over_ = true;
        return;
    }

    /* looks like the snake ate its target */
    if (snake_[0] == targets_[curr_target_]) {
        score_ += kScoreIncrement;

        ExtendSnake();

        if (SnakeWins()) {
            game_over_ = true;
            return;
        }

        /* search for the next target tile that is not occupied by the snake */
        while (std::find(snake_.begin(), snake_.end(),
                         targets_[curr_target_]) != snake_.end()) {
            curr_target_ =
                (curr_target_ + 1) % static_cast<int>(targets_.size());
        }
    }
}
```

## User Interface Design with ncurses

With the game logic and state wrapped in a neat class, it's time to write the
UI. You need to see what API calls ncurses provides and examples of how folks
organize their ncurses programs. There's an aptly named site that does all those
things: [NCURSES Programming HOWTO][3]. The articles provides an API walk
through with clear examples you can test and mod. The site also has sections
explaining the use of related ncurses libraries for menus, forms, and more.

Ncurses provides a C API that like most C APIs is unforgiving when you get it
wrong. RTFM applies when using just about any function in this library. To keep
things manageable, split the game into three primary views: start screen, game
screen, game over screen.

### Start Screen

A simple game should have a simple start menu. An ASCII art title banner
followed by a menu from which the player selects one of three difficulty modes
seems fitting. Ncurses can certainly handle drawing banner and prompt text.
However, to implement the mode menu, you should use `menu` library. The `menu`
library extends ncurses and provides wrapper functions that simplify menu
creation.

Here's the code that displays the game start screen:

```cpp
GameMode PromptForGameMode() {
    clear();

    const std::vector<std::string> kTitleBanner = {
        " _____  _   _   ___   _   __ _____ ",
        "/  ___|| \\ | | / _ \\ | | / /|  ___|",
        "\\ `--. |  \\| |/ /_\\ \\| |/ / | |__  ",
        " `--. \\| . ` ||  _  ||    \\ |  __| ",
        "/\\__/ /| |\\  || | | || |\\  \\| |___ ",
        "\\____/ \\_| \\_/\\_| |_/\\_| \\_/\\____/ ",

    };

    /* display the title banner */
    int row = 0;
    int col = 0;
    getmaxyx(stdscr, row, col);
    (void)row; /* avoid warning regarding unused row variable */
    attron(A_BOLD);
    for (std::size_t i = 0; i < kTitleBanner.size(); ++i) {
        if (i & 1) {
            attron(COLOR_PAIR(Color::kRed));
        } else {
            attron(COLOR_PAIR(Color::kGreen));
        }

        mvprintw(static_cast<int>(i) + 1,
                 (col - static_cast<int>(kTitleBanner[i].size())) / 2, "%s\n",
                 kTitleBanner[i].c_str());

        if (i & 1) {
            attroff(COLOR_PAIR(Color::kRed));
        } else {
            attroff(COLOR_PAIR(Color::kGreen));
        }
    }
    attroff(A_BOLD);

    /* display the mode prompt */
    attron(COLOR_PAIR(Color::kCyan) | A_BOLD);
    std::string mode_prompt("Choose your difficulty:");
    mvprintw(static_cast<int>(kTitleBanner.size()) + 2,
             (col - static_cast<int>(mode_prompt.size())) / 2, "%s",
             mode_prompt.c_str());
    attroff(COLOR_PAIR(Color::kCyan) | A_BOLD);

    const std::vector<std::string> kModes = {
        "easy",
        "medium",
        "hard",
    };

    /* create menu items */
    std::vector<ITEM*> mode_items(kModes.size() + 1, nullptr);
    for (std::size_t i = 0; i < kModes.size(); ++i) {
        mode_items[i] = new_item(kModes[i].c_str(), "");
    }

    /* create the start menu */
    MENU* start_menu = new_menu(mode_items.data());
    menu_opts_off(start_menu, O_SHOWDESC);
    const int kNumMenuLines = 3;
    const int kNumMenuCols = 1;
    set_menu_format(start_menu, kNumMenuLines, kNumMenuCols);
    set_menu_mark(start_menu, "");

    /* create the window to be associated with the menu */
    const int kNumLines = 10;
    const int kNumCols = 50;
    const int kColOffset = 7;
    WINDOW* start_menu_win =
        newwin(kNumLines, kNumCols, static_cast<int>(kTitleBanner.size()) + 3,
               (col - kColOffset) / 2);
    keypad(start_menu_win, TRUE);

    /* set main window and sub window */
    const int kSubmenuNumLines = 3;
    const int kSubmenuNumCols = 20;
    const int kSubmenuRow = 0;
    const int kSubmenuCol = 0;
    set_menu_win(start_menu, start_menu_win);
    set_menu_sub(start_menu, derwin(start_menu_win, kSubmenuNumLines,
                                    kSubmenuNumCols, kSubmenuRow, kSubmenuCol));

    refresh(); /* display the title and mode prompt */

    /* post and display the menu */
    post_menu(start_menu);
    wrefresh(start_menu_win);

    /* allow the user to cycle through the menu until they make a selection with
     * the ENTER key */
    const int kAsciiEnter = 10;
    int c = 0;
    while ((c = wgetch(start_menu_win)) != kAsciiEnter) {
        switch (c) {
            case KEY_DOWN:
                menu_driver(start_menu, REQ_DOWN_ITEM);
                break;
            case KEY_UP:
                menu_driver(start_menu, REQ_UP_ITEM);
                break;
        }
        wrefresh(start_menu_win);
    }

    /* determine the game mode based on the user's menu selection */
    std::string mode(item_name(current_item(start_menu)));
    GameMode ret = GameMode::kEasy;
    if (kModes[0] == mode) {
        ret = GameMode::kEasy;
    } else if (kModes[1] == mode) {
        ret = GameMode::kMedium;
    } else {
        ret = GameMode::kHard;
    }

    /* free all resources */
    unpost_menu(start_menu);
    free_menu(start_menu);
    for (std::size_t i = 0; i < kModes.size(); ++i) {
        free_item(mode_items[i]);
    }
    return ret;
}
```

It's a bit of an abomination, but the steps should be obvious enough from the
comments. The `menu` API is a little cumbersome to use. The menu itself is a
window in ncurses terminology. The menu window embeds in `stdscr` (that is, the
top-level window). Getting the menu to position such that it doesn't hide banner
text in the parent window involves finagling row/col values.

Here's what the start screen looks like when rendered:

![Start Screen](/posts/2023/snake-in-the-terminal/snake.webp#center)

Nothing fancy. The up/down arrow keys navigate the mode menu. ENTER triggers
selection.

### Game Over Screen

After writing the start screen, the game over screen is a walk in the park. The
game over screen only needs to display a banner along with text showing the
player's score. An exit prompt assists with program exit.

```cpp
void DrawGameOverScreen(const snake::game::SnakeGame& game) {
    clear();

    snake::game::ScreenDimension dim = game.GetScreenDimension();

    /* display the game over banner */
    const std::vector<std::string> kGameOverBanner = {
        " _____   ___  ___  ___ _____ ",
        "|  __ \\ / _ \\ |  \\/  ||  ___|",
        "| |  \\// /_\\ \\| .  . || |__  ",
        "| | __ |  _  || |\\/| ||  __| ",
        "| |_\\ \\| | | || |  | || |___ ",
        " \\____/\\_| |_/\\_|  |_/\\____/ ",
        " _____  _   _  _____ ______  ",
        "|  _  || | | ||  ___|| ___ \\ ",
        "| | | || | | || |__  | |_/ / ",
        "| | | || | | ||  __| |    /  ",
        "\\ \\_/ /\\ \\_/ /| |___ | |\\ \\  ",
        " \\___/  \\___/ \\____/ \\_| \\_| ",
    };
    attron(A_BOLD);
    for (std::size_t i = 0; i < kGameOverBanner.size(); ++i) {
        if (i & 1) {
            attron(COLOR_PAIR(Color::kRed));
        } else {
            attron(COLOR_PAIR(Color::kGreen));
        }

        mvprintw(static_cast<int>(i),
                 (dim.width - static_cast<int>(kGameOverBanner[i].size())) / 2,
                 "%s\n", kGameOverBanner[i].c_str());

        if (i & 1) {
            attroff(COLOR_PAIR(Color::kRed));
        } else {
            attroff(COLOR_PAIR(Color::kGreen));
        }
    }
    attroff(A_BOLD);

    /* display the player's score */
    attron(COLOR_PAIR(Color::kCyan) | A_BOLD);
    const std::string kScoreBanner("SCORE");
    mvprintw(static_cast<int>(kGameOverBanner.size()) + 2,
             (dim.width - static_cast<int>(kScoreBanner.size())) / 2,
             "%s: %d\n", kScoreBanner.c_str(), game.GetScore());
    attroff(COLOR_PAIR(Color::kCyan) | A_BOLD);

    /* display the quit banner */
    const std::string kQuitBanner("press q to quit");
    mvprintw(dim.height - 1, 0, "%s", kQuitBanner.c_str());

    /* wait for the user to enter 'q' before quitting */
    int c = 0;
    while ((c = getch()) != 'q') {
    }
}
```

And the final result:

![Game Over Screen](/posts/2023/snake-in-the-terminal/game-over.webp#center)

### The Game Screen

Finally, you get to the most exciting of the three screens: the game screen. In
the game screen, you need to draw the snake, target, and the border around the
arena. You render the target as a single red diamond. The snake head is an angle
bracket whose pointy end tells the player the direction the snake is moving.
Character 'O' represents the snake's body.

```cpp
static void DrawTarget(const snake::game::SnakeGame& game) {
    snake::game::Tile target = game.GetTargetTile();

    attron(COLOR_PAIR(Color::kRed) | A_BOLD);
    mvaddch(target.row, target.col, ACS_DIAMOND);
    attroff(COLOR_PAIR(Color::kRed) | A_BOLD);
}

static void DrawSnake(const snake::game::SnakeGame& game) {
    snake::game::Snake snake = game.GetSnake();

    attron(COLOR_PAIR(Color::kGreen) | A_BOLD);
    const auto& head = snake.front();
    switch (head.direction) {
        case snake::game::Direction::kUp:
            mvaddch(head.row, head.col, '^');
            break;
        case snake::game::Direction::kDown:
            mvaddch(head.row, head.col, 'v');
            break;
        case snake::game::Direction::kLeft:
            mvaddch(head.row, head.col, '<');
            break;
        case snake::game::Direction::kRight:
            mvaddch(head.row, head.col, '>');
            break;
        case snake::game::Direction::kNone:
            mvaddch(head.row, head.col, '?');
            break;
    }

    for (std::size_t i = 1; i < snake.size(); ++i) {
        mvaddch(snake[i].row, snake[i].col, 'O');
    }
    attroff(COLOR_PAIR(Color::kGreen) | A_BOLD);
}

void DrawSnakeScreen(const snake::game::SnakeGame& game) {
    clear();

    if (game.GetBorder()) {
        box(stdscr, 0, 0);
    }
    DrawTarget(game);
    DrawSnake(game);

    refresh();
}
```

And the rendering:

![Game Screen](/posts/2023/snake-in-the-terminal/game-screen.webp#center)

## Putting It All Together

The glue that ties all the game logic and graphical elements is in the program
`main()`.

```cpp
int main() {
    /* configure the screen */
    snake::game::ScreenDimension screen_dim = snake::graphics::InitScreen();

    /* display the start menu and fetch the user's game mode selection */
    snake::graphics::GameMode mode = snake::graphics::PromptForGameMode();

    /* draw the initial game screen */
    snake::game::SnakeGame game(screen_dim);
    snake::graphics::DrawSnakeScreen(game);

    RunGameLoop(game, mode);

    /* show the game over screen with the score and exit */
    snake::graphics::DrawGameOverScreen(game);
    snake::graphics::TerminateScreen();

    return 0;
}
```

The program prompts the user to select their difficulty, runs a game loop which
terminates when the player wins or loses, and then renders the game over screen
before exiting.

Here's `RunGameLoop()`'s implementation:

```cpp
void RunGameLoop(snake::game::SnakeGame& game,
                 const snake::graphics::GameMode& mode) {
    /* adjust the input delay in order tick the game faster or slower */
    const int kEasyModeDelayMs = 150;
    const int kMedModeDelayMs = 100;
    const int kHardModeDelayMs = 75;
    switch (mode) {
        case snake::graphics::GameMode::kEasy:
            snake::graphics::EnableInputDelay(kEasyModeDelayMs);
            break;
        case snake::graphics::GameMode::kMedium:
            snake::graphics::EnableInputDelay(kMedModeDelayMs);
            break;
        case snake::graphics::GameMode::kHard:
            snake::graphics::EnableInputDelay(kHardModeDelayMs);
            break;
    }

    snake::game::Direction curr_direction = game.GetSnake().front().direction;
    while (!game.GameOver()) {
        snake::game::Direction new_direction = snake::graphics::ReadKeypad();

        /* update the direction only if the user provided one */
        if (new_direction != snake::game::Direction::kNone) {
            curr_direction = new_direction;
        }
        game.Tick(curr_direction);
        snake::graphics::DrawSnakeScreen(game);
    }
    snake::graphics::DisableInputDelay();
}
```

Adjust difficulty by altering the input delay. The longer the delay, the longer
the player has to provide an input before the next game tick executes. If the
player fails to provide an input, the snake will continue to move in the
direction it's currently facing.

## Conclusion

![Playing Snake](/posts/2023/snake-in-the-terminal/snake.gif#center)

Ncurses is a solid library. It's not the most straightforward API out there but
there are excellent resources with plenty of examples to get you going.
Implementing the snake game logic is a good exercise. That said, the most
satisfying part of this project is design of the various views and displays.
Watching a crudely animated snake move across the screen never loses its luster.

The complete project source with build instructions, usage, etc. is available on
GitHub under [snake][4].

[1]: https://en.wikipedia.org/wiki/Ncurses
[2]: https://en.wikipedia.org/wiki/Snake_(video_game_genre)
[3]: https://tldp.org/HOWTO/NCURSES-Programming-HOWTO/
[4]: https://github.com/ivan-guerra/snake
