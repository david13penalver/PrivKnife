import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiiScrubberAnonymizerComponent } from './pii-scrubber-anonymizer.component';
import {
  createSyntheticLogFile,
  SAMPLE_SERVER_LOG,
} from './test-fixtures';

describe('PiiScrubberAnonymizerComponent (Seam 2 & 4)', () => {
  let component: PiiScrubberAnonymizerComponent;
  let fixture: ComponentFixture<PiiScrubberAnonymizerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PiiScrubberAnonymizerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PiiScrubberAnonymizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    fixture.destroy();
  });

  describe('Initialization & Reactive State', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default PII scrubbing options', () => {
      expect(component.scrubEmails()).toBe(true);
      expect(component.scrubPhoneNumbers()).toBe(true);
      expect(component.scrubIpAddresses()).toBe(true);
      expect(component.scrubCreditCards()).toBe(true);
      expect(component.scrubSsnNationalIds()).toBe(true);
      expect(component.scrubApiTokens()).toBe(true);
      expect(component.redactionMode()).toBe('replacement_tag');
      expect(component.outputFormat()).toBe('txt');
      expect(component.lastResult()).toBeNull();
    });
  });

  describe('Controls & Options Updates', () => {
    it('should update redaction mode', () => {
      component.setRedactionMode('mask_characters');
      expect(component.redactionMode()).toBe('mask_characters');

      component.setRedactionMode('salted_hash_pseudonym');
      expect(component.redactionMode()).toBe('salted_hash_pseudonym');
    });

    it('should toggle PII entity filters', () => {
      component.toggleEntity('scrubEmails');
      expect(component.scrubEmails()).toBe(false);

      component.toggleEntity('scrubIpAddresses');
      expect(component.scrubIpAddresses()).toBe(false);
    });

    it('should update output format between txt, csv, and json', () => {
      component.setOutputFormat('csv');
      expect(component.outputFormat()).toBe('csv');

      component.setOutputFormat('json');
      expect(component.outputFormat()).toBe('json');
    });
  });

  describe('Sample Data & File Handling', () => {
    it('should populate input with sample server log', () => {
      component.loadSampleData();
      expect(component.inputText()).toContain('alice@acme.corp');
      expect(component.inputText()).toContain('192.168.1.45');
    });

    it('should accept uploaded file and read content', async () => {
      const file = createSyntheticLogFile('auth.log');
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('auth.log');
      expect(component.inputText()).toContain('alice@acme.corp');
    });
  });

  describe('Scrubbing & Deliverable Export', () => {
    it('should scrub PII from text and produce sanitized deliverable', async () => {
      component.inputText.set(SAMPLE_SERVER_LOG);
      await component.scrubData();

      expect(component.lastResult()).toBeTruthy();
      expect(component.lastResult()?.success).toBe(true);
      expect(component.lastResult()?.sanitizedText).toContain('[EMAIL_REDACTED]');
      expect(component.lastResult()?.auditStats.totalRedactions).toBeGreaterThan(0);
    });

    it('should trigger browser download on valid result', async () => {
      const clickSpy = vi.fn();
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag);
        if (tag === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      component.inputText.set(SAMPLE_SERVER_LOG);
      await component.scrubData();

      component.downloadDeliverable();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should copy sanitized content to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      component.inputText.set(SAMPLE_SERVER_LOG);
      await component.scrubData();

      await component.copyToClipboard();
      expect(writeTextSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Hygiene & Disposal', () => {
    it('should revoke created object URLs upon reset and destroy', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const file = createSyntheticLogFile();
      await component.handleFileSelected(file);
      await component.scrubData();

      component.resetToDefaults();
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard', () => {
    it('should scrub PII and export without dispatching any network requests', async () => {
      component.inputText.set(SAMPLE_SERVER_LOG);
      component.setRedactionMode('replacement_tag');
      await component.scrubData();
      component.downloadDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
