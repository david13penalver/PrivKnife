import { ToolCategory, ToolDefinition } from '../core/models/tool.model';
import { brailleAdaSignGeneratorTool } from './3d/braille-ada-sign-generator';
import { cappuccinoStencilMakerTool } from './3d/cappuccino-stencil-maker';
import { hswInsertAdapterTool } from './3d/hsw-insert-adapter';
import { keycapSwitchTesterMakerTool } from './3d/keycap-switch-tester-maker';
import { petIdTagGeneratorTool } from './3d/pet-id-tag-generator';
import { cookieCutterTool } from './3d/cookie-cutter';
import { deskWedgeNameplateTool } from './3d/desk-wedge-nameplate';
import { electronicsBoxEnclosureTool } from './3d/electronics-box-enclosure';
import { gridfinityBinGeneratorTool } from './3d/gridfinity-bin-generator';
import { lithophaneMakerTool } from './3d/lithophane-maker';
import { parametricLampDesignerTool } from './3d/parametric-lamp-designer';
import { qrStandKeychainTool } from './3d/qr-stand-keychain';
import { underDeskClampGeneratorTool } from './3d/under-desk-clamp-generator';
import { geometricPlantPotTool } from './3d/geometric-plant-pot';
import { skadisPegboardMakerTool } from './3d/skadis-pegboard-maker';
import { audioTrimmerBoosterTool } from './audio-video/audio-trimmer-booster';
import { bpmTapDetectorTool } from './audio-video/bpm-tap-detector';
import { soundwaveArtMakerTool } from './audio-video/soundwave-art-maker';
import { videoCompressorResizerTool } from './audio-video/video-compressor-resizer';
import { videoGifTrimmerTool } from './audio-video/video-gif-trimmer';
import { bankStatementConverterTool } from './dev/bank-statement-converter';
import { calendarLinkerTool } from './dev/calendar-linker';
import { colorPaletteExtractorTool } from './dev/color-palette-extractor';
import { csvConverterTool } from './dev/csv-converter';
import { csvVectorChartBuilderTool } from './dev/csv-vector-chart-builder';
import { diffCheckerTool } from './dev/diff-checker';
import { dnsCheckerTool } from './dev/dns-checker';
import { fontSubsetterConverterTool } from './dev/font-subsetter-converter';
import { emailSignatureGeneratorTool } from './dev/email-signature-generator';
import { cssMeshGradientMakerTool } from './dev/mesh-gradient-maker';
import { robotsSitemapBuilderTool } from './dev/robots-sitemap-builder';
import { svgOptimizerCleanerTool } from './dev/svg-optimizer-cleaner';
import { webVitalsTool } from './dev/web-vitals';
import { averyBarcodeSheetTool } from './documents/barcode-labels';
import { floorPlanFurnitureScalerTool } from './documents/floor-plan-furniture-scaler';
import { gridPaperTool } from './documents/grid-paper';
import { invoiceMakerTool } from './documents/invoice-maker';
import { localOcrTextExtractorTool } from './documents/local-ocr-text-extractor';
import { markdownCheatsheetTool } from './documents/markdown-cheatsheet';
import { nutritionLabelMakerTool } from './documents/nutrition-label-maker';
import { pdfMergerTool } from './documents/pdf-merger';
import { pdfSignerStamperTool } from './documents/pdf-signer-stamper';
import { tableTentMakerTool } from './documents/table-tent-maker';
import { backgroundRemoverTool } from './media/background-remover';
import { batchImageCompressorTool } from './media/batch-compressor';
import { faviconAppIconSuiteTool } from './media/favicon-generator';
import { heicAvifConverterTool } from './media/heic-avif-converter';
import { ogCardMakerTool } from './media/og-card-maker';
import { passportBiometricPhotoTool } from './media/passport-biometric-photo';
import { screenshotMockupTool } from './media/screenshot-mockup';
import { seamlessTextureGeneratorTool } from './media/seamless-texture-generator';
import { subtitlesShifterTool } from './media/subtitles-shifter';
import { cryptoHashUuidTool } from './privacy/crypto-hash-uuid';
import { emergencyRecoveryKitTool } from './privacy/emergency-recovery-kit';
import { exifStripperTool } from './privacy/exif-stripper';
import { facePlateBlurTool } from './privacy/face-plate-blur';
import { fileEncryptorVaultTool } from './privacy/file-encryptor-vault';
import { pdfRedactionTool } from './privacy/pdf-redaction';
import { piiScrubberAnonymizerTool } from './privacy/pii-scrubber-anonymizer';

