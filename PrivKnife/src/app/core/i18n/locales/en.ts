import type { enToolCatalog } from './en-tool-catalog';
import type { enToolLoaders } from './en-tool-loaders';

export const en = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'Private In-Browser Toolkit',
    privacyBadge: '🛡️ 100% In-Browser • Never Leaves Your Device',
    inBrowserBadge: '100% In-Browser',
    zeroServerNotice: 'Zero Server Ingestion • Zero Telemetry',
    themeLight: '☀️ Light',
    themeDark: '🌙 Dark',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    selectLanguage: 'Select language',
    download: 'Download',
    copy: 'Copy',
    copied: '✓ Copied!',
    reset: 'Reset',
    clear: 'Clear',
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    loading: 'Loading...',
    processing: 'Processing...',
    error: 'Error',
    dropFilesPrompt: 'Drop your files here, or browse',
    offlineGuarantee: 'Processed 100% locally with zero server upload',
    preview: 'Preview',
    settings: 'Settings',
    options: 'Options',
    save: 'Save',
    undo: 'Undo',
    readyToUse: 'Ready to Use',
    roadmap: 'Roadmap',
    comingSoon: 'Coming Soon',
    openTool: 'Open Tool',
    clearFilters: 'Clear Filters',
    guaranteedClientSide: 'Guaranteed Client-Side',
    verifiableOpenSource: 'Verifiable & Open Source',
    curatedPresets: 'Curated Presets:',
    resetDefaults: '↺ Reset Defaults',
    dimensions: 'DIMENSIONS',
    triangles: 'Triangles:',
    mesh: 'Mesh',
    resetView: 'Reset View',
    slicerSettings: 'Manufacturing Telemetry & Slicer Settings',
    estFilament: 'EST. FILAMENT',
    estPrintTime: 'EST. PRINT TIME',
    grams: 'grams',
    hours: 'hours',
    recommendedSlicerTips: 'Recommended Slicer Instructions:',
    exportPng: '📷 High-Res PNG',
    export3mf: 'Download .3MF Archive',
    exportStl: 'Download Print-Ready .STL',
    exportFormats: 'Export Formats:',
    estWeight: 'EST. WEIGHT',
    interactivePreview: 'Interactive Preview',
    loadSample: 'Load Sample',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'Private In-Browser Toolkit',
    languageSelectAria: 'Select application language',
  },
  home: {
    heroTitle: 'Consolidated Everyday Tools.',
    heroSubtitle: 'No Backend Servers. Zero Telemetry. 100% Client-Side.',
    heroBadge: '🛡️ 100% In-Browser • Zero Server Ingestion • Zero Telemetry',
    heroHeadingStart: 'The Private In-Browser',
    heroHeadingHighlight: 'Swiss Army Knife',
    heroDescription:
      'A consolidated suite of fast, everyday web tools running entirely inside your browser. No cloud uploads. No telemetry. No cookies.',
    ribbonTools: '🇨🇭 59+ Everyday Tools',
    ribbonZeroBytes: '🔒 0 Bytes Leaves Device',
    ribbonWasm: '⚡ Client-Side WebAssembly',
    ribbonOpenSource: '📜 MIT Open Source',
    searchPlaceholder: 'Search 59+ private tools (PDF, images, 3D, crypto, dev)...',
    allTools: 'All Tools',
    toolsCount: '{count} tools available',
    noResultsTitle: 'No matching tools found',
    noResultsHint: 'Try a different search query or select a category above.',
    launchTool: 'Launch Tool',
    privacyByArchTitle: 'Privacy by Architecture, Not by Policy',
    privacyByArchDesc:
      'Most web tools ask you to trust their legal terms while silently uploading your private documents to remote cloud storage. PrivKnife is fundamentally different.',
    categories: {
      all: 'All Tools',
      privacy: 'Privacy & Security',
      documents: 'Documents & PDF',
      media: 'Media & Graphics',
      audioVideo: 'Audio & Video',
      dev: 'Developer Utilities',
      '3d': '3D Printing & CAD',
    },
    pillars: {
      zeroServerTitle: 'Zero Server Ingestion',
      zeroServerDesc:
        'PrivKnife has no processing servers or remote storage buckets. All file parsing, binary manipulation, and rendering run on your local machine using WebAssembly and Web Workers.',
      privacyTitle: 'Zero Telemetry & Tracking',
      privacyDesc:
        'No Google Analytics, no tracking pixels, no telemetry beacons, and zero advertising cookies. You operate with complete digital anonymity.',
      threadTitle: 'Blazing Local Performance',
      threadDesc:
        'Zero network upload latency. Process gigabyte-scale documents or hundreds of photos directly on your device CPU/GPU at full native speed.',
    },
    verifiableTitle: 'Verifiable & Open Source',
    verifiableDesc:
      'Open your browser DevTools (F12) → Network tab to verify 0 network requests, or inspect our source code on GitHub.',
    githubRepo: 'GitHub Repository',
    uiKitDesignSystem: 'Design System & UI Kit',
  },
  footer: {
    mission:
      'PrivKnife runs completely in your web browser with zero server data ingestion and zero analytics tracking.',
    privacyNotice: 'Privacy by Architecture, Not by Policy.',
    copyright: '© 2026 PrivKnife. Open Source under MIT License.',
    zeroStorage: 'Zero Server Storage • Zero Telemetry • Zero Cookies',
    privacyLink: 'Privacy',
    termsLink: 'Terms',
    uiKitLink: 'UI Kit',
    githubLink: 'GitHub',
    contactLink: 'Contact & Issues',
  },
};

type EnglishCatalog = typeof enToolCatalog;
type EnglishToolLoaders = typeof enToolLoaders;

export type TranslationSchema = typeof en & {
  tools: {
    [Key in keyof EnglishCatalog]: EnglishCatalog[Key] & (Key extends keyof EnglishToolLoaders
      ? Awaited<ReturnType<EnglishToolLoaders[Key]>>['default']
      : unknown);
  };
};
