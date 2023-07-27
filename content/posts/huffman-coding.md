---
title: "Huffman Coding"
date: 2023-07-04T20:57:06-07:00
description: "Data compression using Huffman coding."
tags: ["compression", "huffman-codes", "information-theory"]
toc: true
---

While reading through an old data structures book, I came across a cool looking
tree structure called a Huffman Tree[^1]. A Huffman Tree is a type of binary
tree that can be used to compress an arbitrary data file. I never implemented
one of these or dealt with compression at all when I was in school. I figured
it would be fun to write a small command line utility to compress/decompress a
file using Huffman coding.

## Breaking It Down Into Steps

This project started where most of my projects start: Wikipedia. The [Huffman
Coding][1] wiki article gives a nice general breakdown with examples. In
particular, the "Basic Technique"[^2] section covers the algorithms for
compression and decompression. What I gathered was that three key data
structures were necessary in order to implement the big `Compress()` and
`Decompress()` routines:

1. A map mapping characters to their frequency in the input.
2. A Huffman Tree used to generate an encoding map.
3. An encodings map mapping characters to their binary code.

We'll look at how to build up each structure and then discuss how they come
together to implement `Compress()`/`Decompress()`.

## Constructing the Character Frequency Map

A key aspect of Huffman coding is the derivation of binary codes from the
frequency of characters in the input file. **The length of a character's binary
code is determined by the frequency of that character in the input.** The higher
the character frequency the shorter the binary code and vice versa.

So how do we track character frequency? A regular old map does the trick. The
keys of the map are the characters in the input and the mapped to values are the
character's frequency. Below is a snippet of code showing how such a map can
be constructed:

```cpp
using CharFreqMap = std::map<char, uint32_t>;
CharFreqMap char_freqs_; /**< Map of character frequencies in the input. */

RetCode HuffmanCoding::CountCharFrequencies(const std::string& infile) {
    /* read the input file in kReadBuffSize sized chunks */
    std::ifstream infile_stream(infile, std::ios::binary);
    while (infile_stream) {
        infile_stream.read(read_buffer_.data(), read_buffer_.size());
        for (std::streamsize i = 0; i < infile_stream.gcount(); ++i) {
            char_freqs_[read_buffer_[i]]++; /* up the char's frequency */
        }
    }
    return (char_freqs_.empty()) ? RetCode::kEmptyFile : RetCode::kSuccess;
}
```

The code above reads character data into the `read_buffer_` buffer in 1 kilobyte
chunks. The `char_freqs_` map tracks the frequency of each character that is
read.

## Growing a Huffman Tree

So we have our map of character frequencies. How do we use this frequency map to
generate binary codes? There's an intermediate step. We need to represent our
character frequencies in a way where we can later generate optimal codes. This
is where the infamous Huffman Tree comes into play.

A Huffman Tree is a binary tree. The nodes of a Huffman Tree often have a
structure similar to what is shown below:

```cpp
struct HuffmanNode {
    int character;       /**< Character or kInternalNode value. */
    uint32_t count;      /**< Character frequency. */
    HuffmanNodePtr zero; /**< Huffman tree left subtree. */
    HuffmanNodePtr one;  /**< Huffman tree right subtree. */
};
```

Here's a picture of a Huffman Tree for the input text `aaaaabbc`:

!["aaaaabbc" Huffman Tree](/posts/huffman-coding/huffman-tree2.png)

There are two types of nodes in the tree: internal nodes and leaf nodes.  The
leaf nodes of a Huffman Tree contain an input character and its frequency
(denoted as `count` above). The internal nodes of a Huffman Tree often replace
the `character` with some special marker value and contain a `count` value equal
to the sum of the `count` values of its subtrees. By convention, the left
subtree is often labeled `zero` and the right subtree is labeled `one`.

Notice how the root to leaf path for the highest frequency character, `a`, is
shorter than the root to leaf paths for the lower frequency chars. This is no
coincidence. As you'll see in the next section on code generation, an optimally
constructed Huffman Tree can be traversed to obtain character to binary string
mappings where the most frequent characters have the most compact
representation.

So how do we build the tree from the frequency map? The wiki
article provides an algorithm for constructing an optimal Huffman Tree:

> 1. Start with as many leaves as there are symbols.
> 2. Enqueue all leaf nodes into the first queue (by probability in increasing
>    order so that the least likely item is in the head of the queue).
> 3. While there is more than one node in the queues:
>    - Dequeue the two nodes with the lowest weight by examining the fronts of
>      both queues.
>    - Create a new internal node, with the two just-removed nodes as children
>      (either node can be either child) and the sum of their weights as the new
>      weight.
>    - Enqueue the new node into the rear of the second queue.
> 4. The remaining node is the root node; the tree has now been generated.

