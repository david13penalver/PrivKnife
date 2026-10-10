import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { Home } from './home';

describe('Home Component (Presentation & Tool Catalog)', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
});
