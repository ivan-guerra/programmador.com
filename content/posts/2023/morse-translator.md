---
title: "Morse Translator"
date: 2023-08-01T20:51:32-07:00
description: "A text to Morse code translator."
tags: ["c++", "cli-tools", "sdl"]
---

While on a [LeetCode][1] grind, I came across a fun problem involving Morse
code: [Unique Morse Code Words][2]. You might wonder what the encodings sound
like. With a little programming magic you can find out by creating a command
line utility for converting text to Morse code audio.

## The Basics

The journey starts at the Morse code [wiki page][3]. The wiki had a chart that
sums up the protocol:

[![International Morse Code](/posts/2023/morse-translator/international-morse-code.webp#center)][4]

The chart though labeled "International Morse Code" seems basic. Where are all
the accents and punctuations? Turns out there's an organization, International
Telecommunication Union, which has documents defining the complete set of
supported characters.

The International Morse Code chart covers the character set. What about timing
requirements? The wiki mentions you measure time in "dots" where a dot's
duration is up to the discretion of the operator. This is actually a cool
feature of Morse code. An experienced operator can shorten the duration of a dot
which implies they can type more words per minute than an operator with a
lengthier dot time.

## Text to Code

To get yourself warmed up, start with text to code translations. That is, given
a string of characters, the translator outputs the dots and dashes
representation of the input. The following set of rules describes the coded
output:

- Translate valid input chars to their International Morse Code dot/dash
  representation.
- Display invalid input chars as `#`.
- Separate characters in a word with a single space.
- Separate words by a forward slash surrounded by single spaces.

What's a valid input char? You could support the entire alphabet defined in the
ITU documents. Better to keep it simple and add support for the subset of
characters shown in the wiki's Morse table. More specifically, the translator
considers letters `A-Z` (case insensitive) and digits `0-9` to be valid
characters. Ignore extraneous white space characters and punctuation.

As an example, the string `Hello, World!` would have the translation:

```text
.... . .-.. .-.. --- # / .-- --- .-. .-.. -.. #
```

You can use a map to implement the character to code mapping:

```cpp
const std::unordered_map<char, std::string> Translator::kMorseToAscii = {
    {'a', ".-"},    {'b', "-..."},  {'c', "-.-."},  {'d', "-.."},
    {'e', "."},     {'f', "..-."},  {'g', "--."},   {'h', "...."},
    {'i', ".."},    {'j', ".---"},  {'k', "-.-"},   {'l', ".-.."},
    {'m', "--"},    {'n', "-."},    {'o', "---"},   {'p', ".--."},
    {'q', "--.-"},  {'r', ".-."},   {'s', "..."},   {'t', "-"},
    {'u', "..-"},   {'v', "...-"},  {'w', ".--"},   {'x', "-..-"},
    {'y', "-.--"},  {'z', "--.."},  {'0', "-----"}, {'1', ".----"},
    {'2', "..---"}, {'3', "...--"}, {'4', "....-"}, {'5', "....."},
    {'6', "-...."}, {'7', "--..."}, {'8', "---.."}, {'9', "----."},
};
```

Translating boils down to iterating over the input all the while translating
each character using the character to code map:

```cpp
std::string Translator::ToCode(const std::vector<std::string>& words) const {
    std::string translation;
    for (const std::string& word : words) {
        for (const char& c : word) {
            char ascii_char = SafeToLower(c);
            if (kMorseToAscii.count(ascii_char)) {
                for (const char& morse_char : kMorseToAscii.at(ascii_char)) {
                    translation += morse_char;
                }
            } else {
                translation += '#';
            }
            translation += ' ';
        }
        translation += "/ ";
    }

    /* trim off the trailing " / " string */
    return translation.substr(0, translation.size() - 3);
}
```

The code takes a list of words and uses the `kMorseToAscii` map to translate a
Morse char to its dots/dashes representation. Append each character in the
output to the `translation` string one at a time. It's not the most
computationally efficient implementation, but it works for the primary use case
of translating smallish (a few kilobyte) messages.

## Making Some Noise

A goal of the project is to _hear_ a word or sentence's encoding. With a
translator already implemented, you just need a way to play the dots, dashes,
and pauses that form the Morse code audio. So how do you do that?

You may think to record a dot and dash sound as a WAV/MP3 soundbite. The
downside to this approach is that you would not be able to configure the audio
duration. That means translations will always play at a constant speed dictated
by the duration of the audio file. The alternative is then to create the audio
on the fly.

This is a problem where the [Simple DirectMedia Layer (SDL)][8] library comes in
handy. SDL is a cross-platform library for managing video, audio, networking,
and more. SDL is old, it's been around since 1998, and has seen plenty of use in
the [gaming and multimedia domains][9]. Sure enough, SDL has an API capable of
making the computer make beeping noises.

Just because SDL can make noises doesn't mean it's easy to do. [This
article][10] from 2010 explains how to make a "beeper" class. The article's
examples inspired the API shown below:

```cpp
class Beeper {
   public:
    ...
    void Beep(double frequency_hz, int duration_ms);
    void Wait() const;
    ...
};
```

`Beep()` and `Wait()` make up the public API. `Beep()` generates a beep with the
parameter frequency (pitch) and duration. Each call to `Beep()` queues a new
beep sound. The `Beeper` object plays sounds by order of registration.

`Wait()` blocks the calling thread until all beeps in the queue play to
completion.

A complete description of how `Beeper` does its thing is worthy of a separate
post. You can find the article from which this code derives here or checkout
the `Beeper` [source code][11].

## Translating to Beeps

With all the ingredients in hand, it was time to code up the text to Morse audio
portion of the translator:

```cpp
enum DelayMultiplier : int {
    kSymbol = 1,
    kChar = 3,
    kWord = 7,
};

void Translator::Delay(int delay_ms) const {
    static const int kMsToUsec = 1000;
    usleep(delay_ms * kMsToUsec);
}

void Translator::ToAudio(const std::vector<std::string>& words) {
    for (const std::string& word : words) {
        for (const char& c : word) {
            char ascii_char = SafeToLower(c);
            if (kMorseToAscii.count(ascii_char)) {
                for (const char& morse_char : kMorseToAscii.at(ascii_char)) {
                    if ('.' == morse_char) {
                        player_.PlayDot();
                    } else {
                        player_.PlayDash();
                    }
                    Delay(player_.DotDuration() * DelayMultiplier::kSymbol);
                }
            }
            Delay(player_.DotDuration() * DelayMultiplier::kChar);
        }
        Delay(player_.DotDuration() * DelayMultiplier::kWord);
    }
}
```

`ToAudio()` is similar in structure to the `ToCode()` method previously shown.
Dots/dashes now play over the host PC's speakers. There is a delay after each
symbol, character, and word. `DelayMultiplier` defines the units of delay per
symbol type. The values in the enum match up with the values given in the
[International Morse Code](#the-basics) table. The product of the symbol delay
and dot duration determine the length of the pause in microseconds.

## The User Interface

Surprise surprise, this translator has a command line interface! The translator,
named `morse`, has the following usage:

```text
usage: morse [OPTION]...
convert ascii text to Morse code text and audio

OPTIONS
	-i,--input-ascii FILE
		path to an input ASCII text file
	-o,--output-ascii FILE
		path to output Morse coded input
	-d,--disable-audio
		disable Morse code audio player
	-p,--print-code
		print Morse encoding to STDOUT
	-u,--pitch NUM
		a integer percentage value in the range [0, 100], the higher the
		percentage the higher the pitch of each dot/dash (default 50)
	-l,--duration NUM
		a integer percentage value in the range [0, 100], the higher the
		percentage the longer each dot/dash tone lasts (default 25)
	-h,--help
		print this help message
```

Users can pipe data into the program using standard Unix pipes or supply input
via `STDIN`/file. Audio translation is on by default. You can disable audio
translation with the `--disable-audio` switch. Code translations print to
`STDOUT`. There is an option for outputting text translations to file.

Interesting settings to play with are the `--duration` and `--pitch` options.
You want to slow down translation speed? Set `--duration` to a number closer to
`100`. You want the dots/dashes to have a lower, deeper tone? Set `--pitch` to a
number near `0`.

{{< video src="/posts/2023/morse-translator/morse.mp4" type="video/mp4" preload="auto" >}}

## Conclusion

Building a text to Morse code translator is an adventure. Morse code itself is
relatively straightforward to understand with not many gotchas or edge cases.
The most challenging part of this project is understanding how to play dot/dash
sounds over the host's speakers. Of course, audio generation on a computer is a
problem with a solution. The SDL library with its simple C API covers all your
audio needs. In the end, you walk away with a fun, flexible CLI tool.

The complete project source with build instructions, usage, etc. is available on
GitHub under [morse][13].

P.S. You can augment the tool to go the other way. That is, take in a Morse code
audio recording and output the decoded text. Going the audio to text route is
actually a challenging problem that requires digital signal processing skills.
If you're interested, here's a resource that could be of help: ["RSCW's
Algorithm"][14].

[1]: https://leetcode.com
[2]: https://leetcode.com/problems/unique-morse-code-words/
[3]: https://en.wikipedia.org/wiki/Morse_code
[4]: https://en.wikipedia.org/wiki/Morse_code#/media/File:International_Morse_Code.svg
[5]: https://morsecode.world/international/morse.html
[6]: https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1677-1-200910-I!!PDF-E.pdf
[7]: https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1172-0-199510-I!!PDF-E.pdf
[8]: https://www.libsdl.org/
[9]: https://web.archive.org/web/20100629004347/http://www.libsdl.org/games.php?order=name&category=-1&completed=0&os=-1&match_name=&perpage=-1
[10]: https://web.archive.org/web/20120313055436/http://www.dgames.org/beep-sound-with-sdl/
[11]: https://github.com/ivan-guerra/morse/blob/master/src/audio/beeper.cc
[12]: https://github.com/ivan-guerra/morse/blob/master/include/audio/beeper.hpp
[13]: https://github.com/ivan-guerra/morse/tree/master
[14]: http://www.pa3fwm.nl/software/rscw/algorithm.html
