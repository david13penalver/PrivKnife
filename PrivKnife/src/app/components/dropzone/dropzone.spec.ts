import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dropzone } from './dropzone';

describe('Dropzone Component', () => {
  let fixture: ComponentFixture<Dropzone>;
  let component: Dropzone;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dropzone],
    }).compileComponents();

    fixture = TestBed.createComponent(Dropzone);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the dropzone component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit files when valid files are selected', () => {
    let emittedFiles: File[] = [];
    component.filesSelected.subscribe((files) => {
      emittedFiles = files;
    });

    const mockFile = new File(['hello content'], 'test.txt', { type: 'text/plain' });
    const event = {
      target: {
        files: [mockFile],
        value: 'mock',
      },
    } as unknown as Event;

    // Call private or internal handler via component
    (component as unknown as { onFileInputChange: (e: Event) => void }).onFileInputChange(event);

    expect(emittedFiles.length).toBe(1);
    expect(emittedFiles[0].name).toBe('test.txt');
  });

  it('should reject file when file exceeds maxSizeMb', () => {
    let rejectionMessage = '';
    component.rejected.subscribe((msg) => {
      rejectionMessage = msg;
    });

    fixture.componentRef.setInput('maxSizeMb', 1);
    fixture.detectChanges();

    // Create a 2MB mock file
    const oversizedBytes = new Uint8Array(2 * 1024 * 1024);
    const mockFile = new File([oversizedBytes], 'large.dat', { type: 'application/octet-stream' });
    const event = {
      target: {
        files: [mockFile],
        value: 'mock',
      },
    } as unknown as Event;

    (component as unknown as { onFileInputChange: (e: Event) => void }).onFileInputChange(event);

    expect(rejectionMessage).toContain('exceeds the maximum size limit of 1MB');
  });
});