Below is a C++ implementation of the above algorithm description. I use a
priority queue in place of the wiki's double queues but it all essentially works
the same:

```cpp
using HuffmanNodePtr = std::shared_ptr<HuffmanNode>;

void HuffmanCoding::BuildEncodingTree() {
    auto HuffmanNodePtrGreater = [](const HuffmanNodePtr a,
                                    const HuffmanNodePtr b) {
        return (a->count > b->count);
    };
    std::priority_queue<HuffmanNodePtr, std::vector<HuffmanNodePtr>,
                        decltype(HuffmanNodePtrGreater)>
        encoding_queue;

    /* load the initial nodes with their chars and freqs */
    for (const auto& [character, frequency] : char_freqs_) {
        encoding_queue.push(
            std::make_shared<HuffmanNode>(character, frequency));
    }

    /* follow the algorithm described in
     * https://en.wikipedia.org/wiki/Huffman_coding under the "Compression"
     * section */
    while (encoding_queue.size() != 1) {
        HuffmanNodePtr first = encoding_queue.top();
        encoding_queue.pop();
        HuffmanNodePtr second = encoding_queue.top();
        encoding_queue.pop();

        HuffmanNodePtr new_node = std::make_shared<HuffmanNode>(
            kInternalNode, first->count + second->count, first, second);

        encoding_queue.push(new_node);
    }
    encoding_root_ = encoding_queue.top(); /* save off the root of the tree */
}
```

When the above routine terminates, `encoding_root_` will point to the root node
of the Huffman Tree.

## Building a Codebook

It's the moment we've all been waiting for: code generation. You probably
already guessed how this works. To generate a character's code, all we need to
do is traverse the Huffman Tree. As we walk down from the root to each leaf, we
bookkeep the path taken using `0`'s to indicate left subtree traversals and
`1`'s for the right subtree traversals. When we hit a leaf node, we save off the
node's `character` value and the bit string generated up to that node.

Here's a snippet showing how we can recursively construct character encodings:

```cpp
using EncodingMap = std::map<char, std::string>;
EncodingMap encodings_; /**< Map of character to binary string encodings. */

void HuffmanCoding::BuildEncodingMap(HuffmanNodePtr root,
                                     std::string encoding) {
    if (root->character != kInternalNode) { /* reached a leaf node */
        encodings_[static_cast<char>(root->character)] = encoding;
        return;
    }
    BuildEncodingMap(root->zero, encoding + "0"); /* recurse into ltree */
    BuildEncodingMap(root->one, encoding + "1");  /* recurse into rtree */
}
```

At the end of this routine, `encodings_` will contain a mapping of each
character in the input to a binary string. Using the example text `aaaaabbc`
given in the previous section, the `encodings_` map would look like

| **Character** | **Encoding** |
|---------------|--------------|
| a             | 1            |
| b             | 01           |
| c             | 10           |

The original text required one byte per character or 8 bytes of storage. Using
the above codebook, we could store the text string using the code `11111010110`.
This would require only two bytes to store the same information. I say two bytes
because we can only write in units of bytes to an output file meaning we would
have to pad the bit string with 5 zeroes on the right in order to form a
complete second byte (i.e., `11111010 110` -> `11111010 11000000`).

## Compression

With our codebook in hand, compression boils down to converting an input stream
into a coded bit stream. We write out the contents of the bit stream
byte-by-byte to an output file.

The `Compress()` routine looks like the following:

```cpp
RetCode HuffmanCoding::Compress(const std::string& uncompressed_filepath,
                                const std::string& compressed_filepath) {
    /* verify uncompressed_filepath points to an existing file */
    std::filesystem::path uncompressed_path(uncompressed_filepath);
    if (!std::filesystem::exists(uncompressed_filepath)) {
        return RetCode::kFileDoesNotExist;
    }

    /* scan the uncompressed file once to compute char frequencies */
    RetCode retcode = CountCharFrequencies(uncompressed_filepath);
    if (RetCode::kSuccess != retcode) {
        return retcode;
    }

    BuildEncodingTree();                  /* construct the huffman code tree */
    BuildEncodingMap(encoding_root_, ""); /* construct char to bit string map */
    Encode(uncompressed_filepath, compressed_filepath); /* compress the data */

    return retcode;
}
```

You can see that `Compress()` just does some file checks and then builds up the
data structures previously discussed. `Encode()` is where the actual translation
happens. The code I came up with for `Encode()` is stupid simple albeit a bit
ugly:

