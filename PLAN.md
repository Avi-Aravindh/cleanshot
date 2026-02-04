# CleanShot - Photo Decluttering App

## What is CleanShot?

CleanShot is a React Native mobile app that helps users clean up their photo libraries by identifying and organizing clutter photos.

**Core Philosophy:** "Photo library cleanup, not camera enhancement" — we're not another camera app, we're here to help you delete the photos you don't need.

---

## The Problem

Photo libraries grow uncontrollably:
- **Screenshots** pile up and get forgotten
- **Duplicates** from burst mode or backups
- **Blurry photos** from failed attempts
- **Old photos** that are no longer relevant

Users need a simple way to identify and remove clutter without browsing through thousands of photos manually.

---

## Our Solution

CleanShot automatically identifies four types of clutter:

### 1. Screenshots
**Detection Methods:**
- Filename patterns (screenshot, IMG_, screen shot)
- Aspect ratios (9:16, 1:2, etc.)
- Common screenshot widths (720, 1080, 1170, 1280, etc.)
- No GPS location data

### 2. Duplicates
**Detection Methods:**
- Hash-based matching (dimensions + filename)
- Similar filenames with same dimensions

### 3. Blurry Photos
**Detection Methods:**
- File size vs. dimension ratio (low information density)
- Burst mode detection (same creation/modification time)
- Metadata-based quality estimation

### 4. Old Photos (Future)
**Detection Methods:**
- Creation date analysis
- User-defined age threshold

---

## User Flow

```
1. Open app → Home screen with "Scan for Clutter" button
2. Tap scan → App analyzes photo library
3. See results → Categories shown with photo counts
4. Tap category → View photos in grid
5. Select photos → Tap to select, tap delete to remove
6. Done → Photos deleted, space freed
```

---

## Key Features

### ✅ Completed (v1.0)
- Photo scanning with detection algorithms
- Category-based organization (screenshots, duplicates, blurry, old)
- Photo grid view with selection
- Delete functionality
- Settings with sensitivity controls
- Scan history

### 🔄 In Progress
- Better screenshot detection (more aggressive)
- Individual photo previews

### 📋 Future Ideas
- Smart albums (auto-group similar photos)
- Before/after storage comparison
- Cloud backup integration
- Machine learning blur detection (TensorFlow Lite)
- "Keep" suggestions based on duplicates

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo SDK 54) |
| Navigation | React Navigation (Stack) |
| State Management | Zustand + AsyncStorage |
| UI Components | React Native + Expo Icons |
| Photo Access | expo-media-library |
| Platform | iOS (Android coming soon) |

---

## Project Structure

```
cleanshot/
├── App.js                    # Main app, navigation
├── app.json                  # Expo config
├── package.json
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js     # Main screen, scan button
│   │   ├── CategoryScreen.js # Photo grid, delete
│   │   ├── SettingsScreen.js # Sensitivity, preferences
│   │   └── HistoryScreen.js  # Past cleanup history
│   ├── components/
│   │   ├── CategoryCard.js   # Category display card
│   │   └── PhotoGrid.js      # Photo grid component
│   ├── store/
│   │   └── index.js          # Zustand store (data)
│   └── utils/
│       └── photoScanner.js   # Detection algorithms
├── assets/                   # App icons, splash
└── design-prompts.md         # Design specs
```

---

## Design System

| Property | Value |
|----------|-------|
| Primary Color | #10B981 (Emerald Green) |
| Background | #FFFFFF (Light) |
| Text Primary | #1E293B |
| Text Muted | #64748B |

---

## Success Metrics

1. **User can scan** their photo library → Done
2. **User sees clutter categories** → Done
3. **User can view and select photos** → Done
4. **User can delete photos** → Done
5. **Photos are actually detected** → In Progress (Expo Go limitations)

---

## Development Notes

### Expo Go Limitations
- iOS: Limited media library access (can only see ~10-20 photos)
- Full functionality requires a development build

### Testing
```bash
cd cleanshot
npx expo start --host tunnel
# Scan QR with Expo Go
```

### Build for Testing
```bash
npx expo run:ios --device  # Build directly on device
```

---

## Contributing

This is a personal project by [Aravindh](https://aravindh.me). Contributions welcome!

**To contribute:**
1. Fork the repo
2. Create a branch
3. Make changes
4. Submit PR

---

## Links

- **Repo:** https://github.com/Avi-Aravindh/cleanshot
- **Author:** https://aravindh.me

---

*Last updated: Feb 4, 2026*