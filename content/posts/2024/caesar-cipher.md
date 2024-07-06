---
title: "Caesar Cipher"
date: 2024-04-09T15:42:10-07:00
description: "Creating Caesar Cipher encode, decode, and cracking utils."
tags: ["c++", "cli-tools"]
---

The [Caesar Cipher][1] (CC) is a classic [symmetric key][2] algorithm dating
back to the time of Julius Caesar. If you are new to cryptography, the Caesar
Cipher is a great first crypto algorithm to learn. This post will walk through
the details of implementing a CC encrypt/decrypt function. You'll then get a
look at the internals of a CC code cracker.

## Algorithm Description

There are four key ingredients to a Caesar Cipher:

- **alphabet**: The set of characters that may form an encrypted/decrypted
  message.
- **plaintext**: The secret message you'd like to transmit.
- **ciphertext**: The encrypted plaintext message.
- **key**: An integral shift applied to the characters in the plaintext message.

An example best illustrates how each of these components come together.

Suppose you want to send a secret message composed of only the **lowercase
English letters**. You decide to use a Caesar Cipher to encrypt the **plaintext
"hello"** using the **key 14**. To perform the encryption you map each character
in the alphabet to an integer:

```text
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│ a│ b│ c│ d│ e│ f│ g│ h│ i│ j│ k│ l│ m│ n│ o│ p│ q│ r│ s│ t│ u│ v│ w│ x│ y│ z│
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│ 0│ 1│ 2│ 3│ 4│ 5│ 6│ 7│ 8│ 9│10│11│12│13│14│15│16│17│18│19│20│21│22│23│24│25│
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
```

To perform the encryption, add the key to each characters' integer
representation **modulo the size of the alphabet**. For example, the letter "o"
encrypts to \\((14 + 14) \mod 26 = 2\\) which according to the table is the
letter "c." The table below shows the encrypted form of "hello":

```text
┌──┬──┬──┬──┬──┐
│ h│ e│ l│ l│ o│
├──┼──┼──┼──┼──┤
│ v│ s│ z│ z│ c│
└──┴──┴──┴──┴──┘
```

**"vszzc" is the ciphertext** that you send to all your friends along with the
key. To decrypt the message, your friends apply the same shifting process but in
reverse. For example, the letter "c" in the ciphertext decrypts to \\((2 - 14)
\mod 26 = 14\\) which maps to the letter "o."

In general, the encryption and decryption formulas are:

\\[E_{n}(x) = (x + n) \mod |\Sigma|\\]

\\[D_{n}(x) = (x - n) \mod |\Sigma|\\]

where \\(x\\) is the integer mapping of the encrypt/decrypt letter, \\(n\\) is
the key, and \\(|\Sigma|\\) is the size of the alphabet.

## Coding the Cipher

You can apply the CC encryption/decryption algorithm to any character set as
long as you map each character to a unique integral value. In the world of
computers and text, the [ASCII character set][3] is a perfect CC candidate.
ASCII includes 128 characters each mapped to an integer in the range \\([0,
127]\\). The table below defines the ASCII character set. Only 95 out of 128
characters are printable.

