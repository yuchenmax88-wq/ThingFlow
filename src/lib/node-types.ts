// EXPORTS: NodeTypeDef, NODE_TYPE_DEFS, getNodeTypeDef, getPortType
// 逻辑节点类型定义

import {
  Thermometer,
  Timer,
  Play,
  Calculator,
  GitBranch,
  Lightbulb,
  Zap,
  Monitor,
  Wifi,
  Activity,
  Globe,
  Send,
  Server,
  Download,
  Upload,
  Network,
  Bluetooth,
  Clock,
  Cloud,
  Radio,
  Variable,
  Repeat,
  SplitSquareVertical,
  ArrowRightLeft,
  Gauge,
  MessageSquare,
  Database,
  Shield,
  Key,
  Waves,
} from 'lucide-react';
import type { IPortType } from '@/types/project';

export interface NodePortDef {
  id: string;
  label: string;
  type: IPortType;
}

export interface NodeTypeDef {
  type: string;
  category: 'input' | 'process' | 'output' | 'flow' | 'wireless';
  label: { zh: string; en: string };
  icon: React.ComponentType<{ className?: string }>;
  color: string; // tailwind bg 类名
  inputs: NodePortDef[];
  outputs: NodePortDef[];
  defaultProperties: Record<string, unknown>;
}

