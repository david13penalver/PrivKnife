import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(NotFound);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render 404 message and navigation links', () => {
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Page Not Found');
    expect(compiled.textContent).toContain('404');
    expect(compiled.querySelector('a[routerLink="/"]')?.textContent).toContain('Back to Tools');
  });
});
