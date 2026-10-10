import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProgressVariant = 'primary' | 'success' | 'danger';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="progressClasses()"
      role="progressbar"
      [attr.aria-valuenow]="indeterminate() ? null : normalizedValue()"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-label]="label() || 'Progress'">
      @if (label() || (showPercentage() && !indeterminate())) {
        <div class="c-progress__info">
          @if (label()) {
            <span class="c-progress__label">{{ label() }}</span>
          }
          @if (showPercentage() && !indeterminate()) {
            <span class="c-progress__percentage">{{ normalizedValue() }}%</span>
          }
        </div>
      }
      <div class="c-progress__track">
        <div
          class="c-progress__bar"
          [style.width.%]="indeterminate() ? null : normalizedValue()"></div>
      </div>
    </div>
  `,
})
export class ProgressBar {
  readonly value = input<number>(0);
  readonly label = input<string>('');
  readonly showPercentage = input<boolean>(true);
  readonly indeterminate = input<boolean>(false);
  readonly variant = input<ProgressVariant>('primary');
  readonly customClass = input<string>('');

  protected readonly normalizedValue = computed(() => {
    const val = this.value();
    if (val < 0) return 0;
    if (val > 100) return 100;
    return Math.round(val);
  });

  protected readonly progressClasses = computed(() => {
    const classes = ['c-progress'];
    if (this.variant() !== 'primary') {
      classes.push(`c-progress--${this.variant()}`);
    }
    if (this.indeterminate()) {
      classes.push('c-progress--indeterminate');
    }
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    return classes.join(' ');
  });
}
