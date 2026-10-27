import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { MethodologyService } from './methodology.service';
import { OrdersService } from './orders.service';
import { RebalanceService } from './rebalance.service';
import { SimulationService } from './simulation.service';
import { SourcesService } from './sources.service';
import { VoiceService } from './voice.service';
import { AudioInfo } from '../models/chat';

const API = environment.apiBaseUrl;
const SIM = { account_id: 'A1001', trials: 10000, seed: 42, sampling: 'prng', copula: 'gaussian', copula_df: 5 } as const;

describe('API services', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectCall(method: string, url: string, body?: unknown, response: object = {}) {
    const req = http.expectOne((r) => r.method === method && r.urlWithParams === url);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    req.flush(response);
    return req;
  }

  it('SourcesService calls every source, portfolio and config endpoint', () => {
    const s = TestBed.inject(SourcesService);
    s.listSources().subscribe();
    expectCall('GET', `${API}/sources`, undefined, []);
    s.listAccounts('sales').subscribe();
    expectCall('GET', `${API}/sources/sales/accounts`, undefined, []);
    s.listModels('sales').subscribe();
    expectCall('GET', `${API}/sources/sales/models`, undefined, []);
    s.getPortfolio('A1001', 'MOD-60-40').subscribe();
    expectCall('GET', `${API}/accounts/A1001/portfolio?model_id=MOD-60-40`);
    s.getPortfolio('A1001').subscribe();
    expectCall('GET', `${API}/accounts/A1001/portfolio`);
    s.getCma().subscribe();
    expectCall('GET', `${API}/config/cma`);
    s.getOptions().subscribe();
    expectCall('GET', `${API}/config/options`);
  });

  it('SourcesService uploads and resets A360 positions', () => {
    const s = TestBed.inject(SourcesService);
    const file = new File(['Qty'], 'positions.csv', { type: 'text/csv' });
    s.uploadPositions('a360_positions', 'A2001', file).subscribe();
    const url = `${API}/sources/a360_positions/accounts/A2001/positions/upload`;
    const req = expectCall('POST', url, undefined, []);
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBeTruthy();
    s.resetPositions('a360_positions', 'A2001').subscribe();
    expectCall('DELETE', url);
  });

  it('SimulationService posts the request', () => {
    TestBed.inject(SimulationService).run(SIM).subscribe();
    expectCall('POST', `${API}/simulations`, SIM);
  });

  it('RebalanceService gets settings and posts proposals', () => {
    const s = TestBed.inject(RebalanceService);
    s.settings().subscribe();
    expectCall('GET', `${API}/rebalance/settings`);
    const body = { account_id: 'A1001', drift_tolerance: 0.02, simulation: SIM };
    s.propose(body).subscribe();
    expectCall('POST', `${API}/rebalance/proposal`, body);
  });

  it('OrdersService covers generate, list, clear and export', () => {
    const s = TestBed.inject(OrdersService);
    s.generate({ account_id: 'A1001' }).subscribe();
    expectCall('POST', `${API}/orders/generate`, { account_id: 'A1001' }, []);
    s.list().subscribe();
    expectCall('GET', `${API}/orders`, undefined, []);
    s.clear().subscribe();
    expectCall('DELETE', `${API}/orders`);
    s.export('csv').subscribe();
    const req = http.expectOne(`${API}/orders/export?format=csv`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['order_id']));
  });

  it('MethodologyService and LlmService load their lists', () => {
    TestBed.inject(MethodologyService).sections().subscribe();
    expectCall('GET', `${API}/methodology`, undefined, []);
    TestBed.inject(LlmService).providers().subscribe();
    expectCall('GET', `${API}/llm/providers`, undefined, []);
  });

  it('ChatService sends messages and resets threads', () => {
    const s = TestBed.inject(ChatService);
    const body = { message: 'hi', thread_id: 't1', provider: 'ollama', model: 'qwen2.5:7b', account_id: 'A1001' };
    s.send(body).subscribe();
    expectCall('POST', `${API}/chat`, body, { text: 'ok', tool_calls: [], orders_added: 0, orders: [] });
    s.reset('t1').subscribe();
    expectCall('DELETE', `${API}/chat/t1`);
  });

  it('VoiceService creates audio and builds play/download URLs', () => {
    const s = TestBed.inject(VoiceService);
    s.create('Success is 76.8%.', 'A1001').subscribe();
    expectCall('POST', `${API}/voice`, { text: 'Success is 76.8%.', account_id: 'A1001' });
    const audio = { url: '/voice/abc' } as AudioInfo;
    expect(s.playUrl(audio)).toBe(`${API}/voice/abc`);
    expect(s.downloadUrl(audio)).toBe(`${API}/voice/abc?download=true`);
  });
});
