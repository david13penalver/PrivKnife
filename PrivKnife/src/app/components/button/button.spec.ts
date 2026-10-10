import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button Component', () => {
  let fixture: ComponentFixture<Button>;
  let component: Button;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button],
    }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the button component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply primary variant class by default', () => {
    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement.classList.contains('c-button')).toBe(true);
    expect(buttonElement.classList.contains('c-button--primary')).toBe(true);
  });

  it('should disable the button when disabled input is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement.disabled).toBe(true);
    expect(buttonElement.classList.contains('c-button--disabled')).toBe(true);
  });

  it('should display spinner when loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.c-button__spinner');
    expect(spinner).toBeTruthy();
  });
});