[![ASCII Table](/posts/2024/caesar-cipher/ascii-table.webp#center)][4]

Below is a C++ CC implementation that works with the ASCII alphabet:

```cpp
RetCode AsciiCaesarCipher(std::istream &is, std::ostream &os, int shift) {
  if (!is) {
    return RetCode::kBadInputStream;
  }
  if (!os) {
    return RetCode::kBadOutputStream;
  }

  char curr = '\0';
  while (is.get(curr)) {
    curr = (static_cast<int>(curr) + shift) % kAsciiAlphabetSize;
    os << curr;
  }
  os.flush(); /* Flush the output stream just to be safe. */

  return RetCode::kSuccess;
}
```

Lets dissect this function starting with the function signature.
`AsciiCaesarCipher()` takes three parameters: an input stream, an output stream,
and a CC shift/key value. The input stream can be an open file (think
`std::ifstream`), `std::cin`, or any other `std::istream` derived type. Similar
to the input stream, the output stream can be an open file, `std::cout`, or some
other `std::ostream` derived type. `AsciiCaesarCipher()` will output the result
of the cipher to `os`. `shift` is the CC key as described in the previous
section. `AsciiCaesarCipher()` returns a `RetCode` enum type:

```cpp
enum class RetCode {
  kSuccess,
  kBadInputStream,
  kBadOutputStream,
};
```

The `RetCode` types are self explanatory.

`AsciiCaesarCipher()` reads characters out of the `is` stream one at a time.
Each character has the CC shift applied. The shifted character gets output to
`os`. The `os.flush()` call guarantees buffered data gets written to the
recording medium. **The same `AsciiCaesarCipher()` function can encrypt and
decrypt ASCII text depending on the contents of `is` and the value of `shift`.**

`AsciiCaesarCipher()` has a time complexity of \\(\mathcal{O}(N)\\) where
\\(N\\) is the number of characters in the input stream. The space complexity is
\\(\mathcal{O}(1)\\). In reality, `std::istream` and `std::ostream` objects
buffer data to reduce read/write overhead. The size of these buffers is
implementation dependent though likely a small, constant size.

## Cracking the Code

The Caesar Cipher isn't immune to attack. Due to the small key space, one could
perform a ciphertext only, brute force attack to recover the secret message.
That would be tedious to do by hand. With the right algorithm, the computer can
do the dirty work for you. Lets explore two attack techniques: a dictionary
attack and a frequency analysis attack.

### Dictionary Attack

A CC dictionary attack has you applying every possible shift to the ciphertext.
The shift that produces the largest number of valid "words" is most likely the
decryption key. To perform this attack, you need a dictionary of valid words.

Below is a C++ implementation of a CC dictionary attack. The algorithm assumes
you're working with the ASCII character set and that the message decrypts to
regular English.

```cpp
using WordSet = std::unordered_set<std::string>;
using KeyScoreMap = std::unordered_map<int, int>;

KeyScoreMap AsciiDictionaryAttack(std::istream& is, std::istream& dict_is) {
  WordSet dictionary = LoadDictionary(dict_is);
  KeyScoreMap scores;
  char curr = '\0';
  char tmp = '\0';
  std::string words[cipher::kAsciiAlphabetSize];
  while (is.get(curr)) {
    for (int shift = 0; shift < cipher::kAsciiAlphabetSize; ++shift) {
      /* Perform the Caesar Cipher shift. */
      tmp = (static_cast<int>(curr) + shift) % cipher::kAsciiAlphabetSize;

      if (std::isalnum(tmp)) { /* Add a char to the word at this shift. */
        words[shift] += std::tolower(tmp);
      } else if (!words[shift].empty() &&
                 std::isspace(tmp)) { /* Found complete word. */
        if (dictionary.count(words[shift])) {
          scores[shift]++;
        }
        words[shift].clear();
      }
    }
  }

  /* Check for the trailing words. */
  for (int shift = 0; shift < cipher::kAsciiAlphabetSize; ++shift) {
    if (dictionary.count(words[shift])) {
      scores[shift]++;
    }
  }
  return scores;
}
```

There's a lot to talk about here. Lets start with the types `WordSet` and
`KeyScoreMap`. `WordSet` is a set of strings representing the [most popular
English words][5] in lowercase form. Why a set? Using a set, you can determine
whether a string is an English word with an average time complexity of
\\(\mathcal{O}(1)\\).

`KeyScoreMap` is a map data structure. The map's keys are CC shift/key values in
the range \\([0, 127]\\). The map's values are a tally of the number of English
words seen when applying the corresponding shift key to the input stream.

`AsciiDictionaryAttack()` processes the input stream character by character. You
apply each shift to the current input character. If following a shift the
character is alphanumeric, then that character gets buffered in a string
representing a candidate word. Otherwise, when a shift results in whitespace,
the algorithm assumes a complete word proceeded the whitespace. In this case, if
the word at the current shift value is an English word, the shift's English word
tally in `scores` gets incremented.

The output of `AsciiDictionaryAttack()` is a map with shift/key values and their
scores. The key value with the highest score is the one you use to decrypt the
ciphertext. It's possible that two or more keys have the same score. In this
case, apply all keys to find which makes most sense. The longer the input
ciphertext is, the more likely you are to get an exact key match.

### Frequency Analysis Attack

The frequency analysis attack depends on knowledge of the distribution of the
ASCII characters in the English language. You take the ciphertext and apply all
possible shifts to it. You then take a tally of the frequency of the characters
in each translation as a percent value. The shift that produces the distribution
closest to the expected distribution is the decryption key.

How do you know the distribution of ASCII characters in English? Someone has
already done the [hard part][6]. The linked project analyzes the [Reuters-21578
corpus][7] to produce a table of [ASCII frequencies][8]. Note, some characters
aren't included in the table. You can assume the missing ASCII characters have a
frequency of 0.

How do you compare distributions? There are a number of ways. One method is to
treat the frequency distribution as a vector. In this case, the vector has 128
dimensions (one per ASCII character) where each dimension is a frequency
represented as a percent value. You can compute the [Manhattan Distance][9]
between to vectors to get a measure of how similar they are. The formula looks
like this:

\\[D = \sum_{i=0}^{127} |e_i - a_i|\\]

Where \\(e_i\\) is the expected percent frequency of the ASCII character
corresponding to \\(i\\) in the English language. \\(a_i\\) is the actual
frequency of the character as measured in the ciphertext. **The shift that
produces the smallest distance value is the decryption key.**

Lets look at the code:

```cpp
using CharFrequencies = std::array<double, cipher::kAsciiAlphabetSize>;
using CharFrequencyArray =
    std::array<CharFrequencies, cipher::kAsciiAlphabetSize>;

KeyScoreMap AsciiFrequencyAnalysisAttack(std::istream& is) {
  CharFrequencyArray freqs;
  char curr = '\0';
  int tmp = 0;
  double num_chars = 0;
  while (is.get(curr)) {
    for (int shift = 0; shift < cipher::kAsciiAlphabetSize; ++shift) {
      /* Perform the Caesar Cipher shift. */
      tmp = (static_cast<int>(curr) + shift) % cipher::kAsciiAlphabetSize;

      /* Tally the shifted char. */
      freqs[shift][tmp]++;
    }
    num_chars++;
  }

  /* Calculate the percent frequency of each char. */
  for (auto& table : freqs) {
    for (double& val : table) {
      val /= num_chars;
    }
  }

  return FindMinDistShifts(freqs);
}
```

`AsciiFrequencyAnalysisAttack()` uses the `CharFrequencyArray` type to store the
frequency distribution of each shift. The algorithm loops over the characters in
the input stream and applies the CC to each character. The shifted character
gets tallied in the corresponding frequency table. `num_chars` tracks the total
number of characters in the ciphertext. `num_chars` comes into play in the final
loop where the frequency counts get converted to a percentage.

`FindMinDistShifts()` finds the distribution with the smallest distance from the
expected distribution using the Manhattan Distance metric previously described.
The resulting `KeyScoreMap` will only have one shift key with a value set to
one. The shift key with a value of one is the decryption key.

Lets look at an example. Suppose you encrypted this article using the **key
42**. Running the **ciphertext** through `AsciiFrequencyAnalysisAttack()` will
return a `KeyScoreMap` with the following contents:

```text
┌─────┬─────┐
│Key  │ Val │
├─────┼─────┤
│ 0   │ 0   │
├─────┼─────┤
│ ... │ 0   │
├─────┼─────┤
│ 86  │ 1   │
├─────┼─────┤
│ ... │ 0   │
├─────┼─────┤
│ 127 │ 0   │
└─────┴─────┘
```

The results of `AsciiFrequencyAnalysisAttack()` suggests the decryption key is 86. The plot below shows the expected ASCII frequency distribution versus the
frequency distribution of the ciphertext post decryption using the key 86.

![Frequency Plot](/posts/2024/caesar-cipher/frequency-plot.webp#center)

The distributions match up well. If you were to decrypt using the key 86, you
would indeed get the correct plaintext! Why is the decryption key 86 and not 42?
Recall that to decrypt you take the negative of the encryption key **modulo the
size of the alphabet**. In this case, \\(-42 \mod 128 = 86\\).

## Conclusion

The Caesar Cipher is a classic symmetric key crypto algorithm. The CC worked
well in ancient times but doesn't hold up so well in the age of computers. You
can crack any CC code using a dictionary or frequency analysis attack. Neither
attack is trivial. In the case of the dictionary attack, you need a valid
dictionary to perform look ups on. The frequency analysis attack depends on
knowledge of the expected distribution of alphabet characters. Regardless of its
utility, the Caesar Cipher remains a fun algorithm to explore.

The complete project source with build instructions, usage, etc. is available on
GitHub under [caesar_cipher][10].

[1]: https://en.wikipedia.org/wiki/Caesar_cipher#
[2]: https://en.wikipedia.org/wiki/Symmetric-key_algorithm
[3]: https://en.wikipedia.org/wiki/ASCII
[4]: https://en.wikipedia.org/wiki/ASCII#/media/File:USASCII_code_chart.png
[5]: https://github.com/dolph/dictionary
[6]: https://github.com/piersy/ascii-char-frequency-english?tab=readme-ov-file
[7]: https://www.daviddlewis.com/resources/testcollections/reuters21578/
[8]: https://github.com/piersy/ascii-char-frequency-english/blob/main/ascii_freq.txt
[9]: https://simple.wikipedia.org/wiki/Manhattan_distance
[10]: https://github.com/ivan-guerra/caesar_cipher
