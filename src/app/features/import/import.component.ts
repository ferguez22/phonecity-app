import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportService, PreviewData, ExecuteData } from './import.service';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
})
export class ImportComponent {
  private importService = inject(ImportService);

  file = signal<File | null>(null);
  preview = signal<PreviewData | null>(null);
  result = signal<ExecuteData | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  confirm = signal(false);
  dragOver = signal(false);
  showFallbacks = signal(false);

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files && input.files.length ? input.files[0] : null;
    this.setFile(f);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const f = event.dataTransfer && event.dataTransfer.files.length ? event.dataTransfer.files[0] : null;
    this.setFile(f);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  doPreview(): void {
    const f = this.file();
    if (!f) return;
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.importService.preview(f).subscribe({
      next: (data) => {
        this.preview.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.msg(err));
        this.loading.set(false);
      },
    });
  }

  doExecute(): void {
    const f = this.file();
    if (!f || !this.confirm()) return;
    this.loading.set(true);
    this.error.set(null);
    this.importService.execute(f).subscribe({
      next: (data) => {
        this.result.set(data);
        this.preview.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.msg(err));
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.confirm.set(false);
    this.error.set(null);
    this.showFallbacks.set(false);
  }

  toggleConfirm(): void {
    this.confirm.update((v) => !v);
  }

  toggleFallbacks(): void {
    this.showFallbacks.update((v) => !v);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setFile(f: File | null): void {
    if (f && !f.name.toLowerCase().endsWith('.csv')) {
      this.error.set('El archivo debe ser .csv');
      return;
    }
    this.file.set(f);
    this.preview.set(null);
    this.result.set(null);
    this.confirm.set(false);
    this.error.set(null);
  }

  private msg(err: unknown): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    if (e && e.error && e.error.error && e.error.error.message) return e.error.error.message;
    if (e && e.message) return e.message;
    return 'Error inesperado en la importación';
  }
}
