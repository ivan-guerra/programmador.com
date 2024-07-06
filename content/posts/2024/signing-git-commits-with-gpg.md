---
title: "Signing Git Commits With GPG"
date: 2024-01-21T17:16:02-08:00
description: "How to sign your Git commits with a GPG key."
tags: ["cli-tools", "gnu", "linux"]
---

If you've been around the open source community long enough, you've probably
heard of people signing their VCS commits/tags. This post covers the why and how
of signing your Git commits. The focus will be on commits but keep in mind that
these tips equally apply to tags.

## Why Sign Your Commits

The short answer is, signing your commits makes it harder for an attacker to
impersonate you. Sure, if you work solo on rinky-dink toy projects, having your
commits signed isn't a big deal. Now consider the case where you make commits to
an open source project with sensitive code or at your day job where you make
commits and PRs on a product. It might be worth safeguarding those commits just
a bit.

How easy is it to impersonate someone using Git? Lets say you have write access
to a repo on GitHub called `linux2.0`. Maybe you want to make some suckers
believe Linus Torvalds is working on this `linux2.0` project.

Step one, find out what Linus's GitHub username and email are. Clone the GitHub
`linux` repo and run `git log` to view his username and email:

```bash
commit 6613476e225e090cc9aad49be7fa504e290dd33d (grafted, HEAD -> master, tag: v6.8-rc1, origin/master, origin/HEAD)
Author: Linus Torvalds <torvalds@linux-foundation.org>
Date:   Sun Jan 21 14:11:32 2024 -0800

    Linux 6.8-rc1
```

Step two, set up a local `.gitconfig` to use Linus's username/email:

```bash
git config --global user.name "Linus Torvalds"
git config --global user.email torvalds@linux-foundation.org
```

Step three, commit super sneaky backdoor code to `linux2.0`:

