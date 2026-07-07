// EXPORTS: ITemplate, MOCK_TEMPLATES, createProjectFromTemplate
import type { IProject } from '@/types/project';

export interface ITemplate {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  boardId: string;
  category: 'basic' | 'sensor' | 'display' | 'iot' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  componentCount: number;
  icon: string;
}

export const MOCK_TEMPLATES: ITemplate[] = [
  {
    id: 'tpl-blink',
    name: { zh: '闪烁 LED', en: 'Blink LED' },
    description: { zh: '最基础的入门项目，控制板载 LED 闪烁', en: 'Basic starter project, control onboard LED blinking' },
    boardId: 'esp32-devkitc',
    category: 'basic',
    difficulty: 'beginner',
    componentCount: 1,
    icon: '💡',
  },
  {
    id: 'tpl-dht-oled',
    name: { zh: 'DHT11 温湿度 + OLED', en: 'DHT11 Temp/Humidity + OLED' },
    description: { zh: '读取 DHT11 温湿度数据并在 OLED 显示屏上展示', en: 'Read DHT11 sensor and display on OLED screen' },
    boardId: 'esp32-devkitc',
    category: 'sensor',
    difficulty: 'intermediate',
    componentCount: 2,
    icon: '🌡️',
  },
  {
    id: 'tpl-button-led',
    name: { zh: '按键控制 LED', en: 'Button Control LED' },
    description: { zh: '输入输出基础：按下按键点亮 LED，松开熄灭', en: 'Input/output basics: press button to light LED' },
    boardId: 'arduino-uno',
    category: 'basic',
    difficulty: 'beginner',
    componentCount: 2,
    icon: '🔘',
  },
  {
    id: 'tpl-weather-station',
    name: { zh: 'WiFi 天气站', en: 'WiFi Weather Station' },
    description: { zh: '通过 HTTP 请求获取天气数据并显示', en: 'Fetch weather data via HTTP request and display' },
    boardId: 'esp32-devkitc',
    category: 'iot',
    difficulty: 'advanced',
    componentCount: 2,
    icon: '🌤️',
  },
  {
    id: 'tpl-mqtt-relay',
    name: { zh: 'MQTT 远程继电器', en: 'MQTT Remote Relay' },
    description: { zh: '通过 MQTT 消息远程控制继电器开关', en: 'Remote control relay via MQTT messages' },
    boardId: 'esp32-devkitc',
    category: 'iot',
    difficulty: 'advanced',
    componentCount: 1,
    icon: '📡',
  },
];

