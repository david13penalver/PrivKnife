import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CryptoHashUuidComponent } from './crypto-hash-uuid.component';
import { UUID_V4_REGEX } from './test-vectors';

describe('CryptoHashUuidComponent (Seam 2: UI & Privacy Boundary)', () => {
  let fixture: ComponentFixture<CryptoHashUuidComponent>;
  let component: CryptoHashUuidComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    let objectUrlCounter = 0;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:http://localhost/mock-${++objectUrlCounter}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CryptoHashUuidComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CryptoHashUuidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize in UUID mode and generate 10 UUIDs by default', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.activeMode()).toBe('uuid');
    expect(component.generatedUuids().length).toBe(10);
    expect(component.generatedUuids()[0]).toMatch(UUID_V4_REGEX);
    expect(compiled.textContent).toContain('10 UUIDs generated');
    expect(compiled.textContent).toContain('100% In-Browser');
  });

  it('should regenerate UUIDs when quantity or formatting options change', () => {
    component.uuidQuantity.set(5);
    component.uuidCasing.set('uppercase');
    component.uuidHyphens.set(false);
    component.generateUuids();
    fixture.detectChanges();

    expect(component.generatedUuids().length).toBe(5);
    for (const id of component.generatedUuids()) {
      expect(id).toMatch(/^[0-9A-F]{32}$/);
    }
  });

  it('should update quantity and regenerate UUIDs when number input changes', () => {
    const numberInput = fixture.nativeElement.querySelector('#uuid-qty-input') as HTMLInputElement;
    expect(numberInput).toBeTruthy();
    numberInput.value = '25';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.uuidQuantity()).toBe(25);
    expect(component.generatedUuids().length).toBe(25);
  });

  it('should allow clearing the number input while typing and clamp on blur', () => {
    const numberInput = fixture.nativeElement.querySelector('#uuid-qty-input') as HTMLInputElement;
    expect(numberInput).toBeTruthy();

    // User clears input while typing
    numberInput.value = '';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.quantityInput()).toBe('');

    // User types 9999 and blurs
    numberInput.value = '9999';
    numberInput.dispatchEvent(new Event('input'));
    numberInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.uuidQuantity()).toBe(1000);
    expect(component.quantityInput()).toBe('1000');
    expect(component.generatedUuids().length).toBe(1000);
  });

  it('should switch to String Hasher mode and compute hashes for inputs', async () => {
    component.setMode('hasher');
    component.hasherInput.set('apple\nbanana');
    component.hasherAlgorithm.set('SHA-256');
    await component.computeHashes();
    fixture.detectChanges();

    expect(component.activeMode()).toBe('hasher');
    expect(component.hashResults().length).toBe(2);
    expect(component.hashResults()[0].input).toBe('apple');
    expect(component.hashResults()[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(component.hashResults()[1].input).toBe('banana');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('apple');
    expect(compiled.textContent).toContain(component.hashResults()[0].hash);
  });

  it('should display security warning badge when MD5 algorithm is selected', async () => {
    component.setMode('hasher');
    component.hasherAlgorithm.set('MD5');
    await component.computeHashes();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('MD5 is considered cryptographically broken');
  });

  it('should copy output to clipboard and display feedback', async () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });

    await component.copyToClipboard();
    fixture.detectChanges();

    expect(clipboardSpy).toHaveBeenCalled();
    expect(component.copied()).toBe(true);
  });

  it('should download export file and revoke object URL (Memory Hygiene)', () => {
    component.download('txt');
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // Run UUID batch generation
    component.uuidQuantity.set(50);
    component.generateUuids();

    // Run text hashing
    component.setMode('hasher');
    component.hasherInput.set('secret-data-1\nsecret-data-2');
    await component.computeHashes();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
