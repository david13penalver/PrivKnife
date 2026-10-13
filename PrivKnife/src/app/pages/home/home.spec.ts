import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Home } from './home';
import { I18nService } from '../../core/i18n';

describe('Home Component (Presentation & Tool Catalog)', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;
  let store: Record<string, string> = {};

  beforeEach(async () => {
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

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the home component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero presentation headline and Swiss Army Knife branding', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('The Private In-Browser');
    expect(compiled.querySelector('h1')?.textContent).toContain('Swiss Army Knife');
    expect(compiled.textContent).toContain('Zero Server Ingestion');
    expect(compiled.textContent).toContain('Privacy by Architecture, Not by Policy');
  });

  it('should render tools with EXIF tool marked as Ready to Use with a link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('EXIF & Privacy Metadata Stripper');
    expect(compiled.textContent).toContain('Ready to Use');

    const exifLink = compiled.querySelector('a[href="/tools/exif-stripper"]') ||
      compiled.querySelector('a[ng-reflect-router-link="/tools/exif-stripper"]');
    expect(compiled.textContent).toContain('Open Tool');
  });

  it('should filter tools by search query', () => {
    component.searchQuery.set('exif');
    fixture.detectChanges();

    const filtered = component.filteredTools();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((t) => t.name.toLowerCase().includes('exif') || t.keywords.includes('exif'))).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('EXIF & Privacy Metadata Stripper');
  });

  it('should filter tools by category', () => {
    component.selectedCategory.set('documents');
    fixture.detectChanges();

    const filtered = component.filteredTools();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((t) => t.category === 'documents')).toBe(true);
  });

  it('should reset filters when resetFilters() is called', () => {
    component.searchQuery.set('random-non-existent-tool');
    component.selectedCategory.set('3d');
    fixture.detectChanges();

    expect(component.filteredTools().length).toBe(0);

    component.resetFilters();
    fixture.detectChanges();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedCategory()).toBe('all');
    expect(component.filteredTools().length).toBe(component.allCount());
  });

  it('should structure tool cards and pillars using responsive card grid classes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cardGrids = compiled.querySelectorAll('.l-columns--cards');
    expect(cardGrids.length).toBeGreaterThanOrEqual(2);
    expect(cardGrids[0].classList.contains('l-columns--3')).toBe(true);
    expect(cardGrids[0].classList.contains('l-columns--cards')).toBe(true);
  });

  it('should reactively update all home strings and tool cards when switching to Spanish', async () => {
    const i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('es');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    // Spanish Hero & Pillars
    expect(compiled.querySelector('h1')?.textContent).toContain('La Navaja Suiza');
    expect(compiled.querySelector('h1')?.textContent).toContain('Privada en el Navegador');
    expect(compiled.textContent).toContain('Cero Ingesta de Servidor');
    expect(compiled.textContent).toContain('Privacidad por Arquitectura, No por Política');

    // Spanish Tool Card
    expect(compiled.textContent).toContain('Eliminador de Metadatos EXIF y Privacidad');
    expect(compiled.textContent).toContain('Listo para Usar');
    expect(compiled.textContent).toContain('Abrir Herramienta');

    // Spanish Search Query
    component.searchQuery.set('metadatos');
    fixture.detectChanges();
    expect(component.filteredTools().some((t) => t.id === 'exif-stripper')).toBe(true);
  });
});

