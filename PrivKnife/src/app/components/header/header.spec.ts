import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';

describe('Header Component', () => {
  let fixture: ComponentFixture<Header>;
  let component: Header;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the header component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title PrivKnife', () => {
    const titleElement = fixture.nativeElement.querySelector('.c-header__title');
    expect(titleElement.textContent).toContain('PrivKnife');
  });

  it('should display privacy badge', () => {
    const badgeElement = fixture.nativeElement.querySelector('app-badge');
    expect(badgeElement).toBeTruthy();
    expect(badgeElement.textContent).toContain('100% In-Browser');
  });
});
