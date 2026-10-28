import { describe, it, expect } from 'vitest';
import {
  getPageDimensionsMm,
  computeDocumentHash,
  computeTemplateHash,
  generateVerificationQrPayload,
  generateEmergencyKitSvg,
  generateEmergencyKitPdf,
  escapeXml,
} from './engine';
import {
  DEFAULT_EMERGENCY_KIT_OPTIONS,
  SAMPLE_CRYPTO_VAULT_OPTIONS,
} from './test-fixtures';

describe('EmergencyRecoveryKit Engine', () => {
  it('should return physical dimensions for A4 and US Letter formats', () => {
    const a4 = getPageDimensionsMm('a4');
    expect(a4.width).toBe(210);
    expect(a4.height).toBe(297);

    const letter = getPageDimensionsMm('us_letter');
    expect(letter.width).toBeCloseTo(215.9, 1);
    expect(letter.height).toBeCloseTo(279.4, 1);
  });

  describe('escapeXml & XSS Protection (DEFECT-59-01)', () => {
    it('should escape XML entities correctly', () => {
      expect(escapeXml('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      );
      expect(escapeXml("Alice & Bob's")).toBe('Alice &amp; Bob&apos;s');
      expect(escapeXml('')).toBe('');
    });

    it('should escape malicious text in kitTitle, vaultCustodian, and additionalInstructions in SVG', () => {
      const maliciousOptions = {
        ...DEFAULT_EMERGENCY_KIT_OPTIONS,
        kitTitle: 'Evil</text><img src=x onerror=alert(1)><text>',
        vaultCustodian: 'Jane<script>window.__xss=true</script>',
        additionalInstructions: 'Directives<svg onload=1>',
      };

      const svg = generateEmergencyKitSvg(maliciousOptions, 'mock-hash');
      expect(svg).not.toContain('<img src=x');
      expect(svg).not.toContain('<script>');
      expect(svg).not.toContain('<svg onload=1>');
      expect(svg.toLowerCase()).toContain('&lt;img src=x');
      expect(svg).toContain('&lt;script&gt;');
    });
  });

  it('should compute cryptographic SHA-256 hash string', async () => {
    const hash = await computeDocumentHash('PrivKnife Emergency Vault Document');
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // 64 hex characters
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  describe('computeTemplateHash & Consistency (DEFECT-59-03)', () => {
    it('should compute a deterministic 64-character SHA-256 hash matching PDF', async () => {
      const hash1 = await computeTemplateHash(DEFAULT_EMERGENCY_KIT_OPTIONS);
      const hash2 = await computeTemplateHash(DEFAULT_EMERGENCY_KIT_OPTIONS);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

      const pdfResult = await generateEmergencyKitPdf(DEFAULT_EMERGENCY_KIT_OPTIONS, hash1);
      expect(pdfResult.checksumSha256).toBe(hash1);
    });
  });

  it('should generate offline verification QR payload without external URLs', () => {
    const payload = generateVerificationQrPayload(
      DEFAULT_EMERGENCY_KIT_OPTIONS,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(payload).toContain('OFFLINE INTEGRITY CHECK');
    expect(payload).toContain('SHA256:');
    expect(payload).not.toContain('http://');
    expect(payload).not.toContain('https://');
  });

  it('should generate vector SVG preview with directives and offline QR matrix (DEFECT-59-02)', () => {
    const svg = generateEmergencyKitSvg(
      DEFAULT_EMERGENCY_KIT_OPTIONS,
      'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('width="100%"');
    expect(svg).toContain('CONFIDENTIAL EMERGENCY');
    expect(svg).toContain('Master Password Vault');
    expect(svg).toContain('2FA Backup');
    expect(svg).toContain('Cryptographic Seed Phrase (24 Words');
    expect(svg).toContain('Emergency Contacts');
    expect(svg).toContain('Directives for Custodian');
    expect(svg).toContain('OFFLINE QR');
    expect(svg).toContain('Tamper Seal & Fold Guide');
    expect(svg).toContain('SHA-256:');
    expect(svg).toContain('</svg>');
  });

  it('should support 12-word seed layout and monochrome style in SVG', () => {
    const svg = generateEmergencyKitSvg(
      SAMPLE_CRYPTO_VAULT_OPTIONS,
      '1234567890123456789012345678901234567890123456789012345678901234'
    );
    expect(svg).toContain('12 Words');
    expect(svg).not.toContain('Master Password Vault'); // disabled in crypto preset
  });

  it('should generate vector PDF blob with jsPDF', async () => {
    const result = await generateEmergencyKitPdf(DEFAULT_EMERGENCY_KIT_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.blob).toBeDefined();
    expect(result.blob.size).toBeGreaterThan(1000);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toContain('emergency_recovery_kit');
    expect(result.checksumSha256.length).toBe(64);
  });
});
