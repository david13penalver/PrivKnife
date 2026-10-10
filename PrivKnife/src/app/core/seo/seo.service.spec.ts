import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeoService,
        Title,
        Meta,
        provideRouter([]),
      ],
    });

    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update title and meta tags with default values if empty', () => {
    const titleSpy = vi.spyOn(titleService, 'setTitle');
    const metaSpy = vi.spyOn(metaService, 'updateTag');

    service.updateTags({});

    expect(titleSpy).toHaveBeenCalledWith(service.defaultTitle);
    expect(metaSpy).toHaveBeenCalledWith({
      name: 'description',
      content: service.defaultDescription,
    });
    expect(metaSpy).toHaveBeenCalledWith({
      property: 'og:image',
      content: service.defaultOgImage,
    });
  });

  it('should append — PrivKnife to title if not present', () => {
    const titleSpy = vi.spyOn(titleService, 'setTitle');

    service.updateTags({ title: 'EXIF Stripper' });

    expect(titleSpy).toHaveBeenCalledWith('EXIF Stripper — PrivKnife');
  });

  it('should not duplicate PrivKnife if already in title', () => {
    const titleSpy = vi.spyOn(titleService, 'setTitle');

    service.updateTags({ title: 'Privacy Policy | PrivKnife' });

    expect(titleSpy).toHaveBeenCalledWith('Privacy Policy | PrivKnife');
  });

  it('should update Open Graph and Twitter tags correctly', () => {
    const metaSpy = vi.spyOn(metaService, 'updateTag');

    service.updateTags({
      title: 'PDF Redactor',
      description: 'Redact sensitive text in PDF.',
      ogImage: 'https://privknife.com/og-custom.png',
      url: '/tools/pdf-redactor',
    });

    expect(metaSpy).toHaveBeenCalledWith({
      property: 'og:title',
      content: 'PDF Redactor — PrivKnife',
    });
    expect(metaSpy).toHaveBeenCalledWith({
      property: 'og:description',
      content: 'Redact sensitive text in PDF.',
    });
    expect(metaSpy).toHaveBeenCalledWith({
      property: 'og:image',
      content: 'https://privknife.com/og-custom.png',
    });
    expect(metaSpy).toHaveBeenCalledWith({
      property: 'og:url',
      content: 'https://privknife.com/tools/pdf-redactor',
    });
    expect(metaSpy).toHaveBeenCalledWith({
      name: 'twitter:title',
      content: 'PDF Redactor — PrivKnife',
    });
  });
});
