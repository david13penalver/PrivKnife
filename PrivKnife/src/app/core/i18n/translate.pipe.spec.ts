import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let service: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [I18nService, TranslatePipe],
    });
    service = TestBed.inject(I18nService);
    pipe = TestBed.inject(TranslatePipe);
  });

  it('should create an instance of TranslatePipe', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform key to localized English string by default', () => {
    expect(pipe.transform('common.download')).toBe('Download');
    expect(pipe.transform('common.brandName')).toBe('PrivKnife');
  });

  it('should transform key with dynamic interpolation parameters', () => {
    const result = pipe.transform('home.toolsCount', { count: 29 });
    expect(result).toBe('29 tools available');
  });

  it('should reflect active language when language changes', async () => {
    await service.setLanguage('es');
    expect(pipe.transform('common.download')).toBe('Descargar');
    expect(pipe.transform('home.toolsCount', { count: 29 })).toBe('29 herramientas disponibles');
  });

  it('should return the key itself if key is not found', () => {
    expect(pipe.transform('non.existent.key')).toBe('non.existent.key');
  });
});
