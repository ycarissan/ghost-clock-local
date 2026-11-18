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
