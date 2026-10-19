import { describe, expect, it } from 'vitest';
import {
  getLocalizedTool,
  getLocalizedToolById,
  getToolById,
  getToolsByCategory,
  TOOL_I18N_MAP,
  TOOL_REGISTRY,
} from './tool-registry';

describe('ToolRegistry (Seam 3: Catalog & Architecture Verification)', () => {
  it('should have registered tools', () => {
    expect(TOOL_REGISTRY.length).toBeGreaterThan(0);
  });

  it('should verify all registered tools are 100% client side', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.isFullyClientSide).toBe(true);
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(typeof tool.loadComponent).toBe('function');
    }
  });

  it('should find exif-stripper tool by id', () => {
    const tool = getToolById('exif-stripper');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('EXIF & Privacy Metadata Stripper');
    expect(tool?.category).toBe('privacy');
  });

  it('should find crypto-hash-uuid tool by id', () => {
    const tool = getToolById('crypto-hash-uuid');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Cryptographic Hash & UUID Batch Generator');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find csv-to-sql-json tool by id', () => {
    const tool = getToolById('csv-to-sql-json');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('CSV / Excel to JSON, SQL & Markdown');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find pdf-merger-splitter tool by id', () => {
    const tool = getToolById('pdf-merger-splitter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('PDF Merger, Splitter & Page Organizer');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find pdf-redaction tool by id', () => {
    const tool = getToolById('pdf-redaction');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('PDF Redaction & Anonymizer');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find invoice-receipt-maker tool by id', () => {
    const tool = getToolById('invoice-receipt-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Instant Client-Side Invoice & Receipt Maker');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find graph-dot-grid-paper tool by id', () => {
    const tool = getToolById('graph-dot-grid-paper');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Custom Printable Graph & Dot Grid Paper');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find avery-barcode-sheet tool by id', () => {
    const tool = getToolById('avery-barcode-sheet');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Avery Barcode & Label Sheet Generator');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find table-tent-maker tool by id', () => {
    const tool = getToolById('table-tent-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Foldable Table Tent & Counter Sign Maker');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find batch-image-compressor tool by id', () => {
    const tool = getToolById('batch-image-compressor');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Batch Image Compressor & WebP Converter');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find favicon-app-icon-suite tool by id', () => {
    const tool = getToolById('favicon-app-icon-suite');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('App Icon & Favicon Suite Generator');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find og-card-maker tool by id', () => {
    const tool = getToolById('og-card-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Social Share (Open Graph) Card Maker');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find color-palette-extractor tool by id', () => {
    const tool = getToolById('color-palette-extractor');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Color Palette Extractor & Contrast Checker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find css-mesh-gradient-maker tool by id', () => {
    const tool = getToolById('css-mesh-gradient-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('CSS Mesh Gradient & Glassmorphism Code Maker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find subtitles-shifter tool by id', () => {
    const tool = getToolById('subtitles-shifter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Subtitles Timestamp Shifter & SRT/VTT Converter');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find calendar-linker tool by id', () => {
    const tool = getToolById('calendar-linker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Universal Event & .ics Calendar Linker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find tools by category', () => {
    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.length).toBeGreaterThan(0);
    expect(privacyTools.some((t) => t.id === 'exif-stripper')).toBe(true);
    expect(privacyTools.some((t) => t.id === 'crypto-hash-uuid')).toBe(true);
    expect(privacyTools.some((t) => t.id === 'pdf-redaction')).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.length).toBeGreaterThan(0);
    expect(devTools.some((t) => t.id === 'csv-to-sql-json')).toBe(true);
    expect(devTools.some((t) => t.id === 'color-palette-extractor')).toBe(true);
    expect(devTools.some((t) => t.id === 'css-mesh-gradient-maker')).toBe(true);
    expect(devTools.some((t) => t.id === 'calendar-linker')).toBe(true);
    expect(devTools.some((t) => t.id === 'email-signature-generator')).toBe(true);
    expect(devTools.some((t) => t.id === 'robots-sitemap-builder')).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.length).toBeGreaterThan(0);
    expect(docTools.some((t) => t.id === 'pdf-merger-splitter')).toBe(true);
    expect(docTools.some((t) => t.id === 'invoice-receipt-maker')).toBe(true);
    expect(docTools.some((t) => t.id === 'graph-dot-grid-paper')).toBe(true);
    expect(docTools.some((t) => t.id === 'avery-barcode-sheet')).toBe(true);
    expect(docTools.some((t) => t.id === 'table-tent-maker')).toBe(true);
    expect(docTools.some((t) => t.id === 'markdown-cheatsheet')).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.length).toBeGreaterThan(0);
    expect(mediaTools.some((t) => t.id === 'batch-image-compressor')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'favicon-app-icon-suite')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'og-card-maker')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'subtitles-shifter')).toBe(true);
  });

  it('should find email-signature-generator tool by id', () => {
    const tool = getToolById('email-signature-generator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('HTML Email Signature Generator');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find robots-sitemap-builder tool by id', () => {
    const tool = getToolById('robots-sitemap-builder');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Robots.txt & XML Sitemap Builder');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find markdown-cheatsheet tool by id', () => {
    const tool = getToolById('markdown-cheatsheet');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Markdown to Academic & Tech PDF Cheatsheet');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find audio-bpm-detector tool by id and category', () => {
    const tool = getToolById('audio-bpm-detector');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Audio BPM, Pitch & Key Tap Detector');
    expect(tool?.category).toBe('audio-video');
    expect(tool?.isFullyClientSide).toBe(true);

    const audioTools = getToolsByCategory('audio-video');
    expect(audioTools.some((t) => t.id === 'audio-bpm-detector')).toBe(true);
  });

  it('should find soundwave-art-maker tool by id and category', () => {
    const tool = getToolById('soundwave-art-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Spotify Code & Soundwave Art Maker');
    expect(tool?.category).toBe('audio-video');
    expect(tool?.isFullyClientSide).toBe(true);

    const audioTools = getToolsByCategory('audio-video');
    expect(audioTools.some((t) => t.id === 'soundwave-art-maker')).toBe(true);
  });

  it('should find video-to-gif tool by id and category', () => {
    const tool = getToolById('video-to-gif');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Video to GIF & Clip Trimmer');
    expect(tool?.category).toBe('audio-video');
    expect(tool?.isFullyClientSide).toBe(true);

    const audioTools = getToolsByCategory('audio-video');
    expect(audioTools.some((t) => t.id === 'video-to-gif')).toBe(true);
  });

  it('should find screenshot-mockup tool by id and category', () => {
    const tool = getToolById('screenshot-mockup');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('App Screenshot Mockup Studio');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.some((t) => t.id === 'screenshot-mockup')).toBe(true);
  });

  it('should find 3d-qr-stand tool by id and category', () => {
    const tool = getToolById('3d-qr-stand');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('3D QR Stand & Keychain Generator');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === '3d-qr-stand')).toBe(true);
  });

  it('should find cookie-cutter-3d tool by id and category', () => {
    const tool = getToolById('cookie-cutter-3d');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Custom Cookie Cutter & Stamp 3D Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'cookie-cutter-3d')).toBe(true);
  });

  it('should find desk-wedge-nameplate tool by id and category', () => {
    const tool = getToolById('desk-wedge-nameplate');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Parametric Desk Wedge & Nameplate Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'desk-wedge-nameplate')).toBe(true);
  });

  it('should find parametric-lamp-designer tool by id and category', () => {
    const tool = getToolById('parametric-lamp-designer');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('3D Parametric Lamp & Lampshade Designer');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'parametric-lamp-designer')).toBe(true);
  });

  it('should find lithophane-maker tool by id and category', () => {
    const tool = getToolById('lithophane-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Curved & Flat 3D Lithophane Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'lithophane-maker')).toBe(true);
  });

  it('should find gridfinity-bin-generator tool by id and category', () => {
    const tool = getToolById('gridfinity-bin-generator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Gridfinity & Modular Drawer Bin Generator');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'gridfinity-bin-generator')).toBe(true);
  });

  it('should find electronics-box-enclosure tool by id and category', () => {
    const tool = getToolById('electronics-box-enclosure');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Parametric Electronics Box & Snap-Fit Enclosure');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'electronics-box-enclosure')).toBe(true);
  });

  it('should find under-desk-clamp-generator tool by id and category', () => {
    const tool = getToolById('under-desk-clamp-generator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Under-Desk Clamp & Cable Management Generator');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'under-desk-clamp-generator')).toBe(true);
  });

  it('should find skadis-pegboard-maker tool by id and category', () => {
    const tool = getToolById('skadis-pegboard-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('IKEA Skadis & Pegboard Hook & Holder Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'skadis-pegboard-maker')).toBe(true);
  });

  it('should find geometric-plant-pot tool by id and category', () => {
    const tool = getToolById('geometric-plant-pot');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Geometric Plant Pot & Self-Watering Planter');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'geometric-plant-pot')).toBe(true);
  });

  it('should find braille-ada-sign-generator tool by id and category', () => {
    const tool = getToolById('braille-ada-sign-generator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Braille & ADA Tactile Door Sign Generator');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'braille-ada-sign-generator')).toBe(true);
  });

  it('should find keycap-switch-tester-maker tool by id and category', () => {
    const tool = getToolById('keycap-switch-tester-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Custom Mechanical Keycap & Switch Tester Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'keycap-switch-tester-maker')).toBe(true);
  });

  it('should find cappuccino-stencil-maker tool by id and category', () => {
    const tool = getToolById('cappuccino-stencil-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Cappuccino Stencil & Airbrush Template Maker');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'cappuccino-stencil-maker')).toBe(true);
  });

  it('should find pet-id-tag-generator tool by id and category', () => {
    const tool = getToolById('pet-id-tag-generator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Pet ID Tag & Collar Slide-On Generator');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'pet-id-tag-generator')).toBe(true);
  });

  it('should find hsw-insert-adapter tool by id and category', () => {
    const tool = getToolById('hsw-insert-adapter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Honeycomb Storage Wall (HSW) Insert & Adapter');
    expect(tool?.category).toBe('3d');
    expect(tool?.isFullyClientSide).toBe(true);

    const threeDTools = getToolsByCategory('3d');
    expect(threeDTools.some((t) => t.id === 'hsw-insert-adapter')).toBe(true);
  });

  it('should find passport-biometric-photo tool by id and category', () => {
    const tool = getToolById('passport-biometric-photo');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Passport, Visa & ID Biometric Photo Maker');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.some((t) => t.id === 'passport-biometric-photo')).toBe(true);
  });

  it('should find heic-avif-converter tool by id and category', () => {
    const tool = getToolById('heic-avif-converter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('HEIC & AVIF to JPG/PNG Batch Converter');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.some((t) => t.id === 'heic-avif-converter')).toBe(true);
  });

  it('should find pdf-signer-stamper tool by id and category', () => {
    const tool = getToolById('pdf-signer-stamper');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Client-Side PDF Signer, Date Stamper & Initials');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.some((t) => t.id === 'pdf-signer-stamper')).toBe(true);
  });

  it('should find background-remover tool by id and category', () => {
    const tool = getToolById('background-remover');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Automated Background Removal (High Quality)');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.some((t) => t.id === 'background-remover')).toBe(true);
  });

  it('should find dns-checker tool by id and category', () => {
    const tool = getToolById('dns-checker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Global DNS Propagation & WHOIS Checker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.some((t) => t.id === 'dns-checker')).toBe(true);
  });

  it('should find web-vitals tool by id and category', () => {
    const tool = getToolById('web-vitals');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Website Performance & Core Web Vitals Checker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.some((t) => t.id === 'web-vitals')).toBe(true);
  });

  it('should find face-plate-blur tool by id and category', () => {
    const tool = getToolById('face-plate-blur');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Face & License Plate Privacy Blur Tool');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);

    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.some((t) => t.id === 'face-plate-blur')).toBe(true);
  });

  it('should find local-ocr-text-extractor tool by id and category', () => {
    const tool = getToolById('local-ocr-text-extractor');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Local OCR Image & Scanned PDF to Text & Word');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.some((t) => t.id === 'local-ocr-text-extractor')).toBe(true);
  });

  it('should find file-encryptor-vault tool by id and category', () => {
    const tool = getToolById('file-encryptor-vault');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Zero-Knowledge File Encryptor & Vault');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);

    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.some((t) => t.id === 'file-encryptor-vault')).toBe(true);
  });

  it('should find pii-scrubber-anonymizer tool by id and category', () => {
    const tool = getToolById('pii-scrubber-anonymizer');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('PII Log & CSV Scrubber & Data Anonymizer');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);

    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.some((t) => t.id === 'pii-scrubber-anonymizer')).toBe(true);
  });

  it('should find bank-statement-converter tool by id and category', () => {
    const tool = getToolById('bank-statement-converter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Bank Statement CSV & OFX to Excel & QIF Converter');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.some((t) => t.id === 'bank-statement-converter')).toBe(true);
  });

  it('should find audio-trimmer-booster tool by id and category', () => {
    const tool = getToolById('audio-trimmer-booster');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Audio Trimmer, Volume Booster & Ringtone Maker');
    expect(tool?.category).toBe('audio-video');
    expect(tool?.isFullyClientSide).toBe(true);

    const audioTools = getToolsByCategory('audio-video');
    expect(audioTools.some((t) => t.id === 'audio-trimmer-booster')).toBe(true);
  });

  it('should find video-compressor-resizer tool by id and category', () => {
    const tool = getToolById('video-compressor-resizer');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Client-Side Video Compressor & Social Resizer');
    expect(tool?.category).toBe('audio-video');
    expect(tool?.isFullyClientSide).toBe(true);

    const audioTools = getToolsByCategory('audio-video');
    expect(audioTools.some((t) => t.id === 'video-compressor-resizer')).toBe(true);
  });

  it('should find nutrition-label-maker tool by id and category', () => {
    const tool = getToolById('nutrition-label-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('FDA & EU Nutrition Facts & Supplement Label Maker');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.some((t) => t.id === 'nutrition-label-maker')).toBe(true);
  });

  it('should find svg-optimizer-cleaner tool by id in dev category', () => {
    const tool = getToolById('svg-optimizer-cleaner');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('SVG Optimizer, Path Cleaner & React/Vue Exporter');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.some((t) => t.id === 'svg-optimizer-cleaner')).toBe(true);
  });

  describe('Tool Registry Localization (i18n)', () => {
    it('should have an i18n key mapping for every registered tool', () => {
      for (const tool of TOOL_REGISTRY) {
        const key = tool.i18nKey || TOOL_I18N_MAP[tool.id];
        expect(key).toBeDefined();
        expect(key?.length).toBeGreaterThan(0);
      }
    });

    it('should localize tool metadata using getLocalizedTool with Spanish translations', () => {
      const mockI18n = {
        t: (key: string) => {
          if (key === 'tools.exifStripper.name') return 'Eliminador de Metadatos EXIF y Privacidad';
          if (key === 'tools.exifStripper.description') return 'Elimina coordenadas GPS de fotos.';
          return key;
        },
      };

      const tool = getToolById('exif-stripper')!;
      const localized = getLocalizedTool(tool, mockI18n);

      expect(localized.name).toBe('Eliminador de Metadatos EXIF y Privacidad');
      expect(localized.description).toBe('Elimina coordenadas GPS de fotos.');
      expect(localized.i18nKey).toBe('exifStripper');
    });

    it('should retrieve localized tool by id via getLocalizedToolById', () => {
      const mockI18n = {
        t: (key: string) => {
          if (key === 'tools.cryptoHash.name') return 'Generador de Hashes Criptográficos';
          return key;
        },
      };

      const localized = getLocalizedToolById('crypto-hash-uuid', mockI18n);
      expect(localized).toBeDefined();
      expect(localized?.name).toBe('Generador de Hashes Criptográficos');
    });
  });
});
