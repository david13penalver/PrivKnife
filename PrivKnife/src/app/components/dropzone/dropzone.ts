import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="dropzoneClasses()"
      (dragover)="onDragOver($event)"
      (dragenter)="onDragEnter($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="triggerFileInput()"
      (keydown.enter)="triggerFileInput()"
      (keydown.space)="triggerFileInput()"
      role="button"
      tabindex="0"
      [attr.aria-disabled]="disabled()">
      <input
        #fileInput
        type="file"
        class="c-dropzone__input"
        [accept]="accept()"
        [multiple]="multiple()"
        [disabled]="disabled()"
        (change)="onFileInputChange($event)"
        aria-hidden="true" />
      <div class="c-dropzone__icon" aria-hidden="true">
        <ng-content select="[dropzone-icon]">
          <span style="font-size: 2.25rem;">📁</span>
        </ng-content>
      </div>
      <div class="c-dropzone__title">{{ title() }}</div>
      <div class="c-dropzone__subtitle">{{ subtitle() }}</div>
      <ng-content select="[dropzone-hint]" />
    </div>
  `,
})
export class Dropzone {
  readonly accept = input<string>('*/*');
  readonly multiple = input<boolean>(false);
  readonly maxSizeMb = input<number>(100);
  readonly title = input<string>('Drag & drop your files here');
  readonly subtitle = input<string>('or click to browse from your device');
  readonly disabled = input<boolean>(false);
  readonly customClass = input<string>('');

  readonly filesSelected = output<File[]>();
  readonly rejected = output<string>();

  protected readonly isDragOver = signal<boolean>(false);
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly dropzoneClasses = computed(() => {
    const classes = ['c-dropzone'];
    if (this.isDragOver()) {
      classes.push('c-dropzone--drag-over');
    }
    if (this.disabled()) {
      classes.push('c-dropzone--disabled');
    }
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    return classes.join(' ');
  });

  protected triggerFileInput(): void {
    if (!this.disabled()) {
      this.fileInput()?.nativeElement.click();
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.disabled() || !event.dataTransfer?.files) {
      return;
    }

    this.processFileList(event.dataTransfer.files);
  }

  protected onFileInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processFileList(target.files);
      target.value = ''; // Reset input so same file can be re-selected
    }
  }

  private processFileList(fileList: FileList): void {
    const files = Array.from(fileList);
    const maxSizeBytes = this.maxSizeMb() * 1024 * 1024;

    const oversizedFile = files.find((f) => f.size > maxSizeBytes);
    if (oversizedFile) {
      this.rejected.emit(
        `File "${oversizedFile.name}" exceeds the maximum size limit of ${this.maxSizeMb()}MB.`
      );
      return;
    }

    if (!this.multiple() && files.length > 1) {
      this.filesSelected.emit([files[0]]);
    } else {
      this.filesSelected.emit(files);
    }
  }
}
