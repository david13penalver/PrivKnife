import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Terms } from './terms';

describe('Terms', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Terms],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(Terms);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render terms content', () => {
    const fixture = TestBed.createComponent(Terms);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Terms of Service');
    expect(compiled.textContent).toContain('MIT License');
    expect(compiled.textContent).toContain('100% User Data Ownership');
  });
});
