/**
 * PWA Icon Placeholder Generator
 * This file documents the required icons for the Lion Football Academy PWA
 * In production, these should be replaced with actual high-quality PNG icons
 */

const PWA_ICONS = {
  // Main app icons (required for PWA)
  'manifest-icon-192.maskable.png': {
    size: '192x192',
    purpose: 'maskable and any',
    description: 'Lion FA logo with safety padding for maskable icons',
    design: 'Lion head logo centered on green (#2c5530) background with golden (#f8b500) accents'
  },
  
  'manifest-icon-512.maskable.png': {
    size: '512x512', 
    purpose: 'maskable and any',
    description: 'High-res version of main app icon',
    design: 'Lion head logo centered on green background, high quality for splash screens'
  },

  // Apple Touch Icons
  'apple-icon-57x57.png': { size: '57x57', platform: 'iOS', device: 'iPhone (iOS 6.1 and prior)' },
  'apple-icon-60x60.png': { size: '60x60', platform: 'iOS', device: 'iPhone (iOS 7+)' },
  'apple-icon-72x72.png': { size: '72x72', platform: 'iOS', device: 'iPad (iOS 6.1 and prior)' },
  'apple-icon-76x76.png': { size: '76x76', platform: 'iOS', device: 'iPad (iOS 7+)' },
  'apple-icon-114x114.png': { size: '114x114', platform: 'iOS', device: 'iPhone Retina (iOS 6.1 and prior)' },
  'apple-icon-120x120.png': { size: '120x120', platform: 'iOS', device: 'iPhone Retina (iOS 7+)' },
  'apple-icon-144x144.png': { size: '144x144', platform: 'iOS', device: 'iPad Retina (iOS 6.1 and prior)' },
  'apple-icon-152x152.png': { size: '152x152', platform: 'iOS', device: 'iPad Retina (iOS 7+)' },
  'apple-icon-180x180.png': { size: '180x180', platform: 'iOS', device: 'iPhone 6 Plus' },

  // Android Icons
  'android-icon-36x36.png': { size: '36x36', platform: 'Android', density: '0.75x (ldpi)' },
  'android-icon-48x48.png': { size: '48x48', platform: 'Android', density: '1.0x (mdpi)' },
  'android-icon-72x72.png': { size: '72x72', platform: 'Android', density: '1.5x (hdpi)' },
  'android-icon-96x96.png': { size: '96x96', platform: 'Android', density: '2.0x (xhdpi)' },
  'android-icon-144x144.png': { size: '144x144', platform: 'Android', density: '3.0x (xxhdpi)' },
  'android-icon-192x192.png': { size: '192x192', platform: 'Android', density: '4.0x (xxxhdpi)' },

  // Favicon Icons
  'favicon-16x16.png': { size: '16x16', purpose: 'Browser tab icon' },
  'favicon-32x32.png': { size: '32x32', purpose: 'Browser tab icon' },
  'favicon-96x96.png': { size: '96x96', purpose: 'Browser bookmark icon' },

  // Shortcut Icons
  'shortcut-qr.png': {
    size: '96x96',
    purpose: 'QR Code attendance shortcut',
    design: 'QR code icon with football/soccer ball elements'
  },
  'shortcut-training.png': {
    size: '96x96', 
    purpose: 'Training schedule shortcut',
    design: 'Calendar icon with football/soccer ball'
  },
  'shortcut-messages.png': {
    size: '96x96',
    purpose: 'Messages shortcut', 
    design: 'Chat bubble icon with team colors'
  },
  'shortcut-performance.png': {
    size: '96x96',
    purpose: 'Performance stats shortcut',
    design: 'Chart/graph icon with football theme'
  }
};

/**
 * Design Guidelines for Lion Football Academy Icons:
 * 
 * Primary Colors:
 * - Green: #2c5530 (Lion Football Academy primary)
 * - Gold: #f8b500 (Lion Football Academy accent)
 * - White: #ffffff (text/contrast)
 * 
 * Design Elements:
 * - Lion head silhouette (main logo)
 * - Football/soccer ball elements
 * - Clean, modern design
 * - High contrast for accessibility
 * - Scalable vector-based designs
 * 
 * Maskable Icon Requirements:
 * - 20% safe zone padding around the main design
 * - Design should work when cropped to circle or other shapes
 * - Important elements should be in the center 60% of the icon
 * 
 * Production Notes:
 * 1. Create SVG master files for scalability
 * 2. Export to PNG at exact required sizes
 * 3. Optimize file sizes without quality loss
 * 4. Test on various devices and platforms
 * 5. Validate with PWA testing tools
 */

module.exports = PWA_ICONS;