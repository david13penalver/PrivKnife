import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';

describe('Footer Component', () => {
  let fixture: ComponentFixture<Footer>;
  let component: Footer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the footer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render copyright, privacy text, and navigation links', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PrivKnife');
    expect(text).toContain('Zero Server Storage');
    expect(text).toContain('Zero Cookies');
    expect(text).toContain('Privacy');
    expect(text).toContain('Terms');
  });
});
