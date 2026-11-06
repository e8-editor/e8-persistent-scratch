# e8-persistent-scratch

Keeps `*scratch*` across sessions in [E8](https://github.com/e8-editor/e8): its text, point and mark, major mode and narrowing are saved to a file every few minutes and when E8 quits, and read back when E8 starts, with dated backups if you want them. A port of [persistent-scratch](https://github.com/Fanael/persistent-scratch) 0.3.9.

## Installing

In `~/.config/e8/init.ts`:

```ts
e8.usePackage("e8-editor/e8-persistent-scratch");
e8.funcall("persistent-scratch-setup-default");
```

`persistent-scratch-setup-default` restores the scratch buffers and turns on `persistent-scratch-autosave-mode`. E8 installs the package at its newest version tag into `repos/` beside `init.ts`, records the commit in `e8-lock.json`, and requires it. `M-x package-vc-upgrade` brings it up to date. Pin a version with `{ rev: "v0.1.0" }`. It needs E8 0.3.1 or newer.

## Using it

Commands:

- `persistent-scratch-save`, `persistent-scratch-restore`: save the scratch buffers to `persistent-scratch-save-file`, and read them back. Restoring replaces the text of a buffer of the same name.
- `persistent-scratch-save-to-file`, `persistent-scratch-restore-from-file`: the same with a file you name.
- `persistent-scratch-autosave-mode`: a global mode that saves every `persistent-scratch-autosave-interval` seconds and when E8 quits; turning it on restores the scratch buffers first, once a session.
- `persistent-scratch-mode`: in a scratch buffer, makes `C-x C-s` and `C-x C-w` save the scratch buffers rather than ask for a file.
- `persistent-scratch-new-backup`: start a new backup file at the next save.

Variables:

- `persistent-scratch-save-file`: where they are saved, `.persistent-scratch` in `~/.config/e8/` by default.
- `persistent-scratch-what-to-save`: what to keep besides each buffer's name and text: `"major-mode"`, `"point"` (with the mark) and `"narrowing"`.
- `persistent-scratch-scratch-buffer-p-function`: a function, called in a buffer, that says whether it is a scratch buffer; by default only `*scratch*` is.
- `persistent-scratch-autosave-interval`: seconds between saves, or `["idle", N]` to save after N idle seconds.
- `persistent-scratch-backup-directory`: a directory to keep a copy of each save in, named by the time (`persistent-scratch-backup-file-name-format`); `null`, the default, for no backups.
- `persistent-scratch-backup-filter`: a function given the backups' names that returns those to delete. `e8.funcall("persistent-scratch-keep-n-newest-backups", 10)` and `e8.funcall("persistent-scratch-keep-backups-not-older-than", seconds)` make one.
- `persistent-scratch-before-save-commit-functions`: called with the new save file before it replaces the old.

The file is written in the format persistent-scratch.el writes, so E8 and Emacs can read each other's: point `persistent-scratch-save-file` at Emacs's to share it.

## Differences from persistent-scratch.el

- `"text-properties"` in `persistent-scratch-what-to-save` saves the text without its properties, and a file Emacs wrote with them is read without them.
- `persistent-scratch-backup-file-name-format` understands only `%Y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%N` and `%%`, and `%N` counts milliseconds, padded to nine digits.
- The default save file is in E8's configuration directory rather than `~/.emacs.d/`.

## Credit

This is a port to E8 of [persistent-scratch](https://github.com/Fanael/persistent-scratch) 0.3.9, by Fanael Linithien, copyright Fanael Linithien, and distributed in MELPA, under the BSD 2-Clause licence; the port keeps that licence. It is not the upstream authors' work as published, and they do not endorse it: report problems with the port here, not upstream.

## Developing

With an E8 on your PATH (a [release](https://github.com/e8-editor/e8/releases), or built from source) and TypeScript 5.8 or newer:

```bash
make test
make types
```

The tests in `test/persistent-scratch-tests.ts` check that saving writes, byte for byte, the file persistent-scratch.el 0.3.9 writes in Emacs 30 for the same buffer, readable only by its owner; that restoring a file Emacs wrote gives back the text, point, mark, region and narrowing; that `persistent-scratch-setup-default` restores and saves on quitting; that the backup filter deletes old backups; and that `persistent-scratch-mode` refuses buffers that are not scratch buffers. Each test saves into a temporary directory of its own.

## Licence

BSD-2-Clause: see `LICENSE`. The port runs inside E8, which is under GPL-3.0-or-later.
