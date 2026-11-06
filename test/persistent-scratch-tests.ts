// SPDX-License-Identifier: BSD-2-Clause
//
// persistent-scratch's tests, with ERT: the file it writes is what
// persistent-scratch.el 0.3.9 writes in Emacs 30 for the same buffer, and it
// reads back what Emacs wrote. `make test` runs them in e8 --batch, as CI
// does.

import { ertDeftest, should, shouldEqual, shouldError } from "ert";
import "persistent-scratch";

/**
 * What Emacs wrote for *scratch* holding TEXT, point at 4 and the mark at 8
 * (counting from 1, as Emacs does: E8's script API counts from 0), the
 * region active and narrowed to 2..10.
 */
const TEXT = 'hello "world" \\ back\nsecond line\n';
const EMACS_FILE = '(["*scratch*" "hello \\"world\\" \\\\ back\nsecond line\n" (4 . 8) fundamental-mode (2 . 10) t])';

/**
 * Runs `body` with persistent-scratch-save-file in a temporary directory of
 * its own, given to `body`, and *scratch* empty, deleting the directory after.
 */
function withSaveFile(body: (dir: string, file: string) => void): void {
  const dir = e8.makeTempFile("persistent-scratch-", { dir: true });
  const file = e8.expandFileName(".persistent-scratch", dir);
  e8.setVariable("persistent-scratch-save-file", file);
  e8.withCurrentBuffer("*scratch*", () => {
    e8.widen();
    e8.deactivateMark();
    e8.deleteRegion(e8.pointMin(), e8.pointMax());
  });
  try {
    body(dir, file);
  } finally {
    e8.deleteDirectory(dir, { recursive: true });
  }
}

/** Writes `text` to `file`. */
const writeFile = (file: string, text: string) => e8.writeRegion(text, null, file, { quiet: true });

/** The whole of a buffer's text, narrowed or not. */
const text = (name: string) =>
  e8.withCurrentBuffer(name, () => {
    e8.widen();
    return e8.bufferText();
  });

ertDeftest("persistent-scratch-saving-writes-what-emacs-writes", () => {
  withSaveFile((_dir, file) => {
    e8.call("switch-to-buffer", "*scratch*");
    e8.call("fundamental-mode");
    e8.insert(TEXT);
    e8.setMark(7);
    e8.gotoChar(3);
    e8.narrowToRegion(1, 9);
    e8.activateMark();
    e8.call("persistent-scratch-save");
    shouldEqual(e8.readTextFile(file), EMACS_FILE);
    shouldEqual(e8.messages().at(-1), `Wrote persistent-scratch file ${file}`);
    // Only the user can read it, as Emacs makes it.
    shouldEqual((e8.fileModes(file) ?? 0) & 0o777, 0o600);
  });
});

ertDeftest("persistent-scratch-restoring-reads-what-emacs-wrote", () => {
  withSaveFile((_dir, file) => {
    writeFile(file, EMACS_FILE);
    e8.call("persistent-scratch-restore");
    const state = e8.withCurrentBuffer("*scratch*", () => [e8.point(), e8.mark(), e8.pointMin(), e8.pointMax(), e8.regionActive()]);
    shouldEqual(state, [3, 7, 1, 9, true]);
    shouldEqual(text("*scratch*"), TEXT);
  });
});

ertDeftest("persistent-scratch-setup-default-restores-and-saves-on-quitting", () => {
  withSaveFile((_dir, file) => {
    writeFile(file, '(["*scratch*" "kept" (5) fundamental-mode nil nil])');
    e8.funcall("persistent-scratch-setup-default");
    try {
      shouldEqual(text("*scratch*"), "kept");
      shouldEqual(e8.variable("persistent-scratch-autosave-mode"), true);
      e8.withCurrentBuffer("*scratch*", () => {
        e8.gotoChar(e8.pointMax());
        e8.insert(" more");
      });
      e8.runHooks("kill-emacs-hook");
      const saved = e8.readTextFile(file);
      should(saved.startsWith('(["*scratch*" "kept more" (10) fundamental-mode nil nil])'), saved);
    } finally {
      // Off again, so that later tests leave the file alone.
      e8.executeKbdMacro("M-x p e r s i s t e n t - s c r a t c h - a u t o s a v e - m o d e RET");
      shouldEqual(e8.variable("persistent-scratch-autosave-mode"), false);
    }
  });
});

ertDeftest("persistent-scratch-backups-are-kept-and-filtered", () => {
  withSaveFile((dir) => {
    const backups = e8.expandFileName("backups", dir);
    e8.setVariable("persistent-scratch-backup-directory", backups);
    e8.setVariable("persistent-scratch-backup-filter", e8.funcall("persistent-scratch-keep-n-newest-backups", 1));
    try {
      e8.call("persistent-scratch-save");
      e8.call("persistent-scratch-new-backup");
      // A few milliseconds on, for a backup of another name. (e8.sleepFor
      // reads input in e8 --batch, which has none.)
      const until = Date.now() + 5;
      while (Date.now() < until);
      e8.call("persistent-scratch-new-backup");
      e8.call("persistent-scratch-save");
      const names = e8.directoryFiles(backups).filter((f) => f !== "." && f !== "..");
      shouldEqual(names.length, 1, JSON.stringify(names));
    } finally {
      e8.setVariable("persistent-scratch-backup-directory", null);
      e8.setVariable("persistent-scratch-backup-filter", "ignore");
    }
  });
});

ertDeftest("persistent-scratch-the-mode-is-only-for-scratch-buffers", () => {
  e8.call("switch-to-buffer", "notes");
  const e = shouldError(() => e8.call("persistent-scratch-mode"));
  shouldEqual(e.message, "This buffer isn't managed by `persistent-scratch', not enabling mode.");
  shouldEqual(e8.variable("persistent-scratch-mode"), false);
  e8.call("kill-buffer", "notes");
});
