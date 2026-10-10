import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'normal' | 'large';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [class]="buttonClasses()"
      [disabled]="disabled() || loading()"
      (click)="onClick($event)">
      @if (loading()) {
        <span class="c-button__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('normal');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly iconOnly = input<boolean>(false);
  readonly customClass = input<string>('');

  readonly clicked = output<MouseEvent>();

  protected readonly buttonClasses = computed(() => {
    const classes = ['c-button', `c-button--${this.variant()}`];
    if (this.size() === 'small') classes.push('c-button--small');
    if (this.size() === 'large') classes.push('c-button--large');
    if (this.iconOnly()) classes.push('c-button--icon-only');
    if (this.loading()) classes.push('c-button--loading');
    if (this.disabled()) classes.push('c-button--disabled');
    if (this.customClass()) classes.push(this.customClass());
    return classes.join(' ');
  });

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
