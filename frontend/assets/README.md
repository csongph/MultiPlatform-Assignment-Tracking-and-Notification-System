Replace the placeholder composite header

This project includes a placeholder composite SVG in `components/auth-header.html` that shows a stylized campus silhouette, a university seal, and a faculty emblem.

To replace with real assets:

- Preferred approach: replace the inline <svg> content inside `components/auth-header.html` with the official SVGs provided by your university and faculty. This keeps the page dependency-free.

- Alternative: store raster images in `assets/` and reference them. Recommended filenames and sizes:
  - `assets/university-seal.png` — 180×180 px (square)
  - `assets/faculty-logo.png` — 180×180 px (square)
  - `assets/campus-bg.jpg` — 1600×600 px (wide hero)

- If using raster images, update `components/auth-header.html` to use `<img src="../assets/university-seal.png" alt="...">` and similarly for the faculty logo. Adjust CSS in `css/auth.css` under `.auth-logo` as needed.

Accessibility:
- Ensure `alt` attributes describe the images, e.g. `alt="KMITL seal"` and `alt="Faculty of ... logo"`.

Questions or want me to replace these placeholders with exact SVGs you upload? Reply with the files and I'll embed them for you.
