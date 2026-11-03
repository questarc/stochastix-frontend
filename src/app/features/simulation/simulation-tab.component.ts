import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { VideoRequest } from '../../core/models/video';
import { SimulationStore } from '../../core/state/simulation.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { VideoPanelComponent } from '../../shared/video-panel.component';
import { AllocationChartComponent } from './allocation-chart.component';
import { DepletionHistogramComponent } from './depletion-histogram.component';
import { EndingHistogramComponent } from './ending-histogram.component';
import { FanChartComponent } from './fan-chart.component';
import { PositionsTableComponent } from './positions-table.component';
import { RunSettingsComponent } from './run-settings.component';
import { SuccessMetricsComponent } from './success-metrics.component';

export const ASSET_CLASSES = ['US Equity', 'Intl Equity', 'US Bonds', 'Cash', 'Real Estate'];

@Component({
  selector: 'app-simulation-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonToggleModule, MatProgressBarModule, MatCardModule, MatCheckboxModule, AllocationChartComponent,
    DepletionHistogramComponent, EndingHistogramComponent, FanChartComponent, PositionsTableComponent,
    RunSettingsComponent, SuccessMetricsComponent, VideoPanelComponent,
  ],
  template: `
    @if (sim.loading() || workspace.portfolioLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Running simulation" />
    }
    @if (workspace.portfolio(); as portfolio) {
      <div class="two-col">
        <app-positions-table [positions]="portfolio.positions" />
        <app-allocation-chart [portfolio]="portfolio" [assetClasses]="assetClasses" />
      </div>
    }
    @if (sim.response(); as response) {
      <app-success-metrics [response]="response" [selected]="selected()" />
      <mat-card class="video-card" data-testid="video-card">
        <div class="video-head">
          <div>
            <h3>🎬 Investor video</h3>
            <p class="caption">A narrated walkthrough of this retirement plan, including projections and the selected rebalance option.</p>
          </div>
          <mat-checkbox [checked]="includeRebalance()" (change)="includeRebalance.set($event.checked)">
            Include proposed rebalance
          </mat-checkbox>
        </div>
        <app-video-panel [request]="videoRequest()" />
      </mat-card>
      <div class="toggle">
        <span>Projection for:</span>
        <mat-button-toggle-group [value]="selected()" (change)="selected.set($event.value)" aria-label="Projection for">
          <mat-button-toggle value="current">Current portfolio</mat-button-toggle>
          <mat-button-toggle value="model">Model portfolio</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      @if (result(); as r) {
        <app-fan-chart [result]="r" [retirementAge]="retirementAge()" />
        <div class="two-col">
          <app-ending-histogram [result]="r" />
          <app-depletion-histogram [result]="r" />
        </div>
        <app-run-settings [settings]="r.settings" />
      }
    } @else if (!sim.loading()) {
      <p class="empty">Select an account to run the simulation.</p>
    }
  `,
  styles: `
    :host { display: block; padding: 1rem 0; }
    .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1.5rem; margin: 1rem 0; }
    .toggle { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; }
    .empty { opacity: 0.7; }
    .video-card { margin: 1rem 0; padding: 1rem 1.25rem; }
    .video-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .video-card h3 { margin: 0 0 0.25rem; }
    .caption { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--app-muted); max-width: 640px; }
  `,
})
export class SimulationTabComponent {
  protected readonly workspace = inject(WorkspaceStore);
  protected readonly sim = inject(SimulationStore);
  protected readonly selected = signal<'current' | 'model'>('current');
  protected readonly assetClasses = ASSET_CLASSES;
  protected readonly includeRebalance = signal(true);
  protected readonly videoRequest = computed<VideoRequest | null>(() => {
    const request = this.workspace.simulationRequest();
    return request
      ? { ...request, trials: Math.min(request.trials, 25_000), include_rebalance: this.includeRebalance() }
      : null;
  });
  protected readonly result = computed(() => this.sim.response()?.[this.selected()] ?? null);
  protected readonly retirementAge = computed(
    () => this.workspace.plan()?.retirement_age ?? this.workspace.account()?.retirement_age ?? 0,
  );
}
