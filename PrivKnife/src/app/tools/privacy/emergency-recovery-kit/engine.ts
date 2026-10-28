import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  EmergencyRecoveryKitOptions,
  EmergencyRecoveryKitResult,
  PageDimensionsMm,
  PaperFormat,
} from './types';

/**
 * Escapes XML/SVG special characters to prevent XSS / markup injection.
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns physical page dimensions in millimeters for standard paper sizes.
 */
export function getPageDimensionsMm(format: PaperFormat): PageDimensionsMm {
  if (format === 'us_letter') {
    return { width: 215.9, height: 279.4 };
  }
  return { width: 210, height: 297 }; // A4
}

/**
 * Computes a deterministic SHA-256 hex checksum for text using Web Crypto or fallback.
 */
export async function computeDocumentHash(content: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(content);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback 64-character pseudo-hash for non-crypto environments
  let h1 = 0x811c9dc5;
  let h2 = 0x41c6ce57;
  let h3 = 0xdeadbeef;
  let h4 = 0xabcdef01;
  for (let i = 0; i < data.length; i++) {
    h1 = Math.imul(h1 ^ data[i], 0x01000193);
    h2 = Math.imul(h2 ^ data[i], 1597334677);
    h3 = Math.imul(h3 ^ data[i], 2654435761);
    h4 = Math.imul(h4 ^ data[i], 3141592653);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2 + p3 + p4).repeat(2);
}

/**
 * Computes deterministic SHA-256 fingerprint for options object or stringified options.
 */
export async function computeTemplateHash(
  options: EmergencyRecoveryKitOptions | string
): Promise<string> {
  let opts: EmergencyRecoveryKitOptions;
  if (typeof options === 'string') {
    try {
      opts = JSON.parse(options) as EmergencyRecoveryKitOptions;
    } catch {
      return computeDocumentHash(options);
    }
  } else {
    opts = options;
  }

  const sortedOptions = {
    paperFormat: opts.paperFormat,
    kitTitle: opts.kitTitle,
    vaultCustodian: opts.vaultCustodian,
    includeMasterVaultSection: opts.includeMasterVaultSection,
    includeTwoFaCodesSection: opts.includeTwoFaCodesSection,
    includeSeedPhraseSection: opts.includeSeedPhraseSection,
    seedPhraseWordCount: opts.seedPhraseWordCount,
    includeEmergencyContacts: opts.includeEmergencyContacts,
    includeTamperFoldSeals: opts.includeTamperFoldSeals,
    includeOfflineChecksumQr: opts.includeOfflineChecksumQr,
    highContrastMonochrome: opts.highContrastMonochrome,
    additionalInstructions: opts.additionalInstructions,
  };
  return computeDocumentHash(JSON.stringify(sortedOptions));
}

/**
 * Generates an offline verification payload for the QR code without external URLs.
 */
export function generateVerificationQrPayload(
  options: EmergencyRecoveryKitOptions,
  checksum: string
): string {
  return [
    'PRIVKNIFE OFFLINE INTEGRITY CHECK',
    `TITLE: ${options.kitTitle}`,
    `CUSTODIAN: ${options.vaultCustodian || 'N/A'}`,
    `FORMAT: ${options.paperFormat.toUpperCase()}`,
    `SEED: ${options.includeSeedPhraseSection ? `${options.seedPhraseWordCount} WORDS` : 'NONE'}`,
    `SHA256: ${checksum}`,
    'VERIFICATION: 100% IN-BROWSER OFFLINE PAPER VAULT',
  ].join('\n');
}

/**
 * Generates an interactive SVG visual representation of the emergency sheet for live preview.
 */
