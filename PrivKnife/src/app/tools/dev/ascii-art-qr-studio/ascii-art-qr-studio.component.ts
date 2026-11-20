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
  convertImageDataToAscii,
  renderAsciiBanner,
  renderBarcode1dSvg,
  renderQrSvg,
  svgToDataUri,
} from './engine';
import {
  ASCII_BANNER_FONTS,
  AsciiBannerFont,
  AsciiQrTab,
  BARCODE_1D_FORMATS,
  Barcode1dFormat,
  Barcode1dRenderResult,
  COMMENT_WRAPPERS,
  CommentWrapper,
  DEFAULT_BANNER_OPTIONS,
  DEFAULT_BARCODE_OPTIONS,
  DEFAULT_IMAGE_ASCII_OPTIONS,
  DEFAULT_QR_OPTIONS,
  IMAGE_ASCII_MODES,
  ImageAsciiMode,
  PixelGridInput,
  QR_PAYLOAD_TYPES,
  QrErrorCorrection,
  QrModuleStyle,
  QrPayloadType,
  QrRenderResult,
} from './types';

@Component({
  selector: 'app-ascii-art-qr-studio',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './ascii-art-qr-studio.component.html',
  styleUrl: './ascii-art-qr-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsciiArtQrStudioComponent implements OnDestroy {
  readonly bannerFonts = ASCII_BANNER_FONTS;
  readonly commentWrappers = COMMENT_WRAPPERS;
  readonly imageModes = IMAGE_ASCII_MODES;
  readonly qrPayloadTypes = QR_PAYLOAD_TYPES;
  readonly barcodeFormats = BARCODE_1D_FORMATS;

  readonly activeTab = signal<AsciiQrTab>('ascii_banner');

  // Tab 1: ASCII Banner
  readonly bannerText = signal<string>(DEFAULT_BANNER_OPTIONS.text);
  readonly bannerFont = signal<AsciiBannerFont>(DEFAULT_BANNER_OPTIONS.font);
  readonly bannerSpacing = signal<number>(DEFAULT_BANNER_OPTIONS.letterSpacing);
  readonly bannerWrapper = signal<CommentWrapper>(DEFAULT_BANNER_OPTIONS.commentWrapper);

  // Tab 2: Image to ASCII / Braille
  readonly imageMode = signal<ImageAsciiMode>(DEFAULT_IMAGE_ASCII_OPTIONS.mode);
  readonly imageColumns = signal<number>(DEFAULT_IMAGE_ASCII_OPTIONS.columns);
  readonly imageContrast = signal<number>(DEFAULT_IMAGE_ASCII_OPTIONS.contrast);
  readonly imageInvert = signal<boolean>(DEFAULT_IMAGE_ASCII_OPTIONS.invertLuminance);
  readonly imageDitherBraille = signal<boolean>(DEFAULT_IMAGE_ASCII_OPTIONS.ditherBraille);
  readonly imagePixels = signal<PixelGridInput | null>(null);
  readonly imageName = signal<string>('');

  // Tab 3: Static 2D QR Studio
  readonly qrPayloadType = signal<QrPayloadType>(DEFAULT_QR_OPTIONS.payloadType);
  readonly qrRawText = signal<string>(DEFAULT_QR_OPTIONS.rawText);
  readonly wifiSsid = signal<string>(DEFAULT_QR_OPTIONS.wifi.ssid);
  readonly wifiPassword = signal<string>(DEFAULT_QR_OPTIONS.wifi.password);
  readonly wifiEncryption = signal<'WPA' | 'WEP' | 'nopass'>(
    DEFAULT_QR_OPTIONS.wifi.encryption,
  );
  readonly wifiHidden = signal<boolean>(DEFAULT_QR_OPTIONS.wifi.hidden);
  readonly vcardFullName = signal<string>(DEFAULT_QR_OPTIONS.vcard.fullName);
  readonly vcardPhone = signal<string>(DEFAULT_QR_OPTIONS.vcard.phone);
  readonly vcardEmail = signal<string>(DEFAULT_QR_OPTIONS.vcard.email);
  readonly vcardOrg = signal<string>(DEFAULT_QR_OPTIONS.vcard.organization);
  readonly vcardWebsite = signal<string>(DEFAULT_QR_OPTIONS.vcard.website);
  readonly emailTo = signal<string>(DEFAULT_QR_OPTIONS.email.to);
  readonly emailSubject = signal<string>(DEFAULT_QR_OPTIONS.email.subject);
  readonly emailBody = signal<string>(DEFAULT_QR_OPTIONS.email.body);
  readonly smsPhone = signal<string>(DEFAULT_QR_OPTIONS.sms.phone);
  readonly smsMessage = signal<string>(DEFAULT_QR_OPTIONS.sms.message);
  readonly geoLat = signal<string>(DEFAULT_QR_OPTIONS.geo.latitude);
  readonly geoLng = signal<string>(DEFAULT_QR_OPTIONS.geo.longitude);
  readonly qrErrorCorrection = signal<QrErrorCorrection>(DEFAULT_QR_OPTIONS.errorCorrection);
  readonly qrModuleStyle = signal<QrModuleStyle>(DEFAULT_QR_OPTIONS.moduleStyle);
  readonly qrForeground = signal<string>(DEFAULT_QR_OPTIONS.foregroundHex);
  readonly qrBackground = signal<string>(DEFAULT_QR_OPTIONS.backgroundHex);
  readonly qrQuietZone = signal<number>(DEFAULT_QR_OPTIONS.quietZoneModules);
  readonly qrExportSize = signal<number>(DEFAULT_QR_OPTIONS.exportSizePx);
  readonly qrLogoDataUrl = signal<string>('');
  readonly qrLogoScale = signal<number>(DEFAULT_QR_OPTIONS.logoScalePercent);

  // Tab 4: 1D Barcode
  readonly barcodeValue = signal<string>(DEFAULT_BARCODE_OPTIONS.value);
  readonly barcodeFormat = signal<Barcode1dFormat>(DEFAULT_BARCODE_OPTIONS.format);
  readonly barcodeDisplayValue = signal<boolean>(DEFAULT_BARCODE_OPTIONS.displayValue);
  readonly barcodeLineColor = signal<string>(DEFAULT_BARCODE_OPTIONS.lineColor);
  readonly barcodeBackground = signal<string>(DEFAULT_BARCODE_OPTIONS.background);

  // Copy & feedback
  readonly copiedKey = signal<string | null>(null);

  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly bannerOutput = computed<string>(() =>
    renderAsciiBanner({
      text: this.bannerText(),
      font: this.bannerFont(),
      letterSpacing: this.bannerSpacing(),
      commentWrapper: this.bannerWrapper(),
    }),
  );

  readonly imageAsciiOutput = computed<string>(() => {
    const pixels = this.imagePixels();
    if (!pixels) return '';
    return convertImageDataToAscii(pixels, {
      mode: this.imageMode(),
      columns: this.imageColumns(),
      contrast: this.imageContrast(),
      invertLuminance: this.imageInvert(),
      ditherBraille: this.imageDitherBraille(),
    });
  });

  readonly qrResult = computed<QrRenderResult>(() =>
    renderQrSvg({
      payloadType: this.qrPayloadType(),
      rawText: this.qrRawText(),
      wifi: {
        ssid: this.wifiSsid(),
        password: this.wifiPassword(),
        encryption: this.wifiEncryption(),
        hidden: this.wifiHidden(),
      },
      vcard: {
        fullName: this.vcardFullName(),
        phone: this.vcardPhone(),
        email: this.vcardEmail(),
        organization: this.vcardOrg(),
        website: this.vcardWebsite(),
      },
      email: {
        to: this.emailTo(),
        subject: this.emailSubject(),
        body: this.emailBody(),
      },
      sms: {
        phone: this.smsPhone(),
        message: this.smsMessage(),
      },
      geo: {
        latitude: this.geoLat(),
        longitude: this.geoLng(),
      },
      errorCorrection: this.qrErrorCorrection(),
      moduleStyle: this.qrModuleStyle(),
      foregroundHex: this.qrForeground(),
      backgroundHex: this.qrBackground(),
      quietZoneModules: this.qrQuietZone(),
      exportSizePx: this.qrExportSize(),
      logoDataUrl: this.qrLogoDataUrl() || undefined,
      logoScalePercent: this.qrLogoScale(),
    }),
  );

  readonly qrPreviewDataUri = computed<string>(() => {
    const res = this.qrResult();
    return res.success ? svgToDataUri(res.svg) : '';
  });

  readonly barcodeResult = computed<Barcode1dRenderResult>(() =>
    renderBarcode1dSvg({
      value: this.barcodeValue(),
      format: this.barcodeFormat(),
      displayValue: this.barcodeDisplayValue(),
      lineColor: this.barcodeLineColor(),
      background: this.barcodeBackground(),
      barWidth: 2,
      height: 80,
    }),
  );

  readonly barcodePreviewDataUri = computed<string>(() => {
    const res = this.barcodeResult();
    return res.success ? svgToDataUri(res.svg) : '';
  });

  setBannerFont(raw: unknown): void {
    const val = String(raw) as AsciiBannerFont;
    if (ASCII_BANNER_FONTS.includes(val)) {
      this.bannerFont.set(val);
    }
  }

  setBannerWrapper(raw: unknown): void {
    const val = String(raw) as CommentWrapper;
    if (COMMENT_WRAPPERS.includes(val)) {
      this.bannerWrapper.set(val);
    }
  }

  setBannerSpacing(raw: unknown): void {
    this.bannerSpacing.set(Math.min(3, Math.max(0, Math.round(Number(raw) || 0))));
  }

  setImageMode(raw: unknown): void {
    const val = String(raw) as ImageAsciiMode;
    if (IMAGE_ASCII_MODES.includes(val)) {
      this.imageMode.set(val);
    }
  }

  setImageColumns(raw: unknown): void {
    this.imageColumns.set(Math.min(160, Math.max(30, Math.round(Number(raw) || 80))));
  }

  setImageContrast(raw: unknown): void {
    const c = Number(raw);
    if (Number.isFinite(c)) {
      this.imageContrast.set(Math.min(2.0, Math.max(0.5, c)));
    }
  }

  setQrPayloadType(raw: unknown): void {
    const val = String(raw) as QrPayloadType;
    if (QR_PAYLOAD_TYPES.includes(val)) {
      this.qrPayloadType.set(val);
    }
  }

  setQrErrorCorrection(raw: unknown): void {
    const val = String(raw);
    if (val === 'L' || val === 'M' || val === 'Q' || val === 'H') {
      this.qrErrorCorrection.set(val);
    }
  }

  setQrModuleStyle(raw: unknown): void {
    const val = String(raw);
    if (val === 'square' || val === 'rounded' || val === 'dots') {
      this.qrModuleStyle.set(val);
    }
  }

  setWifiEncryption(raw: unknown): void {
    const val = String(raw);
    if (val === 'WPA' || val === 'WEP' || val === 'nopass') {
      this.wifiEncryption.set(val);
    }
  }

  setQrExportSize(raw: unknown): void {
    this.qrExportSize.set(Math.min(2048, Math.max(256, Math.round(Number(raw) || 1024))));
  }

  setBarcodeFormat(raw: unknown): void {
    const val = String(raw) as Barcode1dFormat;
    if (BARCODE_1D_FORMATS.includes(val)) {
      this.barcodeFormat.set(val);
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.imageName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl || typeof Image === 'undefined' || typeof document === 'undefined') {
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(2, Math.round((img.width || 64) * scale));
        const h = Math.max(4, Math.round((img.height || 64) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          this.imagePixels.set({
            width: w,
            height: h,
            data: new Uint8ClampedArray(imgData.data),
          });
        }
        canvas.width = 0;
        canvas.height = 0;
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  onQrLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.qrLogoDataUrl.set(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async copyText(value: string, key: string): Promise<void> {
    if (!value) return;
    try {
      await globalThis.navigator?.clipboard?.writeText?.(value);
      this.copiedKey.set(key);
      if (this.copyTimer !== null) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => {
        this.copiedKey.set(null);
        this.copyTimer = null;
      }, 1600);
    } catch {
      this.copiedKey.set(null);
    }
  }

  exportTextFile(content: string, filename = 'privknife-ascii.txt'): void {
    if (!content) return;
    this.triggerBlobDownload(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
      filename,
    );
  }

  exportSvgFile(svg: string, filename = 'privknife-code.svg'): void {
    if (!svg) return;
    this.triggerBlobDownload(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
      filename,
    );
  }

  exportSvgAsPng(svg: string, sizePx: number, filename: string): void {
    if (!svg || typeof Image === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const img = new Image();
    img.onload = () => {
      const targetSize = Math.min(2048, Math.max(256, Math.round(sizePx || 1024)));
      const aspect = (img.height || targetSize) / (img.width || targetSize);
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = Math.max(120, Math.round(targetSize * aspect));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            this.triggerBlobDownload(blob, filename);
          }
          canvas.width = 0;
          canvas.height = 0;
        }, 'image/png');
      } else {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    img.src = svgToDataUri(svg);
  }

  reset(): void {
    this.bannerText.set(DEFAULT_BANNER_OPTIONS.text);
    this.bannerFont.set(DEFAULT_BANNER_OPTIONS.font);
    this.bannerSpacing.set(DEFAULT_BANNER_OPTIONS.letterSpacing);
    this.bannerWrapper.set(DEFAULT_BANNER_OPTIONS.commentWrapper);
    this.imagePixels.set(null);
    this.imageName.set('');
    this.qrLogoDataUrl.set('');
    this.qrPayloadType.set(DEFAULT_QR_OPTIONS.payloadType);
    this.qrRawText.set(DEFAULT_QR_OPTIONS.rawText);
    this.wifiPassword.set('');
    this.barcodeValue.set(DEFAULT_BARCODE_OPTIONS.value);
    this.barcodeFormat.set(DEFAULT_BARCODE_OPTIONS.format);
    this.copiedKey.set(null);
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    this.imagePixels.set(null);
    this.qrLogoDataUrl.set('');
    this.wifiPassword.set('');
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  private clearCopyTimer(): void {
    if (this.copyTimer !== null) {
      clearTimeout(this.copyTimer);
      this.copyTimer = null;
    }
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
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