![Impersonating Linus](/posts/2024/signing-git-commits-with-gpg/impersonation.webp#center)

The real Linus Torvalds signs his commits with his GPG key. The maintainer of
`linux2.0` can use Linus's public key to verify the signature. Better yet,
GitHub does the verification on their behalf (more on that later).

Note, one could change any metadata (username, email, timestamp, etc.) of a
commit on a branch or PR. If the admins/reviewers don't check beyond the basic
metadata, malicious changes can make it into a codebase. Cryptographic
signatures are a low overhead way of combating these attacks.

## Creating a GPG Key

Convinced you need to sign your commits? Maybe not. Either way, this section
walks through the process of minting a GPG key.

You'll be using GNU Privacy Guard (GPG). As stated on the GPG homepage: "GnuPG
is a complete and free implementation of the OpenPGP standard as defined by
RFC4880 (also known as PGP)." GPG is a beast of a tool. All you need to know is
that message/file signatures are one of GPG's many functions.

Most Linux installations come with GPG pre-installed as a command-line (CLI)
tool. Some distributions come with `gpg2` not `gpg`. With respect to key
generation, `gpg2` is identical to `gpg`. If you care to learn about the
differences between the two, see the [FAQ][1].

What follows is a step-by-step on generating a RSA key pair you can use to sign
commits and just about any other document:

1. Open a terminal.
2. Enter `gpg --full-generate-key`
3. Press `Enter` to select the default `RSA and RSA` option.
4. At the prompt, specify a key size of 4096 and press `Enter`.
5. Press `Enter` to select the default of no expiration date.
6. Follow the prompts to enter your ID info.
7. Enter a [secure password][2].
8. Enter `gpg --list-keys` to view your newly minted key.

```text
> gpg --list-keys
[keyboxd]
---------
pub   rsa4096 2022-01-04 [SC]
      EA76D0964E4D26EEB24CCBC57714EAED772DC391
uid           [ultimate] Ivan Eduardo Guerra <ivan.eduardo.guerra@gmail.com>
sub   rsa4096 2022-01-04 [E]
```

Highly recommend you export and backup your private key somewhere safe! The
command to export your private key for backup is:

```bash
gpg --export-secret-keys --export-options backup --output private.gpg
```

If you want to later install the key on a new machine, just import the private
key:

```bash
gpg --import private.gpg
```

## Tell Git to Sign Commits and Tags

Sometimes, configuring Git is hard. Luckily, telling Git to sign your
commits/tags is pretty easy.

You'll first want to get your signing key. Run the following command:

```bash
gpg --list-keys --keyid-format SHORT
```

The output of `--list-keys` should look similar to what's shown below:

```text
[keyboxd]
---------
pub   rsa4096/772DC391 2022-01-04 [SC]
      EA76D0964E4D26EEB24CCBC57714EAED772DC391
uid         [ultimate] Ivan Eduardo Guerra <ivan.eduardo.guerra@gmail.com>
sub   rsa4096/F54E5449 2022-01-04 [E]
```

The `rsa4096/XXXXXXXX` part is what you're interested in. The `XXXXXXXX` or
`772DC391` in this example is the important bit. It's what Git refers to as your
signkey.

Now tell Git about your signkey:

```bash
# Be sure to replace 772DC391 with your key!
git config --global user.signingkey 772DC391
```

Tell Git to automatically sign your commits/tags:

```bash
git config --global commit.gpgSign true
git config --global tag.gpgSign true
```

Boom, now all your commits and tags will have your crypto signature attached!
Try it out. Make a commit in one of your repos, then run the command `git log
--show-signature -1`. You'll see you're signature info is part of the commit:

```bash
commit 443fc7706ab4cafdda0426f88fdeecc916bcf787 (HEAD -> master, origin/master)
gpg: Signature made Sat 20 Jan 2024 10:42:32 PM PST
gpg:                using RSA key EA76D0964E4D26EEB24CCBC57714EAED772DC391
gpg: Good signature from "Ivan Eduardo Guerra <ivan.eduardo.guerra@gmail.com>" [ultimate]
Author: ivan-guerra <ivan.eduardo.guerra@gmail.com>
Date:   Sat Jan 20 22:42:32 2024 -0800

    Add a GNU stow dotfile mgmt how to article.
```

## Add Your GPG Key to GitHub

The ever trustworthy Microsoft owns GitHub these days. For better or worse,
GitHub's the most popular code hosting site. If it helps, the steps described
here largely apply to the other popular Git based hosting tools like BitBucket,
GitLab, etc. Use one of those services if you prefer.

**For GitHub to verify your commits, you'll need to make sure your Git user
email matches a GitHub verified email. The GitHub verified email must be the
same email associated with your GPG key. You can always add more user IDs (that
is, emails) to your signature key pair.**

Make your way to GitHub's [SSH and GPG Key Settings page][3]. Select to add a
new GPG key. GitHub will ask you to copy-paste your public key. To fetch your
public key run `gpg --armor --export <SIGNKEY>` on your local machine.
Continuing with the previous example, you would run:

```bash
gpg --armor --export 772DC391
```

Just copy and paste the text that's output into GitHub's public key textfield.
**That includes both the opening `-----BEGIN PGP PUBLIC KEY BLOCK-----` and
closing `-----END PGP PUBLIC KEY BLOCK-----` lines!**

Now, when you push your changes to a remote repository hosted on GitHub, GitHub
will automatically verify the commit using the GPG key associated with your
account.

![Verified Commits](/posts/2024/signing-git-commits-with-gpg/verified.webp#center)

It's going to be pretty hard for an impersonator to get that little green
verified widget to show up on their commits without stealing your private key
first.

## Conclusion

Moral of the story, digital signatures make it easier for others to know it was
you who made a commit. Setting up a GPG key and associating it with your GitHub
account takes no more than a few minutes. If you want to be sure your good name
isn't besmirched by some online hooligan, start signing your commits.

[1]: https://www.gnupg.org/faq/whats-new-in-2.1.html
[2]: https://wiki.archlinux.org/title/security#Choosing_secure_passwords
[3]: https://github.com/settings/keys