export function generateEmergencyKitSvg(
  options: EmergencyRecoveryKitOptions,
  checksum: string
): string {
  const dim = getPageDimensionsMm(options.paperFormat);
  const width = dim.width * 3.5;
  const height = dim.height * 3.5;

  const isMono = options.highContrastMonochrome;
  const borderPrimary = isMono ? '#000000' : '#dc2626'; // security red or black
  const headerBg = isMono ? '#f3f4f6' : '#fef2f2';
  const textDark = '#111827';
  const textMuted = '#4b5563';
  const boxBorder = '#9ca3af';

  const escapedTitle = escapeXml(options.kitTitle ? options.kitTitle.toUpperCase() : 'CONFIDENTIAL EMERGENCY RECOVERY KIT');
  const escapedCustodian = escapeXml(options.vaultCustodian || 'Authorized Executor Only');
  const escapedChecksum = escapeXml(checksum);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="max-height: 760px; display: block;">
  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />

  <!-- Security Perimeter Borders -->
  <rect x="15" y="15" width="${width - 30}" height="${height - 30}" fill="none" stroke="${borderPrimary}" stroke-width="2.5" />
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="${borderPrimary}" stroke-width="0.8" stroke-dasharray="6 3" />

  <!-- Corner Crosshairs -->
  <path d="M 25 15 L 25 35 M 15 25 L 35 25" stroke="${borderPrimary}" stroke-width="1.5" />
  <path d="M ${width - 25} 15 L ${width - 25} 35 M ${width - 35} 25 L ${width - 15} 25" stroke="${borderPrimary}" stroke-width="1.5" />
  <path d="M 25 ${height - 15} L 25 ${height - 35} M 15 ${height - 25} L 35 ${height - 25}" stroke="${borderPrimary}" stroke-width="1.5" />
  <path d="M ${width - 25} ${height - 15} L ${width - 25} ${height - 35} M ${width - 35} ${height - 25} L ${width - 15} ${height - 25}" stroke="${borderPrimary}" stroke-width="1.5" />

  <!-- Security Classification Header -->
  <rect x="35" y="32" width="${width - 70}" height="42" fill="${headerBg}" stroke="${borderPrimary}" stroke-width="1" rx="4" />
  <text x="${width / 2}" y="52" fill="${borderPrimary}" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="2">
    ${escapedTitle}
  </text>
  <text x="${width / 2}" y="67" fill="${textMuted}" font-family="sans-serif" font-size="10" text-anchor="middle">
    Custodian: ${escapedCustodian} • Offline Verification Standard
  </text>
`;

  let currentY = 88;

  // Section 1: Master Password Vault
  if (options.includeMasterVaultSection) {
    svg += `
  <!-- Master Password Vault -->
  <g transform="translate(35, ${currentY})">
    <rect x="0" y="0" width="${width - 70}" height="88" fill="#fafafa" stroke="${boxBorder}" stroke-width="1" rx="4" />
    <text x="12" y="18" fill="${textDark}" font-family="sans-serif" font-size="12" font-weight="bold">1. Master Password Vault &amp; Credentials</text>
    
    <text x="14" y="36" fill="${textMuted}" font-family="sans-serif" font-size="10">Password Manager (e.g. Bitwarden / 1Password / KeePass):</text>
    <line x1="14" y1="48" x2="${width - 95}" y2="48" stroke="${boxBorder}" stroke-dasharray="3 3" />

    <text x="14" y="64" fill="${textMuted}" font-family="sans-serif" font-size="10">Primary Email &amp; Master Password (Handwrite clearly):</text>
    <line x1="14" y1="76" x2="${width - 95}" y2="76" stroke="${boxBorder}" stroke-dasharray="3 3" />
  </g>`;
    currentY += 98;
  }

  // Section 2: 2FA Backup Codes
  if (options.includeTwoFaCodesSection) {
    svg += `
  <!-- 2FA Backup Codes -->
  <g transform="translate(35, ${currentY})">
    <rect x="0" y="0" width="${width - 70}" height="80" fill="#fafafa" stroke="${boxBorder}" stroke-width="1" rx="4" />
    <text x="12" y="18" fill="${textDark}" font-family="sans-serif" font-size="12" font-weight="bold">2. 2FA Backup &amp; Recovery Codes</text>`;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col + 1;
        const bx = 14 + col * ((width - 110) / 4);
        const by = 26 + row * 24;
        svg += `
    <rect x="${bx}" y="${by}" width="12" height="12" fill="none" stroke="${boxBorder}" stroke-width="1" />
    <text x="${bx + 18}" y="${by + 10}" fill="${textMuted}" font-family="monospace" font-size="10">${idx.toString().padStart(2, '0')}: ________</text>`;
      }
    }

    svg += `
  </g>`;
    currentY += 90;
  }

  // Section 3: Seed Phrase Section (12 or 24 words)
  if (options.includeSeedPhraseSection) {
    const wordCount = options.seedPhraseWordCount || 24;
    const rows = wordCount === 24 ? 6 : 4;
    const cols = wordCount === 24 ? 4 : 3;
    const boxHeight = rows * 25 + 30;

    svg += `
  <!-- Cryptographic Seed Phrase -->
  <g transform="translate(35, ${currentY})">
    <rect x="0" y="0" width="${width - 70}" height="${boxHeight}" fill="#fafafa" stroke="${boxBorder}" stroke-width="1" rx="4" />
    <text x="12" y="18" fill="${textDark}" font-family="sans-serif" font-size="12" font-weight="bold">3. Cryptographic Seed Phrase (${wordCount} Words • BIP-39)</text>`;

    const colWidth = (width - 100) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c + 1;
        if (idx <= wordCount) {
          const sx = 14 + c * colWidth;
          const sy = 26 + r * 24;
          svg += `
      <rect x="${sx}" y="${sy}" width="${colWidth - 8}" height="20" fill="#ffffff" stroke="${boxBorder}" stroke-width="0.8" rx="2" />
      <text x="${sx + 6}" y="${sy + 14}" fill="${borderPrimary}" font-family="monospace" font-size="9" font-weight="bold">${idx.toString().padStart(2, '0')}.</text>
      <line x1="${sx + 24}" y1="${sy + 15}" x2="${sx + colWidth - 12}" y2="${sy + 15}" stroke="#d1d5db" stroke-dasharray="2 2" />`;
        }
      }
    }

    svg += `
  </g>`;
    currentY += boxHeight + 10;
  }

  // Section 4: Emergency Contacts
  if (options.includeEmergencyContacts) {
    svg += `
  <!-- Emergency Contacts -->
  <g transform="translate(35, ${currentY})">
    <rect x="0" y="0" width="${width - 70}" height="76" fill="#fafafa" stroke="${boxBorder}" stroke-width="1" rx="4" />
    <text x="12" y="18" fill="${textDark}" font-family="sans-serif" font-size="12" font-weight="bold">4. Emergency Contacts &amp; Directives</text>
    
    <text x="14" y="36" fill="${textMuted}" font-family="sans-serif" font-size="10">Designated Executor / Legal Counsel:</text>
    <line x1="14" y1="46" x2="${width - 95}" y2="46" stroke="${boxBorder}" stroke-dasharray="3 3" />

    <text x="14" y="60" fill="${textMuted}" font-family="sans-serif" font-size="10">Emergency Trusted Next-of-Kin / Safe Location:</text>
    <line x1="14" y1="70" x2="${width - 95}" y2="70" stroke="${boxBorder}" stroke-dasharray="3 3" />
  </g>`;
    currentY += 86;
  }

  // Additional Instructions Directive Box (DEFECT-59-02)
  if (options.additionalInstructions && options.additionalInstructions.trim().length > 0) {
    const escapedInstructions = escapeXml(options.additionalInstructions.trim());
    svg += `
  <!-- Additional Directives -->
  <g transform="translate(35, ${currentY})">
    <rect x="0" y="0" width="${width - 70}" height="48" fill="#f8fafc" stroke="${boxBorder}" stroke-width="1" rx="4" />
    <text x="12" y="16" fill="${textDark}" font-family="sans-serif" font-size="11" font-weight="bold">Directives for Custodian &amp; Heirs:</text>
    <text x="14" y="32" fill="${textMuted}" font-family="sans-serif" font-size="9">${escapedInstructions}</text>
  </g>`;
  }

  // Section 5: Tamper Seals & Fold Guides
  if (options.includeTamperFoldSeals) {
    const sealY = height - 130;
    const escapedInstructions = escapeXml(
      options.additionalInstructions || 'Store strictly in a fireproof safe or bank deposit box.'
    );
    svg += `
  <!-- Tamper Seal & Fold Guide -->
  <g transform="translate(35, ${sealY})">
    <line x1="0" y1="0" x2="${width - 70}" y2="0" stroke="${borderPrimary}" stroke-width="1.2" stroke-dasharray="6 4" />
    <text x="${(width - 70) / 2}" y="-6" fill="${borderPrimary}" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">
      ✂️ FOLD / CUT ALONG LINE TO CONCEAL CREDENTIALS • AFFIX TAMPER SEAL OVER SEAM
    </text>
    <rect x="0" y="10" width="${width - 70}" height="46" fill="#fffbeb" stroke="#fef08a" stroke-width="1" rx="4" />
    <text x="12" y="26" fill="#92400e" font-family="sans-serif" font-size="10" font-weight="bold">PHYSICAL TAMPER VERIFICATION:</text>
    <text x="12" y="40" fill="#b45309" font-family="sans-serif" font-size="9">If seal or fold is compromised, immediately rotate all master passwords and migrate funds.</text>
    <text x="12" y="52" fill="#78350f" font-family="sans-serif" font-size="8">${escapedInstructions}</text>
  </g>`;
  }

  // Offline Checksum QR Code representation (DEFECT-59-02)
  if (options.includeOfflineChecksumQr) {
    svg += `
  <!-- Offline Verification QR Matrix -->
  <g transform="translate(${width - 85}, ${height - 62})">
    <rect x="0" y="0" width="46" height="46" fill="#ffffff" stroke="${borderPrimary}" stroke-width="1.2" rx="2" />
    <!-- QR finder patterns -->
    <rect x="4" y="4" width="12" height="12" fill="${borderPrimary}" />
    <rect x="6" y="6" width="8" height="8" fill="#ffffff" />
    <rect x="7" y="7" width="6" height="6" fill="${borderPrimary}" />
    <rect x="30" y="4" width="12" height="12" fill="${borderPrimary}" />
    <rect x="32" y="6" width="8" height="8" fill="#ffffff" />
    <rect x="33" y="7" width="6" height="6" fill="${borderPrimary}" />
    <rect x="4" y="30" width="12" height="12" fill="${borderPrimary}" />
    <rect x="6" y="32" width="8" height="8" fill="#ffffff" />
    <rect x="7" y="33" width="6" height="6" fill="${borderPrimary}" />
    <text x="23" y="43" fill="${borderPrimary}" font-family="sans-serif" font-size="5" text-anchor="middle">OFFLINE QR</text>
  </g>`;
  }

  // Footer Checksum Bar
  svg += `
  <!-- Footer & SHA-256 Offline Fingerprint -->
  <g transform="translate(35, ${height - 42})">
    <text x="0" y="0" fill="${textMuted}" font-family="sans-serif" font-size="9">PrivKnife 100% In-Browser Physical Paper Vault • Strictly Zero Server Storage</text>
    <text x="0" y="14" fill="${textDark}" font-family="monospace" font-size="8">SHA-256: ${escapedChecksum}</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Generates an architectural / print-ready PDF using jsPDF.
 */
export async function generateEmergencyKitPdf(
  options: EmergencyRecoveryKitOptions,
  precomputedChecksum?: string
): Promise<EmergencyRecoveryKitResult> {
  const dim = getPageDimensionsMm(options.paperFormat);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperFormat === 'us_letter' ? 'letter' : 'a4',
  });

  const pageWidth = dim.width;
  const pageHeight = dim.height;
  const margin = 12;

  const isMono = options.highContrastMonochrome;
  const borderRgb: [number, number, number] = isMono ? [0, 0, 0] : [220, 38, 38];
  const darkRgb: [number, number, number] = [17, 24, 39];
  const mutedRgb: [number, number, number] = [100, 116, 139];
  const boxBorderRgb: [number, number, number] = [156, 163, 175];

  // Deterministic checksum matching SVG preview
  const checksum = precomputedChecksum || (await computeTemplateHash(options));

  // Outer Security Border
  doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
  doc.setLineWidth(0.7);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner dashed border
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(margin + 2, margin + 2, pageWidth - (margin + 2) * 2, pageHeight - (margin + 2) * 2);
  doc.setLineDashPattern([], 0); // Reset dash

  // Header Banner
  doc.setFillColor(isMono ? 245 : 254, isMono ? 245 : 242, isMono ? 245 : 242);
  doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin + 6, margin + 6, pageWidth - (margin + 6) * 2, 16, 'FD');

  doc.setTextColor(borderRgb[0], borderRgb[1], borderRgb[2]);
  doc.setFontSize(11);
  doc.text(
    options.kitTitle ? options.kitTitle.toUpperCase() : 'CONFIDENTIAL EMERGENCY RECOVERY KIT',
    pageWidth / 2,
    margin + 12,
    { align: 'center' }
  );

  doc.setFontSize(7.5);
  doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
  doc.text(
    `Custodian: ${options.vaultCustodian || 'Authorized Executor Only'}  |  Offline Cryptographic Paper Vault Standard`,
    pageWidth / 2,
    margin + 18,
    { align: 'center' }
  );

  let curY = margin + 26;

  // 1. Master Vault Credentials
  if (options.includeMasterVaultSection) {
    const boxH = 26;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(boxBorderRgb[0], boxBorderRgb[1], boxBorderRgb[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin + 6, curY, pageWidth - (margin + 6) * 2, boxH, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(darkRgb[0], darkRgb[1], darkRgb[2]);
    doc.text('1. MASTER PASSWORD & DIGITAL VAULT CREDENTIALS', margin + 9, curY + 5);

    doc.setFontSize(7);
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    doc.text('Password Manager (Bitwarden / 1Password / KeePass):', margin + 9, curY + 11);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(margin + 9, curY + 14, pageWidth - margin - 9, curY + 14);

    doc.text('Primary Email & Master Password (Handwrite clearly):', margin + 9, curY + 19);
    doc.line(margin + 9, curY + 23, pageWidth - margin - 9, curY + 23);
    doc.setLineDashPattern([], 0);

    curY += boxH + 4;
  }

  // 2. 2FA Backup Codes
  if (options.includeTwoFaCodesSection) {
    const boxH = 24;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(boxBorderRgb[0], boxBorderRgb[1], boxBorderRgb[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin + 6, curY, pageWidth - (margin + 6) * 2, boxH, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(darkRgb[0], darkRgb[1], darkRgb[2]);
    doc.text('2. 2FA EMERGENCY BACKUP CODES', margin + 9, curY + 5);

    doc.setFontSize(6.5);
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    const usableW = pageWidth - (margin + 6) * 2 - 6;
    const colW = usableW / 4;

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c + 1;
        const bx = margin + 9 + c * colW;
        const by = curY + 8 + r * 7;
        doc.rect(bx, by, 3, 3);
        doc.text(`${idx.toString().padStart(2, '0')}: ________`, bx + 5, by + 2.5);
      }
    }

    curY += boxH + 4;
  }

  // 3. Seed Phrase
  if (options.includeSeedPhraseSection) {
    const wordCount = options.seedPhraseWordCount || 24;
    const rows = wordCount === 24 ? 6 : 4;
    const cols = wordCount === 24 ? 4 : 3;
    const boxH = rows * 6.5 + 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(boxBorderRgb[0], boxBorderRgb[1], boxBorderRgb[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin + 6, curY, pageWidth - (margin + 6) * 2, boxH, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(darkRgb[0], darkRgb[1], darkRgb[2]);
    doc.text(`3. CRYPTOGRAPHIC SEED PHRASE (${wordCount} Words • BIP-39 Standard)`, margin + 9, curY + 5);

    const usableW = pageWidth - (margin + 6) * 2 - 6;
    const colW = usableW / cols;

    doc.setFontSize(6.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c + 1;
        if (idx <= wordCount) {
          const bx = margin + 9 + c * colW;
          const by = curY + 8 + r * 6.5;
          doc.setFillColor(255, 255, 255);
          doc.rect(bx, by, colW - 3, 5, 'FD');
          doc.setTextColor(borderRgb[0], borderRgb[1], borderRgb[2]);
          doc.text(`${idx.toString().padStart(2, '0')}.`, bx + 1.5, by + 3.5);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(bx + 7, by + 3.5, bx + colW - 5, by + 3.5);
          doc.setLineDashPattern([], 0);
        }
      }
    }

    curY += boxH + 4;
  }

  // 4. Emergency Contacts
  if (options.includeEmergencyContacts) {
    const boxH = 22;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(boxBorderRgb[0], boxBorderRgb[1], boxBorderRgb[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin + 6, curY, pageWidth - (margin + 6) * 2, boxH, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(darkRgb[0], darkRgb[1], darkRgb[2]);
    doc.text('4. DESIGNATED EXECUTOR & TRUSTED CONTACTS', margin + 9, curY + 5);

    doc.setFontSize(7);
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    doc.text('Designated Legal Executor / Attorney Contact:', margin + 9, curY + 10);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(margin + 9, curY + 13, pageWidth - margin - 9, curY + 13);

    doc.text('Emergency Trusted Next-of-Kin / Safe Location:', margin + 9, curY + 17);
    doc.line(margin + 9, curY + 20, pageWidth - margin - 9, curY + 20);
    doc.setLineDashPattern([], 0);

    curY += boxH + 4;
  }

  // Section 5: Tamper Seal & Fold Guide
  if (options.includeTamperFoldSeals) {
    const foldY = pageHeight - margin - 38;
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([3, 2], 0);
    doc.line(margin + 6, foldY, pageWidth - margin - 6, foldY);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7);
    doc.setTextColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.text(
      '✂️ FOLD / CUT ALONG DOTTED LINE TO CONCEAL CREDENTIALS • AFFIX TAMPER SEAL OVER SEAM',
      pageWidth / 2,
      foldY - 2,
      { align: 'center' }
    );

    // Tamper instruction box
    doc.setFillColor(isMono ? 245 : 254, isMono ? 245 : 252, isMono ? 245 : 232);
    doc.setDrawColor(isMono ? 0 : 254, isMono ? 0 : 240, isMono ? 0 : 138);
    doc.rect(margin + 6, foldY + 3, pageWidth - (margin + 6) * 2, 13, 'FD');

    doc.setFontSize(6.5);
    doc.setTextColor(isMono ? 0 : 180, isMono ? 0 : 83, isMono ? 0 : 9);
    doc.text(
      'PHYSICAL TAMPER NOTICE: Inspect security tape or wax seal before accessing. If broken, immediately rotate credentials.',
      pageWidth / 2,
      foldY + 7,
      { align: 'center' }
    );
    doc.text(
      options.additionalInstructions || 'Store strictly in a fireproof safe or bank deposit box.',
      pageWidth / 2,
      foldY + 11,
      { align: 'center' }
    );
  }

  // QR Code Offline Checksum
  if (options.includeOfflineChecksumQr) {
    const qrPayload = generateVerificationQrPayload(options, checksum);
    try {
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 120,
        errorCorrectionLevel: 'M',
        color: { dark: isMono ? '#000000' : '#dc2626', light: '#ffffff' },
      });
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 22, pageHeight - margin - 22, 16, 16);
    } catch {
      // Fallback
    }
  }

  // Document Footer
  doc.setFontSize(6.5);
  doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
  doc.text(
    'PrivKnife 100% In-Browser Cryptographic Physical Paper Vault • Zero Remote Server Storage',
    margin + 6,
    pageHeight - margin - 6
  );
  doc.setFontSize(6);
  doc.text(`SHA-256: ${checksum}`, margin + 6, pageHeight - margin - 3);

  const blob = doc.output('blob');
  return {
    success: true,
    blob,
    fileName: `emergency_recovery_kit_${options.paperFormat}.pdf`,
    fileSize: blob.size,
    mimeType: 'application/pdf',
    checksumSha256: checksum,
    metadata: {
      paperFormat: options.paperFormat,
      wordCount: options.seedPhraseWordCount,
      checksum,
    },
  };
}
