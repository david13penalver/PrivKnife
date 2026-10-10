import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CsvConverterComponent } from './csv-converter.component';

describe('CsvConverterComponent (Seam 2: UI & Privacy Boundary)', () => {
  let fixture: ComponentFixture<CsvConverterComponent>;
  let component: CsvConverterComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    let counter = 0;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:http://localhost/csv-blob-${++counter}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CsvConverterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CsvConverterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default sample data and parsed table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.parsedTable()).toBeTruthy();
    expect(component.parsedTable()!.rowCount).toBeGreaterThan(0);
    expect(component.activeFormat()).toBe('json');
    expect(compiled.textContent).toContain('CSV / Excel to JSON, SQL & Markdown');
    expect(compiled.textContent).toContain('100% In-Browser');
  });

  it('should switch output tabs and regenerate output format', () => {
    component.setFormat('sql');
    fixture.detectChanges();
    expect(component.activeFormat()).toBe('sql');
    expect(component.outputCode()).toContain('INSERT INTO');

    component.setFormat('markdown');
    fixture.detectChanges();
    expect(component.activeFormat()).toBe('markdown');
    expect(component.outputCode()).toContain('|');
  });

  it('should reactively update SQL output when table name changes', () => {
    component.setFormat('sql');
    component.sqlTableName.set('users_catalog');
    fixture.detectChanges();

    expect(component.outputCode()).toContain('`users_catalog`');
  });

  it('should parse pasted text input', () => {
    const customCsv = 'city,pop\nMadrid,3200000\nBarcelona,1600000';
    component.onTextInputChange(customCsv);
    fixture.detectChanges();

    expect(component.parsedTable()?.rowCount).toBe(2);
    expect(component.parsedTable()?.headers).toEqual(['city', 'pop']);
  });

  it('should copy output to clipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    await component.copyToClipboard();
    expect(writeTextSpy).toHaveBeenCalledWith(component.outputCode());
    expect(component.copied()).toBe(true);
  });

  it('should download output and revoke object URLs (Memory Hygiene)', () => {
    component.downloadOutput();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute conversion with ZERO network calls (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.onTextInputChange('secret_id,secret_token\n1,abcdef12345');
    component.setFormat('sql');
    component.setFormat('json');
    component.setFormat('markdown');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
