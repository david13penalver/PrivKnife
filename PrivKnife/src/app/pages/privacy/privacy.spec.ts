import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Privacy } from './privacy';

describe('Privacy', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacy],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(Privacy);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render privacy principles', () => {
    const fixture = TestBed.createComponent(Privacy);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Privacy Policy & Architecture');
    expect(compiled.textContent).toContain('Privacy by Architecture, Not by Policy');
    expect(compiled.textContent).toContain('Zero-Cookie Policy');
  });
});
