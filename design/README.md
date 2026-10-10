# Flavoneer brand assets

See [BRAND_GUIDE.md](BRAND_GUIDE.md) for the rules. Logos, app store art, social media kits, and web icons. Everything in `exports/` is generated, so
change the scripts or `tokens.json` rather than editing files by hand.

## Regenerate

From the repository root:

```sh
node design/scripts/build.mjs          # everything
node design/scripts/build.mjs social   # only paths containing "social"
```

The script outlines Fraunces and DM Sans from `@expo-google-fonts` with fontkit, then renders PNGs at
exact sizes with Playwright Chromium. If the pinned Playwright browser is missing, it falls back to any
cached `chromium_headless_shell` build, or run `pnpm exec playwright install chromium-headless-shell`.

## Layout

| Path | Contents |
| --- | --- |
| `tokens.json` | Colors, status colors, fonts, radii, spacing |
| `scripts/lib.mjs` | Font outlining, logo SVG builders, PNG alpha stripping, ICO writer |
| `scripts/templates.mjs` | Social covers, posts, avatars, feature graphic |
| `scripts/screens.mjs` | Store screenshot mockups (EN and AR) |
| `exports/logo/` | F symbol, wordmarks, lockups, mascot wordmark (SVG and PNG) |
| `exports/app-store/` | App Store icon and 6.9" screenshots, Google Play icon, feature graphic, screenshots |
| `exports/social/` | Profile images, platform covers, post and story templates |
| `exports/web/` | Favicons, PWA icons, Open Graph image |

The mascot artwork comes from `apps/landing/public/assets/`.
