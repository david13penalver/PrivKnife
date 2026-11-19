import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge, Button, Card } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  buildBearerHeader,
  buildCurlSnippet,
  buildDecodedExportJson,
  decodeJwt,
  generateEphemeralKeyPair,
  isHmacAlgorithm,
  isSupportedJwtAlgorithm,
  mintJwt,
  verifyJwtSignature,
} from './engine';
import {
  JWT_DEMO_PRESETS,
  RFC_HS256_SECRET,
  RFC_HS256_TOKEN,
} from './test-fixtures';
import {
  ASYMMETRIC_JWT_ALGORITHMS,
  AsymmetricJwtAlgorithm,
  DecodedJwtResult,
  GeneratedKeyPair,
  JwtVerificationResult,
  KeyInputFormat,
  SUPPORTED_JWT_ALGORITHMS,
  SupportedJwtAlgorithm,
} from './types';

export interface StatusBannerView {
  kind: 'valid' | 'invalid' | 'warning' | 'neutral';
  labelKey: string;
  detail: string;
}

@Component({
  selector: 'app-jwt-debugger-studio',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './jwt-debugger-studio.component.html',
  styleUrl: './jwt-debugger-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JwtDebuggerStudioComponent implements OnDestroy {
  readonly supportedAlgorithms = SUPPORTED_JWT_ALGORITHMS;
  readonly asymmetricAlgorithms = ASYMMETRIC_JWT_ALGORITHMS;
  readonly demoPresets = JWT_DEMO_PRESETS;

  readonly tokenInput = signal<string>(RFC_HS256_TOKEN);
  readonly headerEditorText = signal<string>(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2)
  );
  readonly payloadEditorText = signal<string>(
    JSON.stringify(
      { sub: '1234567890', name: 'John Doe', iat: 1516239022 },
      null,
      2
    )
  );
  readonly selectedAlgorithm = signal<SupportedJwtAlgorithm>('HS256');
  readonly keyFormat = signal<KeyInputFormat>('hmac_utf8');
  readonly verifyKeyInput = signal<string>(RFC_HS256_SECRET);
  readonly mintPrivateKeyInput = signal<string>('');
  readonly nowSeconds = signal<number>(Math.floor(Date.now() / 1000));
  readonly verificationResult = signal<JwtVerificationResult | null>(null);
  readonly generatedKeyPair = signal<GeneratedKeyPair | null>(null);
  readonly isGeneratingKeyPair = signal<boolean>(false);
  readonly isBusy = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);
  readonly copyFeedback = signal<string | null>(null);

  readonly decodedResult = computed<DecodedJwtResult>(() =>
    decodeJwt(this.tokenInput(), this.nowSeconds())
  );

  readonly isAsymmetricAlg = computed<boolean>(
    () => !isHmacAlgorithm(this.selectedAlgorithm())
  );

  readonly statusBanner = computed<StatusBannerView>(() => {
    const decoded = this.decodedResult();
    const verification = this.verificationResult();

    if (!decoded.normalizedToken) {
      return {
        kind: 'neutral',
        labelKey: 'tools.jwtDebuggerStudio.statusUnverified',
        detail: '',
      };
    }

    if (!decoded.validStructure) {
      return {
        kind: 'invalid',
        labelKey: 'tools.jwtDebuggerStudio.statusKeyError',
        detail: decoded.error ?? '',
      };
    }

    if (decoded.algorithm?.toLowerCase() === 'none') {
      return {
        kind: 'invalid',
        labelKey: 'tools.jwtDebuggerStudio.statusAlgNone',
        detail: 'alg: none',
      };
    }

    if (verification?.status === 'valid') {
      return {
        kind: 'valid',
        labelKey: 'tools.jwtDebuggerStudio.statusValid',
        detail: verification.algorithm,
      };
    }

    if (verification?.status === 'invalid') {
      return {
        kind: 'invalid',
        labelKey: 'tools.jwtDebuggerStudio.statusInvalid',
        detail: verification.error ?? verification.algorithm,
      };
    }

    if (
      verification?.status === 'key_error' ||
      verification?.status === 'unsupported_alg'
    ) {
      return {
        kind: 'invalid',
        labelKey: 'tools.jwtDebuggerStudio.statusKeyError',
        detail: verification.error ?? verification.algorithm,
      };
    }

    return {
      kind: 'warning',
      labelKey: 'tools.jwtDebuggerStudio.statusUnverified',
      detail: decoded.algorithm ?? '',
    };
  });

  private verifySeq = 0;
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.clockIntervalId = setInterval(() => {
        this.nowSeconds.set(Math.floor(Date.now() / 1000));
      }, 1000);
    }
  }

  onTokenInputChange(raw: string): void {
    this.verifySeq += 1;
    this.tokenInput.set(raw);
    this.verificationResult.set(null);
    this.actionError.set(null);

    const decoded = decodeJwt(raw, this.nowSeconds());
    if (decoded.validStructure && decoded.header && decoded.payload) {
      this.headerEditorText.set(JSON.stringify(decoded.header, null, 2));
      this.payloadEditorText.set(JSON.stringify(decoded.payload, null, 2));
      if (isSupportedJwtAlgorithm(decoded.algorithm)) {
        this.syncAlgorithmAndKeyFormat(decoded.algorithm);
      }
    }
  }

  onAlgorithmChange(alg: SupportedJwtAlgorithm): void {
    this.syncAlgorithmAndKeyFormat(alg);
    const headerObj = this.parseJsonObjectOrDefault(this.headerEditorText(), {
      typ: 'JWT',
    });
    headerObj['alg'] = alg;
    this.headerEditorText.set(JSON.stringify(headerObj, null, 2));
    this.verificationResult.set(null);
  }

  onKeyFormatChange(format: KeyInputFormat): void {
    this.keyFormat.set(format);
    this.verificationResult.set(null);
    this.actionError.set(null);
  }

  async verifyCurrentToken(): Promise<void> {
    const seq = ++this.verifySeq;
    this.actionError.set(null);
    this.isBusy.set(true);
    try {
      const result = await verifyJwtSignature(
        this.tokenInput(),
        this.verifyKeyInput(),
        this.keyFormat()
      );
      if (seq === this.verifySeq) {
        this.verificationResult.set(result);
      }
    } finally {
      if (seq === this.verifySeq) {
        this.isBusy.set(false);
      }
    }
  }

  async mintFromEditors(): Promise<void> {
    this.actionError.set(null);
    this.isBusy.set(true);
    try {
      const alg = this.selectedAlgorithm();
      const signingKey = isHmacAlgorithm(alg)
        ? this.verifyKeyInput()
        : this.mintPrivateKeyInput();

      const minted = await mintJwt({
        headerJson: this.headerEditorText() || JSON.stringify({ alg, typ: 'JWT' }),
        payloadJson: this.payloadEditorText() || '{}',
        algorithm: alg,
        keyInput: signingKey,
        keyFormat: this.keyFormat(),
      });

      this.tokenInput.set(minted.token);
      const decoded = decodeJwt(minted.token, this.nowSeconds());
      if (decoded.header) {
        this.headerEditorText.set(JSON.stringify(decoded.header, null, 2));
      }
      await this.verifyCurrentToken();
    } catch (err) {
      this.actionError.set(
        err instanceof Error ? err.message : 'Failed to sign JWT token.'
      );
    } finally {
      this.isBusy.set(false);
    }
  }

  async generateDevKeyPair(alg?: AsymmetricJwtAlgorithm): Promise<void> {
    const current = this.selectedAlgorithm();
    const targetAlg: AsymmetricJwtAlgorithm =
      alg ?? (!isHmacAlgorithm(current) ? current : 'ES256');

    this.actionError.set(null);
    this.isGeneratingKeyPair.set(true);
    try {
      const kp = await generateEphemeralKeyPair(targetAlg);
      this.generatedKeyPair.set(kp);
      this.selectedAlgorithm.set(targetAlg);

      const headerObj = this.parseJsonObjectOrDefault(this.headerEditorText(), {
        typ: 'JWT',
      });
      headerObj['alg'] = targetAlg;
      if (!headerObj['typ']) {
        headerObj['typ'] = 'JWT';
      }
      this.headerEditorText.set(JSON.stringify(headerObj, null, 2));

      const nextFormat: KeyInputFormat =
        this.keyFormat() === 'jwk' ? 'jwk' : 'pem';
      this.keyFormat.set(nextFormat);
      this.verifyKeyInput.set(
        nextFormat === 'jwk' ? kp.publicKeyJwk : kp.publicKeyPem
      );
      this.mintPrivateKeyInput.set(
        nextFormat === 'jwk' ? kp.privateKeyJwk : kp.privateKeyPem
      );
      this.verificationResult.set(null);
    } catch (err) {
      this.actionError.set(
        err instanceof Error ? err.message : 'Failed to generate ephemeral keypair.'
      );
    } finally {
      this.isGeneratingKeyPair.set(false);
    }
  }

  applyKeyPairFormat(format: 'pem' | 'jwk'): void {
    const kp = this.generatedKeyPair();
    if (!kp) {
      return;
    }
    this.keyFormat.set(format);
    this.verifyKeyInput.set(format === 'jwk' ? kp.publicKeyJwk : kp.publicKeyPem);
    this.mintPrivateKeyInput.set(
      format === 'jwk' ? kp.privateKeyJwk : kp.privateKeyPem
    );
    this.verificationResult.set(null);
  }

  applyExpOffset(offsetSeconds: number): void {
    const now = Math.floor(Date.now() / 1000);
    this.nowSeconds.set(now);
    const payload = this.parseJsonObjectOrDefault(this.payloadEditorText(), {});
    payload['exp'] = now + offsetSeconds;
    this.payloadEditorText.set(JSON.stringify(payload, null, 2));
  }

  applyIatNow(): void {
    const now = Math.floor(Date.now() / 1000);
    this.nowSeconds.set(now);
    const payload = this.parseJsonObjectOrDefault(this.payloadEditorText(), {});
    payload['iat'] = now;
    this.payloadEditorText.set(JSON.stringify(payload, null, 2));
  }

  applyRandomJti(): void {
    const payload = this.parseJsonObjectOrDefault(this.payloadEditorText(), {});
    payload['jti'] = this.createRandomUuid();
    this.payloadEditorText.set(JSON.stringify(payload, null, 2));
  }

  async loadPreset(presetId: string): Promise<void> {
    const preset = this.demoPresets.find((p) => p.id === presetId);
    if (!preset) {
      return;
    }
    this.keyFormat.set(preset.keyFormat);
    this.verifyKeyInput.set(preset.keyInput);
    this.mintPrivateKeyInput.set('');
    this.generatedKeyPair.set(null);
    this.onTokenInputChange(preset.token);
    await this.verifyCurrentToken();
  }

  async copyToken(): Promise<void> {
    await this.copyText(this.decodedResult().normalizedToken, 'JWT');
  }

  async copyBearerHeader(): Promise<void> {
    await this.copyText(buildBearerHeader(this.tokenInput()), 'Bearer');
  }

  async copyCurlSnippet(): Promise<void> {
    await this.copyText(buildCurlSnippet(this.tokenInput()), 'curl');
  }

  async copyText(text: string, label: string): Promise<void> {
    if (!text) {
      return;
    }
    try {
      await globalThis.navigator?.clipboard?.writeText?.(text);
      this.copyFeedback.set(label);
    } catch {
      this.copyFeedback.set(null);
    }
  }

  downloadDecodedJson(): void {
    const json = buildDecodedExportJson(this.decodedResult());
    this.downloadBlob(json, 'decoded-jwt.json', 'application/json;charset=utf-8');
  }

  downloadPem(kind: 'public' | 'private'): void {
    const kp = this.generatedKeyPair();
    const content =
      kind === 'public'
        ? kp?.publicKeyPem ?? this.verifyKeyInput()
        : kp?.privateKeyPem ?? this.mintPrivateKeyInput();
    if (!content.trim()) {
      return;
    }
    const algSlug = (kp?.algorithm ?? this.selectedAlgorithm()).toLowerCase();
    this.downloadBlob(
      content,
      `privknife-${algSlug}-${kind}.pem`,
      'application/x-pem-file;charset=utf-8'
    );
  }

  clearAllSecrets(): void {
    this.verifySeq += 1;
    this.tokenInput.set('');
    this.headerEditorText.set('');
    this.payloadEditorText.set('');
    this.verifyKeyInput.set('');
    this.mintPrivateKeyInput.set('');
    this.verificationResult.set(null);
    this.generatedKeyPair.set(null);
    this.actionError.set(null);
    this.copyFeedback.set(null);
    this.isBusy.set(false);
    this.isGeneratingKeyPair.set(false);
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    this.clearAllSecrets();
  }

  private syncAlgorithmAndKeyFormat(alg: SupportedJwtAlgorithm): void {
    this.selectedAlgorithm.set(alg);
    const fmt = this.keyFormat();
    if (isHmacAlgorithm(alg) && fmt === 'pem') {
      this.keyFormat.set('hmac_utf8');
    } else if (
      !isHmacAlgorithm(alg) &&
      (fmt === 'hmac_utf8' || fmt === 'hmac_base64url')
    ) {
      this.keyFormat.set('pem');
    }
  }

  private parseJsonObjectOrDefault(
    raw: string,
    fallback: Record<string, unknown>
  ): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fallback to default object when user JSON is currently incomplete
    }
    return { ...fallback };
  }

  private createRandomUuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  private downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    }

    const timerId = setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
      this.pendingRevokeTimers.delete(timerId);
    }, 150);
    this.pendingRevokeTimers.add(timerId);
  }

  private revokeAllObjectUrls(): void {
    for (const timerId of this.pendingRevokeTimers) {
      clearTimeout(timerId);
    }
    this.pendingRevokeTimers.clear();

    while (this.createdObjectUrls.length > 0) {
      const url = this.createdObjectUrls.pop();
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