export const NODE_TYPE_DEFS: NodeTypeDef[] = [
  // ===== 输入类 =====
  {
    type: 'sensor-read',
    category: 'input',
    label: { zh: '传感器读取', en: 'Sensor Read' },
    icon: Thermometer,
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'value', label: '数值', type: 'analog' }],
    defaultProperties: { sensorId: '' },
  },
  {
    type: 'timer',
    category: 'input',
    label: { zh: '定时器', en: 'Timer' },
    icon: Timer,
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    defaultProperties: { interval: 1000, unit: 'ms' },
  },
  {
    type: 'button',
    category: 'input',
    label: { zh: '按钮触发', en: 'Button' },
    icon: Play,
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'signal', label: '信号', type: 'digital' }],
    defaultProperties: { mode: 'toggle' },
  },
  {
    type: 'serial-trigger',
    category: 'input',
    label: { zh: '串口触发', en: 'Serial Trigger' },
    icon: MessageSquare,
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'data', label: '数据', type: 'generic' }],
    defaultProperties: { keyword: '' },
  },

  // ===== 处理类 =====
  {
    type: 'compare',
    category: 'process',
    label: { zh: '逻辑比较', en: 'Compare' },
    icon: Calculator,
    color: 'bg-blue-500',
    inputs: [
      { id: 'a', label: 'A', type: 'generic' },
      { id: 'b', label: 'B', type: 'generic' },
    ],
    outputs: [{ id: 'result', label: '结果', type: 'digital' }],
    defaultProperties: { operator: '>' },
  },
  {
    type: 'math',
    category: 'process',
    label: { zh: '数学运算', en: 'Math' },
    icon: Calculator,
    color: 'bg-blue-500',
    inputs: [{ id: 'input', label: '输入', type: 'analog' }],
    outputs: [{ id: 'output', label: '输出', type: 'analog' }],
    defaultProperties: { operation: '+', value: 0 },
  },
  {
    type: 'map',
    category: 'process',
    label: { zh: '数据映射', en: 'Map' },
    icon: GitBranch,
    color: 'bg-blue-500',
    inputs: [{ id: 'input', label: '输入', type: 'analog' }],
    outputs: [{ id: 'output', label: '输出', type: 'analog' }],
    defaultProperties: { inMin: 0, inMax: 1023, outMin: 0, outMax: 100 },
  },
  {
    type: 'variable',
    category: 'process',
    label: { zh: '变量', en: 'Variable' },
    icon: Variable,
    color: 'bg-blue-500',
    inputs: [{ id: 'set', label: '设置', type: 'generic' }],
    outputs: [{ id: 'value', label: '值', type: 'generic' }],
    defaultProperties: { name: 'var1', initialValue: 0 },
  },

  // ===== 输出类 =====
  {
    type: 'led-control',
    category: 'output',
    label: { zh: 'LED 控制', en: 'LED Control' },
    icon: Lightbulb,
    color: 'bg-amber-500',
    inputs: [{ id: 'state', label: '状态', type: 'digital' }],
    outputs: [],
    defaultProperties: { pin: 'GPIO2', brightness: 100 },
  },
  {
    type: 'servo-control',
    category: 'output',
    label: { zh: '舵机控制', en: 'Servo' },
    icon: Zap,
    color: 'bg-amber-500',
    inputs: [{ id: 'angle', label: '角度', type: 'analog' }],
    outputs: [],
    defaultProperties: { pin: 'GPIO5', minAngle: 0, maxAngle: 180 },
  },
  {
    type: 'display-out',
    category: 'output',
    label: { zh: '显示屏输出', en: 'Display' },
    icon: Monitor,
    color: 'bg-amber-500',
    inputs: [{ id: 'content', label: '内容', type: 'generic' }],
    outputs: [],
    defaultProperties: { line: 1, align: 'left' },
  },
  {
    type: 'buzzer',
    category: 'output',
    label: { zh: '蜂鸣器', en: 'Buzzer' },
    icon: Radio,
    color: 'bg-amber-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [],
    defaultProperties: { frequency: 1000, duration: 500 },
  },
  {
    type: 'relay',
    category: 'output',
    label: { zh: '继电器控制', en: 'Relay' },
    icon: Shield,
    color: 'bg-amber-500',
    inputs: [{ id: 'state', label: '状态', type: 'digital' }],
    outputs: [],
    defaultProperties: { pin: 'GPIO4', normallyOpen: true },
  },

  // ===== 流程控制 =====
  {
    type: 'if-else',
    category: 'flow',
    label: { zh: '条件分支', en: 'If/Else' },
    icon: SplitSquareVertical,
    color: 'bg-purple-500',
    inputs: [{ id: 'condition', label: '条件', type: 'digital' }],
    outputs: [
      { id: 'true', label: '是', type: 'generic' },
      { id: 'false', label: '否', type: 'generic' },
    ],
    defaultProperties: {},
  },
  {
    type: 'delay',
    category: 'flow',
    label: { zh: '延时', en: 'Delay' },
    icon: Timer,
    color: 'bg-purple-500',
    inputs: [{ id: 'input', label: '输入', type: 'generic' }],
    outputs: [{ id: 'output', label: '输出', type: 'generic' }],
    defaultProperties: { duration: 1000, unit: 'ms' },
  },
  {
    type: 'loop',
    category: 'flow',
    label: { zh: '循环', en: 'Loop' },
    icon: Repeat,
    color: 'bg-purple-500',
    inputs: [{ id: 'input', label: '输入', type: 'generic' }],
    outputs: [{ id: 'body', label: '循环体', type: 'generic' }],
    defaultProperties: { count: 10 },
  },
  {
    type: 'merge',
    category: 'flow',
    label: { zh: '合并', en: 'Merge' },
    icon: ArrowRightLeft,
    color: 'bg-purple-500',
    inputs: [
      { id: 'a', label: 'A', type: 'generic' },
      { id: 'b', label: 'B', type: 'generic' },
    ],
    outputs: [{ id: 'out', label: '输出', type: 'generic' }],
    defaultProperties: {},
  },

  // ===== 无线 - WiFi =====
  {
    type: 'wifi-connect',
    category: 'wireless',
    label: { zh: 'WiFi 连接', en: 'WiFi Connect' },
    icon: Wifi,
    color: 'bg-cyan-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { ssid: '', password: '' },
  },
  {
    type: 'wifi-status',
    category: 'wireless',
    label: { zh: 'WiFi 状态', en: 'WiFi Status' },
    icon: Activity,
    color: 'bg-cyan-500',
    inputs: [],
    outputs: [{ id: 'connected', label: '已连接', type: 'digital' }],
    defaultProperties: {},
  },
  {
    type: 'wifi-disconnect',
    category: 'wireless',
    label: { zh: 'WiFi 断开', en: 'WiFi Disconnect' },
    icon: Wifi,
    color: 'bg-cyan-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'done', label: '完成', type: 'digital' }],
    defaultProperties: {},
  },

  // ===== 无线 - HTTP =====
  {
    type: 'http-get',
    category: 'wireless',
    label: { zh: 'HTTP GET', en: 'HTTP GET' },
    icon: Globe,
    color: 'bg-sky-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'response', label: '响应', type: 'generic' }],
    defaultProperties: { url: 'https://api.example.com/data' },
  },
  {
    type: 'http-post',
    category: 'wireless',
    label: { zh: 'HTTP POST', en: 'HTTP POST' },
    icon: Send,
    color: 'bg-sky-500',
    inputs: [
      { id: 'trigger', label: '触发', type: 'digital' },
      { id: 'data', label: '数据', type: 'generic' },
    ],
    outputs: [{ id: 'response', label: '响应', type: 'generic' }],
    defaultProperties: { url: 'https://api.example.com/post' },
  },
  {
    type: 'http-parse',
    category: 'wireless',
    label: { zh: '响应解析', en: 'Response Parse' },
    icon: GitBranch,
    color: 'bg-sky-500',
    inputs: [{ id: 'response', label: '响应', type: 'generic' }],
    outputs: [{ id: 'data', label: '数据', type: 'generic' }],
    defaultProperties: { jsonPath: '$.data' },
  },

  // ===== 无线 - MQTT =====
  {
    type: 'mqtt-connect',
    category: 'wireless',
    label: { zh: 'MQTT 连接', en: 'MQTT Connect' },
    icon: Server,
    color: 'bg-teal-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { broker: 'broker.example.com', port: 1883, clientId: '' },
  },
  {
    type: 'mqtt-publish',
    category: 'wireless',
    label: { zh: 'MQTT 发布', en: 'MQTT Publish' },
    icon: Upload,
    color: 'bg-teal-500',
    inputs: [
      { id: 'trigger', label: '触发', type: 'digital' },
      { id: 'message', label: '消息', type: 'generic' },
    ],
    outputs: [{ id: 'done', label: '完成', type: 'digital' }],
    defaultProperties: { topic: 'thingflow/test' },
  },
  {
    type: 'mqtt-subscribe',
    category: 'wireless',
    label: { zh: 'MQTT 订阅', en: 'MQTT Subscribe' },
    icon: Download,
    color: 'bg-teal-500',
    inputs: [],
    outputs: [{ id: 'message', label: '消息', type: 'generic' }],
    defaultProperties: { topic: 'thingflow/test' },
  },

  // ===== 无线 - WebSocket =====
  {
    type: 'websocket-connect',
    category: 'wireless',
    label: { zh: 'WebSocket 连接', en: 'WebSocket Connect' },
    icon: Network,
    color: 'bg-indigo-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { url: 'ws://example.com/ws' },
  },
  {
    type: 'websocket-send',
    category: 'wireless',
    label: { zh: 'WebSocket 发送', en: 'WebSocket Send' },
    icon: Send,
    color: 'bg-indigo-500',
    inputs: [
      { id: 'trigger', label: '触发', type: 'digital' },
      { id: 'data', label: '数据', type: 'generic' },
    ],
    outputs: [{ id: 'done', label: '完成', type: 'digital' }],
    defaultProperties: {},
  },
  {
    type: 'websocket-receive',
    category: 'wireless',
    label: { zh: 'WebSocket 接收', en: 'WebSocket Receive' },
    icon: Download,
    color: 'bg-indigo-500',
    inputs: [],
    outputs: [{ id: 'message', label: '消息', type: 'generic' }],
    defaultProperties: {},
  },

  // ===== 无线 - 蓝牙 =====
  {
    type: 'ble-advertise',
    category: 'wireless',
    label: { zh: 'BLE 广播', en: 'BLE Advertise' },
    icon: Bluetooth,
    color: 'bg-blue-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { deviceName: 'ThingFlow' },
  },
  {
    type: 'ble-service',
    category: 'wireless',
    label: { zh: 'BLE 服务', en: 'BLE Service' },
    icon: Database,
    color: 'bg-blue-500',
    inputs: [],
    outputs: [{ id: 'data', label: '数据', type: 'generic' }],
    defaultProperties: { serviceUUID: '', characteristicUUID: '' },
  },
  {
    type: 'ble-send',
    category: 'wireless',
    label: { zh: 'BLE 发送', en: 'BLE Send' },
    icon: Send,
    color: 'bg-blue-500',
    inputs: [{ id: 'data', label: '数据', type: 'generic' }],
    outputs: [{ id: 'done', label: '完成', type: 'digital' }],
    defaultProperties: {},
  },

  // ===== 无线 - NTP / 时间 =====
  {
    type: 'ntp-sync',
    category: 'wireless',
    label: { zh: 'NTP 时间同步', en: 'NTP Sync' },
    icon: Clock,
    color: 'bg-amber-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'time', label: '时间', type: 'generic' }],
    defaultProperties: { server: 'pool.ntp.org' },
  },
  {
    type: 'get-time',
    category: 'wireless',
    label: { zh: '获取当前时间', en: 'Get Current Time' },
    icon: Clock,
    color: 'bg-amber-500',
    inputs: [],
    outputs: [{ id: 'time', label: '时间', type: 'generic' }],
    defaultProperties: { format: 'YYYY-MM-DD HH:mm:ss' },
  },

  // ===== 无线 - 云平台 =====
  {
    type: 'cloud-bafa',
    category: 'wireless',
    label: { zh: '巴法云', en: 'Bafa Cloud' },
    icon: Cloud,
    color: 'bg-emerald-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { topic: '', uid: '' },
  },
  {
    type: 'cloud-aliyun',
    category: 'wireless',
    label: { zh: '阿里云 IoT', en: 'Aliyun IoT' },
    icon: Cloud,
    color: 'bg-emerald-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { productKey: '', deviceName: '', deviceSecret: '' },
  },
  {
    type: 'cloud-tencent',
    category: 'wireless',
    label: { zh: '腾讯云 IoT', en: 'Tencent IoT' },
    icon: Cloud,
    color: 'bg-emerald-500',
    inputs: [{ id: 'trigger', label: '触发', type: 'digital' }],
    outputs: [{ id: 'status', label: '状态', type: 'digital' }],
    defaultProperties: { productId: '', deviceName: '', deviceSecret: '' },
  },
];

