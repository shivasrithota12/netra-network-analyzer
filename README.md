# N.E.T.R.A. – Network Evaluation, Traffic Recognition & Analysis

**Intelligent Network Traffic Analyzer**

**Monitor • Analyze • Detect**

N.E.T.R.A. (Network Evaluation, Traffic Recognition & Analysis) is an educational network traffic analyzer built with React, Vite, Recharts, and Lucide React. It uses synthetic packet metadata generated in the browser; it does not capture real network traffic, connect to a backend, or act as an intrusion detection system.

## Run locally

```sh
npm install
npm run dev
```

## Dashboard modules

- **Overview** — shared packet counts and byte totals, traffic charts, protocol distribution, and recent rule matches.
- **Live Traffic** — periodic synthetic packet generation with start, pause, and clear controls.
- **Protocol Analysis** — counts and traffic distribution for TCP, UDP, DNS, HTTP, and HTTPS.
- **Packet Explorer** — search, protocol/direction filters, sorting, and CSV export.
- **Anomaly Detection** — configurable rule-based alerts for large packets, unusual destination ports, and source IP concentration. Generate a 1,600-byte TCP test event on port 9443 from this page.
- **Reports** — current traffic and anomaly summaries with CSV download.
- **Settings** — local anomaly thresholds stored in browser `localStorage`.

All modules use the same in-memory packet sample while the app is open. Anomaly thresholds and reviewed alert IDs are stored locally in the browser.

## Checks

```sh
npm run lint
npm run build
```