```cpp
void HuffmanCoding::Encode(const std::string& infile,
                           const std::string& outfile) {
    /* controls for writing compressed data byte by byte */
    const int kBitsPerByte = 8;
    uint8_t currbyte = 0;
    int bitcount = 0;

    std::ofstream outfile_stream(outfile, std::ios::out | std::ios::binary);
    WriteHeader(outfile_stream); /* write the compressed files' header first */

    std::ifstream infile_stream(infile, std::ios::in);
    while (infile_stream) {
        /* read uncompressed data */
        infile_stream.read(read_buffer_.data(), read_buffer_.size());

        /* encode the chars in the buffer */
        for (std::streamsize i = 0; i < infile_stream.gcount(); ++i) {
            /* since the smallest unit we can write to a file is a byte not a
             * bit, the code below constructs a byte from the bits in an
             * encoding and then writes the byte to the output file */
            for (const char& bit : encodings_.at(read_buffer_[i])) {
                uint8_t ibit = (bit == '1') ? 1 : 0;
                currbyte = (currbyte << 1) | ibit;
                bitcount++;
                if (bitcount == kBitsPerByte) {
                    outfile_stream.write(reinterpret_cast<char*>(&currbyte),
                                         sizeof(currbyte));
                    currbyte = 0;
                    bitcount = 0;
                }
            }
        }
    }

    if (bitcount) { /* the very last character didn't land on the byte boundary
                       so we need to pad it with zeroes before writing it out to
                       file */
        while (bitcount != kBitsPerByte) {
            currbyte <<= 1;
            bitcount++;
        }
        outfile_stream.write(reinterpret_cast<char*>(&currbyte),
                             sizeof(currbyte));
    }
}
```

The code above reads the input file in 1kb chunks. The the binary code for each
character is then fetched from the `encodings_` codebook. The code is iterated
over bit-by-bit. Each bit is appended to a variable `currbyte`. When
`currbyte`'s bitcount hits 8, we write `currbyte` out to file. The process
repeats until we've exhausted all characters in the input. The `if (bitcount)`
clause at the end handles the edge case previously discussed where we need to
append a couple of zeroes to a binary code in order to make it a complete byte
before writing to the file.

You might have noticed a call to `WriteHeader()` in the code snippet above.
We'll talk about what that's all about when we look at decompressing a file
next.

## Decompression

If we for a moment assume we have the Huffman Tree used to compress a file
available, decompressing the contents of the file requires only a tree
traversal.  Imagine the compressed file is a bit stream. We can navigate the
tree from the root using the current bit in the stream to guide whether we step
into the left subtree (0 bit) or right subtree (1 bit). When we encounter a leaf
node, we write the character of that node to an output file and then reset
ourselves to the root of the tree.

As always, the devils in the details. For this tree traversal to work, we need
to know the following bits of information:

* How to reconstruct the Huffman Tree.
* How many characters were in original input file.

### Two Birds with One Stone

The easiest thing to do with regard to reconstructing the tree is to simply
write out the character frequency table to the beginning of the file in a header
section. Writing the whole table is not particularly efficient for very small
input files given that the header will be significantly larger than the
compressed data. However, as the input grows, the overhead of the header becomes
negligible.

Included in the header is a magic number[^3]. That magic number forms the first
few bytes of the compressed file and helps us know whether the input file we are
given is a Huffman coded file.

Here's how that header might look like in memory:

![Huffman Header](/posts/huffman-coding/huffman-header.png)

Below is the header write code in all its glory:

```cpp
void HuffmanCoding::WriteHeader(std::ofstream& os) const {
    os.write(reinterpret_cast<const char*>(&kHuffmanFmtIdentifier),
             sizeof(kHuffmanFmtIdentifier));

    std::size_t num_chars = char_freqs_.size();
    os.write(reinterpret_cast<char*>(&num_chars), sizeof(num_chars));

    for (const auto& [character, frequency] : char_freqs_) {
        os.write(&character, sizeof(character));
        os.write(reinterpret_cast<const char*>(&frequency), sizeof(frequency));
    }
}
```

The header code above solves the two problems we encountered earlier when
thinking about decompression: how to reconstruct the tree and how many
characters were in the uncompressed file. Using the frequency table parsed from
a compressed file's header, we can run our `BuildEncodingTree()` routine just as
before. A quick sum of the frequencies in the `char_freqs_` maps reveals how
many characters were in the original input.

### Decoding Data

I broke my implementation of the `Decompression()` routine into three seperate
parts:

1. Reading the header.
2. Building the encoding tree.
3. Decoding the input bit stream.

We already looked at how to write the header. The function that reads the
header in is nearly identical just replace stream writes with reads. Once we
read the header, building the encoding tree is as simple as calling our
`BuildEncodingTree()` routine. Decoding the bit stream is the only new thing
here.

