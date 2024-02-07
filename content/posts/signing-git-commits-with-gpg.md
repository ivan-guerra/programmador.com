---
title: "Signing Git Commits With GPG"
date: 2024-01-21T17:16:02-08:00
description: "How to sign your Git commits with a GPG key."
tags: ["cli-tools", "gnu", "linux"]
cover:
    image: /posts/signing-git-commits-with-gpg/gnupg-logo.webp
    alt: GPG Logo
---

If you've been around the open source community long enough, you've probably
heard of people signing their VCS commits/tags. In this post, we're going to
talk about why and how you would go about signing your Git commits. We'll be
focused on commits but keep in mind that everything that is said equally applies
to tags.

## Why Should I Sign My Commits?

Good question. The short answer is, signing your commits makes it harder for an
attacker to impersonate you. Sure, if you work solo on rinky-dink toy projects
that net maybe 1 view a month, having your commits signed isn't a big deal.
However, if you make commits to an open source project developing sensitive code
or even at your day job where you make commits and PRs against a product, it
might be worth safeguarding those commits just a bit.

Lets look at an example of just how easy it is to impersonate someone using Git.
Lets say I have write access to a repo on GitHub called `linux2.0`. Maybe I want
to make some suckers believe Linus Torvalds himself is working on this
`linux2.0` project. 

Step one, find out what Linus's GitHub username and email are. Linus's GitHub
name and email can be gotten by cloning the GitHub `linux` repo and running `git
log` to view his username and email:

```bash
commit 6613476e225e090cc9aad49be7fa504e290dd33d (grafted, HEAD -> master, tag: v6.8-rc1, origin/master, origin/HEAD)
Author: Linus Torvalds <torvalds@linux-foundation.org>
Date:   Sun Jan 21 14:11:32 2024 -0800

    Linux 6.8-rc1
```

Step two, I set up my local `.gitconfig` to use Linus's username/email:

```bash
git config --global user.name "Linus Torvalds"
git config --global user.email torvalds@linux-foundation.org
```

Step three, commit super sneaky backdoor code to `linux2.0`:

![Impersonating Linus](/posts/signing-git-commits-with-gpg/impersonation.png#center)

Of course, the real Linus Torvalds signs his commits with his GPG key. So
if a contributor on `linux2.0` knew about signed commits and found Linus
Torvald's commit fishy, they could see that the commit wasn't signed which
should immediately set off some alarm bells.

Note, one could just as easily change the metadata (username, email, timestamp,
etc.) of a commit on a branch or PR. If the admins/reviewers don't look just
beyond the name, malicious changes can easily make it into a codebase.
Cryptographic signatures are one way of combating these attacks while not adding
tons of overhead.

## Creating a GPG Key

Convinced you need to sign your commits? Maybe not. Either way, I am now going to
walk you through the process of minting your very own GPG key.

We'll be using GNU Privacy Guard (GPG). As stated on the GPG homepage: "GnuPG is
a complete and free implementation of the OpenPGP standard as defined by RFC4880
(also known as PGP)". GPG is a beast of a tool. We're not going to attempt to
cover all its use cases or features here (not that I could if I wanted to). All
you need to know now is that, among GPG's many functions, it allows you to sign
any message or file of your choosing.

Most Linux installations come with GPG pre-installed as a command-line (CLI)
tool. On some distributions, the application is called `gpg2` not `gpg`. For our
purposes, `gpg2` is identical to `gpg`. If you really care to learn about the
differences, see the FAQ[^1].

What follows is a step-by-step on generating a RSA key pair you can use to sign
commits and just about any other document:

1. Open a terminal.
2. Enter `gpg --full-generate-key`
3. Press `Enter` to select the default `RSA and RSA` option.
4. At the prompt, specify a keysize of 4096 and press `Enter`.
5. Press `Enter` to select the default of no expiration date.
6. Follow the prompts to enter your ID info.
7. Enter a secure password[^2].
8. Enter `gpg --list-keys` to view your newly minted key.

![GPG Key Generation](/posts/signing-git-commits-with-gpg/keygen.png#center)

I highly recommend you export and backup your private key somewhere safe! The
command to safely export your private key for backup is:

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

![Signkey](/posts/signing-git-commits-with-gpg/signkey.png#center)

The output of `--list-keys` should look similar to what's shown above. The
`rsa4096/XXXXXXXX` part is what we're interested in. The `XXXXXXXX` or
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

## Add Your GPG Key to Github

Yeah I know, GitHub is owned by the evil Micro$oft these days. That said, it's
still the most popular code hosting site. If it helps, the steps described here
largely apply to the other popular Git based hosting tools like BitBucket,
GitLab, etc.

**For GitHub to verify your commits, you'll need to make sure your Git user
email matches a verified email associated with your GitHub account and is the
same email associated with your GPG key.** 

Make your way to GitHub's [SSH and GPG Key Settings page][3]. Select to add a
new GPG key. GitHub will ask you to copy-paste your public key. To fetch your
public key run `gpg --armor --export <SIGNKEY>` on your local machine.
Continuing with the previous example, I would run:

```bash
gpg --armor --export 772DC391
```

Just copy and paste the text that is output into GitHub's public key textfield.
**That includes both the opening `-----BEGIN PGP PUBLIC KEY BLOCK-----` and
closing `-----END PGP PUBLIC KEY BLOCK-----` lines!**

Now, when you push your changes to a remote repository hosted on GitHub, GitHub
will automatically verify the commit using the GPG key associated with your
account.

![Verified Commits](/posts/signing-git-commits-with-gpg/verified.png#center)

It's going to be pretty hard for an impersonator to get that little green
verified widget to show up on their commits without stealing your private key
first.

## Conclusion

Moral of the story, digital signatures make it easier for others to know it was
really you who made that commit. Setting up a GPG key and associating it with
your GitHub account takes no more than a few minutes. If you want to be sure
your good name is not besmirched by some online hooligan, start signing your
commits.

[1]: https://www.gnupg.org/faq/whats-new-in-2.1.html
[2]: https://wiki.archlinux.org/title/security#Choosing_secure_passwords
[3]: https://github.com/settings/keys

[^1]: If you're curious what's new in GPG2 versus GPG, the [GnuPG FAQ][1] has
    you covered.
[^2]: The Arch Linux Wiki has some good advice on [choosing secure
    passwords][2].