export const TOOL_REGISTRY: ToolDefinition[] = [
  exifStripperTool,
  cryptoHashUuidTool,
  csvConverterTool,
  colorPaletteExtractorTool,
  cssMeshGradientMakerTool,
  calendarLinkerTool,
  emailSignatureGeneratorTool,
  robotsSitemapBuilderTool,
  pdfMergerTool,
  pdfRedactionTool,
  invoiceMakerTool,
  gridPaperTool,
  averyBarcodeSheetTool,
  tableTentMakerTool,
  markdownCheatsheetTool,
  batchImageCompressorTool,
  faviconAppIconSuiteTool,
  ogCardMakerTool,
  screenshotMockupTool,
  subtitlesShifterTool,
  bpmTapDetectorTool,
  soundwaveArtMakerTool,
  videoGifTrimmerTool,
  qrStandKeychainTool,
  cookieCutterTool,
  deskWedgeNameplateTool,
  parametricLampDesignerTool,
  lithophaneMakerTool,
  gridfinityBinGeneratorTool,
  electronicsBoxEnclosureTool,
  underDeskClampGeneratorTool,
  skadisPegboardMakerTool,
  geometricPlantPotTool,
  brailleAdaSignGeneratorTool,
  keycapSwitchTesterMakerTool,
  cappuccinoStencilMakerTool,
  petIdTagGeneratorTool,
  hswInsertAdapterTool,
  passportBiometricPhotoTool,
  heicAvifConverterTool,
  pdfSignerStamperTool,
  facePlateBlurTool,
  localOcrTextExtractorTool,
  fileEncryptorVaultTool,
  piiScrubberAnonymizerTool,
  bankStatementConverterTool,
  audioTrimmerBoosterTool,
  videoCompressorResizerTool,
  nutritionLabelMakerTool,
  svgOptimizerCleanerTool,
  diffCheckerTool,
  fontSubsetterConverterTool,
  seamlessTextureGeneratorTool,
  floorPlanFurnitureScalerTool,
  emergencyRecoveryKitTool,
  csvVectorChartBuilderTool,
  backgroundRemoverTool,
  dnsCheckerTool,
  webVitalsTool,
];

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export const TOOL_I18N_MAP: Record<string, string> = {
  'exif-stripper': 'exifStripper',
  'crypto-hash-uuid': 'cryptoHash',
  'csv-to-sql-json': 'csvConverter',
  'csv-json-sql': 'csvConverter',
  'color-palette-extractor': 'colorPalette',
  'css-mesh-gradient-maker': 'meshGradient',
  'calendar-linker': 'calendarLinker',
  'email-signature-generator': 'emailSignature',
  'robots-sitemap-builder': 'robotsSitemap',
  'pdf-merger-splitter': 'pdfMerger',
  'pdf-redaction': 'pdfRedaction',
  'invoice-receipt-maker': 'invoiceMaker',
  'graph-dot-grid-paper': 'gridPaper',
  'avery-barcode-sheet': 'barcodeLabels',
  'table-tent-maker': 'tableTentMaker',
  'markdown-cheatsheet': 'markdownCheatsheet',
  'batch-image-compressor': 'batchCompressor',
  'favicon-app-icon-suite': 'faviconGenerator',
  'og-card-maker': 'ogCardMaker',
  'screenshot-mockup': 'screenshotMockup',
  'subtitles-shifter': 'subtitlesShifter',
  'audio-bpm-detector': 'bpmTapDetector',
  'bpm-tap-detector': 'bpmTapDetector',
  'soundwave-art-maker': 'soundwaveArt',
  'video-to-gif': 'videoGifTrimmer',
  'video-gif-trimmer': 'videoGifTrimmer',
  '3d-qr-stand': 'qrStandKeychain',
  'cookie-cutter-3d': 'cookieCutter',
  'cookie-cutter': 'cookieCutter',
  'desk-wedge-nameplate': 'deskWedge',
  'parametric-lamp-designer': 'parametricLampDesigner',
  'lithophane-maker': 'lithophaneMaker',
  'gridfinity-bin-generator': 'gridfinityBinGenerator',
  'electronics-box-enclosure': 'electronicsBoxEnclosure',
  'under-desk-clamp-generator': 'underDeskClampGenerator',
  'skadis-pegboard-maker': 'skadisPegboardMaker',
  'geometric-plant-pot': 'geometricPlantPot',
  'braille-ada-sign-generator': 'brailleAdaSignGenerator',
  'keycap-switch-tester-maker': 'keycapSwitchTesterMaker',
  'cappuccino-stencil-maker': 'cappuccinoStencilMaker',
  'pet-id-tag-generator': 'petIdTagGenerator',
  'hsw-insert-adapter': 'hswInsertAdapter',
  'passport-biometric-photo': 'passportBiometricPhoto',
  'passport-photo': 'passportBiometricPhoto',
  'heic-avif-converter': 'heicAvifConverter',
  'heic-converter': 'heicAvifConverter',
  'avif-converter': 'heicAvifConverter',
  'pdf-signer-stamper': 'pdfSignerStamper',
  'pdf-signer': 'pdfSignerStamper',
  'face-plate-blur': 'facePlateBlur',
  'privacy-blur': 'facePlateBlur',
  'censor-photo': 'facePlateBlur',
  'local-ocr-text-extractor': 'localOcrTextExtractor',
  'local-ocr': 'localOcrTextExtractor',
  'ocr-text-extractor': 'localOcrTextExtractor',
  'image-to-text': 'localOcrTextExtractor',
  'file-encryptor-vault': 'fileEncryptorVault',
  'file-encryptor': 'fileEncryptorVault',
  'file-vault': 'fileEncryptorVault',
  'pii-scrubber-anonymizer': 'piiScrubberAnonymizer',
  'pii-scrubber': 'piiScrubberAnonymizer',
  'data-anonymizer': 'piiScrubberAnonymizer',
  'bank-statement-converter': 'bankStatementConverter',
  'bank-statement': 'bankStatementConverter',
  'ofx-converter': 'bankStatementConverter',
  'qif-converter': 'bankStatementConverter',
  'audio-trimmer-booster': 'audioTrimmerBooster',
  'audio-trimmer': 'audioTrimmerBooster',
  'volume-booster': 'audioTrimmerBooster',
  'ringtone-maker': 'audioTrimmerBooster',
  'video-compressor-resizer': 'videoCompressorResizer',
  'video-compressor': 'videoCompressorResizer',
  'discord-video-compressor': 'videoCompressorResizer',
  'video-resizer': 'videoCompressorResizer',
  'nutrition-label-maker': 'nutritionLabelMaker',
  'nutrition-facts-maker': 'nutritionLabelMaker',
  'fda-label-maker': 'nutritionLabelMaker',
  'supplement-facts-maker': 'nutritionLabelMaker',
  'svg-optimizer-cleaner': 'svgOptimizerCleaner',
  'svg-optimizer': 'svgOptimizerCleaner',
  'svg-cleaner': 'svgOptimizerCleaner',
  'svg-to-react': 'svgOptimizerCleaner',
  'diff-checker': 'diffChecker',
  'code-diff': 'diffChecker',
  'text-compare': 'diffChecker',
  'contract-diff': 'diffChecker',
  'font-subsetter-converter': 'fontSubsetterConverter',
  'font-subsetter': 'fontSubsetterConverter',
  'ttf-to-woff2': 'fontSubsetterConverter',
  'otf-to-woff2': 'fontSubsetterConverter',
  'webfont-generator': 'fontSubsetterConverter',
  'seamless-texture-generator': 'seamlessTextureGenerator',
  'seamless-texture': 'seamlessTextureGenerator',
  'texture-generator': 'seamlessTextureGenerator',
  'normal-map-generator': 'seamlessTextureGenerator',
  'floor-plan-furniture-scaler': 'floorPlanFurnitureScaler',
  'floor-plan-scaler': 'floorPlanFurnitureScaler',
  'floor-plan-maker': 'floorPlanFurnitureScaler',
  'room-furniture-scaler': 'floorPlanFurnitureScaler',
  'blueprint-scaler': 'floorPlanFurnitureScaler',
  'emergency-recovery-kit': 'emergencyRecoveryKit',
  'emergency-password-sheet': 'emergencyRecoveryKit',
  'recovery-kit': 'emergencyRecoveryKit',
  'crypto-seed-sheet': 'emergencyRecoveryKit',
  'paper-vault': 'emergencyRecoveryKit',
  'csv-vector-chart-builder': 'csvVectorChartBuilder',
  'csv-to-chart': 'csvVectorChartBuilder',
  'vector-chart-builder': 'csvVectorChartBuilder',
  'infographic-generator': 'csvVectorChartBuilder',
  'svg-chart-maker': 'csvVectorChartBuilder',
  'backgroundRemover': 'backgroundRemover',
  'background-remover': 'backgroundRemover',
  'dns-checker': 'dnsChecker',
  'web-vitals': 'webVitals',
};

export function getToolI18nKey(id: string): string | undefined {
  return TOOL_I18N_MAP[id];
}

export function getLocalizedTool(
  tool: ToolDefinition,
  i18n: { t: (key: string) => string }
): ToolDefinition {
  const i18nKey = tool.i18nKey || TOOL_I18N_MAP[tool.id];
  if (!i18nKey) return tool;

  const translatedName = i18n.t(`tools.${i18nKey}.name`);
  const translatedDesc = i18n.t(`tools.${i18nKey}.description`);

  return {
    ...tool,
    i18nKey,
    name: translatedName !== `tools.${i18nKey}.name` ? translatedName : tool.name,
    description:
      translatedDesc !== `tools.${i18nKey}.description` ? translatedDesc : tool.description,
  };
}

export function getLocalizedToolById(
  id: string,
  i18n: { t: (key: string) => string }
): ToolDefinition | undefined {
  const tool = getToolById(id);
  return tool ? getLocalizedTool(tool, i18n) : undefined;
}
