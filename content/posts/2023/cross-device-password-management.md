---
title: "Cross-device Password Mgmt Using Pass"
date: 2023-03-31T11:08:58-07:00
description: "Managing passwords across Linux and Android devices using pass."
tags: ["gnu", "password-mgmt"]
---

Who hasn't been guilty of reusing passwords across multiple online services. If
you make a habit out of reusing passwords, it's pretty easy to [get pwned][1]
not for just one service but many all at once. The modern day solution is to use
a password manager. This article walks you through setting up password
management across Linux and Android devices.

## Finding a Password Manager

There's no shortage of [password managers][2] to choose from. Your choice of
password manager is dependent on what devices you use and what your typical
workflow looks like. Here's what a set of basic password manager requirements
looks like:

1. Android support
2. Linux support
3. A command line interface

[pass][3] is one of the best open source options around. The `pass` homepage has
a nice summary of the tool:

> Password management should be simple and follow Unix philosophy. With pass,
> each password lives inside of a gpg encrypted file whose filename is the title
> of the website or resource that requires the password. These encrypted files
> may be organized into meaningful folder hierarchies, copied from computer to
> computer, and, in general, manipulated using standard command line file
> management utilities.

`pass` checks requirements 2-3 off. The actively maintained Password Store app
on Android meets requirement 1 (more on that later).

Install `pass` using your Linux distribution's package manager before moving on
to the next section.

## Setting Up a GPG Key

To work with `pass`, you need a gpg-id. If you need to make an ID, the [GNU
Privacy Guard Manual][5] has you covered. Here's a quick summary of how to
generate a 4096 bit RSA key:

1. Open a terminal.
2. Enter `gpg --full-generate-key`
3. Press `Enter` to select the default `RSA and RSA` option.
4. At the prompt, specify a key size of `4096` and press `Enter`.
5. Press `Enter` to select the default of no expiration date.
6. Follow the prompts to enter your ID info.
7. Enter a [secure password][6].
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

## Password Database Creation and Git Support

To initialize `pass`, call its init function with your public GPG key as the
argument. You can find your key by running `gpg --list-keys`. In the previous
screenshot, the public key is `EBAA65BDAF7BF5D770070F013BE52220A00B08A9`. Here's
how you initialize the `pass` database:

```bash
pass init EBAA65BDAF7BF5D770070F013BE52220A00B08A9
```

`pass init` creates a `.password-store` directory in your home directory. You
can move this directory wherever you like. Just remember to tell `pass` about it
by setting the `PASSWORD_STORE_DIR` environment variable.

One of the nice features of `pass` is its git integration. You can perform git
operations on the password store database using the syntax

```bash
pass git GIT_ARGS...
```

Git operations apply to the `.password-store` database directory previously
created on init. To track changes to the database with git:

```bash
pass git init
```

`pass` will automatically create commits whenever you add, edit, remove, etc.
passwords via the `pass` CLI!

## Password Generation and Storage

`pass` has password generation built-in. To generate and store passwords, the
syntax is:

```bash
pass generate [--no-symbols, -n] [--clip, -c] [--force, -f] PASS_NAME PASS_LEN
```

Some websites only accept alphanumeric passwords in which case the
`--no-symbols` option comes in handy. The `--clip` option is useful if you want
to generate and simultaneously [copy to the clipboard][7] the new password.
Password insertion, removal, and editing are all supported. See the [manpage][8]
for the details.

`pass` gives a lot of flexibility in how you organize your passwords. For
example, you might generate these passwords:

```bash
pass generate games/runescape 20
pass generate services/facebook 20
pass generate services/linkedin 20
pass generate services/github 20
pass generate services/gitlab 20
pass generate email/ivan.eduardo.guerra@gmail.com 20
```

Running `pass` at the terminal (or `pass ls`), You'd see the following printout:

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

If you take a look at the `.password-store` directory, you'll notice that there
is a `*.gpg` per password. That is, `pass` is encrypting a flat text file that
when decrypted contains a password on the first line. The developer of `pass`
took advantage of this fact and made it easy to store arbitrary info along with
a password. This is the "multiline" feature of `pass`. For example, if you
wanted to edit `games/runescape` to add additional info:

```bash
pass edit games/runescape
```

`pass` will bring up the editor pointed to by your `EDITOR` environment
variable. From there, you can **put your password on the first line** and all
other secrets (for example, username and recovery questions/answers) on subsequent
lines. Note, you can also use the `--multiline` option with the `insert` command
to store secret data:

```bash
pass insert --multiline misc/super_secret
```

## Remotely Hosting the Password Database

Of course, before your can access your password database remotely you need to
host it somewhere. Some people host their own git instances others may use
online hosting services like GitHub. You might ask, is your password database
safe if it's at all reachable from the Internet? To quote the [Password Store
wiki][9]:

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

If you want to sync passwords between your phone and PC, you need to host the
password database on some online service. It's up to you to decide if the
convenience of password syncing beats out the danger of exposing your password
names to an attacker.

Whether you're self hosting a git instance or using a service like GitHub, the
`pass` commands for syncing a remote database with a local one remain the same:

```bash
pass git remote add origin GIT_URL
pass git push origin master
```

These two commands sync your remote instance with your local password database.

## Android Support

[![Password Store](/posts/2023/cross-device-password-management/password-store.webp#center)][9]

Android support was one of the original requirements. `pass` is just a Unix
password management command line utility. Luckily, the Password Store Android
app exists. With Password Store, you can sync with a remote server hosting the
`.password-store` database. Working in conjunction with Password Store is the
[OpenKeychain app][10] with which you can store your GPG secret key on mobile.

Transferring your private key to OpenKeychain is the first step. OpenKeychain
[recommends][11] you use the following commands:

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
OpenKeychain to decrypt it by selecting _Keys -> Import from File_. **Don't
text, email, etc. the file password. Manually input the password when prompted
by the app!**

Now all that's left is setting up your password database in Password Store.
Here are the steps:

1. Open Password Store on mobile.
2. Select _Clone Remote Repo_.
3. In the _Server_ section, enter your repository address and branch name.
4. In the _Authentication Mode_ section, select your mode of authentication. If
   using GitHub, select the SSH key option.
5. Follow the prompts to generate an SSH key. Upload the public portion of the
   key to your GitHub account.

That's it. You should see your password database appear in the app. When you
select a password, Password Store will prompt you for your GPG key passphrase.
Password Store is smart enough to show you not only passwords but any other
secrets you may have hidden in the store (see [Beyond
Passwords](#beyond-passwords))!

## Conclusion

Managing dozens of passwords isn't easy. Password managers are here to make the
task more manageable (pun intended). You want your password manager to
complement your workflow. `pass` in tandem with Password Store and OpenKeychain
meets the need on Android and Linux.

[1]: https://haveibeenpwned.com/
[2]: https://en.wikipedia.org/wiki/List_of_password_managers
[3]: https://www.passwordstore.org/
[5]: https://www.gnupg.org/gph/en/manual/c14.html
[6]: https://wiki.archlinux.org/title/security#Choosing_secure_passwords
[7]: https://linux.die.net/man/1/xclip
[8]: https://linux.die.net/man/1/pass
[9]: https://github.com/android-password-store/Android-Password-Store
[10]: https://www.openkeychain.org/
[11]: https://www.openkeychain.org/faq/#what-is-the-best-way-to-transfer-my-own-key-to-openkeychain
[12]: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
