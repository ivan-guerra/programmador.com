---
title: "Cross-device Password Mgmt Using Pass"
date: 2023-03-31T11:08:58-07:00
description: "Managing passwords across Linux and Android devices using pass."
tags: ["gnu", "password-mgmt"]
---

I've been guilty of reusing passwords across tons of online services. As far as
I can tell, I haven't been pwned[^1] just yet. That said, I wanted to give
myself a better chance that if one of my accounts got hijacked, atleast my other
accounts would be safe. I needed a password manager.

## Finding a Password Manager

There's no shortage of password managers to choose from[^2]. To narrow down my
search, I considered what devices I use and what my typical workflow looks like.
I came up with the following set of basic requirements for a password manager
(PM):

1. The PM shall have Android support.
2. The PM shall have Linux support.
3. The PM shall have a commandline interface.

With those requirements in mind, it didn't take long to come across a password
manager which checked all the boxes: [pass][3]. The `pass` homepage has a nice
summary of the tool:

> Password management should be simple and follow Unix philosophy. With pass,
> each password lives inside of a gpg encrypted file whose filename is the title
> of the website or resource that requires the password. These encrypted files
> may be organized into meaningful folder hierarchies, copied from computer to
> computer, and, in general, manipulated using standard command line file
> management utilities.

`pass` checked requirements 2-3 off. Further digging showed that requirement 1
could be met with use of the actively maintained Password Store app (more on
that later).

## Setting Up a GPG ID

[![GnuPG](/posts/cross-device-password-management/gnupg.png)][4]

To work with `pass`, you need a gpg-id. I actually had a gpg-id I used to sign
my git commits, so I went ahead with using that ID. If you need to make an ID,
the GNU Privacy Guard Manual[^1] has you covered. Here's a quick summary of how
to generate a 4096 bit RSA key:

1. Open a terminal.
2. Enter `gpg --full-generate-key`
3. Press `Enter` to select the default `RSA and RSA` option.
4. At the prompt, specify a keysize of `4096` and press `Enter`.
5. Press `Enter` to select the default of no expiration date.
6. Follow the prompts to enter your ID info.
7. Enter a secure password[^4].
8. Enter `gpg --list-keys` to view your newly minted key.

![GPG Key Generation](/posts/cross-device-password-management/keygen.png)

## Password Database Creation and Git Support

