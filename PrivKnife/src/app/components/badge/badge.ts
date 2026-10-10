import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'privacy' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClasses()">
      @if (dot()) {
        <span class="c-badge__dot" aria-hidden="true"></span>
      }
      <ng-content />
    </span>
  `,
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly dot = input<boolean>(false);
  readonly customClass = input<string>('');

  protected readonly badgeClasses = computed(() => {
    const classes = ['c-badge'];
    if (this.variant() !== 'neutral') {
      classes.push(`c-badge--${this.variant()}`);
    }
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    return classes.join(' ');
  });
}
