---
title: "Morse Translator"
date: 2023-08-01T20:51:32-07:00
description: "A text to Morse code translator."
tags: ["sdl2", "morse-code", "audio", "text-to-audio"]
toc: true
---

While on a LeetCode[^1] grind, I came across a fun problem involving Morse code:
Unique Morse Code Words[^2]. The problem got me wondering how some of the words
would sound if the encodings were played over my speakers. I then realized that
I'd never worked with programming audio. The problem inspired me to create a
Linux command-line utility for converting text to Morse audio/codes.

## The Basics

Given that I've never physically seen a telegraph or played with HAM radios, my
knowledge of Morse code was relatively limited. Like most my projects, this
translator started at the Morse code wiki page[^3]. The wiki had a chart that
sums up the protocol:

[![International Morse Code](/posts/morse-translator/international-morse-code.png#center)][4]

The chart though labeled "International Morse Code" didn't seem very
international to me. Where were all the accents and punctuations? Turns out
there's an organization, International Telecommunication Union, which has
documents defining the complete set of supported characters[^4].

Okay, so we got a feel for the character support. What about those timing
requirements? Seems like time is measured in "dots" where a dot's duration is up
to the discretion of the operator. This is actually a cool feature of Morse
code. An experienced operator can shorten the duration of a dot which implies
they can type more words per minute than an operator with a lengthier dot time.

## Text to Code

To kick things off, I first wanted to implement text to code translations. That
is, given a string of characters, the translator would output the dots and
dashes representation of the input. I came up with a simple set of rules
describing the coded output:

* Valid input chars will be translated to their International Morse Code
  dot/dash representation.
* Invalid input chars will be displayed as `#`.
* Characters in a word will be seperated by a single space.
* Words will be seperated by a slash, `/`, surrounded by single spaces.

What's a valid input char? I could support the entire alphabet defined in the
ITU[^4] documents. However, I decided to keep it simple and just add support for
the characters shown in the wiki's Morse table. More specifically, the
translator would consider letters `A-Z` (case insensitive) and digits `0-9` to
be valid characters. Extraneous whitespace characters would be ignored.

As an example, the string `Hello, World!` would have the translation:

```text
.... . .-.. .-.. --- # / .-- --- .-. .-.. -.. #
```

If you've worked with data structures before, it's no surprise I chose to use a
vanilla map structure to implement the Morse char to code mapping:

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

I didn't try to implement any big brain tricks when it came to translating:

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

The code above takes a list of words and uses the `kMorseToAscii` map to
translate a Morse char to its dots/dashes representation. Each character in the
output code is appended to the `translation` string one at a time. It's not the
most computationally efficient implementation, but it works for the primary use
case of translating smallish (maybe a few kb) messages.

## Making Some Noise

My original thought was to be able to *hear* a word or sentence's encoding.
With a translator of sorts already implemented, I just needed a way to play the
dots, dashes, and pauses that form the Morse code audio. So how do you do that?

My first thought was to record a dot and dash sound as a WAV/MP3 soundbite.  The
downside to this approach is that we would not be able to configure duration
meaning translations will always play at a consant speed dictated by the
duration of the dot audio. The alternative is then to create the audio on the
fly.

After much searching, Google led me to the Simple DirectMedia Layer (SDL)[^5]
library. SDL is a cross-platform library for managing video, audio, networking,
and more. SDL is old, it's been around since 1998, and has seen plenty of use in
the gaming and multimedia domains[^6]. Sure enough, SDL had an API capable of
making my computer make simple beeping noises.

Just because SDL can make noises doesn't mean its easy to do. I lucked out in
finding this[^7] post from 2010 explaining how to make a "beeper" class. I
lifted the code from the post with some minor alterations producing the
following API:

```cpp
class Beeper {
   public:
    ...
    void Beep(double frequency_hz, int duration_ms);
    void Wait() const;
    ...
};
```

The public API is composed of the `Beep()` and `Wait()` methods. `Beep()` allows
a User to generate a beep with the parameter frequency (pitch) and duration.
Each call to `Beep()` queues a new beep sound wave. The `Beeper` object will
play each beep sound in the order they are registered.

`Wait()` will block the calling thread until all beeps in the `beeps_` queue
have been played to completion.

A complete description of how `Beeper` does its thing is worthy of a seperate
post. I recommend checking out the original article[^7] if you are interested in
the implementation details or peruse the `Beeper` implementation files[^8].

## Beep Beeeeeep Beep ...

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

The relevant bits of the translator are shown above. `ToAudio()` is similar in
structure to the `ToCode()` method previously shown. The main difference is that
(a) we now play the dots/dashes over the host PC's speakers and (b) we insert
delays after each symbol, character, and word. `DelayMultiplier` defines how
many units of delay must be inserted. The values in the enum match up with the
values given in the [International Morse Code](#the-basics) pic. Each delay
multiplier is multiplied against the dot duration before a call to `usleep()` is
made within `Delay()` to insert a pause between sounds.

## The UI

Surprise surprise, I made this translator another command line interface tool!
The translator application is called `morse` and has the following usage:

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
via `STDIN`/file. Audio translation is on by default but can be disabled with
the `--disable-audio` switch. Code translations can be printed to `STDOUT`
and/or written to an output file.

My favorite settings to play with are the `--duration` and `--pitch` options.
You want to slow down translation speed? Set `--duration` to a number closer to
`100`. You want the dots/dashes to have a lower, deeper tone? Set `--pitch` to a
number near `0`.

{{< video src="/posts/morse-translator/morse.mp4" type="video/mp4" preload="auto" >}}

## Conclusion

Building a text to Morse code audio/code translator was an adventure. Morse code
itself is relatively straightforward to understand with not many gotchas or edge
cases as far as I could tell. That's nice, because it made the task of
programming much easier. The most challenging part of this project was
understanding how to play dot/dash sounds over the host's speakers. Of
course, playing sound on a computer is a problem that has been solved a thousand
times over. The SDL library with its simple C API covered all our audio needs.
In the end, we walk away with a fun, flexible CLI tool.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [morse][13].

P.S. I thought about augmenting the tool to go the other way. That is, take in a
Morse code audio recording and output the decoded text. Going the audio to text
route is actually a fairly challenging problem that requires digital signal
processing skills I do not possess. Despite that, I looked into a bit. If you're
interested, I found a nice resource that could be of help if you go down this
path: ["RSCW's Algorithm"][14].


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

[^1]: The bane of many freshly graduated CS students' existence, [LeetCode][1]
    is a site where one can brush up on their algorithm and data structures
    skills by solving problems of varying difficulty.
[^2]: Every now and then when grinding LeetCode, you come across a problem that
    teaches some extracurricular knowledge. This [Morse Code][2] problem is one
    of those.
[^3]: [Morse code][3]
[^4]: To quote the awesome [morsecode.world][5] site: "The definitive references
    for International Morse code are [Recommendation ITU-R M.1677-1][6] which
    tabulates the characters but does not include most accented characters,
    nor some punctuation (see notes in the tables for the exceptions) and
    [Recommendation ITU-R M.1172][7] which tabulates abbreviations."
[^5]: [Simple DirectMedia Layer][8]
[^6]: From the SDL Wikipedia page: "SDL is [extensively used][9] in the industry
    in both large and small projects. Over 700 games, 180 applications, and 120
    demos have been posted on the library website."
[^7]: ["Beep Sound with SDL"][11]
[^8]: [beep.hpp][12] and [beeper.cc][11] implement the `Beeper` class.
