import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { VideoInfo, VideoJob, VideoRequest } from '../models/video';
import { ApiService } from './api.service';

export const VIDEO_POLL_MS = 1500;

/** VideoGenAgent: narrated investor videos rendered in the back end as background jobs. */
@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly api = inject(ApiService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

  start(request: VideoRequest): Observable<VideoJob> {
    return this.api.post<VideoJob>('/video', request, this.context);
  }

  job(jobId: string): Observable<VideoJob> {
    return this.api.get<VideoJob>(`/video/jobs/${encodeURIComponent(jobId)}`, undefined, this.context);
  }

  /** Emits job updates until it is done or failed (the last emission included). */
  watch(jobId: string, intervalMs = VIDEO_POLL_MS): Observable<VideoJob> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.job(jobId)),
      takeWhile((j) => j.status === 'queued' || j.status === 'rendering', true),
    );
  }

  /** Start a video and follow its progress. */
  create(request: VideoRequest): Observable<VideoJob> {
    return this.start(request).pipe(switchMap((job) => this.watch(job.job_id)));
  }

  playUrl(video: VideoInfo): string {
    return this.api.url(video.url);
  }

  downloadUrl(video: VideoInfo): string {
    return `${this.api.url(video.url)}?download=true`;
  }
}
