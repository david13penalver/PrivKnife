import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-split-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="previewClasses()">
      <div class="c-preview__toolbar">
        <span class="c-preview__label-static">
          <strong>{{ beforeLabel() }}</strong> vs <strong>{{ afterLabel() }}</strong>
        </span>
        <ng-content select="[preview-actions]" />
      </div>

      <div
        #viewport
        class="c-preview__viewport c-preview__split"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)">
        <!-- Before View (Background) -->
        <div class="c-preview__before">
          <ng-content select="[before]" />
          <span class="c-preview__label c-preview__label--left">{{ beforeLabel() }}</span>
        </div>

        <!-- After View (Clipped Foreground) -->
        <div
          class="c-preview__after"
          [style.clipPath]="clipPathStyle()">
          <ng-content select="[after]" />
          <span class="c-preview__label c-preview__label--right">{{ afterLabel() }}</span>
        </div>

        <!-- Split Slider Handle -->
        <div
          class="c-preview__handle"
          [style.left.%]="splitPosition()"
          role="slider"
          aria-label="Split preview slider"
          [attr.aria-valuenow]="splitPosition()"
          aria-valuemin="5"
          aria-valuemax="95"
          tabindex="0"></div>
      </div>
    </div>
  `,
})
export class SplitPreview {
  readonly beforeLabel = input<string>('Original');
  readonly afterLabel = input<string>('Processed');
  readonly customClass = input<string>('');

  protected readonly splitPosition = signal<number>(50);
  protected readonly isDragging = signal<boolean>(false);
  protected readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  protected readonly previewClasses = computed(() => {
    const classes = ['c-preview'];
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    return classes.join(' ');
  });

  protected readonly clipPathStyle = computed(() => {
    const pos = this.splitPosition();
    return `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;
  });

  protected onPointerDown(event: PointerEvent): void {
    this.isDragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updatePositionFromPointer(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.isDragging()) {
      this.updatePositionFromPointer(event);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may have already been released
      }
    }
  }

  private updatePositionFromPointer(event: PointerEvent): void {
    const el = this.viewport()?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let percentage = (x / rect.width) * 100;

    // Clamp between 5% and 95%
    if (percentage < 5) percentage = 5;
    if (percentage > 95) percentage = 95;

    this.splitPosition.set(Math.round(percentage));
  }
}
