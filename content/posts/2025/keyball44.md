---
title: "keyball44"
date: 2025-05-13T22:13:59-04:00
description: "A journey into the world of split keyboards."
tags: ["hardware"]
---

The world of keyboards is vast. It's easy to get lost in the sea of options and
opinions. That said, it's worth searching through the noise to find a keyboard
that works for you. This is especially true if you're a programmer or work a
desk job. A good keyboard can not only affect your productivity but also your
health.

This article will discuss the keyball44, a 40% split keyboard design originally
produced by [Shirogane Labs][1].

![keyball44](/posts/2025/keyball44/keyball44.webp#center)

This article will cover everything from where to purchase the keyboard,
customization, and tips on how to adjust to a split keyboard.

## Pros and Cons of a Split Keyboard

### The Pros

Why a split keyboard? The main reason is ergonomics. You can position the halves
of the keyboard such that your shoulders are in their natural position.

![Ergonomics](/posts/2025/keyball44/ergonomic.webp#center)

This is in contrast to a traditional keyboard where you can often find yourself
in a hunched position. This is especially true if your a larger person.

Most split keyboards support tenting.

![Tenting](/posts/2025/keyball44/tenting.webp#center)

A tenting kit angles the keyboard halves upwards. This can help reduce wrist
strain. The keyball44 includes an option for adding tenting legs.

The keyball44 is also a 40% keyboard. This means it has a smaller layout than
traditional keyboards. This can be a pro or a con depending on your needs. On
the pro side, the smaller layout means keys are easier to reach. Your hands
barely move if at all.

Another pro of many split keyboards is their programmability. You can "flash"
the keyboard with custom firmware. Through a flash, you can remap keys and
create macros. The keyball44 supports QMK firmware. This means you can program
the keyboard to your liking. You'll see an example of one such mapping later on.

One pro of the keyball44 in particular is the trackball.

![Trackball](/posts/2025/keyball44/trackball.webp#center)

The trackball isn't a one for one replacement for a mouse. That said, the
trackball is accurate enough for most tasks and makes scrolling through long
documents a breeze. It's convenient to use a thumb on a trackball versus moving
your hand to the mouse.

If you're already a mechanical keyboard enthusiast, the keyball44 won't
disappoint. Most split keyboards support mechanical switches.

![Switches](/posts/2025/keyball44/switches.webp#center)

This means you can customize the feel of the keyboard to your liking. If you're
wondering what a switch is and why you should care, checkout [this][8] article
for an in depth explanation.

Likewise, keycaps are often interchangeable. Keycaps not only change the look of
the keyboard but they also can change the feel significantly.

### The Cons

The main con of a split keyboard is the learning curve. If you're used to a
traditional keyboard, it can be difficult to adjust to a split keyboard. You'll
have to invest time into learning the new layout. The adjustment period can take
anywhere from 2 weeks to a few months. How fast you adjust depends on how much
you use the keyboard and how many sessions of deliberate practice you perform.
30 minutes a day of practice on a typing tutor site will get you back up to your
original typing speed in no time. Here are some typing tutor sites you can try:

- [TypingClub][4]
- [MonkeyType][5]
- [Keybr][6]

![TypingClub](/posts/2025/keyball44/typingclub.webp#center)

TypingClub is the preferred option since it assumes no prior typing knowledge.
TypingClub provides a structured approach that will have you practicing with
most symbols and letters. If you're new to [touch typing][7], TypingClub is a
great place to start.

Another con is the price. Split keyboards are often more expensive than
traditional keyboards. And not just a little more expensive. The keyball44
starts at about $250. This is a lot of money for a keyboard. But if you're
serious about your health and productivity, it's worth the investment.

## How to Buy

It may seem silly to explain how to buy a keyboard, but the keyball44, much like
other niche hardware, isn't always easy to buy. There are a few options.

If you own a soughtering iron and you're confident in your soughtering skills,
you can build the keyboard yourself. There's an official [build guide][2]
that details everything you need to know. The guide includes a bill of materials
and step by step instructions. To simplify the process even further, you can
purchase build kits from various vendors. For example, [HolyKeebs][3] sells
build kits that include (almost) everything you need.

Suck at soughtering? No problem. You can purchase a pre-built keyball44. For
example, [HolyKeebs][3] sells pre-built keyball44s. HolyKeebs in particular
provides various customization options including colors, keycaps, switches, and
more. Not to mention they also sell additional equipment such as tenting kits
and the TRRS cable required to connect the two halves of the keyboard. A
keyball44 from HolyKeebs with modest customization and assembly will run you
about $350 shipping included. $75 of the price covers assembly. If you purchase
the tenting kit, cable, and trackball, you'll be looking at about $400 all in.

One thing to keep in mind is that if you're purchasing a pre-built board, you
shouldn't expect same day delivery. The lead time is usually about a month. Keep
in mind that these aren't mass produced. They're made in small batches or even
upon order by a small team of people.

## Keymaps

The keyball44 supports [QMK firmware][9]. This means you can program the
keyboard to your liking.

Since you're working with the keyball44 which is a 40% keyboard and you're new
to split keyboards, you should start with a keymap optimized for 40% boards.
["The Art of Making 40% Keyboards that Aren't Crap"][10] provides a solid
starting keymap. The only modification required is the addition of a fifth layer
for the trackball.

You can find a QMK ready keyball44 keymap that implements the fifth layer plus a
few other tweaks [here][11]. Those tweaks include:

- Easier access to the mouse left and right button.
- A shortcut for `shift+insert` on the navigation layer.
- The arrow keys on the navigation layer are in a Vim style `hjkl` pattern.

If you want to further customize, you can find a [keycode reference][12] on the
QMK site. If using a keyball44, you have access to additional keycodes. Check out
the added keyball44 codes at [HolyKeebs][13].

## Flashing

Flashing the keyball44 is mostly straightforward. This article assumes you have
a Linux PC running Arch Linux and a Windows PC.

**Warning, when following the steps below, avoid connecting / disconnecting the
TRRS cable when powered. This can short the GPIO pins of the controllers.**

Follow these steps to flash the custom keymap introduced in [Keymaps](#keymaps):

1. Clone the `ieg-keyball44` branch of the QMK firmware repository fork:

```bash
git clone --branch ieg-keyball44 git@github.com:ivan-guerra/qmk_firmware.github
cd qmk_firmware
```

2. Install `qmk`:

```bash
sudo pacman -S qmk
```

3. Compile the keymap using `qmk`. Replace `USER_NAME` with your name. If your
   keyball44 doesn't have a OLED screen, remove the `-e OLED=yes` option. If you
   have a board with RGB, add `-e RGB=yes`:

```bash
qmk compile -e USER_NAME=ieg -e OLED=yes -kb keyball/keyball44 -km ivan-guerra
```

4. Upon a successful build, you should see a `keyball_keyball44_ivan-guerra.uf2`
   file in the top-level directory.

```text
Size before:
   text	   data	    bss	    dec	    hex	filename
      0	  55372	      0	  55372	   d84c	keyball_keyball44_ivan-guerra.uf2

Copying keyball_keyball44_ivan-guerra.uf2 to qmk_firmware folder          [OK]
```

Transfer the file to your Windows PC.

5. Plug in the keyball44 to your Windows PC. Place the keyboard in bootloader
   mode by pressing the layer 5 modifier followed by the `QK_BOOT` key. See the
   [default keymap][14] for help locating those keys.

6. The keyboard will show up as a USB drive. Copy the
   `keyball_keyball44_ivan-guerra.uf2` file to the USB drive.

7. Repeat the flash process this time plugging in the USB cable into the
   opposite half of the keyboard.

## Conclusion

The keyball44 offers a compelling option for anyone looking to improve their
typing comfort and ergonomics. This 40% split keyboard provides significant
benefits including reduced shoulder strain, programmable layouts, and the
convenience of an integrated trackball. While the learning curve and price
present initial hurdles, the long-term health benefits and increased
productivity justify the investment.

Start with a keymap that suits your workflow, practice consistently with typing
tutors, and within a few weeks, you'll likely find yourself typing comfortably
and efficiently. The ability to fully customize both the hardware and firmware
means your keyboard can evolve alongside your needs and preferences.

[1]: https://shirogane-lab.net/
[2]: https://github.com/Yowkees/keyball/blob/main/keyball44/doc/rev1/buildguide_en.md
[3]: https://holykeebs.com/products/keyball44?_pos=1&_psq=keyball44&_ss=e&_v=1.0
[4]: https://www.edclub.com/sportal/program-3.game
[5]: https://monkeytype.com/
[6]: https://www.keybr.com/
[7]: https://en.wikipedia.org/wiki/Touch_typing
[8]: https://www.theremingoat.com/blog/beginners-guide
[9]: https://docs.qmk.fm/
[10]: https://www.keyboard-layout-editor.com/#/gists/016b11b6fc11fa1cb9306338a26e71f9
[11]: https://github.com/ivan-guerra/qmk_firmware/blob/ieg-keyball44/keyboards/keyball/keyball44/keymaps/ivan-guerra/keymap.c
[12]: https://docs.qmk.fm/#/keycodes
[13]: https://docs.holykeebs.com/guides/keyboard/keyball/#custom-keycodes
[14]: https://github.com/Yowkees/keyball/blob/main/qmk_firmware/keyboards/keyball/keyball44/keymaps/default/keymap.c
