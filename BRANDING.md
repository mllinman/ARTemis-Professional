# ARTemis Professional - Branding & Visual Assets

This document describes the visual branding assets for ARTemis Professional.

## Source Image

**ARTemislogo.png** - The master branding image (1376x768)
**Location:** `/ARTemislogo.png`

This is the source image from which all branding assets are derived. It features the ARTemis Professional branding with a paint palette icon and professional styling.

## Logo

### Professional Logo
**Location:** `/website/images/logo-professional.png`

The main logo derived from ARTemislogo.png, optimized for square display:
- Center-cropped from the source image to maintain key branding elements
- Paint palette icon with vibrant colors
- Professional styling
- High-quality PNG format

**Usage:** Main website header, promotional materials, social media profiles

**Dimensions:** 400x400px (PNG)

**Fallback:** `/website/images/logo.png` (identical copy for compatibility)

### Icon Variations

#### 192x192 Icon
**Location:** `/src/assets/icon-192.png` and `/website/images/icon-192.png`

PWA and mobile icon optimized for smaller displays:
- Center-cropped from ARTemislogo.png
- Maintains paint palette branding
- Optimized for app icons and home screens

**Usage:** PWA manifest, mobile home screen, app listings

#### 512x512 Icon
**Location:** `/src/assets/icon-512.png` and `/website/images/icon-512.png`

High-resolution icon for larger displays:
- Center-cropped from ARTemislogo.png
- Enhanced detail preservation
- Suitable for high-DPI displays

**Usage:** High-DPI displays, app store listings, splash screens

#### Favicons

**16x16:** `/website/images/favicon-16.png`
- Ultra-small version for browser tabs
- Scaled from ARTemislogo.png
- Maintains recognizable branding even at tiny size

**32x32:** `/website/images/favicon-32.png`
- Standard favicon size
- Scaled from ARTemislogo.png
- Clear and recognizable

**Fallback:** `/website/images/favicon.png` (32x32, identical to favicon-32.png)

**Usage:** Browser tabs, bookmarks, browser UI

## Banners

### Hero Banner
**Location:** `/website/images/hero-banner.png`

**Dimensions:** 1920x600px

Wide banner for website hero sections:
- Derived from ARTemislogo.png
- Optimized for 1920x600 aspect ratio
- Maintains brand identity and color scheme
- Professional PNG format

**Usage:** Website hero section, landing page header

### Social Media Banner
**Location:** `/website/images/social-banner.png`

**Dimensions:** 1200x630px (Open Graph standard)

Optimized for social media sharing:
- Derived from ARTemislogo.png
- Standard Open Graph dimensions
- Maintains brand consistency
- High-quality PNG format

**Usage:** 
- Open Graph meta tags (og:image)
- Twitter Card images
- LinkedIn posts
- Facebook shares

## Splash Page

**Location:** `/src/splash.html`

Loading/welcome screen featuring:
- Beautiful gradient background
- ARTemislogo.png displayed prominently (500x280px display size)
- Floating particle effects with animations
- "ARTemis Professional" branding
- Loading progress bar with shimmer effect
- Feature highlights (178+ Brushes, Natural Media, AI-Powered, Unlimited Layers)
- Smooth fade-in animations
- Auto-redirect after loading
- Click-anywhere-to-continue functionality

**Animations Include:**
- Brush rotation and bristle movement
- Paint stroke drawing animation
- Color cycling gradients
- Floating particles
- Sparkle effects
- Progress bar shimmer

**Usage:** 
- App loading screen
- Welcome page for new users
- Standalone entry point

## Color Palette

### Primary Colors (App Theme - Dark Slate)
- **Primary Blue:** `#0e639c` (main accent)
- **Accent Cyan:** `#00d4ff` (highlights)
- **Primary Dark:** `#0a4d7a` (darker blue)

### Background Colors (Dark Slate Theme)
- **Main Background:** `#1e1e1e` (darkest)
- **Secondary Background:** `#252526` (medium dark)
- **Tertiary Background:** `#2d2d30` (lighter dark)
- **Border Color:** `#3e3e42` (UI borders)

### Text Colors
- **Primary Text:** `#cccccc` (main text)
- **Secondary Text:** `#858585` (muted text)

### Brush Colors (Natural Wood & Realistic)
- **Wood Base:** `#4a3728` (brush handle base)
- **Wood Mid:** `#3a2818` (handle mid-tone)
- **Wood Dark:** `#2a1808` (handle shadows)
- **Wood Grain:** `#1a0f08` (wood grain lines)
- **Wood Highlight:** `#5a4028` (wood highlights)
- **Metal Base:** `#a0a0a0` (ferrule base)
- **Metal Light:** `#c0c0c0` (ferrule highlights)
- **Metal Dark:** `#8a8a8a` (ferrule shadows)
- **Bristles:** `#e8e8e8`, `#f0f0f0`, `#f8f8f8` (natural fiber variations)

## Typography

### Fonts
Primary: `'Helvetica Neue', Arial, sans-serif`

### Font Weights
- **Light:** 300 (taglines, body text)
- **Regular:** 400 (subtitles, descriptions)
- **Medium:** 500 (UI elements, labels)
- **Bold:** 700 (headings, brand name)

### Sizes
- **Logo/Brand:** 72px+ (extra large)
- **Headings:** 32-54px (large)
- **Subtitles:** 18-28px (medium)
- **Body:** 14-18px (regular)
- **Small:** 12-14px (captions)

## Design Principles

1. **Professional Yet Approachable:** High-quality gradients and effects balanced with clean, readable design
2. **Artistic Identity:** Paint brushes, strokes, and splatters throughout
3. **Vibrant Colors:** Rich gradients and colorful accents to represent creative possibilities
4. **Smooth Animations:** Subtle motion that enhances without distracting
5. **Scalability:** All assets are SVG for perfect scaling at any size
6. **Consistency:** Shared color palette and design elements across all assets

## Usage Guidelines

### Do:
✅ Use SVG files for best quality and scalability
✅ Maintain aspect ratios when resizing
✅ Use on contrasting backgrounds for visibility
✅ Keep animations smooth (2-4 second durations)
✅ Use gradients as shown for brand consistency

### Don't:
❌ Distort or stretch logos
❌ Change the color palette arbitrarily
❌ Remove the paint stroke accent (brand signature)
❌ Use low-resolution raster formats when SVG is available
❌ Overlay busy backgrounds that reduce visibility

## File Formats

All assets are provided as **PNG (Portable Network Graphics)** derived from ARTemislogo.png:
- High-quality raster images
- Full color depth with transparency support
- Optimized file sizes
- Universal browser and platform compatibility
- Professional quality at all sizes

## Future Enhancements

Potential additions to the branding package:
- PNG/WebP versions for compatibility
- Print-ready versions (CMYK, 300 DPI)
- Brand style guide document
- Animation sequences for video intros
- Icon set for all tools and features
- Alternative color schemes (light mode, etc.)
- Merchandise mockups

---

**Created:** November 2024
**Version:** 1.0.0-alpha
**Last Updated:** See git history
