---
title: "Chip8"
date: 2025-07-27T19:02:44-04:00
description: "Notes on Writing a Chip8 emulator."
tags: ["emulation", "rust"]
---

A classic weekend programming project is to write a Chip8 emulator. Chip8 refers
to an interpreter for a simple instruction set architecture (ISA) that saw use
in the 1970s COMSAC VIP microcomputer. You could program the VIP's CDP1802
processor by writing Chip8 instructions: hexadecimal opcodes that resemble
machine code but are more high-level.

This article will discuss a number of sticking points you might encounter when
implementing your own Chip8 emulator. Note, the issues discussed here are
language agnostic. At the end of the article, you'll find a link to a Rust
implementation of a Chip8 emulator that can serve as a more complete reference.

## The Many Forms of Chip8

To start, you'll want to get your hands on a Chip8 specification. The fun part
is that there are many different specifications since Chip8 has seen an
evolution over the years.

### COMSAC VIP Specification

[![BRIX](/posts/2025/chip8/brix.webp#center)][6]

The most common specification is the original one for the COMSAC VIP. The
original specification includes the following components (the listing below
comes directly from [Tobias' Chip8 Guide][1]):

- Memory: Chip8 has direct access to up to 4 kilobytes of RAM.
- Display: 64x32 monochrome pixel display.
- A program counter which points at the current instruction in memory.
- One 16-bit index register called “I” which points at locations in memory.
- A stack for 16-bit addresses. The stack plays a role in the implementation of
  subroutines/functions and returning from them.
- An 8-bit delay timer which decrements at a rate of 60 Hz until it reaches 0.
- An 8-bit sound timer which functions like the delay timer, but which also
  gives off a beeping sound as long as it’s not 0.
- Sixteen 8-bit general purpose variable registers numbered `0` through `F`
  called `V0` through `VF`.

The instruction set consists of 35 instructions:

| Instruction |                                                                                       Description                                                                                       |
| :---------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|   `0NNN`    |                                                                  Execute machine language subroutine at address `NNN`                                                                   |
|   `00E0`    |                                                                                    Clear the screen                                                                                     |
|   `00EE`    |                                                                                Return from a subroutine                                                                                 |
|   `1NNN`    |                                                                                  Jump to address `NNN`                                                                                  |
|   `2NNN`    |                                                                      Execute subroutine starting at address `NNN`                                                                       |
|   `3XNN`    |                                                        Skip the following instruction if the value of register `VX` equals `NN`                                                         |
|   `4XNN`    |                                                    Skip the following instruction if the value of register `VX` is not equal to `NN`                                                    |
|   `5XY0`    |                                           Skip the following instruction if the value of register `VX` is equal to the value of register `VY`                                           |
|   `6XNN`    |                                                                           Store number `NN` in register `VX`                                                                            |
|   `7XNN`    |                                                                           Add the value `NN` to register `VX`                                                                           |
|   `8XY0`    |                                                                    Store the value of register `VY` in register `VX`                                                                    |
|   `8XY1`    |                                                                                Set `VX` to `VX` OR `VY`                                                                                 |
|   `8XY2`    |                                                                                Set `VX` to `VX` AND `VY`                                                                                |
|   `8XY3`    |                                                                                Set `VX` to `VX` XOR `VY`                                                                                |
|   `8XY4`    |                           Add the value of register `VY` to register `VX`<br>Set `VF` to `01` if a carry occurs<br>Set `VF` to `00` if a carry does not occur                           |
|   `8XY5`    |                      Subtract the value of register `VY` from register `VX`<br>Set `VF` to `00` if a borrow occurs<br>Set `VF` to `01` if a borrow does not occur                       |
|   `8XY6`    |            Store the value of register `VY` shifted right one bit in register `VX`<br>Set register `VF` to the least significant bit prior to the shift<br>`VY` is unchanged            |
|   `8XY7`    |                         Set register `VX` to the value of `VY` minus `VX`<br>Set `VF` to `00` if a borrow occurs<br>Set `VF` to `01` if a borrow does not occur                         |
|   `8XYE`    |             Store the value of register `VY` shifted left one bit in register `VX`<br>Set register `VF` to the most significant bit prior to the shift<br>`VY` is unchanged             |
|   `9XY0`    |                                         Skip the following instruction if the value of register `VX` is not equal to the value of register `VY`                                         |
|   `ANNN`    |                                                                       Store memory address `NNN` in register `I`                                                                        |
|   `BNNN`    |                                                                               Jump to address `NNN + V0`                                                                                |
|   `CXNN`    |                                                                     Set `VX` to a random number with a mask of `NN`                                                                     |
|   `DXYN`    | Draw a sprite at position `VX`, `VY` with `N` bytes of sprite data starting at the address stored in `I`<br>Set `VF` to `01` if any set pixels are changed to unset, and `00` otherwise |
|   `EX9E`    |                                  Skip the following instruction if the key corresponding to the hex value currently stored in register `VX` is pressed                                  |
|   `EXA1`    |                                Skip the following instruction if the key corresponding to the hex value currently stored in register `VX` is not pressed                                |
|   `FX07`    |                                                               Store the current value of the delay timer in register `VX`                                                               |
|   `FX0A`    |                                                                Wait for a keypress and store the result in register `VX`                                                                |
|   `FX15`    |                                                                    Set the delay timer to the value of register `VX`                                                                    |
|   `FX18`    |                                                                    Set the sound timer to the value of register `VX`                                                                    |
|   `FX1E`    |                                                                  Add the value stored in register `VX` to register `I`                                                                  |
|   `FX29`    |                                     Set `I` to the memory address of the sprite data corresponding to the hexadecimal digit stored in register `VX`                                     |
|   `FX33`    |        Store the [binary-coded decimal](https://en.wikipedia.org/wiki/Binary-coded_decimal) equivalent of the value stored in register VX at addresses `I`, `I + 1`, and `I + 2`        |
|   `FX55`    |                           Store the values of registers `V0` to `VX` inclusive in memory starting at address `I`<br>`I` is set to `I + X + 1` after operation                           |
|   `FX65`    |                       Fill registers `V0` to `VX` inclusive with the values stored in memory starting at address `I`<br>`I` is set to `I + X + 1` after operation                       |

This article will focus on this version of the spec.

### SuperChip8

[![Sweetcopter](/posts/2025/chip8/sweetcopter.webp#center)][7]

SuperChip8 is a 1990s extension of the original Chip8 specification. The
extension focuses on improving graphic and display capabilities. Here's a
summary of the changes:

- **Higher Resolution**: SuperChip8 supports a 128x64 pixel display mode.
- **High Resolution Toggle**: New instructions `00FF` and `00FE` enable and
  disable the high-resolution graphics mode, respectively.
- **Scrolling**: SuperChip8 adds instructions for scrolling the display: `00CN`
  (scroll down), `00FB` (scroll right), and `00FC` (scroll left).
- **Larger Sprites**: The existing `DXYN` instruction in SuperChip8 draws 16x16
  sprites when `N` is 0.
- **Larger Fonts**: SuperChip8 includes a larger hexadecimal font, 8 pixels wide
  and 10 pixels tall, available via the `FX30` instruction.
- **Exit Instruction**: `00FD` lets a program exit the interpreter.
- **Flag Register Operations**: `FX75` and `FX85` instructions let you save and
  load values to and from user flag registers, providing a form of persistent
  storage.

### XO-Chip

[![XO-Chip Emulator](/posts/2025/chip8/xo-chip-emulator.webp#center)][8]

XO-Chip is a modern extension of the Chip8 specification developed by John
Earnest in 2014. Below is a excerpt from the ["official" chip-8 docs][2]):

XO-Chip supports audio and 64 kilobytes of memory, which is usable mainly for
graphics and audio (addressable only by `I`). It also has one extra buffer
(“plane”) of display memory, which works identical to the regular one. Planes
display on top of each other, and they can have different colors. You can draw
illuminated pixels in both planes in another color. Clear, draw and scroll
instructions will only affect the currently selected planes.

XO-Chip is mainly supported by John Earnest’s own Octo assembler, which supports
“macros” for comparison operators but which assembles down to regular Chip8
bytecode instead of dedicated instructions.

## Instructions

Most Chip8 instructions have a side effect. Instructions alter the state of the
registers, graphic display, timers, or memory. To ease instruction
implementation, make data structures representing each of these components. Give
these structures methods for read-only access and methods for mutating the
state. It makes the code easier to read and removes much of the repetition. See
[`state.rs`][3] for examples.

Probably the best tip (lifted directly from [Tobias' Guide][1]) for handling
Chip8 instructions is to decode the 16-bit value into a structure like
`DecodedInstruction` shown below:

```rust
/// Internal structure for holding parsed components of a CHIP-8 instruction.
///
/// This structure breaks down a 16-bit instruction word into its constituent
/// parts for easier access during instruction execution.
struct DecodedInstruction {
    /// First nibble. Represents the operation code.
    opcode: u8,
    /// Second nibble. Used to look up one of the 16 registers.
    x: usize,
    /// Third nibble. Used to look up one of the 16 registers.
    y: usize,
    /// Fourth nibble. A 4-bit number.
    n: u8,
    /// The second byte (third and fourth nibbles). An 8-bit immediate number.
    nn: u8,
    /// The second, third, and fourth nibbles. A 12-bit immediate address.
    nnn: Address,
}
```

When you process an instruction, you can first decode it into a
`DecodedInstruction` which gives easy access to the components of the
instruction. During execution, you can access the desired component without
performing bitwise operations to read the values.

The final and most crucial tip regarding instructions is to make sure to read
the specification two to three times! The extra 2-3 minutes spent reading the
spec will save you hours of debugging later.

## The Run Loop

Now the Chip8 emulator run loop is for the most part straightforward. The
emulator executes at 60 Hz. This means the display and timers update at a rate
of 60 times per second.

How many instructions run per second? Now that's the tricky part. The original
Chip8 processor ran at 1 MHz. That doesn't tell you much since the Chip8
instructions take a different number of cycles to run. Many Chip8 implementers
target an Instructions Per Second (IPS) rate of 700. This seems to work best for
most Chip8 games. Ideally, you want to make the IPS value configurable so that
the User can adjust it as needed.

Below is some pseudocode illustrating the run loop:

```pseudocode
FRAMES_PER_SEC = 60
IPS = 700
INSTRUCTIONS_PER_FRAME = IPS / FRAMES_PER_SEC

last_time = 0
loop:
    curr_time = get_current_time()

    if curr_time - last_time >= 1 / FRAMES_PER_SEC:
        for _ in range(INSTRUCTIONS_PER_FRAME):
            fetch_instruction()
            decode_instruction()
            execute_instruction()

        update_timers()
        render_display()

        last_time = curr_time
```

## Testing Your Emulator

If you're like most programmers, your emulator will have bugs. Luckily, there
are a number of test ROMs that you can run to verify your implementation.

[![Timendus Logo](/posts/2025/chip8/timendus-logo.webp#center)][4]

This is where [Timendus's Chip8 Test Suite][4] saves the day. Timendus provides
ROMs that test drawing, flag handling, quirks, and more. See the project's
README for instructions along with helpful screenshots illustrating what to
expect for each test.

## Conclusion

Writing a Chip8 emulator is an excellent introduction to emulation development.
The simplicity of the Chip8 instruction set makes it approachable for beginners,
while implementation quirks and timing considerations provide enough depth to
keep things interesting. Start with the original COSMAC VIP specification,
implement instructions methodically using the `DecodedInstruction` pattern, and
use test ROMs like Timendus's suite to verify your work. Once complete, you'll
have gained valuable experience in instruction decoding, memory management, and
graphics rendering that applies to more complex emulation projects.

The complete project source is available on GitHub under [chip8][5].

[1]: https://tobiasvl.github.io/blog/write-a-chip-8-emulator/#specifications
[2]: https://chip-8.github.io/extensions/#xo-chip
[3]: https://github.com/ivan-guerra/chip8/blob/master/src/state.rs
[4]: https://github.com/Timendus/chip8-test-suite?tab=readme-ov-file#chip-8-test-suite
[5]: https://github.com/ivan-guerra/chip8
[6]: https://github.com/shiver/chip8
[7]: https://johnearnest.github.io/chip8Archive/play.html?p=sweetcopter
[8]: https://www.reddit.com/r/EmuDev/comments/srs8q7/finished_my_chip8_schip_xochip_emulator_made_with/
