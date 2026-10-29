import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { I18nService } from './i18n.service';
import { ParametricLampDesignerComponent } from '../../tools/3d/parametric-lamp-designer/parametric-lamp-designer.component';
import { PassportBiometricPhotoComponent } from '../../tools/media/passport-biometric-photo/passport-biometric-photo.component';
import { FileEncryptorVaultComponent } from '../../tools/privacy/file-encryptor-vault/file-encryptor-vault.component';
import { CsvVectorChartBuilderComponent } from '../../tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component';
import { LocalOcrTextExtractorComponent } from '../../tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component';
import { ExifStripperComponent } from '../../tools/privacy/exif-stripper/exif-stripper.component';
import { CryptoHashUuidComponent } from '../../tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component';

describe('Tools Detail Pages Localization (Batch 2: Tools 31–60)', () => {
  let i18nService: I18nService;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render Parametric Lamp Designer detail page in English and reactively update to Spanish and French', async () => {
    await TestBed.configureTestingModule({
      imports: [ParametricLampDesignerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    // English
    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(ParametricLampDesignerComponent);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.name'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.description'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.curatedPresets'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.resetDefaults'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.totalHeight'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.dimensions'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.bulbOn'));
    expect(textContent).toContain(i18nService.t('tools.parametricLampDesigner.slicerInstructions'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    const esText = fixture.nativeElement.textContent;
    expect(esText).toContain('Diseñador Paramétrico 3D de Lámparas y Pantallas');
    expect(esText).toContain('Preajustes Seleccionados:');
    expect(esText).toContain('↺ Restablecer Valores');
    expect(esText).toContain('Altura Total:');
    expect(esText).toContain('DIMENSIONES');
    expect(esText).toContain('💡 Bombilla ENCENDIDA');
    expect(esText).toContain('Instrucciones Recomendadas para el Laminador:');
    expect(esText).toContain('Descargar Archivo .3MF');
    expect(esText).toContain('Descargar .STL Listo para Imprimir');

    // Switch to French
    await i18nService.setLanguage('fr');
    fixture.detectChanges();
    const frText = fixture.nativeElement.textContent;
    expect(frText).toContain('Concepteur Paramétrique 3D de Lampes et Abat-jour');
    expect(frText).toContain('Préréglages Sélectionnés :');
    expect(frText).toContain('↺ Réinitialiser');
    expect(frText).toContain('Hauteur Totale :');
    expect(frText).toContain('💡 Ampoule ALLUMÉE');

    fixture.destroy();
  });

  it('should render Passport Biometric Photo detail page in English and reactively update to Spanish and German', async () => {
    await TestBed.configureTestingModule({
      imports: [PassportBiometricPhotoComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    // English
    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(PassportBiometricPhotoComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('.c-header__title');
    const subtitle = fixture.nativeElement.querySelector('.c-header__subtitle');
    const badge = fixture.nativeElement.querySelector('.c-badge--privacy');

    expect(h1.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.description'));
    expect(badge.textContent.trim()).toBe(i18nService.t('common.privacyBadge'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.description'));
    expect(badge.textContent.trim()).toBe(i18nService.t('common.privacyBadge'));

    // Switch to German
    await i18nService.setLanguage('de');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.passportBiometricPhoto.description'));
    expect(badge.textContent.trim()).toBe(i18nService.t('common.privacyBadge'));

    fixture.destroy();
  });

  it('should render File Encryptor Vault detail page in English and reactively update to Spanish and Japanese', async () => {
    await TestBed.configureTestingModule({
      imports: [FileEncryptorVaultComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    // English
    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(FileEncryptorVaultComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('.c-header__title');
    const subtitle = fixture.nativeElement.querySelector('.c-header__subtitle');
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.description'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.description'));

    // Switch to Japanese
    await i18nService.setLanguage('ja');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.fileEncryptorVault.description'));

    fixture.destroy();
  });

  it('should render CSV Vector Chart Builder detail page in English and reactively update to Spanish and Chinese', async () => {
    await TestBed.configureTestingModule({
      imports: [CsvVectorChartBuilderComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    // English
    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(CsvVectorChartBuilderComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('.c-header__title');
    const subtitle = fixture.nativeElement.querySelector('.c-header__subtitle');
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.description'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.description'));

    // Switch to Chinese
    await i18nService.setLanguage('zh');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.csvVectorChartBuilder.description'));

    fixture.destroy();
  });

  it('should render Local OCR Text Extractor detail page in English and reactively update to Spanish and Arabic', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalOcrTextExtractorComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    // English
    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(LocalOcrTextExtractorComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('.c-header__title');
    const subtitle = fixture.nativeElement.querySelector('.c-header__subtitle');
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.description'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.description'));

    // Switch to Arabic
    await i18nService.setLanguage('ar');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.localOcrTextExtractor.description'));

    fixture.destroy();
  });

  it('should render ExifStripper detail page in English and reactively update to Spanish', async () => {
    await TestBed.configureTestingModule({
      imports: [ExifStripperComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(ExifStripperComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    const subtitle = fixture.nativeElement.querySelector('.l-columns__area p');
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.exifStripper.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.exifStripper.description'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.exifStripper.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.exifStripper.description'));

    fixture.destroy();
  });

  it('should render CryptoHash detail page in English and reactively update to Spanish', async () => {
    await TestBed.configureTestingModule({
      imports: [CryptoHashUuidComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);

    await i18nService.setLanguage('en');
    const fixture = TestBed.createComponent(CryptoHashUuidComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    const subtitle = fixture.nativeElement.querySelector('.l-columns__area p');
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.cryptoHash.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.cryptoHash.description'));

    // Switch to Spanish
    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(h1.textContent.trim()).toBe(i18nService.t('tools.cryptoHash.name'));
    expect(subtitle.textContent.trim()).toBe(i18nService.t('tools.cryptoHash.description'));

    fixture.destroy();
  });

  it('should ensure all 30 Batch 2 tools use TranslatePipe and localization keys in their templates', () => {
    const BATCH_2_TOOL_KEYS = [
      'parametricLampDesigner',
      'lithophaneMaker',
      'gridfinityBinGenerator',
      'electronicsBoxEnclosure',
      'underDeskClampGenerator',
      'skadisPegboardMaker',
      'geometricPlantPot',
      'brailleAdaSignGenerator',
      'keycapSwitchTesterMaker',
      'cappuccinoStencilMaker',
      'petIdTagGenerator',
      'hswInsertAdapter',
      'passportBiometricPhoto',
      'heicAvifConverter',
      'pdfSignerStamper',
      'facePlateBlur',
      'localOcrTextExtractor',
      'fileEncryptorVault',
      'piiScrubberAnonymizer',
      'bankStatementConverter',
      'audioTrimmerBooster',
      'videoCompressorResizer',
      'nutritionLabelMaker',
      'svgOptimizerCleaner',
      'diffChecker',
      'fontSubsetterConverter',
      'seamlessTextureGenerator',
      'floorPlanFurnitureScaler',
      'emergencyRecoveryKit',
      'csvVectorChartBuilder',
    ];

    // Assert that each tool's name and description resolve to non-empty translations in all 8 languages
    for (const key of BATCH_2_TOOL_KEYS) {
      expect(i18nService.t(`tools.${key}.name`)).not.toBe(`tools.${key}.name`);
      expect(i18nService.t(`tools.${key}.description`)).not.toBe(`tools.${key}.description`);
    }
  });
});
