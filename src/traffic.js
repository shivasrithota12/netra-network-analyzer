export const DEFAULT_SETTINGS = {
  largePacketBytes: 1350,
  unusualPort: 9000,
  sourcePacketLimit: 24,
}

export const PROTOCOLS = [
  { name: 'TCP', color: '#8b7bff' },
  { name: 'UDP', color: '#42d6c5' },
  { name: 'DNS', color: '#69a9ff' },
  { name: 'HTTP', color: '#f1b85b' },
  { name: 'HTTPS', color: '#d780e8' },
]

const SOURCES = Array.from({ length: 16 }, (_, index) => `10.0.${Math.floor(index / 8) + 1}.${index % 8 + 10}`)
const DESTINATIONS = Array.from({ length: 12 }, (_, index) => `192.0.2.${index + 10}`)
const PROTOCOL_NAMES = PROTOCOLS.map(({ name }) => name)
const COMMON_PORTS = {
  TCP: [22, 443, 8080, 3389],
  UDP: [123, 443, 500, 4500],
  DNS: [53, 53, 53, 5353],
  HTTP: [80, 8080, 8000],
  HTTPS: [443, 443, 8443],
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function packetId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createPacket(timestamp = Date.now()) {
  const protocol = randomItem(PROTOCOL_NAMES)
  const direction = Math.random() > 0.5 ? 'Incoming' : 'Outgoing'
  const sourceIp = randomItem(SOURCES)
  const destinationIp = randomItem(DESTINATIONS)
  const isUnusualPort = Math.random() < 0.025

  return {
    id: packetId(),
    timestamp,
    sourceIp: direction === 'Incoming' ? destinationIp : sourceIp,
    destinationIp: direction === 'Incoming' ? sourceIp : destinationIp,
    sourcePort: 1024 + Math.floor(Math.random() * 54000),
    destinationPort: isUnusualPort ? 9000 + Math.floor(Math.random() * 1000) : randomItem(COMMON_PORTS[protocol]),
    protocol,
    size: Math.random() < 0.015 ? 1400 + Math.floor(Math.random() * 400) : 64 + Math.floor(Math.random() * 1280),
    direction,
  }
}

export function createInitialPackets(now = Date.now()) {
  const packets = []
  for (let index = 0; index < 168; index += 1) {
    const protocol = PROTOCOL_NAMES[index % PROTOCOL_NAMES.length]
    const direction = index % 2 === 0 ? 'Incoming' : 'Outgoing'
    const sourceIp = SOURCES[index % SOURCES.length]
    const destinationIp = DESTINATIONS[(index * 5) % DESTINATIONS.length]
    const day = Math.floor(index / 24)
    const hour = index % 24
    packets.push({
      id: `sample-${index}`,
      timestamp: now - day * 24 * 60 * 60 * 1000 - hour * 60 * 60 * 1000 - (index % 4) * 60 * 1000,
      sourceIp: direction === 'Incoming' ? destinationIp : sourceIp,
      destinationIp: direction === 'Incoming' ? sourceIp : destinationIp,
      sourcePort: 12000 + (index * 73) % 40000,
      destinationPort: COMMON_PORTS[protocol][index % COMMON_PORTS[protocol].length],
      protocol,
      size: 180 + (index * 97) % 1120,
      direction,
    })
  }
  return packets
}

export function detectAnomalies(packets, settings) {
  const bySource = new Map()
  for (const packet of packets) {
    bySource.set(packet.sourceIp, (bySource.get(packet.sourceIp) || 0) + 1)
  }

  const anomalies = []
  for (const packet of packets) {
    if (packet.size > settings.largePacketBytes) {
      anomalies.push({
        id: `large-${packet.id}`,
        kind: 'large',
        title: 'Large packet detected',
        description: `${packet.size.toLocaleString()} byte ${packet.protocol} packet exceeds the configured size threshold.`,
        sourceIp: packet.sourceIp,
        timestamp: packet.timestamp,
        packetId: packet.id,
      })
    }
    if (packet.destinationPort >= settings.unusualPort) {
      anomalies.push({
        id: `port-${packet.id}`,
        kind: 'port',
        title: 'Unusual destination port',
        description: `${packet.protocol} traffic was sent to destination port ${packet.destinationPort}.`,
        sourceIp: packet.sourceIp,
        timestamp: packet.timestamp,
        packetId: packet.id,
      })
    }
  }

  for (const [sourceIp, count] of bySource) {
    if (count > settings.sourcePacketLimit) {
      anomalies.push({
        id: `source-${sourceIp}`,
        kind: 'source',
        title: 'High source IP concentration',
        description: `${sourceIp} generated ${count} packets, exceeding the configured source limit.`,
        sourceIp,
        timestamp: Date.now(),
        packetId: null,
      })
    }
  }

  return anomalies.sort((left, right) => right.timestamp - left.timestamp)
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('netra-settings') || '{}')
    return {
      largePacketBytes: validSetting(saved.largePacketBytes, DEFAULT_SETTINGS.largePacketBytes),
      unusualPort: validSetting(saved.unusualPort, DEFAULT_SETTINGS.unusualPort),
      sourcePacketLimit: validSetting(saved.sourcePacketLimit, DEFAULT_SETTINGS.sourcePacketLimit),
    }
  } catch (error) {
    console.error('Unable to load NETRA settings from local storage.', error)
    return DEFAULT_SETTINGS
  }
}

export function loadReviewedAlerts() {
  try {
    const saved = JSON.parse(localStorage.getItem('netra-reviewed-alerts') || '[]')
    return Array.isArray(saved) && saved.every((item) => typeof item === 'string') ? saved : []
  } catch (error) {
    console.error('Unable to load reviewed NETRA alerts from local storage.', error)
    return []
  }
}

function validSetting(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}
