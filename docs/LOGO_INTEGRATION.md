# Logo Integration - Creative Branding Throughout the App

## Overview
Creative integration of the Memareh logo throughout the application for consistent branding and professional appearance.

## Logo Assets Available

Located in `/public/assets/logo/`:
- **`logo.png`** - Full logo with text (20KB) - For light backgrounds
- **`logo-reverse.png`** - Light version (17KB) - For dark backgrounds  
- **`fav-logo.png`** - Icon only (2KB) - For favicon, small spaces
- **`cover-image.jpg`** - Cover/hero image (66KB) - For social media

## Where Logos Are Used

### 1. **Hero Section** ✨
**Location**: `src/components/home/Hero.tsx`

**Implementation**:
```tsx
<div className="relative w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-xl">
  <Image
    src="/assets/logo/fav-logo.png"
    alt="معماره Logo"
    width={80}
    height={80}
    className="w-full h-full object-contain"
    priority
  />
  {/* Glow effect */}
  <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-30" />
</div>
```

**Features**:
- ✅ Glassmorphic container with backdrop blur
- ✅ Blue glow effect for premium feel
- ✅ Animated entrance (scale + fade in)
- ✅ Company name "معماره" next to logo
- ✅ Tagline "خدمات برق‌کاری حرفه‌ای"

**Visual Effect**: Modern, professional brand presence at the top of the hero section

---

### 2. **Favicon & Browser Tab** 🔖
**Location**: `src/app/layout.tsx`

**Implementation**:
```tsx
icons: {
  icon: [
    { url: "/assets/logo/fav-logo.png" },
    { url: "/assets/logo/fav-logo.png", sizes: "32x32", type: "image/png" },
    { url: "/assets/logo/fav-logo.png", sizes: "16x16", type: "image/png" },
  ],
  apple: [{ url: "/assets/logo/fav-logo.png" }],
  shortcut: "/assets/logo/fav-logo.png",
}
```

**Features**:
- ✅ Browser tab icon
- ✅ Bookmark icon
- ✅ Apple touch icon (iOS)
- ✅ PWA icon support
- ✅ Multiple sizes for optimization

---

### 3. **Page Metadata & SEO** 📱
**Location**: `src/app/layout.tsx`

**Implementation**:
```tsx
metadata: {
  title: "معماره - خدمات برق‌کاری حرفه‌ای و مطمئن",
  openGraph: {
    images: [{ url: "/assets/logo/cover-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/assets/logo/cover-image.jpg"],
  },
}
```

**Features**:
- ✅ SEO optimized title with brand name
- ✅ Open Graph image for social sharing
- ✅ Twitter Card image
- ✅ Brand keywords for search engines
- ✅ Persian language meta tags

---

### 4. **Booking Summary** 💳
**Location**: `src/components/booking/BookingSummary.tsx`

**Implementation**:

**A. Header Logo** (subtle branding):
```tsx
<Image
  src="/assets/logo/fav-logo.png"
  alt="معماره"
  width={40}
  height={40}
  className="opacity-30"
/>
```

**B. Watermark** (security & branding):
```tsx
<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
  <Image
    src="/assets/logo/logo.png"
    alt="معماره"
    width={200}
    height={200}
  />
</div>
```

**C. Trust Badge** (payment security):
```tsx
<div className="flex items-center justify-center gap-2 text-sm text-gray-600">
  <Image src="/assets/logo/fav-logo.png" alt="معماره" width={24} height={24} />
  <span>پرداخت امن با</span>
  <span className="font-bold text-blue-600">معماره</span>
</div>
```

**Features**:
- ✅ Subtle header logo (30% opacity)
- ✅ Large watermark (5% opacity) for document authenticity
- ✅ Trust badge near payment section
- ✅ Professional invoice appearance

---

## Design Principles Applied

