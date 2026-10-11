import {
  TableTentConfig,
  TableTentPreset,
  ThemeColors,
} from './types';

export const THEME_PRESETS: ThemeColors[] = [
  {
    id: 'clean-white',
    name: 'Clean White',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    accentColor: '#2563eb',
    borderColor: '#e2e8f0',
  },
  {
    id: 'elegant-navy',
    name: 'Navy & Gold',
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    accentColor: '#f59e0b',
    borderColor: '#334155',
  },
  {
    id: 'warm-kraft',
    name: 'Warm Kraft',
    backgroundColor: '#faf5ee',
    textColor: '#451a03',
    accentColor: '#b45309',
    borderColor: '#d7c4b7',
  },
  {
    id: 'modern-emerald',
    name: 'Modern Emerald',
    backgroundColor: '#f0fdf4',
    textColor: '#064e3b',
    accentColor: '#059669',
    borderColor: '#a7f3d0',
  },
];

export const DEFAULT_TENT_CONFIG: TableTentConfig = {
  paperFormat: 'a4',
  orientation: 'portrait',
  foldType: 'bi-fold',
  mirrorPanels: true,
  frontPanel: {
    title: 'Scan for Digital Menu',
    subtitle: 'Table Service & Daily Specials',
    body: 'Point your camera at the QR code below to view our full menu, drink list, and daily seasonal specials.',
    tableNumber: '12',
    qrUrl: 'https://privknife.com/menu',
    qrLabel: 'Scan Menu',
  },
  backPanel: {
    title: 'Scan for Digital Menu',
    subtitle: 'Table Service & Daily Specials',
    body: 'Point your camera at the QR code below to view our full menu, drink list, and daily seasonal specials.',
    tableNumber: '12',
    qrUrl: 'https://privknife.com/menu',
    qrLabel: 'Scan Menu',
  },
  theme: THEME_PRESETS[0],
  fontFamily: 'helvetica',
  alignment: 'center',
  showFoldLines: true,
  showCutMarks: true,
  showTableNumberBadge: true,
  includeQrCode: true,
};

export const TENT_PRESETS: TableTentPreset[] = [
  {
    id: 'restaurant-menu',
    name: 'Restaurant QR Menu',
    description: 'Digital menu QR code with table number and ordering instructions.',
    config: {
      foldType: 'bi-fold',
      mirrorPanels: true,
      frontPanel: {
        title: 'Scan for Menu',
        subtitle: 'Contactless Dining Experience',
        body: 'Scan to browse our drinks, appetizers, and chef specials.',
        tableNumber: '8',
        qrUrl: 'https://example.com/menu',
        qrLabel: 'View Menu',
      },
    },
  },
  {
    id: 'wedding-reserved',
    name: 'Wedding & Event Reserved',
    description: 'Elegant place card for VIP tables and reserved wedding seating.',
    config: {
      foldType: 'bi-fold',
      mirrorPanels: true,
      theme: THEME_PRESETS[1], // Navy & Gold
      fontFamily: 'times',
      showTableNumberBadge: true,
      includeQrCode: false,
      frontPanel: {
        title: 'Table Reserved',
        subtitle: 'The Miller & Davis Wedding',
        body: 'Honoring our bridal party & immediate family members.',
        tableNumber: 'VIP',
      },
    },
  },
  {
    id: 'hotel-wifi',
    name: 'Hotel / Cafe Wi-Fi Sign',
    description: 'Guest Wi-Fi network credentials with QR login link.',
    config: {
      foldType: 'tri-fold',
      mirrorPanels: true,
      theme: THEME_PRESETS[2], // Warm Kraft
      includeQrCode: true,
      showTableNumberBadge: false,
      frontPanel: {
        title: 'Complimentary Wi-Fi',
        subtitle: 'Network: Guest_HighSpeed',
        body: 'Password: CoffeeBreak2026\nEnjoy 1Gbps high-speed fiber internet during your stay.',
        qrUrl: 'WIFI:S:Guest_HighSpeed;T:WPA;P:CoffeeBreak2026;;',
        qrLabel: 'Connect Instantly',
      },
    },
  },
  {
    id: 'conference-desk',
    name: 'Conference Nameplate',
    description: 'Executive speaker desk wedge with organization logo and schedule QR.',
    config: {
      foldType: 'tri-fold',
      mirrorPanels: true,
      theme: THEME_PRESETS[3],
      showTableNumberBadge: false,
      includeQrCode: true,
      frontPanel: {
        title: 'Dr. Evelyn Vance',
        subtitle: 'Director of AI Systems • DeepTech Labs',
        body: 'Keynote Session: Edge Computing & Private Architecture',
        qrUrl: 'https://example.com/speaker/vance',
        qrLabel: 'Speaker Bio',
      },
    },
  },
];
