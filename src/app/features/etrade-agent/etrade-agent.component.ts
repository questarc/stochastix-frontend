import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { EtradeStatement } from '../../core/models/etrade';
import { EtradeService } from '../../core/services/etrade.service';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-etrade-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule],
  template: `
    <header class="page-heading">
      <p class="eyebrow">BROKERAGE STATEMENTS</p>
      <h1>E*TRADE Agent</h1>
      <p class="description">
        View-only statement analytics. No brokerage transactions or account changes are submitted.
      </p>
    </header>

    <section class="reader" aria-labelledby="reader-heading">
      <aside class="privacy-note" aria-label="Privacy and data handling">
        <strong>Privacy:</strong> The original PDF and unredacted text are processed temporarily in memory and are not
        written to disk or a database. Names, SSNs, passwords, addresses, and account details are excluded from the
        displayed preview and are not retained. Only allowlisted transfer dates, statuses, and amounts are held in
        backend memory for this browser session; clear the statement when finished. Automatic protection cannot
        guarantee that every sensitive value in an uploaded document is identified. Use only in a trusted environment.
      </aside>
      <div class="reader-heading">
        <div>
          <h2 id="reader-heading">Statement reader</h2>
          <p>
            Text-based PDFs only. Scanned/image-only and password-protected PDFs are not supported.
          </p>
        </div>
        <div class="actions">
          <input #pdfInput type="file" accept="application/pdf,.pdf" hidden
                 aria-label="Choose an E*TRADE statement PDF" (change)="onFile($event)" />
          <button mat-flat-button type="button" [disabled]="loading()" (click)="pdfInput.click()">
            <mat-icon>upload_file</mat-icon>
            {{ loading() ? 'Reading PDF…' : 'Load statement PDF' }}
          </button>
          @if (statement()) {
            <button mat-stroked-button type="button" [disabled]="loading()" (click)="clearStatement()">
              Clear statement
            </button>
          }
        </div>
      </div>

      <p class="hint">PDF only · Maximum 20 MB · Password-protected and scanned PDFs are not supported</p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (statement(); as current) {
        <div class="document-meta" aria-live="polite">
          <strong>{{ current.filename }}</strong>
          <span>{{ current.page_count }} pages</span>
          <span>{{ current.character_count.toLocaleString() }} characters in redacted preview</span>
          <span>Loaded {{ current.imported_at | date:'medium' }}</span>
        </div>
        @if (current.document_type === 'transfer_activity' && current.summary; as summary) {
          <section class="analytics" aria-labelledby="analytics-heading">
            <h3 id="analytics-heading">Transfer activity summary</h3>
            <p class="notice">
              This PDF contains transfer activity, not a holdings statement. These cash movement totals do not
              represent portfolio value or investment performance.
            </p>
            <div class="metrics">
              <article class="metric"><span>Transfers listed</span><strong>{{ summary.transaction_count }}</strong></article>
              <article class="metric"><span>Total listed</span><strong>{{ currency(summary.total_amount) }}</strong></article>
              <article class="metric"><span>Completed</span><strong>{{ currency(summary.completed_amount) }}</strong></article>
              <article class="metric"><span>Scheduled</span><strong>{{ currency(summary.scheduled_amount) }}</strong></article>
            </div>
            @if (current.transactions.length) {
              <div class="table-wrap">
                <table>
                  <caption>Transfers identified in the PDF</caption>
                  <thead><tr><th>Date</th><th>Activity</th><th>Status</th><th class="amount">Amount</th></tr></thead>
                  <tbody>
                    @for (transaction of current.transactions; track $index) {
                      <tr>
                        <td>{{ transaction.date | date:'mediumDate' }}</td>
                        <td>{{ transaction.type }}</td>
                        <td>{{ transaction.status }}</td>
                        <td class="amount">{{ currency(transaction.amount) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        } @else {
          <p class="disclaimer">
            Text was extracted, but this document type does not yet have structured holdings or transaction analytics.
            Check the original statement before relying on any figures.
          </p>
        }
        @if (current.text) {
          <details class="raw-text">
            <summary>Show redacted preview (source and destination account details excluded)</summary>
            <label class="sr-only" for="statement-text">Redacted statement preview</label>
            <textarea id="statement-text" class="statement-text" readonly spellcheck="false"
                      [value]="current.text" aria-label="Redacted statement preview"></textarea>
          </details>
        }
      } @else {
        <div class="empty-state">
          <mat-icon aria-hidden="true">picture_as_pdf</mat-icon>
          <p>No statement loaded. Choose a PDF to extract its searchable text.</p>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.2; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
    .reader { padding: 1.25rem; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-panel-solid); }
    .reader-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    h2 { margin: 0; font-size: 1.25rem; }
    .reader-heading p, .hint, .disclaimer { color: var(--app-muted); font-size: 0.88rem; }
    .reader-heading p { margin: 0.35rem 0 0; }
    .privacy-note { margin-bottom: 1.25rem; padding: 1rem; border: 1px solid var(--app-border); border-left: 3px solid var(--app-accent); border-radius: 8px; background: var(--app-panel); color: var(--app-muted); font-size: 0.88rem; line-height: 1.55; }
    .privacy-note strong { color: var(--app-text); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .actions mat-icon { margin-right: 0.25rem; }
    .hint { margin: 0.8rem 0 1rem; }
    .error { padding: 0.75rem; color: #fecaca; border: 1px solid #7f1d1d; border-radius: 6px; background: #450a0a; }
    .document-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-bottom: 0.75rem; color: var(--app-muted); font-size: 0.85rem; }
    .document-meta strong { color: var(--app-text); }
    .analytics { margin: 1.5rem 0; }
    .analytics h3 { margin: 0 0 0.4rem; }
    .notice { color: var(--app-muted); font-size: 0.9rem; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .metric { display: flex; flex-direction: column; gap: 0.4rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel); }
    .metric span { color: var(--app-muted); font-size: 0.82rem; }
    .metric strong { font-size: 1.25rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    caption { padding: 0.5rem 0; text-align: left; font-weight: 600; }
    th, td { padding: 0.65rem; border-bottom: 1px solid var(--app-border); text-align: left; }
    th { color: var(--app-muted); font-size: 0.82rem; }
    .amount { text-align: right; white-space: nowrap; }
    .raw-text { margin-top: 1.5rem; }
    .raw-text summary { color: var(--app-muted); cursor: pointer; }
    .statement-text { box-sizing: border-box; width: 100%; min-height: 60vh; padding: 1rem; resize: vertical; color: var(--app-text); border: 1px solid var(--app-border); border-radius: 8px; background: #08111f; font: 0.85rem/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre; }
    .disclaimer { margin: 0.75rem 0 0; }
    .empty-state { display: grid; justify-items: center; padding: 3rem 1rem; color: var(--app-muted); text-align: center; }
    .empty-state mat-icon { width: 2rem; height: 2rem; font-size: 2rem; color: var(--app-accent); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    @media (max-width: 700px) { .reader-heading { flex-direction: column; } .reader { padding: 1rem; } }
  `,
})
export class EtradeAgentComponent implements OnInit {
  private readonly etrade = inject(EtradeService);
  protected readonly statement = signal<EtradeStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.etrade.getStatement().subscribe({
      next: (statement) => this.statement.set(statement),
      error: (err: unknown) => this.error.set(errorDetail(err)),
    });
  }

  protected currency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.error.set('Choose a PDF statement file.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.error.set('The PDF exceeds the 20 MB upload limit.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.etrade.uploadStatement(file).subscribe({
      next: (statement) => {
        this.statement.set(statement);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.loading.set(false);
      },
    });
  }

  protected clearStatement(): void {
    this.loading.set(true);
    this.error.set('');
    this.etrade.clearStatement().subscribe({
      next: () => {
        this.statement.set(null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.loading.set(false);
      },
    });
  }
}
