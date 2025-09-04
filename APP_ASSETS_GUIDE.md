# TMR POS Mobile - App Assets Guide

This document outlines all required app icons, splash screens, and assets for iOS and Android deployment.

## 📱 Required Assets Overview

### Master Source Files Needed
- **App Icon**: 1024x1024px PNG (square, no transparency, no rounded corners)
- **Splash Screen**: 2732x2732px PNG (square canvas with centered logo)
- **Logo**: Vector SVG + high-res PNG variants
- **Brand Colors**: 
  - Primary: `#2563eb` (blue-600)
  - Secondary: `#1f2937` (gray-800)
  - Accent: `#10b981` (emerald-500)

## 🤖 Android Assets

### App Icons (all in PNG format)
```
android/app/src/main/res/
├── mipmap-mdpi/         # 48x48px
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-hdpi/         # 72x72px
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-xhdpi/        # 96x96px
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-xxhdpi/       # 144x144px
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
└── mipmap-xxxhdpi/      # 192x192px
    ├── ic_launcher.png
    ├── ic_launcher_round.png
    └── ic_launcher_foreground.png
```

### Splash Screens
```
android/app/src/main/res/
├── drawable/
│   └── splash.png       # 1080x1920px
├── drawable-land/
│   └── splash.png       # 1920x1080px
├── drawable-hdpi/
│   └── splash.png       # 480x800px
├── drawable-xhdpi/
│   └── splash.png       # 720x1280px
├── drawable-xxhdpi/
│   └── splash.png       # 1080x1920px
└── drawable-xxxhdpi/
    └── splash.png       # 1440x2560px
```

## 🍎 iOS Assets

### App Icons
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── AppIcon-20@2x.png    # 40x40px
├── AppIcon-20@3x.png    # 60x60px
├── AppIcon-29@2x.png    # 58x58px
├── AppIcon-29@3x.png    # 87x87px
├── AppIcon-40@2x.png    # 80x80px
├── AppIcon-40@3x.png    # 120x120px
├── AppIcon-60@2x.png    # 120x120px
├── AppIcon-60@3x.png    # 180x180px
├── AppIcon-76.png       # 76x76px
├── AppIcon-76@2x.png    # 152x152px
├── AppIcon-83.5@2x.png  # 167x167px
├── AppIcon-1024.png     # 1024x1024px
└── Contents.json
```

### Launch Images
```
ios/App/App/Assets.xcassets/LaunchImage.launchimage/
├── Default.png          # 320x480px
├── Default@2x.png       # 640x960px
├── Default-568h@2x.png  # 640x1136px
├── Default-667h@2x.png  # 750x1334px
├── Default-736h@3x.png  # 1242x2208px
├── Default-Landscape.png     # 1024x768px
├── Default-Landscape@2x.png  # 2048x1536px
└── Contents.json
```

## 🎨 Design Guidelines

### App Icon Design
- **Theme**: Modern POS terminal with shopping cart
- **Style**: Minimalist, professional
- **Colors**: Primary blue with white/gray accents
- **Elements**: 
  - Cash register/terminal icon
  - Shopping cart or receipt symbol
  - Clean typography for "TMR" if space allows

### Icon Specifications
- **Format**: PNG-24 with no transparency for app icons
- **Background**: Solid color or subtle gradient
- **Safe Area**: Keep important elements within 80% of canvas
- **Contrast**: Ensure good visibility on all backgrounds
- **Scalability**: Design should be readable at 16x16px

### Splash Screen Design
- **Layout**: Centered logo on solid background
- **Background**: Brand primary color or white
- **Logo**: Simplified version of app icon
- **Text**: Optional "Loading..." text
- **Animation**: Consider subtle fade-in effect

## 📋 Asset Generation Checklist

### Pre-Production
- [ ] Create master 1024x1024px app icon
- [ ] Create 2732x2732px splash screen design
- [ ] Test icon visibility at small sizes
- [ ] Verify brand color consistency
- [ ] Check contrast ratios for accessibility

### iOS Generation
- [ ] Generate all AppIcon sizes using Icon Generator tool
- [ ] Create launch image variants for all screen sizes
- [ ] Update Contents.json files with proper references
- [ ] Test on various iOS device simulators
- [ ] Verify App Store Connect requirements

### Android Generation
- [ ] Generate adaptive icon layers (foreground/background)
- [ ] Create density-specific variants
- [ ] Generate round icon variants for supported launchers
- [ ] Create splash screens for all orientations
- [ ] Test on various Android device sizes

## 🛠️ Recommended Tools

### Icon Generation
- **Figma**: Vector design and export
- **Sketch**: macOS app icon design
- **Icon Generator**: Online batch generation
- **ImageOptim**: PNG compression
- **Android Asset Studio**: Google's official tool

### Quality Checks
- **iOS**: Test in Xcode iOS Simulator
- **Android**: Test in Android Studio AVD
- **Real Devices**: Test on actual hardware
- **App Store**: Use App Store Connect preview

## 🚀 Implementation Commands

### Update Capacitor Assets
```bash
# After placing assets in correct directories
npx cap sync

# Copy assets and update native projects
npx cap copy

# Open native IDEs to verify assets
npx cap open ios
npx cap open android
```

### Asset Validation
```bash
# iOS: Build and test
npx cap run ios

# Android: Build and test  
npx cap run android
```

## 📝 Notes for Implementation

1. **Automated Generation**: Consider using tools like `@capacitor/assets` for automated asset generation from source files.

2. **Brand Consistency**: Ensure all assets follow the same design language and color palette.

3. **Testing**: Always test on physical devices before submission to app stores.

4. **App Store Requirements**: 
   - iOS: Follow Apple Human Interface Guidelines
   - Android: Follow Material Design guidelines

5. **Performance**: Optimize PNG files for size without losing quality.

6. **Adaptive Icons**: Android supports adaptive icons - create separate foreground and background layers.

---

*This guide ensures professional app presentation and successful app store submission for TMR POS Mobile.*