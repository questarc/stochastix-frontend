# Stochastix AI — Features (front end)

Angular front end for **Stochastix AI**. It does no calculations: every number comes from the
FastAPI back end (separate repository).

Results are projections, not guarantees, and not investment advice.

## Feature overview

| Area | What the advisor can do |
|---|---|
| Header | Stochastix AI navigation on every page; client name, account, portfolio value, age, risk profile, and model on Quant Models |
| 📊 MarketWatch | Main page with economic news, upcoming earnings, corporate actions, and market heatmap |
| 📈 Quant Models | Monte Carlo simulation, portfolio settings, rebalancing, orders, methodology, and Stochastix AI chat |
| Sidebar — Stochastix AI | Choose source agent, account and model portfolio; load a positions CSV or go back to the default file |
| Sidebar — Plan assumptions | Retirement age, plan end age, annual contribution, annual withdrawal (reset per account) |
| Sidebar — Simulation | Trials (1k–50k), seed, sampling (PRNG/LHS/Sobol), copula (Gaussian/Student-t, df 3–30), return distribution |
| Sidebar — AI model | Ollama, OpenAI, Anthropic or **WebLLM (in browser)**; model; API-key status |
| 🎲 Simulation tab | Positions, allocation chart and drift table, success cards, fan chart, histograms, run settings, **🎬 Investor video** |
| ⚖️ Rebalance tab | Drift tolerance, minimum trade, whole shares; trades, allocation after trades, success before/after; Generate orders |
| 🧾 Orders tab | Blotter with sorting and paging, metrics, Export CSV/JSON, Clear orders; badge with order count |
| 📖 How it works tab | 30 sample paths chart and methodology panels |
| 💬 Stochastix AI chat | Available from MarketWatch and Quant Models; example questions, markdown answers, tool trace, orders notice, **🔊 Create audio**, **🎬 Create video** |

## Simulation
- Re-runs automatically when the account, model, plan or settings change: 400 ms debounce, duplicate requests skipped,
  previous request cancelled.
- Cards: current and model probability of success with the difference in percentage points, median ending value
  (today's $). Toggle the projection between current and model portfolio.
- Plotly charts (lazy-loaded): P10–P90 / P25–P75 fan chart with retirement marker, ending-value and depletion-age
  histograms ("No trials ran out of money" when none fail).

## Investor video (VideoGenAgent)
- **Simulation tab:** card below the success metrics with "Include proposed rebalance" and **Create investor video**.
- **Chat:** **Create video** under each AI answer; videos started by the AI ("make a video for Jane") appear inline.
- Progress bar while the back end renders (~30 s), then an inline player and **Download video** (MP4, ~90 s,
  animated advisor, charts, subtitles, narration, disclaimer). Uses the on-screen plan and settings.

## Audio summary (VoiceGenAgent)
- **Create audio** under each AI answer (not under user or error messages) → in-chat player and **Download** (WAV).
- The AI can also create audio on request. Numbers are reworded for speech, never changed; disclaimer always included.

## MarketWatch (Market agents)
- **📰 Economic news** (MarketAnalyzerAgent): headlines linked to the source, topic chips, publish time.
- **📈 Upcoming earnings** (EarningsAgent, 14 days): date, symbol, before/after market, EPS estimate.
- **🏦 Corporate actions** (CorporateActionsAgent, 30 days): dividends (ex-date, pay date, amount) and splits (ratio);
  **Client holdings** filter.
- **🗺️ Market heatmap** (MarketHeatmapAgent): Plotly treemap of the largest US companies grouped by sector; tile
  size = market cap, colour = daily change (red → green, ±3% scale); ★ marks tickers held by clients; 50/100/200
  companies; cap-weighted market change, up/down breadth and sector chips.
- Green **Held** badge with the accounts holding the ticker; per-widget refresh, "Updated" time, unavailable-source
  notes; collapsible MarketWatch widgets.

## Stochastix AI chat
- Sends the question with the on-screen account and model; 180 s timeout; "Thinking…" indicator.
- Answers rendered with ngx-markdown (`$` escaped); expandable "Data used (N tool calls)".
- Orders created by the AI refresh the Orders badge. New conversation clears memory (`crypto.randomUUID()` thread).
- Errors from the back end shown as a "⚠️" message.

## WebLLM (in browser)
- Runs the model on the advisor's GPU in a Web Worker (`@mlc-ai/web-llm`); first use downloads 1.6–5 GB, then cached.
- Models: Qwen2.5 7B (default), Hermes-3 Llama 3.1 8B, Llama 3.1 8B, Qwen2.5 3B, Qwen2.5 1.5B.
- The tool loop runs in the browser (max 6 steps); every tool executes in the back end, so numbers still come from
  Python. Needs WebGPU (recent Chrome or Edge). Conversation memory lasts for the browser tab.

## Look and feel
- Ambient dark-blue theme (Angular Material dark, navy surfaces, soft blue glows); colours set once in `src/styles.scss`.
- Money as `$1,234,567`, probabilities as `84.2%` (shared pipes). Errors shown in snack bars by an interceptor.
- Keyboard accessible with ARIA labels; sidebar becomes an overlay below 960 px.

## Structure
```
src/app/
  core/models        account, simulation, rebalance, order, chat, llm, video, market
  core/services      api, sources, simulation, rebalance, orders, chat, llm, methodology, voice, video, market
  core/state         workspace.store, simulation.store, orders.store (signals)
  core/webllm        WebLLM engine, worker, browser agent, tool-call parsing
  core/interceptors  error.interceptor
  layout             header, sidebar
  features           simulation, rebalance, orders, methodology, advisor-ai, market
  shared             plotly-chart, video-panel, confirm-dialog, pipes
```

## Run
```powershell
npm install          # .npmrc sets legacy-peer-deps
npm start            # http://localhost:4200, calls http://localhost:8000/api
npx ng test --watch=false   # 33 tests
npx ng build
```
Docker: multi-stage `Dockerfile` (Node build → nginx on port 8080). nginx serves the app, proxies `/api/` to the back
end (180 s timeout) and never caches `index.html`, so new deployments load immediately.
With the back end: `docker compose up -d --build` from the parent folder → `http://localhost:8080`.

## Known limitations
- No login; everyone who can reach the app shares the same orders.
- Orders, uploads, audio and videos live in back-end memory and are lost when it restarts.
- Market data comes from free public sources; check their terms before production use.
