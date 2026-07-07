// EXPORTS: ISerialLogEntry, ISerialDataPoint, MOCK_SERIAL_LOGS, MOCK_SERIAL_DATA
export interface ISerialLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  tag?: string
  message: string
  nodeId?: string
}

export interface ISerialDataPoint {
  time: string
  temperature: number
  humidity: number
  light: number
}

export const MOCK_SERIAL_LOGS: ISerialLogEntry[] = [
  {
    id: '1',
    timestamp: '10:23:01.042',
    level: 'info',
    tag: 'System',
    message: 'ESP32 固件启动完成，版本 v2.1.0'
  },
  {
    id: '2',
    timestamp: '10:23:01.156',
    level: 'info',
    tag: 'WiFi',
    message: '正在连接 WiFi: ThingFlow-Demo...'
  },
  {
    id: '3',
    timestamp: '10:23:02.389',
    level: 'info',
    tag: 'WiFi',
    message: 'WiFi 连接成功，IP: 192.168.1.105'
  },
  {
    id: '4',
    timestamp: '10:23:02.501',
    level: 'info',
    tag: 'Sensor',
    message: 'DHT22 传感器初始化完成'
  },
  {
    id: '5',
    timestamp: '10:23:02.678',
    level: 'debug',
    tag: 'Node',
    message: '__TF_NODE:node_001:24.5',
    nodeId: 'node_001'
  },
  {
    id: '6',
    timestamp: '10:23:02.680',
    level: 'debug',
    tag: 'Node',
    message: '__TF_NODE:node_002:62',
    nodeId: 'node_002'
  },
  {
    id: '7',
    timestamp: '10:23:03.005',
    level: 'info',
    tag: 'Data',
    message: 'DATA:T:24.5,H:62,L:450'
  },
  {
    id: '8',
    timestamp: '10:23:04.012',
    level: 'warn',
    tag: 'Sensor',
    message: '光照强度低于阈值，触发 LED 点亮'
  },
  {
    id: '9',
    timestamp: '10:23:04.020',
    level: 'debug',
    tag: 'Node',
    message: '__TF_NODE:node_003:HIGH',
    nodeId: 'node_003'
  },
  {
    id: '10',
    timestamp: '10:23:05.008',
    level: 'info',
    tag: 'Data',
    message: 'DATA:T:24.6,H:61,L:448'
  }
]

export const MOCK_SERIAL_DATA: ISerialDataPoint[] = [
  { time: '10:23:00', temperature: 24.3, humidity: 63, light: 460 },
  { time: '10:23:01', temperature: 24.4, humidity: 62, light: 455 },
  { time: '10:23:02', temperature: 24.5, humidity: 62, light: 450 },
  { time: '10:23:03', temperature: 24.5, humidity: 61, light: 448 },
  { time: '10:23:04', temperature: 24.6, humidity: 61, light: 445 },
  { time: '10:23:05', temperature: 24.6, humidity: 60, light: 442 }
]