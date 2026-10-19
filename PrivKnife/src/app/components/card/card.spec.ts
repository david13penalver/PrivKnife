import { Component } from '@angular/core';
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

  it('should leave header element empty when neither title nor projected header is provided', () => {
    const headerElement = fixture.nativeElement.querySelector('.c-card__header');
    expect(headerElement.textContent.trim()).toBe('');
  });
});

@Component({
  standalone: true,
  imports: [Card],
  template: `
    <app-card>
      <div card-header class="custom-header">
        <button id="test-action-btn">Custom Action</button>
      </div>
      <p id="test-body">Body Content</p>
    </app-card>
  `,
})
class TestProjectedHeaderHost {}

describe('Card Component - Content Projection', () => {
  it('should render projected header content even when title and hasHeader are not specified', async () => {
    await TestBed.configureTestingModule({
      imports: [TestProjectedHeaderHost],
    }).compileComponents();

    const hostFixture = TestBed.createComponent(TestProjectedHeaderHost);
    hostFixture.detectChanges();

    const header = hostFixture.nativeElement.querySelector('.c-card__header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Custom Action');
    expect(hostFixture.nativeElement.querySelector('#test-action-btn')).toBeTruthy();
  });
});

