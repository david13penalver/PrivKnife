import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge Component', () => {
  let fixture: ComponentFixture<Badge>;
  let component: Badge;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Badge],
    }).compileComponents();

    fixture = TestBed.createComponent(Badge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the badge component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply privacy variant class when specified', () => {
    fixture.componentRef.setInput('variant', 'privacy');
    fixture.detectChanges();
    const badgeElement = fixture.nativeElement.querySelector('span');
    expect(badgeElement.classList.contains('c-badge--privacy')).toBe(true);
  });

  it('should render dot when dot input is true', () => {
    fixture.componentRef.setInput('dot', true);
    fixture.detectChanges();
    const dotElement = fixture.nativeElement.querySelector('.c-badge__dot');
    expect(dotElement).toBeTruthy();
  });
});