### 1. **Strategic Placement**
- **Hero**: Bold presence for brand recognition
- **Favicon**: Constant visibility in browser
- **Booking**: Trust and security reinforcement
- **Metadata**: Social media and SEO optimization

### 2. **Opacity Hierarchy**
```
Hero Logo:        100% - Main brand presence
Trust Badge:      100% - Payment security
Header Reference: 30%  - Subtle reminder
Watermark:        5%   - Document authenticity
```

### 3. **Visual Effects**
- **Glassmorphism**: Modern frosted glass effect
- **Glow**: Blue radial blur for premium feel
- **Animation**: Smooth entrance transitions
- **Watermark**: Large, centered, extremely subtle

### 4. **Accessibility**
- ✅ Alt text on all images
- ✅ Semantic HTML
- ✅ Proper contrast ratios
- ✅ Responsive sizing

## Logo Usage Guidelines

### ✅ DO:
- Use fav-logo.png for small spaces (< 80px)
- Use logo.png for light backgrounds
- Use logo-reverse.png for dark backgrounds
- Maintain aspect ratio
- Provide alt text
- Use Next.js Image component for optimization

### ❌ DON'T:
- Stretch or distort the logo
- Use logo.png on dark backgrounds
- Remove glow effects from hero
- Make watermarks too visible (> 10% opacity)
- Forget to add priority loading on hero

## Technical Implementation

### Next.js Image Component
All logos use Next.js Image for:
- Automatic optimization
- Lazy loading (except hero - uses `priority`)
- Responsive sizing
- WebP conversion
- Blur placeholder

### File Structure
```
public/
└── assets/
    └── logo/
        ├── logo.png              (Main - light backgrounds)
        ├── logo-reverse.png      (Dark backgrounds)
        ├── fav-logo.png          (Icon/favicon)
        └── cover-image.jpg       (Social media)
```

## Future Enhancements

### Potential Additions:
- [ ] Animated SVG logo for loading states
- [ ] Logo in footer
- [ ] Logo in navigation/header (when created)
- [ ] Logo in email templates
- [ ] Logo in PDF invoices
- [ ] Logo in success/confirmation pages
- [ ] Logo in 404/error pages
- [ ] Animated logo hover effects

### Additional Placements:
- **CTASection**: Small logo in call-to-action
- **Footer**: Full logo with contact info
- **Navigation**: Logo as home link
- **Loading**: Animated logo spinner
- **Success Pages**: Celebratory logo animation
- **Email Templates**: Header branding

## Performance Considerations

### Optimization:
- ✅ WebP format (automatic by Next.js)
- ✅ Proper sizing (width/height specified)
- ✅ Priority loading on hero
- ✅ Lazy loading elsewhere
- ✅ Small file sizes (2-20KB)

### Loading Strategy:
```tsx
// Hero - Load immediately
<Image priority src="/assets/logo/fav-logo.png" />

// Other locations - Lazy load
<Image loading="lazy" src="/assets/logo/fav-logo.png" />
```

## Testing Checklist

- [ ] Hero logo appears with glow effect
- [ ] Favicon shows in browser tab
- [ ] Watermark visible but subtle in booking
- [ ] Trust badge displays correctly
- [ ] Social media preview shows cover image
- [ ] Logo responsive on mobile
- [ ] No layout shift on logo load
- [ ] Alt text accessible
- [ ] Logo maintains aspect ratio

## Files Modified

1. **src/components/home/Hero.tsx** - Main logo badge with animation
2. **src/app/layout.tsx** - Metadata and favicon
3. **src/components/booking/BookingSummary.tsx** - Watermark and trust badges

## Summary

The logo has been creatively integrated throughout the application with:
- ✨ **Premium glassmorphic design** in Hero
- 🔖 **Professional favicon** and metadata
- 💳 **Trust-building watermarks** in booking
- 📱 **Social media optimization** with cover image
- ⚡ **Performance optimized** with Next.js Image

The brand identity is now consistent, professional, and memorable throughout the user journey!
