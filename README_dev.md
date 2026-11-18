# Ghost Clock – Developer Notes

## GNOME Shell version check (GitHub Actions)

The workflow [`.github/workflows/check-gnome-version.yml`](.github/workflows/check-gnome-version.yml) warns you when a new GNOME Shell version is released, so the extension can be updated.

### How it works

1. **When:** every Monday at 06:00 UTC, or on demand (see below).
2. **Check:** it reads the highest version in `shell-version` in [`metadata.json`](metadata.json) and compares it with the latest GNOME Shell major version listed at <https://download.gnome.org/sources/gnome-shell/cache.json>.
3. **If a newer version exists:** it opens an issue titled **"Support GNOME Shell N"**, assigned to the repository owner. Being assigned makes GitHub send an email notification.
4. **No duplicates:** if an issue with that title already exists (open or closed), nothing is done. You get one email per GNOME version.

Pre-releases count: the issue is opened as soon as `N.alpha` is published (usually a few months before `N.0`), which leaves time to test.

### When you receive the email

Follow the checklist in the issue:

1. Test the extension on the new GNOME Shell version.
2. Add the version to `shell-version` in `metadata.json`.
3. Build the package:
   ```bash
   gnome-extensions pack --force --out-dir=dist .
   ```
4. Commit, push, then publish a release with the zip:
   ```bash
   gh release create vX.Y "dist/ghost-clock@local.shell-extension.zip" --title "Ghost Clock X.Y"
   ```
5. Close the issue.

Once `metadata.json` lists the new version, the next run reports "Up to date".

### Running it manually

From the **Actions** tab on GitHub, open *Check for new GNOME Shell version* and click **Run workflow**, or from the terminal:

```bash
gh workflow run check-gnome-version.yml
gh run list --workflow=check-gnome-version.yml --limit 1
```

The run log shows the supported and latest versions.

To test the detection logic locally without creating an issue:

```bash
curl -fsSL https://download.gnome.org/sources/gnome-shell/cache.json \
  | jq -r '.[1]["gnome-shell"] | keys[]' | sort -V | tail -5
jq -r '."shell-version" | map(tonumber) | max' metadata.json
```

### Things to know

- **Inactivity:** GitHub disables scheduled workflows after 60 days without activity on the repository. It sends an email beforehand; re-enable the workflow from the **Actions** tab with one click.
- **Notifications:** emails are only sent if email notifications are enabled in your GitHub settings (*Settings → Notifications*).
- **Failures:** if the run fails (for example if the GNOME download server is unreachable or its format changes), GitHub also emails you about the failed scheduled run.
- **Permissions:** the workflow only uses the built-in `GITHUB_TOKEN` with `issues: write`; no secret needs to be configured.

## Static checks (GitHub Actions)

The workflow [`.github/workflows/lint.yml`](.github/workflows/lint.yml) runs on every push and pull request (about 1 minute):

- **ESLint** on all JavaScript files, with the configuration in [`eslint.config.js`](eslint.config.js) (GJS globals such as `global` and `log` are declared there);
- **GSettings schema** validation with `glib-compile-schemas --strict`;
- **`metadata.json`** checks: required keys, existing `settings-schema`, `shell-version` listing major versions only.

Run the same checks locally:

```bash
npm install          # once, installs ESLint into node_modules/
npm run lint
glib-compile-schemas --strict --dry-run schemas/
```

## Runtime test in GNOME Shell

[`tests/shell-test.sh`](tests/shell-test.sh) checks that the extension really works inside GNOME Shell:

1. builds the zip with `gnome-extensions pack` and installs it with `gnome-extensions install`, like a user would;
2. starts a **headless** GNOME Shell with two virtual monitors (1920×1080 and 1280×1024);
3. checks that the extension is active, then changes every setting (positions, font, opacity, animations, stretch with and without aspect ratio, split-flap);
4. waits for the next minute so the split-flap animation runs;
5. disables and re-enables the extension;
6. fails if the extension is not active at any step, or if a JavaScript error appears in the GNOME Shell log.

It does not check the visual result (clock placement, rendering), only that the extension runs without errors. A full run takes 1–2 minutes, mostly waiting for the minute change.

### Running it locally

On a machine with GNOME Shell installed (and `jq`):

```bash
tests/run-local.sh
```

The test runs in a GNOME Shell fully isolated from your session: temporary `HOME`, private D-Bus session and runtime directory. Your settings and your installed extension are not touched. It tests the GNOME Shell version installed on your machine.

With Docker, to test in a clean Ubuntu 26.04 (GNOME Shell 50) or another image:

```bash
tests/run-in-docker.sh                 # ubuntu:26.04
tests/run-in-docker.sh ubuntu:25.10    # another Ubuntu release
```

### On GitHub

The workflow [`.github/workflows/shell-test.yml`](.github/workflows/shell-test.yml) runs the same test in an `ubuntu:26.04` container, as a regular user, on every push to `main`. It can also be started from the **Actions** tab (*GNOME Shell runtime test* → **Run workflow**) or with:

```bash
gh workflow run shell-test.yml
```

When adding support for a new GNOME Shell version, change the `container:` image in the workflow to a distribution shipping that version.
