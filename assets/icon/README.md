# Rune Icon Assets

The primary source is `icon.svg`, sized at 1024x1024.

Generated outputs:
- `icon-1024.png` base raster asset.
- `AppIcon.appiconset/` macOS AppIcon set.
- `rune.icns` for Electron packaging.

To regenerate:

1. Create the base PNG:

```bash
sips -s format png assets/icon/icon.svg --out assets/icon/icon-1024.png
```

2. Generate all sizes:

```bash
sips -z 16 16 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_16x16.png
sips -z 32 32 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_16x16@2x.png
sips -z 32 32 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_32x32.png
sips -z 64 64 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_32x32@2x.png
sips -z 128 128 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_128x128.png
sips -z 256 256 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_128x128@2x.png
sips -z 256 256 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_256x256.png
sips -z 512 512 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_256x256@2x.png
sips -z 512 512 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_512x512.png
sips -z 1024 1024 assets/icon/icon-1024.png --out assets/icon/AppIcon.appiconset/icon_512x512@2x.png
```

3. Create the `.icns` file:

```bash
mkdir -p assets/icon/rune.iconset
cp assets/icon/AppIcon.appiconset/icon_16x16.png assets/icon/rune.iconset/icon_16x16.png
cp assets/icon/AppIcon.appiconset/icon_16x16@2x.png assets/icon/rune.iconset/icon_16x16@2x.png
cp assets/icon/AppIcon.appiconset/icon_32x32.png assets/icon/rune.iconset/icon_32x32.png
cp assets/icon/AppIcon.appiconset/icon_32x32@2x.png assets/icon/rune.iconset/icon_32x32@2x.png
cp assets/icon/AppIcon.appiconset/icon_128x128.png assets/icon/rune.iconset/icon_128x128.png
cp assets/icon/AppIcon.appiconset/icon_128x128@2x.png assets/icon/rune.iconset/icon_128x128@2x.png
cp assets/icon/AppIcon.appiconset/icon_256x256.png assets/icon/rune.iconset/icon_256x256.png
cp assets/icon/AppIcon.appiconset/icon_256x256@2x.png assets/icon/rune.iconset/icon_256x256@2x.png
cp assets/icon/AppIcon.appiconset/icon_512x512.png assets/icon/rune.iconset/icon_512x512.png
cp assets/icon/AppIcon.appiconset/icon_512x512@2x.png assets/icon/rune.iconset/icon_512x512@2x.png
iconutil -c icns assets/icon/rune.iconset -o assets/icon/rune.icns
```
