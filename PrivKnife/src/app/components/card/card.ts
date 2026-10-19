import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cardClasses()">
      <div class="c-card__header">
        @if (title()) {
          <h3 class="c-card__title">{{ title() }}</h3>
        }
        <ng-content select="[card-header]" />
      </div>
      <div class="c-card__body">
        <ng-content />
      </div>
      <div class="c-card__footer">
        <ng-content select="[card-footer]" />
      </div>
    </div>
  `,
})
export class Card {
  readonly title = input<string>('');
  readonly hasHeader = input<boolean>(false);
  readonly hasFooter = input<boolean>(false);
  readonly interactive = input<boolean>(false);
  readonly customClass = input<string>('');

  protected readonly cardClasses = computed(() => {
    const classes = ['c-card'];
    if (this.interactive()) {
      classes.push('c-card--interactive');
    }
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    return classes.join(' ');
  });
}

