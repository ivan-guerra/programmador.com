---
title: "Code - The Hidden Language of Computer Hardware and Software"
date: 2025-05-15T16:13:15-04:00
description: 'Notes on Charles Petzgold''s "Code" second edition.'
categories: ["notes"]
---

This is the sixth [installment][1] in a series of posts where I share notes
taken while reading an interesting book or article.

This post includes the notes made while reading the book ["Code - The Hidden
Language of Computer Hardware and Software 2nd Edition"][2] by Charles Petzgold.

## Chapter 2: Codes and Combinations

- Morse Code is a binary language. International Morse Code encodes up to 8 bits
  of information where each bit is either a dot or a dash.
- Dots and dashes are the written representation of Morse Code. The dot is a
  short signal, while the dash is a long signal. The length of the dash is three
  times that of the dot.
- As with all binary codes, each time you add a bit, you double the number of
  possible combinations.

## Chapter 3: Braille and Binary Codes

- Braille is a type of binary code where 6 bits represent a character. The 6
  bits arrange in a 3x2 grid, where each dot can be either raised or not raised.
  The 6 bits can represent 64 different characters.
- Though there are only 64 characters, Braille characters can have additional
  meanings based on their context.
- The number indicator marks the beginning of a sequence of numbers. The letter
  indicator terminates the number sequence. This is an example of a _shift code_.
- In Braille, the capital indicator capitalizes the letter that follows. The
  capital indicator is an example of an _escape code_. Escape codes change the
  meaning of the code that immediately follows.

## Chapter 4: Anatomy of a Flashlight

- You can characterize electricity as the flow of electrons.
- In the flashlight example, the battery is the source of electricity. The
  flashlight bulb is the load. The switch is a control device that opens and
  closes the circuit.
- Batteries produce a chemical reaction that creates a flow of electrons.
  Chemical energy converts to electrical energy. Spare electrons appear on the
  anode side of the battery. The cathode side of the battery has a deficiency of
  electrons. Electrons would like to flow from the anode to the cathode.
- An electrical circuit provides a path for the flow of electrons from the anode
  to the cathode.
- Substances composed of atoms that bias towards shedding electrons are
  conductors. Copper, silver, and gold are good conductors.
- The opposite of conductance is resistance. Substances with high resistance are
  called insulators. Rubber, glass, and plastic are good insulators.
- Current (\\(I\\)) is the flow of electrons through a circuit.
- Voltage (\\(V\\)) is the difference in electric potential between two points
  in a circuit.
- Voltage is directly proportional to the amount of current flowing through a
  circuit. Current is inversely proportional to resistance. Also known as Ohm's
  Law: \\(V = IR\\).
- Power in Watts is the product of voltage and current: \\(P = IV\\).

## Chapter 5: Communicating Around Corners

- You can make a primitive telegraph by connecting two batteries, four wires,
  and two light bulbs.
- You can remove a wire from the circuit by using a common ground. Ground in
  this case means a connection to the Earth.
- The Earth acts a source of electrons. The electrons flow from the Earth,
  through the circuit, and into the positive terminal of the battery.
- American Wire Gauge (AWG) is a measure of wire thickness. The lower the
  number, the thicker the wire. The thicker the wire, the less resistance it has.
- When covering great distances, you need to use thicker wire or a higher
  voltage power supply.

## Chapter 6: Logic with Switches

- George Boole invented Boolean algebra. Boolean algebra is a system of logic.
- You can describe boolean algebra in terms of sets. The usual set operators
  such as union, intersection, and complement apply as do the concepts of the
  universe and NULL set.
- Two switches wired in series are equivalent to an `AND` gate.
- Two switches wired in parallel are equivalent to an `OR` gate.
- You can configure switches and wires to form complex boolean expressions. A
  primitive form of a computer.

## Chapter 7: Telegraphs and Relays

- The invention of the telegraph marks the beginning of modern communication.
  For the first time, people could communicate over long distances almost
  instantaneously.
- The telegraph key is a switch that opens and closes the circuit to send
  messages. The telegraph operator taps the key to send dots and dashes.
- The telegraph sounder is a device that converts the electrical signals from
  the telegraph key into audible sounds.
- One major impediment to the telegraph was the length of the wires needed to
  connect the telegraph stations. The longer the wire, the more resistance it has,
  and the weaker the signal.
- The invention of the relay solved the problem of long-distance telegraphy. A
  relay is an electrically operated switch that can amplify the signal.
- A relay consists of an electromagnet, a set of contacts, and a spring. When
  the electromagnet gets energized, it attracts the armature, which closes the
  contacts and completes the circuit.

## Chapter 8: Relays and Gates

- Reduced to its essentials, a computer is a synthesis of Boolean algebra and
  electricity.
- The crucial components of a computer are the logic gates. Logic gates are
  electronic circuits that perform boolean operations.
- Like switches, you can connect relays in series or parallel as logic gates.
  You can combine logic gates to form more complex circuits.
- The switches control the input to the relays, and the relays control the
  output. The output of one relay can be the input to another relay.
- A normally open relay is a relay that's open when the electromagnet isn't
  energized. A normally closed relay is a relay that's closed when the
  electromagnet isn't energized.
- An inverter is a logic gate that reverses the input signal. In terms of
  relays, an inverter is a normally closed relay that opens when the electromagnet
  gets energized.
- There are six basic logic gates: AND, OR, NOT, NAND, NOR, and XOR.
- Additionally, you have buffers. A buffer is a logic gate that passes the input
  signal to the output without changing it. In real life circuits, sometimes
  output must serve as many inputs. That's called **fanout**, and it can result in
  a lessening of the power available to each input. Buffers can help boost that
  power acting as a relay. You can also use buffers to delay a signal.
- From a NAND or NOR gate, you can create all other logic gates.
- The following are Demorgan's Laws:
  - \\(\lnot A \land \lnot B = \lnot(A \lor B)\\)
  - \\(\lnot A \lor \lnot B = \lnot(A \land B)\\)
- Demorgan's Laws are useful for simplifying boolean expressions.

## Chapter 9: Our Ten Digits

- There are many possible number systems.
- Roman numerals were common before the introduction of the Hindu-Arabic
  numeral system. Key features that differentiate the Hindu-Arabic numeral
  system include:
  - The use of a zero to represent the absence of a value.
  - The positional notation, where the value of a digit depends on its position
    in the number.

## Chapter 10: Alternative 10s

- By convention, humans work in a base 10 number system, also known as decimal.
- There are many other number systems, such as binary (base 2), octal (base 8),
  and hexadecimal (base 16).
- The formula for converting from any base to decimal is:
  \\(d = \sum\_{i=0}^{n} d_i \cdot b^i\\)
  where \\(d\\) is the decimal value, \\(d_i\\) is the digit in base \\(b\\),
  and \\(n\\) is the position of the digit.
- Binary numbers unite arithmetic and electricity. Switches, wires, and light
  bulbs can all represent the binary digits 0 and 1, and with the addition of
  logic gates, you can manipulate these numbers.

## Chapter 11: Bit by Bit by Bit

- The binary number system is the simplest number system possible.
- The bit, a binary digit, is the fundamental unit of information in computing.
- The meaning of a particular bit or collection of bits is always understood
  contextually.
- You can visualize binary codes in many ways. The example given is the
  Universal Product Code (UPC) barcode. The UPC barcode is a binary code that
  encodes information about a product. A slice of the barcode has black lines
  representing 1 and gaps representing 0. The thickness of the lines or gaps
  dictate the number of bits represented (up to 4 bits per line). In total, the
  UPC barcode encodes 95 bits of data.
- The UPC barcode also includes some error checking. The last digit is a
  checksum that verifies the integrity of the data. Each barcode includes a
  beginning, middle, and end guard pattern to help scanners identify faulty codes.
- Quick Response (QR) codes are another example of a binary code. QR codes can
  encode more information than UPC barcodes, including URLs and text. QR codes
  consist of black squares arranged on a white grid. The black squares represent
  1s, and the white squares represent 0s. Most of the bits in a QR code are for
  error correction.

## Chapter 12: Bytes and Hexadecimal

- Computers often group bits into a quantity called a word with the most common
  word size being 8 bits, also known as a byte.
- Modern computers typically use 32-bit or 64-bit words.
- The hexadecimal number system is a base 16 number system that uses the digits
  0-9 and the letters A-F to represent values.
- You can group the digits in a binary number into sets of four to form a
  hexadecimal digit.

## Chapter 13: From ASCII to Unicode

- Morse code is a variable bit-length code, meaning that different characters
  can have different numbers of bits. For example, the letter 'E' is a single dot
  (1 bit), while 'Q' is a dash followed by two dots (3 bits).
- Braille is a fixed-length code, meaning that each character has the same
  number of bits (6 bits).
- ASCII (American Standard Code for Information Interchange) is a character
  encoding standard that uses 7 bits to represent characters. ASCII can represent
  128 different characters, including letters, digits, and control characters.
- ASCII includes 32 control characters that are not printable, such as the
  newline character and the tab character.
- ASCII is also known as plain text. ASCII data does not include any formatting
  information, such as font size or color.
- Extended ASCII is an 8-bit character encoding that includes additional
  characters beyond the standard ASCII set. Extended ASCII can represent 256
  different characters.
- Extended ASCII can't represent characters from all different languages and
  scripts.
- Unicode is a character encoding standard that can represent characters from
  many different languages and scripts. Unicode started as a 16-bit encoding.
- Unicode documents start with a Byte Order Mark to indicate endianness.
- Unicode has more recently extended to 21 bits, allowing it to represent over a
  million different characters.
- Unicode transformation formats (UTF) encode Unicode characters in a way that's
  compatible with existing systems. The most common UTFs are UTF-8, UTF-16, and
  UTF-32.
- UTF-8 is the most widely used Unicode encoding. It uses 1 to 4 bytes to
  represent characters, depending on the character's code point. How bytes are
  interpreted is complex enough that you should look this up for more details.

## Chapter 14: Adding with Logic Gates

- The summation of two bits produces a sum bit and a carry bit.
- You create an XOR gate by passing the two inputs through both a OR gate and a
  NAND gate, and then passing the outputs through a AND gate:
- An XOR gate takes two input bits and produces a sum bit.
- An AND gate takes two input bits and produces a carry bit.
- You can combine XOR and AND gates to create a half adder, which adds two bits
  and produces a sum bit and a carry bit.
- A full adder is a circuit that adds three bits: two input bits and a carry bit
  from a previous addition. A full adder produces a sum bit and a carry bit. You
  can combine two half adders and an OR gate to create a full adder (see page
  177).
- You can combine two 8 bit full adders to create a 16 bit adder (see page 182).
  You can combine multiple 16 bit adders to create larger adders.

## Chapter 15: Is This For Real

- Relays and vacuum tubes were the first electronic components used in
  computers.
- You can build logic gates from vacuum tubes just like you can with relays.
- Relays suffer slow switching speeds and are susceptible to mechanical wear.
- Vacuum tubes are faster than relays but are larger, consume more power,
  generate more heat, and wear more often.
- The transition from relay technology to vacuum tube technology marked the
  transition from electromechanical computers to electronic computers.
- Von Neumann architecture is a design for a computer that uses a single memory
  space for both data and instructions. This architecture is the basis for most
  modern computers.
- You can control a semiconductors' conductance by applying a voltage. This
  property makes them ideal for building logic gates and other electronic
  components.
- Semiconductor doping is the process of adding impurities to a semiconductor to
  change its electrical properties. The most common dopants are phosphorus and
  boron forming n-type and p-type semiconductors.
- You can make amplifiers out of semiconductors by sandwiching a p-type
  semiconductor between two n-type semiconductors. This is the basis for a NPN
  transistor, and the three pieces form the collector, base, and emitter.
- A small voltage on the base controls the flow of current between the collector
  and emitter.
- The transistor introduces solid-state electronics, which means transistors are
  built from solids, specifically semiconductors and most commonly silicon.
- Transistors require much less power, generate much less heat, and last longer
  than vacuum tubes.
- The invention of the integrated circuit (IC) allowed for the miniaturization
  of electronic components. An IC is a small chip that contains many transistors
  and other electronic components.
- The first ICs were usually packaged in dual in-line packages (DIPs).
- There are two families of ICs: transistor-transistor logic (TTL) and
  complementary metal-oxide-semiconductor (CMOS).
- TTL chips are faster but consume more power than CMOS chips. CMOS chips are
  slower but consume less power and are more tolerant to variations in voltages.
- One important fact to know about a particular integrated circuit is the
  propagation time, the time it takes for a change in the inputs to reflect in the
  output.
- You measure propagation time in nanoseconds.
- The timeline to keep in mind from this chapter is that logic gate components
  trended from relays, to vacuum tubes, to transistors, and then to integrated
  circuits.

## Chapter 16: But What About Subtraction

- This chapter introduces two's complement, a method for representing signed
  integers in binary.
- Two's complement makes for easy addition and subtraction of signed integers
  using the same binary addition circuits previously discussed.
- To convert a positive integer to two's complement, you simply represent it in
  binary. To convert a negative integer to two's complement, you invert the bits
  of its positive representation and add 1.
- Since binary numbers have a fixed number of bits, you can only represent
  integers within a certain range. For example, with 8 bits, you can represent
  signed integers from -128 to 127 or unsigned integers from 0 to 255.
- There's opportunity for overflow when adding or subtracting signed integers.
  The circuit on page 210 shows how to detect overflow in a two's complement
  addition circuit.

## Chapter 17: Feedback and Flip-Flops

- You can create an oscillator by connecting the output of an inverter to its
  input. The inverter will toggle its output between 0 and 1, creating a square
  wave.
- The period of an oscillator is the time it takes for the output to complete
  one cycle. The frequency is the number of cycles per second.
- The frequency of an oscillator is inversely proportional to its period.
  Usually, you measure frequency in Hertz.
- See page 221 for an illustration of a reset-set flip-flop.
- The next flip-flop type is the level triggered D-type flip-flop. The D stands
  for data. The D flip-flop captures the value of the data input when the clock
  signal is high and holds that value until the next clock cycle.
- A edge triggered D-type flip-flop captures the value of the data input on the
  rising or falling edge of the clock signal.
- You can make an edge triggered D-type flip-flop by combining two level
  triggered flip-flops (see page 229).
- If you combine an oscillator with a edge triggered D-type flip-flop, you can
  create a frequency divider. The output frequency is half the input frequency.
  See page 235 for an illustration of a frequency divider.
- Chained frequency dividers create a binary counter called a ripple counter.
- To find the frequency of the oscillator, you can let the ripple counter run
  for a certain number of cycles and then divide the number of cycles by the time
  it took to run them.
- You can augment a flip-flop with a clear and preset input. You never set both
  clear and preset at the same time.
- Having a clear input avoids the issue of the flip-flop being in an
  indeterminate state when powered on.
- With the preset input, you can set the flip-flop to a known state without
  waiting for the clock signal.

## Chapter 18: Let's Build a Clock

- Binary Coded Decimal (BCD) is a way of representing decimal numbers in binary.
  BCD uses 4 bits to represent each decimal digit, allowing you to represent
  decimal numbers from 0 to 9.
- It's best to read the book to get an idea of how to build the clock. At a high
  level, you use a ripple counter to count each digit in the seconds, minutes, and
  hours. The output of the high digit's counter is the input to the next counter.
  Additional circuitry makes it possible to display the hours in 12-hour format.
- Electrical current can only flow in one direction through a diode.
- A Light Emitting Diode (LED) is a diode that emits light when current flows
  through it.
- A diode matrix is a grid of diodes that displays characters or numbers. The
  diodes are in rows and columns, and you can turn on specific diodes to create a
  pattern.
- Diode matrices are technically a form of Read Only Memory (ROM).

## Chapter 19: An Assemblage of Memory

- You can use level triggered D-type flip-flops to create a primitive form of
  memory.
- Combining say 8 flip-flops with a 3-to-8 decoder creates a memory cell that
  can store 8 bits of data. Add a 8-to-1 selector to the circuit and you're able
  to read the data from the memory cell. See page 273 for an illustration.
- This is a form of read/write memory. Since you can address any of the 8 bits
  at will, this is also known as Random Access Memory (RAM).
- A tri-state buffer can have one of three states: high, low, or high impedance
  (Z). The high impedance state is like an open circuit, meaning it doesn't affect
  the output.
- Both static and dynamic RAM are examples of volatile memory, meaning they lose
  their contents when powered off.

## Chapter 20: Automating Arithmetic

- You can build a simple adder using components introduced in previous chapters.
  This includes RAM, accumulators, and latches.
- The control signals are the most complex part of the adder.
- The adder includes simple instructions or opcodes for adding and subtracting,
  storing results in RAM, and halting the machine.
- The combination of the hardware and software forms a primitive computer.
- Byte ordering specifically little versus big endian is important when dealing
  with multi-byte data types.

## Chapter 21: The Arithmetic Logic Unit

- The three components of a computer include memory, the central processing unit
  (CPU), and input/output (I/O) devices.
- In memory lives both the data and the CPU instruction codes.
- The Arithmetic Logic Unit (ALU) is the part of the CPU that performs
  arithmetic and logic operations.
- The ALU shown in this chapter can add and subtract 8-bit numbers and perform
  bitwise logic operations on the same 8-bit numbers.
- There are opcodes for each ALU function.
- The ALU performs all logic operations simultaneously outputting each result to
  a tri-state buffer. Three functions bits select which buffer to output.
- A compare operation is the same as a subtraction operation, but the result is
  not stored. Instead, you save a carry flag and a zero flag.
- You can find the complete ALU circuit on page 332.

## Chapter 22: Registers and Busses

- A CPU includes a small number of special purpose registers.
- The registers can be general purpose or serve a specific task. For example, in
  the Intel 8080 CPU, the accumulator register is a general purpose register used
  to store intermediate results of arithmetic and logic operations.
- The opcodes may use one or more registers as operands. For example, the Intel
  8080 CPU has an opcode for moving data to RAM. The opcode uses the H and L
  registers to form the 16-bit address of the RAM location to write to.
- Assembly language is a low-level programming language that uses mnemonics to
  represent opcodes and registers. Each assembly language instruction corresponds
  to a single opcode.
- Opcodes for arithmetic, moving data to registers/ram, control flow, and
  halting the CPU exist.
- The data bus is a set of wires that carry data between the CPU, memory, and
  I/O devices. The address bus is a set of wires that carry addresses to memory
  and I/O devices.

## Chapter 23: CPU Control Signals

- Most control signals are of two types (buses here are the **data** and
  **address** busses):
  - Signals that **put a value on** one of the two busses.
  - Signals that **save a value from** one of the two busses.
- Signals that put a value on the bus attach to the enable inputs of various
  tri-state buffers that connect the outputs of the components to the bus.
- Signals that save a value from the bus usually control the clock inputs of the
  various latches that connect the busses to the components on the bus. The only
  exception is when you save a value to memory using the RAM write signal.
- CPU cycles are the time it takes to execute a single instruction. When
  optimizing for speed, you want to minimize the number of CPU cycles needed to
  execute a program.
- The control signals are arguably the most complex part of the CPU.

## Chapter 24: Loops, Jumps, and Calls

- Loops are a fundamental control flow construct in programming. Loops repeat a
  block of code multiple times.
- To implement a loop in assembly language, you need to use a combination of
  jump instructions and conditional flags.
- Subroutines or functions are groups of instructions.
- The CALL and RET instructions call and return from subroutines.
- The stack is a special area of memory used to store temporary data. The stack
  provides a means to save the state of the program when calling a subroutine and
  to restore it when returning from the subroutine.
- You can nest subroutine calls, meaning you can call a subroutine from within
  another subroutine. It's possible to nest so many calls that you run out of
  stack space resulting in a stack overflow. You can also underflow the stack by
  popping more items than you pushed onto it.

## Chapter 25: Peripherals

- Devices such as the mouse, keyboard, video display, and printer fall under the
  category of peripherals.
- One of the most important peripherals is the video display. The video display
  renders pixels on the screen. Each pixel is a small dot of color. Each pixel is
  a combination of 8 bit red, green, and blue (RGB) values. A display with a
  1920x1080 resolution has 2,073,600 pixels, each represented by 3 bytes requiring
  a total of 6MB of memory to store the pixel data.
- The frame buffer is an area in main memory that houses the display pixels. The
  frame buffer is an example of a memory-mapped I/O device. The CPU can read and
  write to the frame buffer as if it were regular memory.
- Peripherals often communicate with the CPU using interrupts. An interrupt is a
  signal that tells the CPU to stop what it's doing and handle a specific event.
- Many signals are analog. To convert an analog signal to a digital signal, you
  need an Analog-to-Digital Converter (ADC). An ADC samples the analog signal at
  regular intervals and converts each sample to a digital value. Digital-to-Analog
  Converters (DAC) do the opposite, converting digital values to analog signals.
- DACs in video displays convert the digital values of the pixels into voltages
  that govern the intensity of the red, green, and blue components of each pixel.
- Digital cameras use ADCs to convert the analog signals from the camera sensor
  into digital values that form a bitmap.
- With image data such as a bitmap, you can use compression algorithms to reduce
  the size of the image. Common image formats include JPEG, PNG, and GIF. Some
  compression algorithms are lossy, meaning they discard some data to reduce the
  file size, while others are lossless, meaning they preserve all the original
  data. JPEG is lossy while PNG and GIF are lossless.
- Microphones take in sound waves and convert them into electrical signals. The
  electrical signals are analog, so you need an ADC to convert them into digital
  values.
- Compact discs (CDs) store audio data in a digital format. Pulse Code
  Modulation (PCM) is the technique which encodes the data. PCM samples the audio
  signal at regular intervals and quantizes the amplitude of the signal to a fixed
  number of levels.
- You sample audio at a rate of 44.1 kHz, meaning you take 44,100 samples per
  second. Each sample is typically 16 bits, resulting in a data rate of 1,411.2
  kbps for stereo audio (two channels). The Nyquist Theorem states that you need
  to sample at least twice the maximum frequency to accurately capture the audio
  signal.
- Much like pictures, you can also compress audio data. Common audio formats
  include MP3, AAC, and FLAC. MP3 and AAC are lossy formats, while FLAC is a
  lossless format.

## Chapter 26: The Operating System

- An operating system (OS) is a collection of software that manages computer
  hardware and software resources and provides common services for computer
  programs.
- An OS exposes an Application Programming Interface (API) that programs
  interact with to access hardware resources.
- The OS includes a filesystem that organizes files and directories on storage
  devices. The filesystem provides a way to read, write, and manage files.
- A bootloader is a small program that runs when the computer starts up. The
  bootloader loads the OS into memory and transfers control to it.
- In the early days, programmers would often bypass the OS and control the
  hardware directly usually via writing directly to memory.
- The introduction of operating systems that included a graphical user interface
  (GUI) made it easier for users to interact with the computer.

## Chapter 27: Coding

- Assembly language is a low-level programming language that uses mnemonics to
  represent machine code instructions. Each assembly language instruction
  corresponds to a single machine code instruction.
- Assembly language is specific to a particular CPU architecture. For example,
  the Intel 8080 assembly language is different from the Motorola 6800 assembly
  language. In essence, assembly code is non-portable.
- A program called an Assembler translates assembly language code into machine
  code.
- High-level programming languages such as C, Python, and Java provide a more
  abstract way to write programs. High-level languages are more portable across
  different CPU architectures.
- A compiler translates high-level language code into machine code. The compiler
  performs various optimizations to improve the performance of the generated
  machine code.
- A functional programming language is a type of high-level language that treats
  computation as the evaluation of mathematical functions. Examples include
  Haskell and Lisp.
- A procedural programming language is a type of high-level language that uses
  procedures or routines to structure the code. Examples include C and Pascal.
- An object-oriented programming language is a type of high-level language that
  uses objects to structure the code. Examples include Java, C++, and Python.
- An interpreted language is a type of high-level language that a program called
  an interpreter executes one line at runtime. Examples include Python and Ruby.
  The interpreter reads the source code and executes it line by line.
- Most languages represent floating point numbers using the IEEE 754 standard.
  The standard defines how to represent floating point numbers in binary,
  including the sign bit, exponent, and mantissa.
- Special hardware called a floating point unit (FPU) performs arithmetic
  operations on floating point numbers. The FPU is often integrated into the CPU.

## Chapter 28: The World Brain

- The Internet is a global network of interconnected computers that communicate
  with each other using standardized protocols.
- TCP/IP (Transmission Control Protocol/Internet Protocol) is the fundamental
  protocol suite that underlies the Internet.
- The World Wide Web (WWW) is a system of interlinked hypertext documents
  accessed via the Internet. The WWW uses the HTTP (Hypertext Transfer Protocol)
  to transfer documents.
- The Internet is a decentralized network, meaning there is no single point of
  control. This decentralization makes the Internet resilient to failures.
- Modems and routers are devices that connect computers to the Internet. A modem
  converts digital signals from a computer into analog signals sent over telephone
  lines or cable systems. A router directs data packets between different
  networks.
- The Domain Name System (DNS) is a distributed naming system that translates
  human-readable domain names (like www.example.com) into IP addresses.

[1]: https://programmador.com/series/notes/
[2]: https://codehiddenlanguage.com/Chapter00/
