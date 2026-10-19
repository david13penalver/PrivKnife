import { SignatureConfig } from './types';

/**
 * Self-contained SVG Data URI for default avatar image.
 * Eliminates external network requests to third-party image hosts (Unsplash).
 */
export const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiM5NGEzYjgiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik00IDIwYzAtNCA0LTYgOC02czggMiA4IDYiLz48L3N2Zz4=';

/**
 * Self-contained SVG Data URI for default corporate logo image.
 */
export const DEFAULT_LOGO_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAxNjAgNjAiPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzQ3NTU2OSI+TE9HTzwvdGV4dD48L3N2Zz4=';

export const DEFAULT_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Alex Morgan',
    jobTitle: 'Senior Software Engineer',
    department: 'Core Infrastructure',
    company: 'Apex Cloud Solutions',
  },
  contact: {
    email: 'alex.morgan@apexcloud.io',
    phone: '+1 (555) 019-2834',
    mobile: '+1 (555) 019-9944',
    website: 'https://apexcloud.io',
    address: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
  },
  social: {
    linkedin: 'https://linkedin.com/in/alexmorgan',
    twitter: 'https://x.com/alexmorgan',
    github: 'https://github.com/alexmorgan',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  images: {
    avatarUrl: DEFAULT_AVATAR_DATA_URI,
    avatarShape: 'round',
    avatarSize: 80,
    logoUrl: '',
    logoSize: 40,
  },
  style: {
    template: 'modern',
    primaryColor: '#2563eb',
    secondaryColor: '#4b5563',
    textColor: '#1f2937',
    fontFamily: 'Arial, sans-serif',
    fontSize: 'md',
    disclaimerText: '',
    includeBranding: false,
  },
};

export const CORPORATE_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Eleanor Vance',
    jobTitle: 'Chief Compliance Officer',
    department: 'Legal & Governance',
    company: 'Vance & Sterling Partners',
  },
  contact: {
    email: 'e.vance@vancestirling.com',
    phone: '+1 (212) 555-0144',
    mobile: '',
    website: 'https://vancestirling.com',
    address: '745 Fifth Avenue, 28th Floor, New York, NY 10151',
  },
  social: {
    linkedin: 'https://linkedin.com/company/vancestirling',
    twitter: '',
    github: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  images: {
    avatarUrl: DEFAULT_AVATAR_DATA_URI,
    avatarShape: 'rounded',
    avatarSize: 84,
    logoUrl: DEFAULT_LOGO_DATA_URI,
    logoSize: 48,
  },
  style: {
    template: 'corporate',
    primaryColor: '#0f172a',
    secondaryColor: '#475569',
    textColor: '#1e293b',
    fontFamily: 'Georgia, serif',
    fontSize: 'md',
    disclaimerText:
      'CONFIDENTIALITY NOTICE: This transmission is intended only for the use of the individual or entity to whom it is addressed and may contain confidential information. If you are not the intended recipient, any disclosure or distribution is strictly prohibited.',
    includeBranding: false,
  },
};

export const COMPACT_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Liam Chen',
    jobTitle: 'Product Designer',
    department: '',
    company: 'Studio Pixel',
  },
  contact: {
    email: 'liam@studiopixel.design',
    phone: '+1 (415) 555-8721',
    mobile: '',
    website: 'https://studiopixel.design',
    address: '',
  },
  social: {
    linkedin: 'https://linkedin.com/in/liamchen',
    twitter: 'https://x.com/liamdesign',
    github: '',
    instagram: 'https://instagram.com/liamdesign',
    facebook: '',
    youtube: '',
  },
  images: {
    avatarUrl: '',
    avatarShape: 'round',
    avatarSize: 64,
    logoUrl: '',
    logoSize: 32,
  },
  style: {
    template: 'compact',
    primaryColor: '#059669',
    secondaryColor: '#6b7280',
    textColor: '#111827',
    fontFamily: 'Helvetica, sans-serif',
    fontSize: 'sm',
    disclaimerText: '',
    includeBranding: false,
  },
};

export const MINIMAL_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Sophia Martinez',
    jobTitle: 'Independent Journalist & Essayist',
    department: '',
    company: 'The Sunday Dispatch',
  },
  contact: {
    email: 'sophia@sundaydispatch.org',
    phone: '',
    mobile: '+44 7700 900123',
    website: 'https://sundaydispatch.org',
    address: 'London, United Kingdom',
  },
  social: {
    linkedin: 'https://linkedin.com/in/sophiamartinez',
    twitter: 'https://x.com/sophiam',
    github: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  images: {
    avatarUrl: '',
    avatarShape: 'round',
    avatarSize: 72,
    logoUrl: '',
    logoSize: 36,
  },
  style: {
    template: 'minimal',
    primaryColor: '#7c3aed',
    secondaryColor: '#64748b',
    textColor: '#0f172a',
    fontFamily: "'Times New Roman', serif",
    fontSize: 'md',
    disclaimerText: '',
    includeBranding: false,
  },
};

export const TWO_COLUMN_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Marcus Brody',
    jobTitle: 'VP of Engineering',
    department: 'Platform Architecture',
    company: 'Nexus Tech Labs',
  },
  contact: {
    email: 'marcus@nexustech.dev',
    phone: '+1 (555) 782-9901',
    mobile: '+1 (555) 782-9902',
    website: 'https://nexustech.dev',
    address: '420 Silicon Blvd, Austin, TX 78701',
  },
  social: {
    linkedin: 'https://linkedin.com/in/marcusbrody',
    twitter: 'https://x.com/marcusbrody',
    github: 'https://github.com/marcusbrody',
    instagram: '',
    facebook: '',
    youtube: 'https://youtube.com/@marcusbrody',
  },
  images: {
    avatarUrl: DEFAULT_AVATAR_DATA_URI,
    avatarShape: 'round',
    avatarSize: 88,
    logoUrl: '',
    logoSize: 40,
  },
  style: {
    template: 'two-column',
    primaryColor: '#d97706',
    secondaryColor: '#4b5563',
    textColor: '#1f2937',
    fontFamily: 'Verdana, sans-serif',
    fontSize: 'md',
    disclaimerText: '',
    includeBranding: false,
  },
};

export const MALICIOUS_SIGNATURE_CONFIG: SignatureConfig = {
  personal: {
    fullName: 'Bad Actor <script>alert("hacked")</script>',
    jobTitle: 'Hacker <img src=x onerror="alert(1)">',
    department: 'Injections',
    company: 'Evil Corp',
  },
  contact: {
    email: 'bad@evil.com',
    phone: '123456789',
    mobile: '',
    website: 'javascript:alert(document.cookie)',
    address: '<b onmouseover="alert(1)">Darknet</b>',
  },
  social: {
    linkedin: 'javascript:alert("linkedin")',
    twitter: 'https://x.com/safe',
    github: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  images: {
    avatarUrl: 'javascript:alert("avatar")',
    avatarShape: 'round',
    avatarSize: 80,
    logoUrl: '',
    logoSize: 40,
  },
  style: {
    template: 'modern',
    primaryColor: '#2563eb',
    secondaryColor: '#4b5563',
    textColor: '#1f2937',
    fontFamily: 'Arial, sans-serif',
    fontSize: 'md',
    disclaimerText: '<script>evil()</script>Standard legal notice',
    includeBranding: false,
  },
};