// 从模板创建完整项目
export function createProjectFromTemplate(templateId: string, newProjectId: string): IProject | null {
  const template = MOCK_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const now = Date.now();
  const baseProject: IProject = {
    id: newProjectId,
    name: template.name.zh,
    platformVersion: '1.0.0',
    createdAt: now,
    updatedAt: now,
    board: {
      boardId: template.boardId,
      name: { zh: '开发板', en: 'Board' },
    },
    components: [],
    logicGraph: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    metadata: {
      description: template.description.zh,
    },
  };

  switch (templateId) {
    case 'tpl-blink':
      return {
        ...baseProject,
        components: [
          {
            id: 'comp-led-1',
            componentId: 'led-module',
            name: 'LED 灯',
            pinMapping: {
              VCC: 'GPIO2',
              GND: 'GND',
            },
            position: { x: 0, y: 0 },
          },
        ],
        logicGraph: {
          nodes: [
            {
              id: 'node-timer-1',
              type: 'timer-trigger',
              category: 'input',
              label: { zh: '定时器', en: 'Timer' },
              position: { x: 100, y: 100 },
              properties: { interval: 1000, unit: 'ms' },
            },
            {
              id: 'node-toggle-1',
              type: 'toggle-state',
              category: 'process',
              label: { zh: '翻转状态', en: 'Toggle' },
              position: { x: 350, y: 100 },
              properties: { initialState: false },
            },
            {
              id: 'node-led-1',
              type: 'led-control',
              category: 'output',
              label: { zh: 'LED 控制', en: 'LED Control' },
              position: { x: 600, y: 100 },
              properties: { pin: 'GPIO2', brightness: 255 },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-timer-1',
              sourcePort: 'trigger',
              target: 'node-toggle-1',
              targetPort: 'input',
            },
            {
              id: 'edge-2',
              source: 'node-toggle-1',
              sourcePort: 'output',
              target: 'node-led-1',
              targetPort: 'control',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      };

    case 'tpl-dht-oled':
      return {
        ...baseProject,
        components: [
          {
            id: 'comp-dht-1',
            componentId: 'dht11',
            name: 'DHT11 温湿度',
            pinMapping: {
              VCC: '3.3V',
              GND: 'GND',
              DATA: 'GPIO4',
            },
            position: { x: 0, y: 0 },
          },
          {
            id: 'comp-oled-1',
            componentId: 'oled-ssd1306',
            name: 'OLED 显示屏',
            pinMapping: {
              VCC: '3.3V',
              GND: 'GND',
              SDA: 'GPIO21',
              SCL: 'GPIO22',
            },
            position: { x: 0, y: 0 },
          },
        ],
        logicGraph: {
          nodes: [
            {
              id: 'node-timer-1',
              type: 'timer-trigger',
              category: 'input',
              label: { zh: '定时器', en: 'Timer' },
              position: { x: 80, y: 120 },
              properties: { interval: 2000, unit: 'ms' },
            },
            {
              id: 'node-dht-1',
              type: 'sensor-read',
              category: 'input',
              label: { zh: '温度读取', en: 'Temp Read' },
              position: { x: 300, y: 60 },
              properties: { sensor: 'dht11', valueType: 'temperature' },
            },
            {
              id: 'node-dht-2',
              type: 'sensor-read',
              category: 'input',
              label: { zh: '湿度读取', en: 'Humidity Read' },
              position: { x: 300, y: 180 },
              properties: { sensor: 'dht11', valueType: 'humidity' },
            },
            {
              id: 'node-oled-1',
              type: 'display-text',
              category: 'output',
              label: { zh: 'OLED 显示', en: 'OLED Display' },
              position: { x: 580, y: 120 },
              properties: { line1: '温度: {temp}°C', line2: '湿度: {hum}%' },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-timer-1',
              sourcePort: 'trigger',
              target: 'node-dht-1',
              targetPort: 'trigger',
            },
            {
              id: 'edge-2',
              source: 'node-timer-1',
              sourcePort: 'trigger',
              target: 'node-dht-2',
              targetPort: 'trigger',
            },
            {
              id: 'edge-3',
              source: 'node-dht-1',
              sourcePort: 'value',
              target: 'node-oled-1',
              targetPort: 'input1',
            },
            {
              id: 'edge-4',
              source: 'node-dht-2',
              sourcePort: 'value',
              target: 'node-oled-1',
              targetPort: 'input2',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      };

    case 'tpl-button-led':
      return {
        ...baseProject,
        components: [
          {
            id: 'comp-btn-1',
            componentId: 'push-button',
            name: '按键',
            pinMapping: {
              VCC: '5V',
              GND: 'GND',
              OUT: 'D2',
            },
            position: { x: 0, y: 0 },
          },
          {
            id: 'comp-led-1',
            componentId: 'led-module',
            name: 'LED 灯',
            pinMapping: {
              VCC: 'D13',
              GND: 'GND',
            },
            position: { x: 0, y: 0 },
          },
        ],
        logicGraph: {
          nodes: [
            {
              id: 'node-btn-1',
              type: 'button-trigger',
              category: 'input',
              label: { zh: '按键触发', en: 'Button' },
              position: { x: 100, y: 120 },
              properties: { pin: 'D2', mode: 'PULLUP' },
            },
            {
              id: 'node-led-1',
              type: 'led-control',
              category: 'output',
              label: { zh: 'LED 控制', en: 'LED Control' },
              position: { x: 450, y: 120 },
              properties: { pin: 'D13', brightness: 255 },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-btn-1',
              sourcePort: 'pressed',
              target: 'node-led-1',
              targetPort: 'control',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      };

    case 'tpl-weather-station':
      return {
        ...baseProject,
        components: [
          {
            id: 'comp-oled-1',
            componentId: 'oled-ssd1306',
            name: 'OLED 显示屏',
            pinMapping: {
              VCC: '3.3V',
              GND: 'GND',
              SDA: 'GPIO21',
              SCL: 'GPIO22',
            },
            position: { x: 0, y: 0 },
          },
        ],
        logicGraph: {
          nodes: [
            {
              id: 'node-wifi-1',
              type: 'wifi-connect',
              category: 'wireless',
              label: { zh: 'WiFi 连接', en: 'WiFi Connect' },
              position: { x: 80, y: 80 },
              properties: { ssid: 'YourWiFi', password: '[HIDDEN]' },
            },
            {
              id: 'node-timer-1',
              type: 'timer-trigger',
              category: 'input',
              label: { zh: '定时器', en: 'Timer' },
              position: { x: 80, y: 200 },
              properties: { interval: 60000, unit: 'ms' },
            },
            {
              id: 'node-http-1',
              type: 'http-get',
              category: 'wireless',
              label: { zh: 'HTTP 请求', en: 'HTTP Get' },
              position: { x: 320, y: 140 },
              properties: { url: 'https://api.example.com/weather', method: 'GET' },
            },
            {
              id: 'node-parse-1',
              type: 'json-parse',
              category: 'process',
              label: { zh: 'JSON 解析', en: 'JSON Parse' },
              position: { x: 560, y: 140 },
              properties: { path: 'data.temp' },
            },
            {
              id: 'node-oled-1',
              type: 'display-text',
              category: 'output',
              label: { zh: 'OLED 显示', en: 'OLED Display' },
              position: { x: 800, y: 140 },
              properties: { line1: '天气温度', line2: '{value}°C' },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-wifi-1',
              sourcePort: 'connected',
              target: 'node-http-1',
              targetPort: 'trigger',
            },
            {
              id: 'edge-2',
              source: 'node-timer-1',
              sourcePort: 'trigger',
              target: 'node-http-1',
              targetPort: 'trigger',
            },
            {
              id: 'edge-3',
              source: 'node-http-1',
              sourcePort: 'response',
              target: 'node-parse-1',
              targetPort: 'input',
            },
            {
              id: 'edge-4',
              source: 'node-parse-1',
              sourcePort: 'output',
              target: 'node-oled-1',
              targetPort: 'input1',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 0.9 },
        },
      };

    case 'tpl-mqtt-relay':
      return {
        ...baseProject,
        components: [
          {
            id: 'comp-relay-1',
            componentId: 'relay-module',
            name: '继电器模块',
            pinMapping: {
              VCC: '5V',
              GND: 'GND',
              IN: 'GPIO5',
            },
            position: { x: 0, y: 0 },
          },
        ],
        logicGraph: {
          nodes: [
            {
              id: 'node-wifi-1',
              type: 'wifi-connect',
              category: 'wireless',
              label: { zh: 'WiFi 连接', en: 'WiFi Connect' },
              position: { x: 80, y: 80 },
              properties: { ssid: 'YourWiFi', password: '[HIDDEN]' },
            },
            {
              id: 'node-mqtt-1',
              type: 'mqtt-connect',
              category: 'wireless',
              label: { zh: 'MQTT 连接', en: 'MQTT Connect' },
              position: { x: 300, y: 80 },
              properties: { broker: 'broker.example.com', port: 1883, topic: 'home/relay/1' },
            },
            {
              id: 'node-relay-1',
              type: 'relay-control',
              category: 'output',
              label: { zh: '继电器控制', en: 'Relay Control' },
              position: { x: 580, y: 80 },
              properties: { pin: 'GPIO5', defaultState: 'off' },
            },
            {
              id: 'node-debug-1',
              type: 'serial-print',
              category: 'output',
              label: { zh: '串口打印', en: 'Serial Print' },
              position: { x: 580, y: 200 },
              properties: { format: '继电器状态: {state}' },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-wifi-1',
              sourcePort: 'connected',
              target: 'node-mqtt-1',
              targetPort: 'trigger',
            },
            {
              id: 'edge-2',
              source: 'node-mqtt-1',
              sourcePort: 'message',
              target: 'node-relay-1',
              targetPort: 'control',
            },
            {
              id: 'edge-3',
              source: 'node-mqtt-1',
              sourcePort: 'message',
              target: 'node-debug-1',
              targetPort: 'input',
            },
          ],
          viewport: { x: 0, y: 0, zoom: 0.9 },
        },
      };

    default:
      return baseProject;
  }
}
