import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NutritionLabelMakerComponent } from './nutrition-label-maker.component';

describe('NutritionLabelMakerComponent (Seam 2 UI & Privacy)', () => {
  let component: NutritionLabelMakerComponent;
  let fixture: ComponentFixture<NutritionLabelMakerComponent>;
  let fetchSpy: any;
  let xhrOpenSpy: any;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [NutritionLabelMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NutritionLabelMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrOpenSpy.mockRestore();
  });

  it('should create component with default signals and live preview', () => {
    expect(component).toBeTruthy();
    expect(component.regulatoryStandard()).toBe('fda_standard_2016');
    expect(component.calories()).toBe(230);
    expect(component.servingSizeText()).toBe('2/3 cup (55g)');
    expect(component.exportFormat()).toBe('svg');
    expect(component.liveSvg()).toContain('Nutrition Facts');
  });

  it('should render privacy trust badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.c-badge--privacy');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('100% In-Browser • Never Leaves Your Device');
  });

  it('should update reactive options and regenerate live SVG preview', () => {
    component.updateStandard('eu_standard_1169');
    component.updateCalories(580);
    component.updateServingSize('30g portion');
    component.updateTotalFat(32);
    component.updateProtein(12);

    expect(component.regulatoryStandard()).toBe('eu_standard_1169');
    expect(component.calories()).toBe(580);
    expect(component.servingSizeText()).toBe('30g portion');
    expect(component.liveSvg()).toContain('Nutrition Declaration');
  });

  it('should generate SVG deliverable and create object URL', async () => {
    component.updateExportFormat('svg');
    await component.generateDeliverable();
    fixture.detectChanges();

    const res = component.result();
    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);
    expect(res?.mimeType).toBe('image/svg+xml');
    expect(res?.fileName).toContain('.svg');
    expect(component.downloadUrl()).toBeTruthy();
  });

  it('should generate PDF deliverable when pdf format is chosen', async () => {
    component.updateExportFormat('pdf');
    await component.generateDeliverable();
    fixture.detectChanges();

    const res = component.result();
    expect(res?.success).toBe(true);
    expect(res?.mimeType).toBe('application/pdf');
    expect(res?.fileName).toContain('.pdf');
  });

  it('should switch between presets (FDA, EU, Supplement, Dual Column)', () => {
    component.updateStandard('fda_supplement_facts');
    expect(component.liveSvg()).toContain('Supplement Facts');

    component.updateStandard('fda_dual_column');
    expect(component.liveSvg()).toContain('Per serving');
  });

  it('should revoke object URL when resetting component state', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    await component.generateDeliverable();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    component.resetToDefaults();
    expect(revokeSpy).toHaveBeenCalledWith(url);
    expect(component.downloadUrl()).toBeNull();
    expect(component.result()).toBeNull();

    revokeSpy.mockRestore();
  });

  it('should revoke object URL on ngOnDestroy', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    await component.generateDeliverable();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    fixture.destroy();
    expect(revokeSpy).toHaveBeenCalledWith(url);

    revokeSpy.mockRestore();
  });

  it('should trigger browser download anchor click', async () => {
    await component.generateDeliverable();

    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      set href(val: string) {},
      set download(val: string) {},
      click: clickSpy,
    } as any);

    component.downloadResult();
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it('should maintain ZERO network exfiltration during full workflow', async () => {
    component.updateCalories(350);
    component.updateStandard('eu_standard_1169');
    await component.generateDeliverable();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });

  it('should include 300 DPI PNG export option and export PNG deliverable (DEFECT-53-03)', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('#exportFormatSelect') as HTMLSelectElement;
    const pngOption = Array.from(select.options).find((opt) => opt.value === 'png');
    expect(pngOption).toBeTruthy();

    component.updateExportFormat('png');
    await component.generateDeliverable();
    fixture.detectChanges();

    const res = component.result();
    expect(res?.success).toBe(true);
    expect(res?.mimeType).toBe('image/png');
    expect(res?.fileName).toContain('.png');
  });
});
