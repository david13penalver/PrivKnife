import {
  AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, OnInit,
  computed, inject, input, signal, viewChild,
} from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Button, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import { MeshViewport } from './mesh-viewport';
import type { WorkshopDefinition, WorkshopPreset } from './workshop-config';
import type { WorkshopFormat, WorkshopMetrics, WorkshopRequest, WorkshopResponse, WorkshopValue } from './workshop-protocol';

@Component({
  selector: 'app-mesh-workshop',
  standalone: true,
  imports: [Badge, Button, ProgressBar, ReactiveFormsModule, TranslatePipe],
  templateUrl: './workshop.html',
  styleUrl: './workshop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeshWorkshop implements OnInit, AfterViewInit, OnDestroy {
  readonly definition = input.required<WorkshopDefinition>();
  readonly form = new FormRecord<FormControl<WorkshopValue>>({});
  readonly values = signal(this.form.getRawValue());
  readonly fields = computed(() => this.definition().fields.filter((field) => this.visible(field.modes)));
  readonly metrics = signal<WorkshopMetrics | null>(null);
  readonly pending = signal<WorkshopRequest['type'] | null>(null);
  readonly progress = signal(0);
  readonly error = signal<string | null>(null);
  readonly noWebgl = signal(false);
  readonly wireframe = signal(false);
  readonly fileSize = signal(0);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly destroyRef = inject(DestroyRef);
  private readonly createdObjectUrls: string[] = [];
  private worker?: Worker;
  private timer?: ReturnType<typeof setTimeout>;
  private viewport?: MeshViewport;

  ngOnInit(): void {
    for (const [name, value] of Object.entries(this.definition().initial)) {
      this.form.addControl(name, new FormControl<WorkshopValue>(value, { nonNullable: true }));
    }
    this.values.set(this.form.getRawValue());
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.values.set(this.form.getRawValue());
      this.queuePreview();
    });
  }

  ngAfterViewInit(): void {
    if (typeof WebGL2RenderingContext !== 'undefined' && typeof ResizeObserver !== 'undefined') {
      try {
        const host = this.host().nativeElement;
        this.viewport = new MeshViewport(host, host.getAttribute('aria-label') ?? '');
      } catch {
        this.noWebgl.set(true);
      }
    } else {
      this.noWebgl.set(true);
    }
    this.queuePreview();
  }

  ngOnDestroy(): void {
    this.stopJob();
    this.viewport?.dispose();
    this.createdObjectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  }

  applyPreset(preset: WorkshopPreset): void {
    this.form.patchValue(preset.patch);
  }

  reset(): void {
    this.form.reset(this.definition().initial);
    this.wireframe.set(false);
    this.viewport?.setWireframe(false);
  }

  visible(modes?: readonly string[]): boolean {
    return !modes || modes.includes(String(this.values()['mode']) );
  }

  key(local: string): string {
    return `tools.${this.definition().i18n}.${local}`;
  }

  choice(value: string | { value: string | number; label: string }) {
    return typeof value === 'string' ? { value, label: this.key(value) } : { value: value.value, label: value.label };
  }

  toggleWireframe(): void {
    this.wireframe.update((on) => !on);
    this.viewport?.setWireframe(this.wireframe());
  }

  resetView(): void {
    this.viewport?.resetView();
  }

  download(format: WorkshopFormat): void {
    if (!this.metrics() || this.pending()) return;
    this.run(format);
  }

  displayMetric(key: string, digits: number): string {
    const value = this.metrics()?.[key];
    return typeof value === 'number' ? Number(value.toFixed(digits)).toString() : '';
  }

  private queuePreview(): void {
    this.stopJob();
    this.metrics.set(null);
    this.error.set(null);
    this.fileSize.set(0);
    this.progress.set(0);
    this.pending.set('preview');
    this.timer = setTimeout(() => this.run('preview'), 140);
  }

  private stopJob(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.onmessageerror = null;
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  private run(type: WorkshopRequest['type']): void {
    this.stopJob();
    this.progress.set(0);
    this.pending.set(type);
    this.error.set(null);
    const options = this.values();
    const fail = (key: string) => {
      this.stopJob();
      this.error.set(key);
      this.pending.set(null);
      if (type === 'preview') this.viewport?.clearParts();
    };
    try {
      const worker = this.definition().worker();
      this.worker = worker;
      worker.onerror = () => fail('generationError');
      worker.onmessageerror = () => fail('generationError');
      worker.onmessage = ({ data }: MessageEvent<WorkshopResponse>) => {
        if (this.worker !== worker) return;
        if (data.type === 'progress') {
          this.progress.set(data.percent);
          return;
        }
        if (data.type === 'error') {
          fail(data.key);
          return;
        }
        this.stopJob();
        this.pending.set(null);
        this.metrics.set(data.metrics);
        if (data.type === 'preview') {
          this.viewport?.setParts(data.parts, this.definition().colors.map((key) => String(options[key])));
        } else if (type !== 'preview') {
          this.fileSize.set(data.buffer.byteLength);
          try {
            this.save(data.buffer, type);
          } catch {
            fail('generationError');
          }
        }
      };
      worker.postMessage({ type, options } satisfies WorkshopRequest);
    } catch {
      fail('generationError');
    }
  }

  private save(buffer: ArrayBuffer, format: WorkshopFormat): void {
    const url = URL.createObjectURL(new Blob([buffer], { type: `model/${format}` }));
    this.createdObjectUrls.push(url);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = `privknife-${this.definition().id}-${this.values()['mode']}.${format}`;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.pop();
    }
  }
}
