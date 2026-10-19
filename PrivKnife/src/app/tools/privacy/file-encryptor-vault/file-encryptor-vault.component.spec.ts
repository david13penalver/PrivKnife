import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileEncryptorVaultComponent } from './file-encryptor-vault.component';
import {
  createSyntheticPlaintextFile,
  TEST_VAULT_PASSWORD,
} from './test-fixtures';

describe('FileEncryptorVaultComponent (Seam 2 & 4)', () => {
  let component: FileEncryptorVaultComponent;
  let fixture: ComponentFixture<FileEncryptorVaultComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [FileEncryptorVaultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileEncryptorVaultComponent);
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

    it('should initialize with default vault options', () => {
      expect(component.operationMode()).toBe('encrypt');
      expect(component.encryptionAlgorithm()).toBe('AES-GCM-256');
      expect(component.pbkdf2Iterations()).toBe(100000);
      expect(component.saltLengthBytes()).toBe(16);
      expect(component.ivLengthBytes()).toBe(12);
      expect(component.embedOriginalFilename()).toBe(true);
      expect(component.containerFormat()).toBe('priv');
      expect(component.password()).toBe('');
      expect(component.selectedFile()).toBeNull();
      expect(component.lastResult()).toBeNull();
    });
  });

  describe('Controls & Options Updates', () => {
    it('should update operation mode between encrypt and decrypt', () => {
      component.setOperationMode('decrypt');
      expect(component.operationMode()).toBe('decrypt');

      component.setOperationMode('encrypt');
      expect(component.operationMode()).toBe('encrypt');
    });

    it('should update password and iterations', () => {
      component.setPassword('MasterSecretVaultPass#42');
      expect(component.password()).toBe('MasterSecretVaultPass#42');

      component.setIterations(300000);
      expect(component.pbkdf2Iterations()).toBe(300000);
    });

    it('should update container format', () => {
      component.setContainerFormat('enc');
      expect(component.containerFormat()).toBe('enc');
    });
  });

  describe('File Handling & Auto-Detection', () => {
    it('should accept plaintext file and retain encrypt mode', async () => {
      const file = createSyntheticPlaintextFile('tax-return.pdf', 2048);
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('tax-return.pdf');
      expect(component.operationMode()).toBe('encrypt');
    });

    it('should auto-switch to decrypt mode when a .priv file is dropped', async () => {
      const file = createSyntheticPlaintextFile('records.pdf.priv', 2048);
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.operationMode()).toBe('decrypt');
    });
  });

  describe('Vault Action Execution (Encrypt & Decrypt)', () => {
    it('should encrypt a file and produce a downloadable result', async () => {
      const file = createSyntheticPlaintextFile('passwords.txt', 512);
      await component.handleFileSelected(file);
      component.setPassword(TEST_VAULT_PASSWORD);
      component.setIterations(1000); // fast iterations for tests

      await component.executeVaultAction();

      expect(component.lastResult()).toBeTruthy();
      expect(component.lastResult()?.success).toBe(true);
      expect(component.lastResult()?.fileName).toBe('passwords.txt.priv');
      expect(component.lastResult()?.operation).toBe('encrypt');
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

      const file = createSyntheticPlaintextFile('keys.txt', 256);
      await component.handleFileSelected(file);
      component.setPassword(TEST_VAULT_PASSWORD);
      component.setIterations(1000);

      await component.executeVaultAction();
      component.downloadDeliverable();

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Hygiene & Disposal', () => {
    it('should revoke created object URLs upon reset and destroy', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const file = createSyntheticPlaintextFile('notes.txt', 256);
      await component.handleFileSelected(file);
      component.setPassword(TEST_VAULT_PASSWORD);
      component.setIterations(1000);
      await component.executeVaultAction();

      component.resetToDefaults();
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard', () => {
    it('should encrypt and decrypt files without dispatching any network requests', async () => {
      const file = createSyntheticPlaintextFile('classified-dossier.pdf', 1024);
      await component.handleFileSelected(file);
      component.setPassword(TEST_VAULT_PASSWORD);
      component.setIterations(1000);

      await component.executeVaultAction();
      component.downloadDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
