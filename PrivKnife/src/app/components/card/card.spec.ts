import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card Component', () => {
  let fixture: ComponentFixture<Card>;
  let component: Card;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Card],
    }).compileComponents();

    fixture = TestBed.createComponent(Card);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header when title input is provided', () => {
    fixture.componentRef.setInput('title', 'Tool Settings');
    fixture.detectChanges();
    const headerElement = fixture.nativeElement.querySelector('.c-card__header');
    expect(headerElement).toBeTruthy();
    expect(headerElement.textContent).toContain('Tool Settings');
  });

  it('should add interactive class when interactive input is true', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();
    const cardElement = fixture.nativeElement.querySelector('.c-card');
    expect(cardElement.classList.contains('c-card--interactive')).toBe(true);
  });
});