export function getNodeTypeDef(type: string): NodeTypeDef | undefined {
  return NODE_TYPE_DEFS.find((n) => n.type === type);
}

export function getPortType(nodeType: string, portId: string, direction: 'input' | 'output'): IPortType {
  const def = getNodeTypeDef(nodeType);
  if (!def) return 'generic';
  const ports = direction === 'input' ? def.inputs : def.outputs;
  const port = ports.find((p) => p.id === portId);
  return port?.type ?? 'generic';
}

/**
 * 检查两个端口类型是否兼容
 * 规则：generic 兼容所有类型；同类型直接兼容；digital <-> analog 不兼容（但允许通过 map 节点转换）
 */
export function arePortTypesCompatible(sourceType: IPortType, targetType: IPortType): boolean {
  if (sourceType === 'generic' || targetType === 'generic') return true;
  if (sourceType === targetType) return true;
  // 数字和 PWM 兼容
  if ((sourceType === 'digital' && targetType === 'pwm') || (sourceType === 'pwm' && targetType === 'digital')) return true;
  // I2C 内部兼容
  if (sourceType === 'i2c' && targetType === 'i2c') return true;
  // SPI 内部兼容
  if (sourceType === 'spi' && targetType === 'spi') return true;
  // UART 内部兼容
  if (sourceType === 'uart' && targetType === 'uart') return true;
  return false;
}