We already described the algorithm for decoding the bit stream
[earlier](#decompression). Here's the code that implements the concept:

```cpp
void HuffmanCoding::DecodeStream(const std::vector<bool>& bitstream,
                                 std::ofstream& os) {
    /* take a tally of how many chars we need to decode */
    uint32_t num_chars = 0;
    for (const auto& kv : char_freqs_) {
        num_chars += kv.second;
    }

    /* repeatedly traverse the huffman tree decoding characters along the way */
    uint32_t num_chars_decoded = 0;
    HuffmanNodePtr node = encoding_root_;
    std::size_t i = 0;
    while ((i < bitstream.size()) && (num_chars_decoded != num_chars)) {
        node = (bitstream[i]) ? node->one : node->zero;

        if (!node->zero && !node->one) { /* reached a leaf node */
            os << static_cast<char>(node->character);
            node = encoding_root_;
            num_chars_decoded++;
        }
        i++;
    }
}
```

One weak aspect of this code is that `DecodeStream()` expects the *entire* input
bit stream to be fed in at once. That is, we buffer all the bits (represented as
`bool` types) in the input file. If the file is large enough, the `bitstream`
vector may well not fit in memory. For this project, I considered it reasonable
to keep it simple and not worry about multi gigabyte files. A better approach
would be to read the data, perhaps in page sized chunks, and create a parser
object that tracks where in the decoding process it is.

Similar to `Compress()`, the `Decompress()` routine is a wrapper around the
`Decode()` routine:

```cpp
RetCode HuffmanCoding::Decode(const std::string& infile,
                              const std::string& outfile) {
    std::ifstream infile_stream(infile, std::ios::in | std::ios::binary);
    RetCode retcode = ReadHeader(infile_stream); /* read in char frequencies */
    if (RetCode::kSuccess != retcode) {          /* invalid header */
        return retcode;
    }

    BuildEncodingTree(); /* construct the encoding tree */

    /* build up a bit vector from the compressed file's binary content */
    const int kNumBitsInByte = 8;
    std::vector<bool> bitstream;
    while (infile_stream) {
        infile_stream.read(read_buffer_.data(), read_buffer_.size());
        for (std::streamsize i = 0; i < infile_stream.gcount(); ++i) {
            for (int j = 0; j < kNumBitsInByte; ++j) {
                uint8_t mask = 1 << (kNumBitsInByte - j - 1);
                bitstream.push_back(read_buffer_[i] & mask);
            }
        }
    }

    /* reconstruct the message by traversing the huffman tree */
    std::ofstream outfile_stream(outfile);
    DecodeStream(bitstream, outfile_stream);

    return retcode;
}

RetCode HuffmanCoding::Decompress(const std::string& compressed_filepath,
                                  const std::string& uncompressed_filepath) {
    /* verify compressed_filepath points to an existing file */
    std::filesystem::path compressed_path(compressed_filepath);
    if (!std::filesystem::exists(compressed_filepath)) {
        return RetCode::kFileDoesNotExist;
    }

    return Decode(compressed_filepath, uncompressed_filepath);
}
```

## Conclusion

Putting all the above together, I was able to create a utility capable of
compressing and decompressing any image, text, executable, etc. using Huffman
coding. The implementation is not the most robust or efficient with regards to
space/time. The header could be made significantly smaller[^4], additional
precautions need to be taken in the source to account for massive input/output
files, etc. That said, the core concepts are there. Playing around with the
tool, I was able to compress some files down to 50% of their original size! The
lossless decompression, less like magic now that I know how it works, was
equally satisfying.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [huffman][5].

[1]: https://en.wikipedia.org/wiki/Huffman_coding
[2]: https://en.wikipedia.org/wiki/Huffman_coding#Basic_technique
[3]: https://en.wikipedia.org/wiki/Magic_number_(programming)#:~:text=In%20computer%20programming%2C%20a%20magic,see%20List%20of%20file%20signatures
[4]: https://en.wikipedia.org/wiki/Canonical_Huffman_code
[5]: https://github.com/ivan-guerra/huffman

[^1]: This posts title image shows a Huffman Tree generated from the text "this
    is an example of a huffman tree". The source of the image is of course
    [Wikipedia][1].
[^2]: ["Huffman Coding: Basic Technique"][2]
[^3]: Like with most things in computing, magic number has multiple meanings.
    The second definition in the ["Magic number (programming)"][3] wiki is the
    one referenced here: "A constant numerical or text value used to identify a
    file format or protocol".
[^4]: Checkout ["Canonical Huffman Codes"][4] to learn about a coding strategy
    that could lead to significantly smaller headers. We're talking 1 bit per
    Huffman node, 8-bits per character. That's a big savings over writing out
    the whole frequency table.
