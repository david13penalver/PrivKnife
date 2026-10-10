import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressBar } from './progress-bar';

describe('ProgressBar Component', () => {
  let fixture: ComponentFixture<ProgressBar>;
  let component: ProgressBar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBar],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the progress bar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render normalized percentage and label', () => {
    fixture.componentRef.setInput('value', 75);
    fixture.componentRef.setInput('label', 'Processing files');
    fixture.detectChanges();

    const labelElement = fixture.nativeElement.querySelector('.c-progress__label');
    const percentageElement = fixture.nativeElement.querySelector('.c-progress__percentage');
    const barElement = fixture.nativeElement.querySelector('.c-progress__bar');

    expect(labelElement.textContent).toContain('Processing files');
    expect(percentageElement.textContent).toContain('75%');
    expect(barElement.style.width).toBe('75%');
  });

  it('should clamp values outside 0-100 range', () => {
    fixture.componentRef.setInput('value', 150);
    fixture.detectChanges();
    const barElement = fixture.nativeElement.querySelector('.c-progress__bar');
    expect(barElement.style.width).toBe('100%');
  });
});
