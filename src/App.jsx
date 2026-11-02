import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Database,
  Download,
  Ellipsis,
  FileBarChart,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Pause,
  Play,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  createInitialPackets,
  createPacket,
  DEFAULT_SETTINGS,
  detectAnomalies,
  loadReviewedAlerts,
  loadSettings,
  PROTOCOLS,
} from './traffic'
import './App.css'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Live Traffic', icon: Activity },
  { label: 'Protocol Analysis', icon: Network },
  { label: 'Packet Explorer', icon: Database },
  { label: 'Anomaly Detection', icon: ShieldAlert },
  { label: 'Reports', icon: FileBarChart },
  { label: 'Settings', icon: SettingsIcon },
]

const PAGE_COPY = {
  Overview: ['Good morning, Jordan', "Here's what's happening across your network today."],
  'Live Traffic': ['Live traffic', 'Watch simulated packet metadata as it flows across your network.'],
  'Protocol Analysis': ['Protocol analysis', 'Explore how packets are distributed across network protocols.'],
  'Packet Explorer': ['Packet explorer', 'Search, filter, sort, and export the shared packet sample.'],
  'Anomaly Detection': ['Anomaly detection', 'Rule-based signals from simulated packet metadata.'],
  Reports: ['Network reports', 'A snapshot of traffic volume and detected rule matches.'],
  Settings: ['Settings', 'Configure local analyzer thresholds and preferences.'],
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes.toLocaleString()} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escapeValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(escapeValue).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Sidebar({ mobileOpen, activePage, onNavigate, onClose, profileOpen, onToggleProfile, profileTriggerRef }) {
  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); onNavigate('Overview') }} aria-label="N.E.T.R.A. overview">
            <span className="brand-mark"><Network size={20} strokeWidth={2.2} /></span>
            <span className="brand-copy">
              <span className="brand-name">N.E.T.R.A.</span>
              <span className="brand-expansion">Network Evaluation, Traffic Recognition &amp; Analysis</span>
              <span className="brand-subtitle">Intelligent Network Traffic Analyzer</span>
              <span className="brand-tagline">Monitor • Analyze • Detect</span>
            </span>
          </a>
          <button className="icon-button mobile-close" onClick={onClose} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-icon"><Globe2 size={16} /></span>
          <span className="workspace-copy"><strong>Acme Workspace</strong><small>Educational demo</small></span>
          <ChevronDown size={15} className="workspace-chevron" />
        </div>
        <div className="nav-section-label">Workspace</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item${activePage === label ? ' active' : ''}`}
              key={label}
              type="button"
              aria-current={activePage === label ? 'page' : undefined}
              onClick={() => { onNavigate(label); onClose() }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={16} /></span>
            <div><strong>Learning mode</strong><small>All packet data is synthetic</small></div>
            <ShieldCheck size={14} className="help-arrow" />
          </div>
          <button
            ref={profileTriggerRef}
            className="profile-row"
            type="button"
            data-profile-trigger="sidebar"
            aria-label="Open Jordan Davis profile"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            aria-controls="profile-popover"
            onClick={onToggleProfile}
          >
            <span className="avatar">JD</span>
            <span className="profile-copy"><strong>Jordan Davis</strong><small>Security Analyst</small></span>
            <Ellipsis size={18} className="profile-more" />
          </button>
        </div>
      </aside>
    </>
  )
}

function ProfilePopover({ open, position, popoverRef, onSettings }) {
  if (!open) return null
  return (
    <section
      className="profile-popover"
      id="profile-popover"
      role="dialog"
      aria-label="Jordan Davis profile"
      ref={popoverRef}
      style={{ left: position.left, top: position.top }}
    >
      <div className="profile-popover-heading">
        <span className="profile-popover-avatar">JD</span>
        <span><strong>Jordan Davis</strong><small>Security Analyst</small></span>
      </div>
      <div className="profile-information">
        <span className="profile-info-icon"><UserRound size={15} /></span>
        <span><strong>Profile information</strong><small>NETRA demo user · Local session</small></span>
      </div>
      <div className="profile-popover-divider" />
      <button className="profile-menu-item" type="button" onClick={onSettings}>
        <SettingsIcon size={15} /><span>Account settings</span><ArrowUpRight size={13} className="profile-menu-arrow" />
      </button>
      <button className="profile-menu-item logout-unavailable" type="button" disabled title="Authentication is not implemented in this demo">
        <LogOut size={15} /><span>Log out <small>Not available in demo</small></span>
      </button>
      <p className="profile-demo-note">No authentication session is active.</p>
    </section>
  )
}

function MetricCard({ metric }) {
  const Icon = metric.icon
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{metric.label}</span>
        <span className={`metric-icon ${metric.tone}`}><Icon size={17} strokeWidth={1.9} /></span>
      </div>
      <div className="metric-value-row">
        <strong className="metric-value">{metric.value}</strong>
        {metric.unit && <span className="metric-unit">{metric.unit}</span>}
      </div>
      <div className={`metric-foot${metric.alert ? ' metric-foot-alert' : ''}`}>
        {metric.alert ? <span className="alert-dot" /> : <span className="metric-change"><ArrowUpRight size={13} />{metric.change}</span>}
        <span className={`metric-detail${metric.alert ? ' metric-change' : ''}`}>{metric.detail}</span>
      </div>
    </article>
  )
}

function SummaryMetrics({ packets, alerts }) {
  const incoming = packets.filter((packet) => packet.direction === 'Incoming').reduce((total, packet) => total + packet.size, 0)
  const outgoing = packets.filter((packet) => packet.direction === 'Outgoing').reduce((total, packet) => total + packet.size, 0)
  const metrics = [
    { label: 'Total packets', value: packets.length.toLocaleString(), detail: 'in shared sample', icon: Database, tone: 'violet' },
    { label: 'Incoming traffic', value: formatBytes(incoming), detail: 'simulated bytes', icon: ArrowDownLeft, tone: 'teal' },
    { label: 'Outgoing traffic', value: formatBytes(outgoing), detail: 'simulated bytes', icon: ArrowUpRight, tone: 'blue' },
    { label: 'Network alerts', value: alerts.length.toLocaleString(), detail: 'rule matches', icon: ShieldAlert, tone: 'amber', alert: true },
  ]
  return <section className="metrics-grid" aria-label="Network summary">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>
}

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} className="tooltip-line">
          <i style={{ backgroundColor: item.color }} />{item.name}: <b>{formatBytes(item.value * 1024)}</b>
        </span>
      ))}
    </div>
  )
}

function getTrafficSeries(packets, period) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const buckets = period === '24 hours' ? 12 : 7
  const bucketMs = period === '24 hours' ? 2 * 60 * 60 * 1000 : day
  const start = now - buckets * bucketMs
  const series = Array.from({ length: buckets }, (_, index) => ({
    time: period === '24 hours'
      ? new Date(start + (index + 1) * bucketMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : new Date(start + (index + 1) * bucketMs).toLocaleDateString([], { weekday: 'short' }),
    incoming: 0,
    outgoing: 0,
  }))

  for (const packet of packets) {
    const age = now - packet.timestamp
    if (age < 0 || age >= buckets * bucketMs) continue
    const index = Math.min(buckets - 1, Math.floor((packet.timestamp - start) / bucketMs))
    const key = packet.direction === 'Incoming' ? 'incoming' : 'outgoing'
    series[index][key] += packet.size / 1024
  }
  return series
}

function TrafficChart({ packets }) {
  const [period, setPeriod] = useState('24 hours')
  const chartData = useMemo(() => getTrafficSeries(packets, period), [packets, period])
  return (
    <section className="panel traffic-panel">
      <div className="panel-header">
        <div><h2>Traffic overview</h2><p>Simulated traffic volume over time</p></div>
        <label className="select-shell">
          <Clock3 size={14} />
          <select aria-label="Traffic chart time range" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option>24 hours</option><option>7 days</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot incoming" />Incoming</span>
        <span><i className="legend-dot outgoing" />Outgoing</span>
        <span className="chart-unit">KB</span>
      </div>
      <div className="traffic-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="incomingFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b7bff" stopOpacity={0.24} /><stop offset="95%" stopColor="#8b7bff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outgoingFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42d6c5" stopOpacity={0.16} /><stop offset="95%" stopColor="#42d6c5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#242936" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#788094', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} />
            <YAxis tick={{ fill: '#788094', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={10} />
            <Tooltip content={<TrafficTooltip />} cursor={{ stroke: '#41485a', strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="incoming" name="Incoming" stroke="#9587ff" strokeWidth={2.2} fill="url(#incomingFill)" activeDot={{ r: 4, fill: '#9587ff', stroke: '#171a22', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="outgoing" name="Outgoing" stroke="#42d6c5" strokeWidth={2} fill="url(#outgoingFill)" activeDot={{ r: 4, fill: '#42d6c5', stroke: '#171a22', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote"><span className="live-indicator" />Shared packet sample <span className="footnote-divider">·</span> {packets.length.toLocaleString()} packets</div>
    </section>
  )
}

function ProtocolDistribution({ packets, interactive = false }) {
  const [activeProtocol, setActiveProtocol] = useState(null)
  const distribution = PROTOCOLS.map((protocol) => ({
    ...protocol,
    value: packets.filter((packet) => packet.protocol === protocol.name).length,
  }))
  const total = distribution.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="panel protocol-panel">
      <div className="panel-header">
        <div><h2>Protocol distribution</h2><p>Packet counts by protocol</p></div>
        {interactive && <span className="protocol-hint">{activeProtocol ? `${activeProtocol} selected` : 'Select a segment'}</span>}
      </div>
      <div className="protocol-content">
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="name"
                innerRadius="70%"
                outerRadius="92%"
                paddingAngle={total ? 4 : 0}
                stroke="none"
                cornerRadius={4}
                onClick={interactive ? (entry) => setActiveProtocol(activeProtocol === entry.name ? null : entry.name) : undefined}
                style={interactive ? { cursor: 'pointer' } : undefined}
              >
                {distribution.map((protocol) => <Cell key={protocol.name} fill={protocol.color} opacity={activeProtocol && activeProtocol !== protocol.name ? 0.3 : 1} />)}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} packets`, name]} contentStyle={{ background: '#20242e', border: '1px solid #343a49', borderRadius: 8, color: '#eef0f6', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center"><strong>{total.toLocaleString()}</strong><span>packets</span></div>
        </div>
        <div className="protocol-legend">
          {distribution.map((protocol) => (
            <button
              className={`protocol-row protocol-row-button${activeProtocol === protocol.name ? ' selected' : ''}`}
              type="button"
              key={protocol.name}
              onClick={() => interactive && setActiveProtocol(activeProtocol === protocol.name ? null : protocol.name)}
              aria-pressed={interactive ? activeProtocol === protocol.name : undefined}
            >
              <span className="protocol-name"><i style={{ backgroundColor: protocol.color }} />{protocol.name}</span>
              <strong>{protocol.value.toLocaleString()} <small>({total ? Math.round(protocol.value / total * 100) : 0}%)</small></strong>
            </button>
          ))}
        </div>
      </div>
      {interactive && activeProtocol && (
        <div className="protocol-selection">
          <span>{activeProtocol} packets in sample</span>
          <strong>{distribution.find((item) => item.name === activeProtocol)?.value.toLocaleString()}</strong>
        </div>
      )}
    </section>
  )
}

