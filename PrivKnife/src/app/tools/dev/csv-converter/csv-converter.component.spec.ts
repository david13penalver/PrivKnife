import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
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
    expect(compiled.textContent).toContain('JSON, SQL & Markdown');
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

  it('should render interactive paginated Data Grid preview', () => {
    // Populate with 15 rows
    const rows = Array.from({ length: 15 }, (_, i) => `user_${i + 1},${i * 10}`);
    component.onTextInputChange(['name,score', ...rows].join('\n'));
    fixture.detectChanges();

    expect(component.totalRows()).toBe(15);
    expect(component.totalPages()).toBe(2); // 10 rows/page default -> 2 pages
    expect(component.paginatedRows()).toHaveLength(10);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Interactive Data Grid Preview');
    expect(compiled.textContent).toContain('Showing rows 1 – 10 of 15');

    // Go to page 2
    component.setGridPage(2);
    fixture.detectChanges();
    expect(component.paginatedRows()).toHaveLength(5);
    expect(compiled.textContent).toContain('Showing rows 11 – 15 of 15');

    // Change page size to 25
    component.setGridPageSize(25);
    fixture.detectChanges();
    expect(component.totalPages()).toBe(1);
    expect(component.paginatedRows()).toHaveLength(15);
  });

  it('should support SQL batchSize chunking in output preview', () => {
    const csv = 'id,val\n1,a\n2,b\n3,c\n4,d';
    component.onTextInputChange(csv);
    component.setFormat('sql');
    component.sqlBatchSize.set(2);
    fixture.detectChanges();

    const sql = component.outputCode();
    const count = (sql.match(/INSERT INTO/g) || []).length;
    expect(count).toBe(2);
  });

  it('should parse dropped Excel files and support sheet switching', async () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['id', 'product'],
      ['101', 'Keyboard'],
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['emp_id', 'emp_name'],
      ['E1', 'Carlos'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Products');
    XLSX.utils.book_append_sheet(wb, ws2, 'Staff');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const excelFile = new File([buffer], 'catalog.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await component.onFilesDropped([excelFile]);
    fixture.detectChanges();

    expect(component.parsedTable()?.activeSheet).toBe('Products');
    expect(component.parsedTable()?.headers).toEqual(['id', 'product']);
    expect(component.parsedTable()?.sheetNames).toEqual(['Products', 'Staff']);

    // Switch sheet to Staff
    component.onSheetChange('Staff');
    fixture.detectChanges();

    expect(component.parsedTable()?.activeSheet).toBe('Staff');
    expect(component.parsedTable()?.headers).toEqual(['emp_id', 'emp_name']);
    expect(component.parsedTable()?.rowCount).toBe(1);
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
