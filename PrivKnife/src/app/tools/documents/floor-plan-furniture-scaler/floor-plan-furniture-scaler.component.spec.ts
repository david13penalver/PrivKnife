import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FloorPlanFurnitureScalerComponent } from './floor-plan-furniture-scaler.component';

describe('FloorPlanFurnitureScalerComponent', () => {
  let component: FloorPlanFurnitureScalerComponent;
  let fixture: ComponentFixture<FloorPlanFurnitureScalerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [FloorPlanFurnitureScalerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloorPlanFurnitureScalerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
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

  it('should allow adding furniture from template library with grid snap (DEFECT-58-03)', () => {
    const initialCount = component.project().furniture.length;
    component.updateSnap(50);
    component.addFurniture('armchair');
    fixture.detectChanges();

    expect(component.project().furniture.length).toBe(initialCount + 1);
    const added = component.project().furniture[component.project().furniture.length - 1];
    expect(added.name).toContain('Armchair');
    expect(added.x % 50).toBe(0);
    expect(added.y % 50).toBe(0);
  });

  it('should resize room dimensions via controls (DEFECT-58-03)', () => {
    component.onRoomWidthChange(750);
    component.onRoomDepthChange(550);
    fixture.detectChanges();

    expect(component.currentRoomWidth()).toBe(750);
    expect(component.currentRoomDepth()).toBe(550);
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

  it('should display error alert when invalid JSON is imported (DEFECT-58-01)', async () => {
    const invalidFile = new File(['NOT_JSON'], 'invalid.json', { type: 'application/json' });
    const event = {
      target: {
        files: [invalidFile],
        value: '',
      },
    } as unknown as Event;

    await component.onJsonFileSelected(event);
    fixture.detectChanges();

    expect(component.importError()).toContain('Failed to import JSON floor plan');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.c-alert--danger')).toBeTruthy();
  });

  it('should sanitize malicious SVG input preventing XSS injection (DEFECT-58-01)', async () => {
    const maliciousJson = JSON.stringify({
      version: '1.0',
      name: '</text><img src=x onerror="window.__xss=true"><text>',
      options: {
        ...component.project().options,
        designerName: '<script>window.__xss=true</script>',
      },
      walls: component.project().walls,
      furniture: component.project().furniture,
    });

    const file = new File([maliciousJson], 'evil.json', { type: 'application/json' });
    const event = {
      target: {
        files: [file],
        value: '',
      },
    } as unknown as Event;

    await component.onJsonFileSelected(event);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const previewEl = compiled.querySelector('.c-floor-plan__svg-wrap');
    expect(previewEl?.querySelector('img')).toBeNull();
    expect(previewEl?.querySelector('script')).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
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

  it('should render BEM compliant elements and areas (DEFECT-58-04)', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.c-floor-plan')).toBeTruthy();
    expect(compiled.querySelector('.c-floor-plan__preset-group')).toBeTruthy();
    expect(compiled.querySelector('.c-floor-plan__svg-wrap')).toBeTruthy();
    expect(compiled.querySelector('.l-extremo__area-izquierda')).toBeTruthy();
    expect(compiled.querySelector('.l-extremo__area-derecha')).toBeTruthy();
  });

  it('should execute floor plan operations with zero network calls', async () => {
    component.downloadSvg();
    component.downloadJson();
    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