function PacketTable({ packets, compact = false, onExport, emptyMessage = 'No packets match these filters.' }) {
  return (
    <div className={`packet-table-wrap${compact ? ' compact-table' : ''}`}>
      {packets.length ? (
        <table className="packet-table">
          <thead><tr><th>Timestamp</th><th>Source IP</th><th>Destination IP</th><th>Protocol</th><th>Size</th><th>Direction</th></tr></thead>
          <tbody>
            {packets.map((packet) => (
              <tr key={packet.id}>
                <td className="mono-cell">{formatTimestamp(packet.timestamp)}</td>
                <td className="mono-cell">{packet.sourceIp}<small>:{packet.sourcePort}</small></td>
                <td className="mono-cell">{packet.destinationIp}<small>:{packet.destinationPort}</small></td>
                <td><span className={`protocol-pill protocol-${packet.protocol.toLowerCase()}`}>{packet.protocol}</span></td>
                <td>{packet.size.toLocaleString()} B</td>
                <td><span className={`direction-label ${packet.direction.toLowerCase()}`}>{packet.direction}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty-state"><Database size={22} /><p>{emptyMessage}</p></div>}
      {onExport && <div className="table-footer"><span>Showing {packets.length.toLocaleString()} packets</span><button className="secondary-button" onClick={onExport} disabled={!packets.length}><Download size={14} />Export CSV</button></div>}
    </div>
  )
}

function OverviewPage({ packets, alerts, reviewedAlerts, onNavigate, onToggleReviewed, onExportReport }) {
  const recentPackets = [...packets].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
  const recentAlerts = alerts.slice(0, 3)
  return (
    <>
      <SummaryMetrics packets={packets} alerts={alerts} />
      <div className="charts-grid">
        <TrafficChart packets={packets} />
        <ProtocolDistribution packets={packets} interactive />
      </div>
      <section className="panel overview-lower-grid">
        <div className="overview-lower-section">
          <div className="panel-header"><div><h2>Recent network alerts</h2><p>{alerts.length.toLocaleString()} active rule matches</p></div><button className="text-link" onClick={() => onNavigate('Anomaly Detection')}>View all <ArrowUpRight size={14} /></button></div>
          {recentAlerts.length ? recentAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} reviewed={reviewedAlerts.includes(alert.id)} onToggleReviewed={() => onToggleReviewed(alert.id)} />) : <p className="muted-empty">No rule matches in the current packet sample.</p>}
        </div>
        <div className="overview-lower-section">
          <div className="panel-header"><div><h2>Latest packets</h2><p>Most recently recorded metadata</p></div><button className="text-link" onClick={() => onNavigate('Packet Explorer')}>Explore <ArrowUpRight size={14} /></button></div>
          <PacketTable packets={recentPackets} compact />
        </div>
      </section>
      <div className="overview-actions"><button className="secondary-button" onClick={onExportReport}><Download size={14} />Export report CSV</button></div>
    </>
  )
}

function LiveTrafficPage({ packets, running, setRunning, onClear }) {
  const sortedPackets = [...packets].sort((a, b) => b.timestamp - a.timestamp).slice(0, 60)
  const incomingCount = packets.filter((packet) => packet.direction === 'Incoming').length
  const latest = sortedPackets[0]
  return (
    <>
      <div className="module-toolbar">
        <div className="live-state"><i className={running ? 'is-live' : ''} /><span>{running ? 'Streaming simulated packets' : 'Stream paused'}</span><small>{latest ? `Last packet ${formatTimestamp(latest.timestamp)}` : 'No packets in sample'}</small></div>
        <div className="toolbar-buttons">
          <button className="secondary-button" onClick={() => setRunning(!running)}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? 'Pause' : 'Start'}</button>
          <button className="secondary-button danger-button" onClick={onClear}><Trash2 size={14} />Clear</button>
        </div>
      </div>
      <div className="mini-stats-grid">
        <div className="mini-stat"><span>Packets in sample</span><strong>{packets.length.toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Incoming</span><strong>{incomingCount.toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Outgoing</span><strong>{(packets.length - incomingCount).toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Capture mode</span><strong className="small-stat-value">Synthetic only</strong></div>
      </div>
      <section className="panel page-table-panel">
        <div className="panel-header"><div><h2>Packet stream</h2><p>Newest packet metadata first · showing up to 60 recent records</p></div><span className="live-chip"><i className={running ? 'is-live' : ''} />{running ? 'LIVE' : 'PAUSED'}</span></div>
        <PacketTable packets={sortedPackets} />
      </section>
    </>
  )
}

function ProtocolAnalysisPage({ packets }) {
  const counts = PROTOCOLS.map((protocol) => ({
    ...protocol,
    count: packets.filter((packet) => packet.protocol === protocol.name).length,
    bytes: packets.filter((packet) => packet.protocol === protocol.name).reduce((sum, packet) => sum + packet.size, 0),
  }))
  return (
    <>
      <div className="module-intro"><Network size={16} /><span>Distribution and counts are recalculated from the shared packet sample.</span></div>
      <div className="protocol-analysis-grid">
        <ProtocolDistribution packets={packets} interactive />
        <section className="panel protocol-count-panel">
          <div className="panel-header"><div><h2>Protocol breakdown</h2><p>Packet volume and bytes transferred</p></div></div>
          <div className="protocol-breakdown">
            {counts.map((protocol) => (
              <div className="breakdown-row" key={protocol.name}>
                <span className="protocol-name"><i style={{ backgroundColor: protocol.color }} />{protocol.name}</span>
                <div className="breakdown-bar"><i style={{ width: `${packets.length ? Math.max(protocol.count / packets.length * 100, protocol.count ? 2 : 0) : 0}%`, backgroundColor: protocol.color }} /></div>
                <strong>{protocol.count.toLocaleString()}</strong><small>{formatBytes(protocol.bytes)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel protocol-note"><ShieldCheck size={16} /><p>TCP, UDP, DNS, HTTP, and HTTPS are educational protocol labels assigned to generated records; they do not represent captured traffic.</p></section>
    </>
  )
}

function PacketExplorerPage({ packets, query, setQuery, onExport }) {
  const [protocol, setProtocol] = useState('All protocols')
  const [direction, setDirection] = useState('All directions')
  const [sortKey, setSortKey] = useState('timestamp')
  const [sortDirection, setSortDirection] = useState('desc')
  const filteredPackets = packets
    .filter((packet) => protocol === 'All protocols' || packet.protocol === protocol)
    .filter((packet) => direction === 'All directions' || packet.direction === direction)
    .filter((packet) => !query || [packet.sourceIp, packet.destinationIp, packet.protocol, packet.direction, packet.destinationPort, packet.sourcePort].some((value) => String(value).toLowerCase().includes(query.toLowerCase())))
    .sort((left, right) => {
      const a = left[sortKey]
      const b = right[sortKey]
      const comparison = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
      return sortDirection === 'asc' ? comparison : -comparison
    })
  const toggleSort = (key) => {
    if (sortKey === key) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
  }
  return (
    <>
      <section className="panel explorer-panel">
        <div className="filter-toolbar">
          <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search IP, protocol, port..." aria-label="Search packets" />{query && <button onClick={() => setQuery('')} aria-label="Clear packet search"><X size={14} /></button>}</label>
          <label className="filter-select"><span>Protocol</span><select aria-label="Filter by protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)}><option>All protocols</option>{PROTOCOLS.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label className="filter-select"><span>Direction</span><select aria-label="Filter by direction" value={direction} onChange={(event) => setDirection(event.target.value)}><option>All directions</option><option>Incoming</option><option>Outgoing</option></select></label>
        </div>
        <div className="sort-hints">
          <span>Sort by:</span>
          {[['timestamp', 'Time'], ['size', 'Size'], ['protocol', 'Protocol']].map(([key, label]) => (
            <button className={sortKey === key ? 'sort-chip selected' : 'sort-chip'} key={key} onClick={() => toggleSort(key)}>{label}{sortKey === key && <ArrowDownUp size={12} />}</button>
          ))}
          <span className="result-count">{filteredPackets.length.toLocaleString()} results</span>
        </div>
        <PacketTable
          packets={filteredPackets}
          onExport={() => onExport(filteredPackets)}
          emptyMessage="Try changing your search or filters."
        />
      </section>
    </>
  )
}

function AlertRow({ alert, reviewed, onToggleReviewed }) {
  const severity = alert.kind === 'large' ? 'critical' : alert.kind === 'port' ? 'warning' : 'notice'
  const Icon = alert.kind === 'large' ? ShieldAlert : alert.kind === 'port' ? Activity : Globe2
  return (
    <article className={`alert-row${reviewed ? ' alert-reviewed' : ''}`}>
      <span className={`severity-icon ${severity}`}><Icon size={16} /></span>
      <div className="alert-main">
        <div className="alert-title-row"><h3>{alert.title}</h3><span className={`severity-label ${severity}`}>{severity}</span>{reviewed && <span className="reviewed-label">Reviewed</span>}</div>
        <p>{alert.description}</p>
        <div className="alert-meta"><span><Command size={12} />{alert.sourceIp}</span><span><Clock3 size={12} />{formatTimestamp(alert.timestamp)}</span></div>
      </div>
      <button className="secondary-button review-button" onClick={onToggleReviewed}>{reviewed ? 'Undo review' : 'Mark reviewed'}</button>
    </article>
  )
}

function AnomalyDetectionPage({ alerts, reviewedAlerts, onToggleReviewed, onGenerateEvent, settings }) {
  const unreviewedCount = alerts.filter((alert) => !reviewedAlerts.includes(alert.id)).length
  const reviewedCount = alerts.length - unreviewedCount
  return (
    <>
      <div className="module-toolbar">
        <div className="live-state"><ShieldAlert size={16} /><span>Rule-based detection</span><small>Evaluated against {settings.largePacketBytes} B, port {settings.unusualPort}+, and {settings.sourcePacketLimit}+ packets per source</small></div>
        <button className="primary-button" onClick={onGenerateEvent}><Activity size={14} />Generate test event</button>
      </div>
      <div className="mini-stats-grid">
        <div className="mini-stat"><span>Total detections</span><strong>{alerts.length.toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Needs review</span><strong>{unreviewedCount.toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Reviewed</span><strong>{reviewedCount.toLocaleString()}</strong></div>
        <div className="mini-stat"><span>Detection mode</span><strong className="small-stat-value">Educational rules</strong></div>
      </div>
      <section className="panel page-table-panel alerts-full-panel">
        <div className="panel-header"><div><h2>Detected events</h2><p>Alerts update from shared packet data and saved thresholds.</p></div><span className="alert-total">{unreviewedCount} new</span></div>
        {alerts.length ? alerts.map((alert) => <AlertRow key={alert.id} alert={alert} reviewed={reviewedAlerts.includes(alert.id)} onToggleReviewed={() => onToggleReviewed(alert.id)} />) : <div className="empty-state"><ShieldCheck size={22} /><p>No anomalies detected. Generate a test event to try the rules.</p></div>}
      </section>
      <p className="disclaimer"><ShieldCheck size={14} />N.E.T.R.A. is an educational demo using synthetic data, not a real intrusion detection or security monitoring system.</p>
    </>
  )
}

function ReportsPage({ packets, alerts, onDownload }) {
  const incomingBytes = packets.filter((packet) => packet.direction === 'Incoming').reduce((sum, packet) => sum + packet.size, 0)
  const outgoingBytes = packets.filter((packet) => packet.direction === 'Outgoing').reduce((sum, packet) => sum + packet.size, 0)
  const typeCounts = ['large', 'port', 'source'].map((kind) => ({ kind, count: alerts.filter((alert) => alert.kind === kind).length }))
  return (
    <>
      <div className="module-toolbar">
        <div className="live-state"><FileBarChart size={16} /><span>Current sample report</span><small>Generated from {packets.length.toLocaleString()} shared synthetic packet records</small></div>
        <button className="primary-button" onClick={onDownload}><Download size={14} />Download CSV report</button>
      </div>
      <div className="report-summary-grid">
        <div className="report-stat"><span>Total packets</span><strong>{packets.length.toLocaleString()}</strong><small>Records in current sample</small></div>
        <div className="report-stat"><span>Incoming bytes</span><strong>{formatBytes(incomingBytes)}</strong><small>Simulated inbound volume</small></div>
        <div className="report-stat"><span>Outgoing bytes</span><strong>{formatBytes(outgoingBytes)}</strong><small>Simulated outbound volume</small></div>
        <div className="report-stat"><span>Total detections</span><strong>{alerts.length.toLocaleString()}</strong><small>Current rule matches</small></div>
      </div>
      <section className="panel report-detail-panel">
        <div className="panel-header"><div><h2>Protocol traffic summary</h2><p>Packet count and volume by protocol</p></div></div>
        <div className="report-protocol-list">
          {PROTOCOLS.map((protocol) => {
            const matching = packets.filter((packet) => packet.protocol === protocol.name)
            const bytes = matching.reduce((sum, packet) => sum + packet.size, 0)
            return <div className="report-protocol-row" key={protocol.name}><span className="protocol-name"><i style={{ backgroundColor: protocol.color }} />{protocol.name}</span><span>{matching.length.toLocaleString()} packets</span><strong>{formatBytes(bytes)}</strong></div>
          })}
        </div>
      </section>
      <section className="panel report-detail-panel">
        <div className="panel-header"><div><h2>Anomaly summary</h2><p>Counts by rule</p></div></div>
        <div className="report-protocol-list">
          {typeCounts.map(({ kind, count }) => <div className="report-protocol-row" key={kind}><span className={`severity-label ${kind === 'large' ? 'critical' : kind === 'port' ? 'warning' : 'notice'}`}>{kind === 'large' ? 'Large packet' : kind === 'port' ? 'Unusual port' : 'Source concentration'}</span><strong>{count.toLocaleString()} alerts</strong></div>)}
        </div>
      </section>
      <p className="disclaimer"><ShieldCheck size={14} />CSV report values are calculated locally from synthetic metadata.</p>
    </>
  )
}

function SettingsPage({ settings, onSave, savedMessage, errorMessage }) {
  const [draft, setDraft] = useState(settings)
  const [validationError, setValidationError] = useState('')
  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setValidationError('')
  }
  const save = (event) => {
    event.preventDefault()
    const values = {
      largePacketBytes: Number(draft.largePacketBytes),
      unusualPort: Number(draft.unusualPort),
      sourcePacketLimit: Number(draft.sourcePacketLimit),
    }
    if (Object.values(values).some((value) => !Number.isInteger(value) || value < 1 || value > 65535)) {
      setValidationError('Enter a whole number between 1 and 65,535 for each threshold.')
      return
    }
    setValidationError('')
    onSave(values)
  }
  return (
    <>
      <form className="panel settings-panel" onSubmit={save}>
        <div className="panel-header"><div><h2>Anomaly thresholds</h2><p>Changes apply to detection rules for the shared packet sample.</p></div></div>
        <label className="setting-row"><span><strong>Large packet threshold</strong><small>Flag packets larger than this value, in bytes.</small></span><span className="number-input"><input aria-label="Large packet threshold in bytes" type="number" min="1" max="65535" required value={draft.largePacketBytes} onChange={(event) => update('largePacketBytes', event.target.value)} /><small>bytes</small></span></label>
        <label className="setting-row"><span><strong>Unusual destination port</strong><small>Flag destination ports at or above this value.</small></span><span className="number-input"><input aria-label="Unusual destination port threshold" type="number" min="1" max="65535" required value={draft.unusualPort} onChange={(event) => update('unusualPort', event.target.value)} /><small>port</small></span></label>
        <label className="setting-row"><span><strong>Source IP concentration</strong><small>Flag a source after it exceeds this packet count.</small></span><span className="number-input"><input aria-label="Source IP packet limit" type="number" min="1" max="65535" required value={draft.sourcePacketLimit} onChange={(event) => update('sourcePacketLimit', event.target.value)} /><small>packets</small></span></label>
        <div className="settings-actions">
          <button className="secondary-button" type="button" onClick={() => { setDraft(DEFAULT_SETTINGS); onSave(DEFAULT_SETTINGS) }}>Restore defaults</button>
          <div>{(validationError || errorMessage) && <span className="settings-error" role="alert">{validationError || errorMessage}</span>}{savedMessage && <span className="settings-saved">{savedMessage}</span>}<button className="primary-button" type="submit"><ShieldCheck size={14} />Save settings</button></div>
        </div>
      </form>
      <section className="panel settings-note"><ShieldCheck size={16} /><p>Thresholds and reviewed alert states are stored in this browser only. N.E.T.R.A. does not capture packets or send data to a server.</p></section>
    </>
  )
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSource, setProfileSource] = useState(null)
  const [profilePosition, setProfilePosition] = useState({ left: 12, top: 12 })
  const sidebarProfileRef = useRef(null)
  const topbarProfileRef = useRef(null)
  const profilePopoverRef = useRef(null)
  const profileAnchorRef = useRef(null)
  const [activePage, setActivePage] = useState('Overview')
  const [packets, setPackets] = useState(() => createInitialPackets())
  const [running, setRunning] = useState(true)
  const [settings, setSettings] = useState(loadSettings)
  const [reviewedAlerts, setReviewedAlerts] = useState(loadReviewedAlerts)
  const [packetQuery, setPacketQuery] = useState('')
  const [topSearch, setTopSearch] = useState('')
  const [topSearchOpen, setTopSearchOpen] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (!running) return undefined
    const intervalId = window.setInterval(() => {
      const packet = createPacket()
      setPackets((current) => [packet, ...current].slice(0, 2000))
    }, 1400)
    return () => window.clearInterval(intervalId)
  }, [running])

  const anomalies = useMemo(() => detectAnomalies(packets, settings), [packets, settings])
  const unreadCount = anomalies.filter((alert) => !reviewedAlerts.includes(alert.id)).length
  const pageCopy = PAGE_COPY[activePage]

  const toggleProfile = (event) => {
    const trigger = event.currentTarget
    if (profileOpen && profileSource === trigger.dataset.profileTrigger) {
      setProfileOpen(false)
      setProfileSource(null)
      profileAnchorRef.current = null
      return
    }
    profileAnchorRef.current = trigger
    setProfileSource(trigger.dataset.profileTrigger)
    setProfileOpen(true)
  }

  const closeProfile = () => {
    setProfileOpen(false)
    setProfileSource(null)
    profileAnchorRef.current = null
  }

  useLayoutEffect(() => {
    if (!profileOpen || !profileAnchorRef.current) return undefined

    const updatePosition = () => {
      const bounds = profileAnchorRef.current?.getBoundingClientRect()
      if (!bounds) return
      const width = Math.min(290, window.innerWidth - 24)
      const height = profilePopoverRef.current?.offsetHeight ?? 250
      const left = Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12))
      const top = bounds.bottom + height + 12 <= window.innerHeight
        ? bounds.bottom + 8
        : Math.max(12, bounds.top - height - 8)
      setProfilePosition({ left, top })
    }

    updatePosition()
    profilePopoverRef.current?.querySelector('button:not(:disabled)')?.focus()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [profileOpen])

  useEffect(() => {
    if (!profileOpen) return undefined
    const onPointerDown = (event) => {
      if (profilePopoverRef.current?.contains(event.target)) return
      if (profileAnchorRef.current?.contains(event.target)) return
      closeProfile()
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      const trigger = profileAnchorRef.current
      closeProfile()
      trigger?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  const navigate = (page) => {
    setActivePage(page)
    setMobileOpen(false)
    setSavedMessage('')
  }

  const navigateFromProfile = () => {
    closeProfile()
    navigate('Settings')
  }

  const packetRowsForExport = (items) => items.map((packet) => ({
    timestamp: new Date(packet.timestamp).toISOString(),
    sourceIp: packet.sourceIp,
    sourcePort: packet.sourcePort,
    destinationIp: packet.destinationIp,
    destinationPort: packet.destinationPort,
    protocol: packet.protocol,
    sizeBytes: packet.size,
    direction: packet.direction,
  }))

  const exportPackets = (items = packets) => downloadCsv('netra-packets.csv', packetRowsForExport(items))
  const exportReport = () => {
    const rows = [
      { section: 'Traffic', metric: 'Total packets', value: packets.length },
      { section: 'Traffic', metric: 'Incoming bytes', value: packets.filter((packet) => packet.direction === 'Incoming').reduce((sum, packet) => sum + packet.size, 0) },
      { section: 'Traffic', metric: 'Outgoing bytes', value: packets.filter((packet) => packet.direction === 'Outgoing').reduce((sum, packet) => sum + packet.size, 0) },
      ...PROTOCOLS.map((protocol) => ({ section: 'Protocol', metric: protocol.name, value: packets.filter((packet) => packet.protocol === protocol.name).length })),
      ...['large', 'port', 'source'].map((kind) => ({ section: 'Anomaly', metric: kind, value: anomalies.filter((alert) => alert.kind === kind).length })),
    ]
    downloadCsv('netra-report.csv', rows)
  }

  const toggleReviewed = (alertId) => {
    const next = reviewedAlerts.includes(alertId)
      ? reviewedAlerts.filter((id) => id !== alertId)
      : [...reviewedAlerts, alertId]
    setReviewedAlerts(next)
    try {
      localStorage.setItem('netra-reviewed-alerts', JSON.stringify(next))
      setStorageError('')
    } catch (error) {
      console.error('Unable to save reviewed N.E.T.R.A. alerts.', error)
      setStorageError('Could not save reviewed alerts in this browser.')
    }
  }

  const generateTestEvent = () => {
    const packet = {
      id: `test-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      sourceIp: '198.51.100.77',
      sourcePort: 49152,
      destinationIp: '192.0.2.44',
      destinationPort: 9443,
      protocol: 'TCP',
      size: 1600,
      direction: 'Outgoing',
    }
    setPackets((current) => [packet, ...current].slice(0, 2000))
  }

  const saveSettings = (nextSettings) => {
    setSettings(nextSettings)
    try {
      localStorage.setItem('netra-settings', JSON.stringify(nextSettings))
      setSavedMessage('Settings saved')
      setStorageError('')
    } catch (error) {
      console.error('Unable to save N.E.T.R.A. settings.', error)
      setSavedMessage('')
      setStorageError('Could not save settings in this browser.')
    }
  }

  const submitTopSearch = (event) => {
    event.preventDefault()
    setPacketQuery(topSearch.trim())
    navigate('Packet Explorer')
    setTopSearch('')
    setTopSearchOpen(false)
  }

  const renderPage = () => {
    if (activePage === 'Overview') return <OverviewPage packets={packets} alerts={anomalies} reviewedAlerts={reviewedAlerts} onNavigate={navigate} onToggleReviewed={toggleReviewed} onExportReport={exportReport} />
    if (activePage === 'Live Traffic') return <LiveTrafficPage packets={packets} running={running} setRunning={setRunning} onClear={() => setPackets([])} />
    if (activePage === 'Protocol Analysis') return <ProtocolAnalysisPage packets={packets} />
    if (activePage === 'Packet Explorer') return <PacketExplorerPage packets={packets} query={packetQuery} setQuery={setPacketQuery} onExport={exportPackets} />
    if (activePage === 'Anomaly Detection') return <AnomalyDetectionPage alerts={anomalies} reviewedAlerts={reviewedAlerts} onToggleReviewed={toggleReviewed} onGenerateEvent={generateTestEvent} settings={settings} />
    if (activePage === 'Reports') return <ReportsPage packets={packets} alerts={anomalies} onDownload={exportReport} />
    return <SettingsPage settings={settings} onSave={saveSettings} savedMessage={savedMessage} errorMessage={storageError} />
  }

  return (
    <div className="app-shell" id="overview">
      <Sidebar
        mobileOpen={mobileOpen}
        activePage={activePage}
        onNavigate={navigate}
        onClose={() => setMobileOpen(false)}
        profileOpen={profileOpen && profileSource === 'sidebar'}
        onToggleProfile={toggleProfile}
        profileTriggerRef={sidebarProfileRef}
      />
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>N.E.T.R.A.</span><span className="breadcrumb-slash">/</span><strong>{activePage}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className={`system-status${running ? '' : ' status-paused'}`}><i />{running ? 'Simulation online' : 'Simulation paused'}</span>
            <form className={`topbar-search${topSearchOpen ? ' search-open' : ''}`} onSubmit={submitTopSearch}>
              <button type="button" className="top-search-toggle" onClick={() => setTopSearchOpen((open) => !open)} aria-label={topSearchOpen ? 'Close packet search' : 'Open packet search'}><Search size={15} /></button>
              <input aria-label="Search packet data" placeholder="Search packets..." value={topSearch} onChange={(event) => setTopSearch(event.target.value)} autoFocus={topSearchOpen} />
              <kbd>↵</kbd>
            </form>
            <button className="icon-button topbar-icon notification-button" aria-label={`Open anomaly detection, ${unreadCount} unreviewed alerts`} onClick={() => navigate('Anomaly Detection')}><Bell size={18} />{unreadCount > 0 && <i />}</button>
            <button
              ref={topbarProfileRef}
              className="topbar-avatar"
              type="button"
              data-profile-trigger="topbar"
              aria-label="Open Jordan Davis profile"
              aria-haspopup="dialog"
              aria-expanded={profileOpen && profileSource === 'topbar'}
              aria-controls="profile-popover"
              onClick={toggleProfile}
            >JD</button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{activePage === 'Overview' ? 'NETWORK MONITORING' : 'N.E.T.R.A. MODULE'}</div>
              <h1>{pageCopy[0]}{activePage === 'Overview' && <span className="wave">✦</span>}</h1>
              <p>{pageCopy[1]}</p>
            </div>
            <span className="simulation-badge"><i />Synthetic data</span>
          </section>

          {storageError && activePage !== 'Settings' && <div className="inline-error" role="status">{storageError}</div>}
          {renderPage()}
          <footer className="dashboard-footer">
            <span><ShieldCheck size={14} />Educational simulation only · No live capture</span>
            <span>N.E.T.R.A. <i>·</i> {packets.length.toLocaleString()} packet records in shared sample</span>
          </footer>
        </div>
      </main>
      <ProfilePopover
        open={profileOpen}
        position={profilePosition}
        popoverRef={profilePopoverRef}
        onSettings={navigateFromProfile}
      />
    </div>
  )
}

export default App
