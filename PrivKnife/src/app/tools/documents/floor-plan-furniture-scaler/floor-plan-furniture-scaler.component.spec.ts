import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FloorPlanFurnitureScalerComponent } from './floor-plan-furniture-scaler.component';

describe('FloorPlanFurnitureScalerComponent', () => {
  let component: FloorPlanFurnitureScalerComponent;
  let fixture: ComponentFixture<FloorPlanFurnitureScalerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorPlanFurnitureScalerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloorPlanFurnitureScalerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the privacy indicator badge', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('100% In-Browser');
    expect(el.textContent).toContain('Never Leaves Your Device');
  });

  it('should load preset room layouts', () => {
    component.loadPreset('one_bedroom_50m');
    fixture.detectChanges();

    expect(component.project().name).toContain('1-Bedroom');
    expect(component.project().walls.length).toBeGreaterThanOrEqual(5);

    component.loadPreset('office_60m');
    fixture.detectChanges();
    expect(component.project().name).toContain('Office');
  });

  it('should allow adding furniture from template library', () => {
    const initialCount = component.project().furniture.length;
    component.addFurniture('armchair');
    fixture.detectChanges();

    expect(component.project().furniture.length).toBe(initialCount + 1);
    expect(component.project().furniture.some((f) => f.name.includes('Armchair'))).toBe(true);
  });

  it('should update scale and measurement units reactively', () => {
    component.updateScale('1:20');
    expect(component.project().options.blueprintScale).toBe('1:20');

    component.updateUnit('imperial_feet');
    expect(component.project().options.measurementUnit).toBe('imperial_feet');
  });

  it('should update theme color', () => {
    component.updateTheme('classic_cad_dark');
    expect(component.project().options.themeColor).toBe('classic_cad_dark');
    expect(component.svgPreview()).toContain('#111827');
  });

  it('should detect and display clearance overlap warnings', () => {
    // Add two items at the exact same location
    component.project.update((p) => ({
      ...p,
      furniture: [
        {
          id: 'item1',
          type: 'bed_double',
          name: 'Queen Bed',
          x: 200,
          y: 200,
          widthCm: 160,
          depthCm: 200,
          rotationDeg: 0,
        },
        {
          id: 'item2',
          type: 'desk_office',
          name: 'Office Desk',
          x: 200,
          y: 200,
          widthCm: 140,
          depthCm: 70,
          rotationDeg: 0,
        },
      ],
    }));
    fixture.detectChanges();

    expect(component.clearanceWarnings().length).toBeGreaterThan(0);
    expect(component.clearanceWarnings()[0].type).toBe('overlap');
  });

  it('should trigger SVG export and revoke Object URL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-svg');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadSvg();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-svg');
  });

  it('should trigger JSON export and revoke Object URL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-json');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadJson();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-json');
  });

  it('should trigger Blueprint PDF export and revoke Object URL', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-pdf');
  });

  it('should revoke all created object URLs in ngOnDestroy', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

    component.downloadSvg();
    component.ngOnDestroy();

    expect(revokeSpy).toHaveBeenCalled();
  });
});