To initialize `pass`, call its init function with your public GPG key as the
argument. You can find your key by running `gpg --list-keys`. In the screenshot
[above](#setting-up-a-gpg-id), my public key is
`EBAA65BDAF7BF5D770070F013BE52220A00B08A9`. Here's how I initialize my `pass`
database:

```bash
pass init EBAA65BDAF7BF5D770070F013BE52220A00B08A9
```

After initialization, a `.password-store` directory is created in your home
directory. You can move this directory wherever you like. Just remember to tell
`pass` about it by setting the `PASSWORD_STORE_DIR` environment variable.

One of the nice features of `pass` is its git integration. You can perform git
operations on the password store database using the syntax

```bash
pass git GIT_ARGS...
```

The git operations will be applied to the `.password-store` database directory
previously created on init. To track changes to the database with git:

```bash
pass git init
```

`pass` will automatically create commits whenever you add, edit, remove, etc.
passwords via the `pass` CLI!

## Password Generation and Storage

The whole reason I migrated to using `pass` was so I could generate and store
strong passwords. `pass` has password generation built-in. To generate and store
passwords, the syntax is:

```bash
pass generate [--no-symbols, -n] [--clip, -c] [--force, -f] PASS_NAME PASS_LEN
```

I like to generate passwords with symbols. Some websites only allow alphanumeric
passwords in which case the `--no-symbols` option comes in handy.  The `--clip`
option is useful if you want to generate and simultaneously copy to the
clipboard the new password[^5]. Password insertion, removal, and editing are all
supported. See the manpage[^6] for the details.

`pass` gives a lot of flexibility in how you organize your passwords. I like to
organize my passwords into folders like *email*, *games*, *services*, etc.  For
example, I might generate these passwords:

```bash
pass generate games/runescape 20
pass generate services/facebook 20
pass generate services/linkedin 20
pass generate services/github 20
pass generate services/gitlab 20
pass generate email/ivan.eduardo.guerra@gmail.com 20
```

Running `pass` at the terminal (or `pass ls`) I'd be met with the following
printout:

```text
Password Store
|-- email
|   `-- ivan.eduardo.guerra@gmail.com
|-- games
|   `-- runescape
`-- services
    |-- facebook
    |-- github
    |-- gitlab
    `-- linkedin
```

You get full control over how you organize your passwords! When it comes time to
login to one of the services, just show the password with the command

```bash
pass [show] PASS_NAME
```

Better yet, let `pass` copy the password to your clipboard:

```bash
pass -c PASS_NAME
```

## Beyond Passwords

If you take a look at the `.password-store` directory, you'll notice that
passwords are stored in `*.gpg` files. That is, `pass` is basically encrypting a
flat text file that when decrypted contains a password on the first line.  The
author of `pass` was aware of this and made it easy to store arbitrary info
along with a password. The feature is referred to as multiline. For example, if
you wanted to edit `games/runescape` to add additional info:

```bash
pass edit games/runescape
```

`pass` will bring up the editor pointed to by your `EDITOR` environment
variable. From there, you can **put your password on the first line** and all
other secrets (e.g., username and recovery questions/answers) on subsequent
lines. Note, you can also use the `--multiline` option with the `insert` command
to store secret data:

```bash
pass insert --multiline misc/super_secret
```

## Remotely Hosting the Password Database

Of course, before your can access your password database remotely you need to
host it somewhere. Some people host their own git instances. I personally use
GitHub to store my password database in a private repo. You might ask, is my
password database safe if it is at all reachable from the Internet? To quote the
Password Store[^7] wiki:

> Yes and no. The password themselves are safe, since they are stored in an
> encrypted fashion. They are secure as long as your GPG key's secret part is
> safe. However, the repo leaks the names of the entries: a password named
> `web/site.com` will be stored in the file `web/site.com.gpg`. As a
> consequence, anyone who can see your public repo can see the name of your
> passwords, which is not so great for privacy: if a file is named
> `web/pornhub.com.gpg`, this might give a hint about your browsing habits.
> Moreover, the size of the files might also gives a clue about which accounts
> might have small passwords. If a file is very small, chances are that your
> password is small too. An attacker could use this information to select which
> account of yours is most likely to have a weak password.

I needed to host my database on some service since I wanted to sync passwords
between my phone and PC. In my case, convenience of password syncing beat out
the danger of exposing my password names to GitHub employees or some attacker in
general.

Whether your self hosting a git instance or using a service like GitHub, the
`pass` commands for syncing a remote database with a local one remain the same:

```bash
pass git remote add origin GIT_URL
pass git push origin master
```

After executing the above two commands, your remote instance will be synced with
your local password database.

# *pass* ON ANDROID

[![Password
Store](/posts/cross-device-password-management/password_store.png)][9]

One of my [requirements](#finding-a-password-manager) for a password manager was
that it have Android support. `pass` is just a Unix password management
commandline utility. Luckily, the Password Store[^7] Android app exists.
Password Store allows one to sync with a remote server hosting the
`.password-store` database. Working in conjunction with Password Store is the
OpenKeychain[^8] app which allows you to store your GPG secret key on mobile.

Transferring your private key to OpenKeychain is the first step. OpenKeychain
recommends[^9] the following commands be used:

```bash
export GPG_TTY=$(tty)

# generate a strong random password
gpg --armor --gen-random 1 20

# encrypt key, use password above when asked
gpg --armor --export-secret-keys YOUREMAILADDRESS | gpg --armor --symmetric --output mykey.sec.asc
```

The first command generates a one time password. The second encrypts the private
key tied to `YOUREMAILADDRESS` and outputs it to the file `mykey.sec.asc`. When
prompted to enter a passphrase, make sure you enter the password that was
previously generated. You can transfer `mykey.sec.asc` to your phone and tell
OpenKeychain to decrypt it by selecting *Keys -> Import from File*. **Do not
text, email, etc. the file password.  Manually input the password when prompted
by the app!**

Now all that's left is setting up your password database in Password Store.
Here are the steps:

1. Open Password Store on mobile.
2. Select *Clone Remote Repo*.
3. In the *Server* section, enter your repository URL and branch name.
4. In the *Authentication Mode* section, select your mode of authentication.  If
   using GitHub, select the SSH key option.
5. Follow the prompts to generate an SSH key. Upload the public portion of the
   key to your GitHub account[^10].

That's it. You should see your password database appear in the app. When you
select a password, Password Store will prompt you for your GPG key passphrase.
Password Store is smart enough to show you not only passwords but any other
secrets you may have hidden in the store (see [Beyond
Passwords](#beyond-passwords))!

## Conclusion

Managing dozens of passwords isn't easy. Password managers are here to make the
task more... manageable (BA DUM TSSS). You want your password manager to
complement your workflow. In my case, that meant having a password manager that
worked with the Linux CLI and that had Android support. `pass` in tandem with
Password Store and OpenKeychain met and in some ways exceeded my needs. I've
been using this setup for the last year and half without complaints! The juice
is definitely worth the squeeze when it comes to protecting your data.

[1]: https://haveibeenpwned.com/
[2]: https://en.wikipedia.org/wiki/List_of_password_managers
[3]: https://www.passwordstore.org/
[4]: https://gnupg.org/
[5]: https://www.gnupg.org/gph/en/manual/c14.html
[6]: https://wiki.archlinux.org/title/security#Choosing_secure_passwords
[7]: https://linux.die.net/man/1/xclip
[8]: https://linux.die.net/man/1/pass
[9]: https://github.com/android-password-store/Android-Password-Store
[10]: https://www.openkeychain.org/
[11]: https://www.openkeychain.org/faq/#what-is-the-best-way-to-transfer-my-own-key-to-openkeychain
[12]: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account

[^1]: Have you been [pwned][1]?
[^2]: [Wikipedia][2] lists over 20 password managers!
[^3]: The GNU Privacy Handbook shows how to [generate a new keypair][5].
[^4]: The Arch Linux Wiki has some good advice on [choosing secure passwords][6]
[^5]: `pass` uses [xclip][7] to carry out copies to the clipboard. `xclip` is
    available in the package repository of most Linux distros.
[^6]: `pass`'s [manpage][8] has some nice usage examples that show how to
    generate, insert, remove, and edit passwords.
[^7]: See the [Password Store][9] project page.
[^8]: See the [OpenKeychain][10] project page.
[^9]: [What is the best way to transfer my own key to OpenKeychain?][11]
[^10]: [Adding a new SSH key to your GitHub account][12]
