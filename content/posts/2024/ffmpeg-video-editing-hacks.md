---
title: "ffmpeg Video Editing Hacks"
date: 2024-07-15T21:15:38-04:00
description: "A few ffmpeg video editing hacks."
tags: ["cli-tools"]
---

[ffmpeg][1] is a powerful command line tool for processing video and audio
files. ffmpeg can do just about anything you can imagine with media files. The
trouble is in understanding how to invoke the program correctly. There are a few
options that require some Linux and multimedia expertise to get right. This
article covers a couple handy ffmpeg hacks that have made much of the
audio/visual content on this website possible. The commands presented here are
MP4 centric. That said, you can modify most of the commands to work with
alternative formats (for example, WebM).

## Screen Recording

You can use ffmpeg to create a desktop recording. The command below assumes
you're on a Linux machine with an X Server running.

```bash
ffmpeg -y -f x11grab -draw_mouse 0 -s $RESOLUTION -i $DISPLAY ${OUTPUT_FILE}.mp4
```

Lets dissect the options:

| Option               | Description                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `-y`                 | Overwrite an existing output file without prompting the User for confirmation.                                          |
| `-f x11grab`         | Use the `x11grab` device. This device allows one to capture a region of an X11 display.                                 |
| `-draw_mouse 0`      | Disables recording of the mouse. Set this to `1` or remove the option completely to include the mouse in the recording. |
| `-s $RESOLUTION`     | Sets the capture resolution. For example, `-s 1920x1080`.                                                               |
| `-i $DISPLAY`        | Sets the input X11 display. You likely want to put the value of `$DISPLAY` here to capture the default X display.       |
| `${OUTPUT_FILE}.mp4` | The path to the output MP4 file.                                                                                        |

If you want to make a recording that includes audio, the command looks a little
different:

```bash
ffmpeg -y -f x11grab -draw_mouse 0 -s $RESOLUTION -i $DISPLAY -f pulse -ac 2 -i default ${OUTPUT_FILE}.mp4
```

What does the newly added `-f pulse -ac 2 -i default` bit do? It tells ffmpeg to
record audio using the default PulseAudio device. If you instead use Alsa for
audio, replace the PulseAudio device with the equivalent Alsa device: `-f alsa
-ac 2 -i hw:0`. Having trouble identifying your Alsa/PulseAudio device? See
["Capture/ALSA"][2] and ["Capture/PulseAudio"][3] for help.

You can augment the capture command to change the framerate, recording area, and
more. Checkout the [original source][4] of this info for more details on how to
capture video/audio.

## Concatenating Video Files

Suppose you wanted to concatenate a number of recordings. You can use ffmpeg's
[concat demuxer][5] to join all the files.

The first step is to create a text file with the list of recordings you want to
concat in the order you want them concatenated in:

```text
file record1.mp4
file record2.mp4
file record3.mp4
...
```

Suppose you had all your `*.mp4` files in a directory. You can create ffmpeg's
concat input file using `printf`:

```bash
printf "file $s\n" *.mp4 > mylist.txt
```

Run ffmpeg using the concat device with your file list as input:

```bash
ffmpeg -f concat -i mylist.txt -c copy output.mp4
```

**Note, this command works for files with the same codec**. If you want to join
files with different codecs, checkout ["Concatenation of files with different
codecs"][6].

## Adding Text Overlays to Videos

Need to add a small text box to your video? Look no further than the fun command
below:

```bash
ffmpeg -y -i ${IN}.mp4 -vf "drawtext=:text='Hello World':fontfile=/path/to/font.ttf:fontcolor=white:fontsize=50:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,5,10)'" -codec:a copy ${OUT}.mp4
```

The magic happens in the video filter flag's `"drawtext=..."` argument. The
fields of the argument are mostly self explanatory though the `enable` and
`x`/`y` options could do with a little elaboration.

The `enable` option specifies a window of time (in seconds) when the text label
will be visible. In this example, `enable='between(t,5,10)'` means the text box
will be visible from the 5 second mark to the 10 second mark in the video.

The `x`/`y` options specify the location of the text box on screen. The `w`,
`h`, `text_w`, and `text_h` are variables provided by ffmpeg to make it easier
to compute a position. `w`/`h` are the screen width and height.
`text_w`/`text_h` are the text string's width and height.

The `drawtext` filter takes many more options. Take a look at the [official
docs][7] for all the details.

## Bonus: Video Playback

It's likely that you want to playback your video after an edit. [ffplay][8] is a
program that uses ffmpeg libraries and SDL to playback a media file. The
following command will play an MP4 adding a small text box with a live timestamp
at the bottom:

```bash
ffplay -vf "drawtext=text='%{pts\:hms}':box=1:x=(w-tw)/2:y=h-(2*lh)" ${MY_VIDEO}.mp4
```

This command isn't limited to MP4s. You can pass any video format ffmpeg
supports to ffplay.

## Conclusion

This article doesn't scratch the surface of what's possible with ffmpeg. That
said, these "simple" commands have helped make most of the video content on this
site! Hopefully, these same commands save you some time in creating your own
video content.

[1]: https://ffmpeg.org/
[2]: https://trac.ffmpeg.org/wiki/Capture/ALSA
[3]: https://trac.ffmpeg.org/wiki/Capture/PulseAudio
[4]: https://trac.ffmpeg.org/wiki/Capture/Desktop
[5]: https://trac.ffmpeg.org/wiki/Concatenate#demuxer
[6]: https://trac.ffmpeg.org/wiki/Concatenate#differentcodec
[7]: https://ffmpeg.org/ffmpeg-filters.html#drawtext-1
[8]: https://www.ffmpeg.org/ffplay.html
