import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { JsonSqlFormatterComponent } from './json-sql-formatter.component';
import { buildLargeJsonArrayText, SAMPLE_YAML_DOC } from './test-fixtures';

describe('JsonSqlFormatterComponent (Seam 3: 3-Mode Studio, Tree Pagination, Validation & Hygiene)', () => {
  let component: JsonSqlFormatterComponent;
  let fixture: ComponentFixture<JsonSqlFormatterComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [JsonSqlFormatterComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(JsonSqlFormatterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes in JSON mode with privacy badge, dual layout panes, and clean defaults', () => {
    expect(component).toBeTruthy();
    expect(component.language()).toBe('json');
    expect(component.indentType()).toBe('2spaces');
    expect(component.jsonOutputView()).toBe('formatted');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
  });

  it('generates TypeScript, Zod, and filters via JSONPath in JSON mode', async () => {
    component.updateInput('[{"id": 1, "name": "A"}, {"id": 2, "name": null, "tag": "x"}]');
    await component.setJsonOutputView('typescript');
    fixture.detectChanges();
    expect(component.result()?.outputText).toContain('id: number;');
    expect(component.result()?.outputText).toContain('name: string | null;');
    expect(component.result()?.outputText).toContain('tag?: string;');

    await component.setJsonOutputView('zod');
    expect(component.result()?.outputText).toContain('z.string().nullable()');
    expect(component.result()?.outputText).toContain('z.string().optional()');

    await component.setJsonOutputView('formatted');
    await component.updateJsonPath('$[*].id');
    expect(JSON.parse(component.result()!.outputText)).toEqual([1, 2]);
  });

  it('virtualizes large 150-item JSON trees at depth <= 2 and paginates beyond 100 items on demand', async () => {
    const bigArrayJson = buildLargeJsonArrayText(150);
    component.updateInput(bigArrayJson);
    await component.setJsonOutputView('tree');
    fixture.detectChanges();

    const rowsInitial = component.treeRows();
    // Depth > 2 nodes should be collapsed by default (array at root is depth 0, items at 1, 'meta' at 2 -> expanded stops before 'nested' children!)
    expect(rowsInitial.some((r) => r.key === '[100]')).toBe(false);
    expect(rowsInitial.some((r) => r.key === 'deepTag')).toBe(false);

    // Clicking Show Next 100 reveals [100]..[149]
    component.showMoreArrayItems('$');
    fixture.detectChanges();
    const rowsAfterMore = component.treeRows();
    expect(rowsAfterMore.some((r) => r.key === '[149]')).toBe(true);
  });

  it('formats SQL keywords cleanly while preserving literals, and validates YAML with line/column badge', async () => {
    await component.setLanguage('sql');
    component.updateInput("select 'from where' as msg from users where id = $1");
    await component.format();
    fixture.detectChanges();

    expect(component.result()?.success).toBe(true);
    expect(component.result()?.outputText).toContain('SELECT');
    expect(component.result()?.outputText).toContain("'from where'");

    await component.setLanguage('yaml');
    component.updateInput('bad:\n\tindent: 1');
    await component.format();
    fixture.detectChanges();
    expect(component.result()?.success).toBe(false);
    expect(component.result()?.diagnostic.line).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Line 2');

    // Valid YAML -> JSON conversion
    component.updateInput(SAMPLE_YAML_DOC);
    component.yamlOutputMode.set('json');
    await component.format();
    expect(component.result()?.success).toBe(true);
    expect(JSON.parse(component.result()!.outputText)['kind']).toBe('Deployment');
  });

  it('revokes ObjectURL after download, copies output, and terminates Worker cleanly on reset/ngOnDestroy', async () => {
    component.updateInput('{"hello": "privknife"}');
    await component.format();
    fixture.detectChanges();

    vi.useFakeTimers();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-dev-output');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadOutput();
    expect(createSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-dev-output');

    const terminateMock = vi.fn();
    (component as unknown as { activeWorker: Worker | null }).activeWorker = {
      terminate: terminateMock,
    } as unknown as Worker;
    component.reset();
    expect(terminateMock).toHaveBeenCalledTimes(1);
    expect(component.inputText()).toBe('');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
