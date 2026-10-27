import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { VideoJob, VideoRequest } from '../core/models/video';
import { VideoService } from '../core/services/video.service';
import { VideoPanelComponent } from './video-panel.component';

const REQ: VideoRequest = {
  account_id: 'A1001', trials: 10000, seed: 42, sampling: 'prng', copula: 'gaussian', copula_df: 5,
  include_rebalance: true,
};
const DONE: VideoJob = {
  job_id: 'j1', account_id: 'A1001', status: 'done', progress: 1, message: 'Video ready.',
  video: { video_id: 'v1', account_id: 'A1001', client_name: 'Jane Smith', duration_seconds: 94.3,
    scenes: ['title'], created_at: '', file_name: 'A1001_plan_update_20261027_184505.mp4', size_bytes: 2_600_000,
    url: '/video/v1' },
};

function setup(jobs: Subject<VideoJob>, sent: VideoRequest[] = []) {
  TestBed.configureTestingModule({
    imports: [VideoPanelComponent],
    providers: [{ provide: VideoService, useValue: {
      create: (r: VideoRequest) => { sent.push(r); return jobs; },
      watch: () => of(DONE),
      playUrl: () => 'http://api/video/v1', downloadUrl: () => 'http://api/video/v1?download=true',
    } }],
  });
  const fixture = TestBed.createComponent(VideoPanelComponent);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('VideoPanelComponent (VideoGenAgent)', () => {
  it('creates a video, shows progress, then the player and download', async () => {
    const jobs = new Subject<VideoJob>();
    const sent: VideoRequest[] = [];
    const { fixture, el } = setup(jobs, sent);
    fixture.componentRef.setInput('request', REQ);
    await fixture.whenStable();
    (el.querySelector('[data-testid="video-create"]') as HTMLButtonElement).click();
    jobs.next({ ...DONE, status: 'rendering', progress: 0.42, message: 'Rendering video…', video: null });
    await fixture.whenStable();
    expect(sent).toEqual([REQ]);
    expect(el.querySelector('[data-testid="video-progress"]')?.textContent).toContain('42%');
    jobs.next(DONE);
    await fixture.whenStable();
    expect(el.querySelector('video')?.getAttribute('src')).toBe('http://api/video/v1');
    const link = el.querySelector('[data-testid="video-download"]') as HTMLAnchorElement;
    expect(link.getAttribute('download')).toBe(DONE.video!.file_name);
  });

  it('shows the error from a failed job and lets the advisor retry', async () => {
    const jobs = new Subject<VideoJob>();
    const { fixture, el } = setup(jobs);
    fixture.componentRef.setInput('request', REQ);
    await fixture.whenStable();
    (el.querySelector('[data-testid="video-create"]') as HTMLButtonElement).click();
    jobs.next({ ...DONE, status: 'error', message: 'Voice not installed', video: null });
    await fixture.whenStable();
    expect(el.textContent).toContain('Voice not installed');
    expect(el.querySelector('[data-testid="video-create"]')).toBeTruthy();
  });

  it('follows a job started by the Advisor AI', async () => {
    const { fixture, el } = setup(new Subject<VideoJob>());
    fixture.componentRef.setInput('initialJob', { ...DONE, status: 'queued', progress: 0, video: null });
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="video-ready"]')).toBeTruthy();
  });
});
