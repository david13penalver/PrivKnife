import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplitPreview } from './split-preview';

describe('SplitPreview Component', () => {
  let fixture: ComponentFixture<SplitPreview>;
  let component: SplitPreview;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitPreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the split preview component', () => {
    expect(component).toBeTruthy();
  });

  it('should render before and after labels', () => {
    fixture.componentRef.setInput('beforeLabel', 'Uncompressed');
    fixture.componentRef.setInput('afterLabel', 'Optimized');
    fixture.detectChanges();

    const toolbar = fixture.nativeElement.querySelector('.c-preview__toolbar');
    expect(toolbar.textContent).toContain('Uncompressed');
    expect(toolbar.textContent).toContain('Optimized');
  });

  it('should render split handle at initial 50% position', () => {
    const handle = fixture.nativeElement.querySelector('.c-preview__handle');
    expect(handle).toBeTruthy();
    expect(handle.style.left).toBe('50%');
  });
});
