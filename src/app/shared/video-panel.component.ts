import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs';
import { errorDetail } from '../core/interceptors/error.interceptor';
import { VideoJob, VideoRequest } from '../core/models/video';
import { VideoService } from '../core/services/video.service';

/** Create-video button, render progress, then an inline player with Download. */
@Component({
  selector: 'app-video-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    @let j = job();
    @if (j?.status === 'done' && j?.video; as _) {
      <div class="ready" data-testid="video-ready">
        <video controls preload="metadata" [src]="playUrl()" [class.compact]="compact()" aria-label="Investor video"></video>
        <div class="row">
          <a mat-flat-button color="primary" [href]="downloadUrl()" [attr.download]="j!.video!.file_name"
             data-testid="video-download"><mat-icon>download</mat-icon> Download video</a>
          <span class="note">{{ j!.video!.duration_seconds }} s · {{ j!.video!.file_name }}</span>
          @if (request()) {
            <button mat-button type="button" (click)="create()">Create again</button>
          }
        </div>
      </div>
    } @else if (j && (j.status === 'queued' || j.status === 'rendering')) {
      <div class="progress" data-testid="video-progress">
        <span>🎬 {{ j.message }} {{ (j.progress * 100).toFixed(0) }}%</span>
        <mat-progress-bar mode="determinate" [value]="j.progress * 100" aria-label="Video progress" />
      </div>
    } @else if (request()) {
      <button mat-stroked-button type="button" (click)="create()" data-testid="video-create">
        <mat-icon>movie</mat-icon> {{ label() }}
      </button>
    }
    @if (error(); as e) {
      <span class="error">⚠️ {{ e }}</span>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 0.5rem; }
    video { width: 100%; max-width: 760px; border-radius: 0.5rem; border: 1px solid var(--app-border); background: #000; }
    video.compact { max-width: 100%; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .progress { display: flex; flex-direction: column; gap: 0.35rem; max-width: 420px; font-size: 0.9rem; }
    .note { font-size: 0.75rem; color: var(--app-muted); }
    .error { font-size: 0.85rem; color: var(--app-negative); }
  `,
})
export class VideoPanelComponent {
  private readonly video = inject(VideoService);

  /** Request to send when the button is clicked (omit to only follow ``initialJob``). */
  readonly request = input<VideoRequest | null>(null);
  /** Job already started elsewhere, e.g. by the Stochastix AI chat. */
  readonly initialJob = input<VideoJob | null>(null);
  readonly label = input('Create investor video');
  readonly compact = input(false);

  readonly job = signal<VideoJob | null>(null);
  readonly error = signal<string | null>(null);
  private sub: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
    effect(() => {
      const started = this.initialJob();
      if (started && !this.job()) this.follow(started);
    });
  }

  protected playUrl(): string {
    const v = this.job()?.video;
    return v ? this.video.playUrl(v) : '';
  }

  protected downloadUrl(): string {
    const v = this.job()?.video;
    return v ? this.video.downloadUrl(v) : '';
  }

  create(): void {
    const req = this.request();
    if (!req) return;
    this.error.set(null);
    this.job.set({ job_id: '', account_id: req.account_id, status: 'queued', progress: 0, message: 'Starting…', video: null });
    this.sub?.unsubscribe();
    this.sub = this.video.create(req).subscribe({ next: (j) => this.update(j), error: (e) => this.fail(e) });
  }

  private follow(job: VideoJob): void {
    this.job.set(job);
    this.sub?.unsubscribe();
    this.sub = this.video.watch(job.job_id).subscribe({ next: (j) => this.update(j), error: (e) => this.fail(e) });
  }

  private update(j: VideoJob): void {
    this.job.set(j);
    if (j.status === 'error') {
      this.error.set(j.message);
      this.job.set(null);
    }
  }

  private fail(e: unknown): void {
    this.error.set(errorDetail(e));
    this.job.set(null);
  }
}
