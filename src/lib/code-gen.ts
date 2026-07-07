// EXPORTS: generateCode, COMPONENT_LIBS, COMPONENT_PIN_LABELS
import type { IComponentInstance, ILogicNode } from '@/types/project';
import { MOCK_COMPONENTS } from '@/data/components';
import { MOCK_BOARDS } from '@/data/boards';

type Lang = 'zh' | 'en';

interface CodeGenOptions {
  lang: Lang;
  boardId: string;
  components: IComponentInstance[];
  nodes: ILogicNode[];
  debugMode: boolean;
}

// 元件 → 所需库映射
export const COMPONENT_LIBS: Record<string, string[]> = {
  led: [], 'rgb-led-cathode': [], 'rgb-led-anode': [], ws2812b: ['Adafruit_NeoPixel.h'], ws2811: ['Adafruit_NeoPixel.h'], apa102: [],
  'servo-sg90': ['ESP32Servo.h'], 'servo-mg996r': ['ESP32Servo.h'], 'servo-continuous': ['ESP32Servo.h'],
  dht11: ['DHT.h'], dht22: ['DHT.h'],
  aht10: ['Adafruit_AHTX0.h'], aht20: ['Adafruit_AHTX0.h'],
  sht30: ['Adafruit_SHT31.h'], sht31: ['Adafruit_SHT31.h'],
  bme280: ['Adafruit_BME280.h', 'Adafruit_Sensor.h'],
  bme680: ['Adafruit_BME680.h', 'Adafruit_Sensor.h'],
  bh1750: ['BH1750.h'], veml7700: ['Adafruit_VEML7700.h'],
  'hc-sr04': [], 'vl53l0x': ['Adafruit_VL53L0X.h'], 'vl53l1x': ['Adafruit_VL53L1X.h'],
  mpu6050: ['Adafruit_MPU6050.h', 'Adafruit_Sensor.h'], mpu9250: ['MPU9250.h'],
  'ssd1306-096': ['Adafruit_SSD1306.h', 'Adafruit_GFX.h', 'Wire.h'],
  'ssd1306-13': ['Adafruit_SSD1306.h', 'Adafruit_GFX.h', 'Wire.h'],
  'lcd1602-i2c': ['LiquidCrystal_I2C.h', 'Wire.h'], 'lcd2004-i2c': ['LiquidCrystal_I2C.h', 'Wire.h'],
  'hc-sr501': [], am312: [],
  'soil-moisture': [], 'water-level': [], raindrop: [], 'sound-sensor': [], 'flame-sensor': [],
  'mq-2': [], 'mq-3': [], 'mq-5': [], 'mq-7': [], 'mq-135': [],
  photoresistor: [], 'gp2y0a21yk': [],
  ds18b20: ['OneWire.h', 'DallasTemperature.h'],
  'rc522': ['MFRC522.h', 'SPI.h'], pn532: ['Adafruit_PN532.h'],
  'neo-6m': ['TinyGPSPlus.h', 'SoftwareSerial.h'],
  'relay-1ch': [], 'relay-2ch': [], 'relay-4ch': [], 'relay-optocoupler': [],
  'buzzer-passive': [], 'buzzer-active': [],
  l298n: [], l293d: [], tb6612: [], 'dc-gear-motor': [],
  'button-module': [], potentiometer: [],
};

function getLibs(componentId: string): string[] {
  return COMPONENT_LIBS[componentId] ?? [];
}

function getVarName(name: string): string {
  return name.replace(/[\s\u4e00-\u9fff]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function generateMicroPython({ lang, boardId, components, nodes, debugMode }: CodeGenOptions): string {
  const board = MOCK_BOARDS.find((b) => b.id === boardId);
  const boardName = board?.name.zh ?? 'Board';

  let code = `# ============================================
# ThingFlow - 自动生成代码
# 开发板: ${boardName}
# 配件数量: ${components.length}
# 生成时间: ${new Date().toISOString().split('T')[0]}
# ============================================

from machine import Pin, I2C, ADC, PWM
import time

`;

  // 导入库
  const libs = new Set<string>();
  components.forEach((comp) => {
    getLibs(comp.componentId).forEach((l) => libs.add(l));
  });
  const hasWireless = nodes.some((n) => n.category === 'wireless');
  if (hasWireless) { libs.add('network'); libs.add('socket'); }
  libs.forEach((l) => {
    code += `import ${l.replace('.h', '').toLowerCase()}\n`;
  });

  // 引脚定义
  code += `\n# ===== 引脚定义 =====\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def) return;
    const vn = getVarName(comp.name);
    Object.entries(comp.pinMapping).forEach(([pinName, pinVal]) => {
      if (pinName === 'VCC' || pinName === 'GND') return;
      code += `${vn}_${pinName.toLowerCase()} = ${JSON.stringify(pinVal)}  # ${comp.name} - ${pinName}\n`;
    });
  });

  // 对象初始化
  code += `\n# ===== 对象初始化 =====\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def) return;
    const vn = getVarName(comp.name);
    const { protocol, category } = def;

    if (protocol === 'i2c') {
      const sda = comp.pinMapping['SDA'] ?? comp.pinMapping['SDA'] ?? '21';
      const scl = comp.pinMapping['SCL'] ?? comp.pinMapping['SCL'] ?? '22';
      code += `# ${comp.name}\ni2c = I2C(0, sda=Pin(${JSON.stringify(sda)}), scl=Pin(${JSON.stringify(scl)}))\n`;
      code += `${vn} = i2c  # I2C 设备\n`;
    } else if (category === 'actuator' || protocol === 'gpio') {
      const pin = comp.pinMapping['IN'] ?? comp.pinMapping['SIG'] ?? comp.pinMapping['OUT'] ?? comp.pinMapping['VCC'] ?? '2';
      code += `# ${comp.name}\n${vn}_pin = Pin(${JSON.stringify(pin)}, Pin.OUT)\n`;
    } else if (protocol === 'analog') {
      const pin = comp.pinMapping['AO'] ?? comp.pinMapping['OUT'] ?? comp.pinMapping['SIG'] ?? '34';
      code += `# ${comp.name}\n${vn} = ADC(Pin(${JSON.stringify(pin)}))\n${vn}.atten(ADC.ATTN_11DB)\n`;
    } else if (protocol === 'onewire') {
      const pin = comp.pinMapping['DATA'] ?? comp.pinMapping['DQ'] ?? '4';
      code += `# ${comp.name}\nimport onewire\n${vn}_onewire = onewire.OneWire(Pin(${JSON.stringify(pin)}))\n`;
    }
  });

  // WiFi
  if (hasWireless) {
    code += `\n# ===== WiFi 连接 =====\nwifi = network.WLAN(network.STA_IF)\nwifi.active(True)\nwifi.connect('YOUR_SSID', 'YOUR_PASSWORD')\nwhile not wifi.isconnected():\n    time.sleep(0.5)\nprint('WiFi connected:', wifi.ifconfig())\n`;
  }

  // setup()
  code += `\n# ===== setup() =====\ndef setup():\n    print("ThingFlow ${boardName} 启动")\n`;
  components.forEach((comp) => {
    code += `    print("${comp.name} 就绪")\n`;
  });
  code += `\n`;

  // loop()
  code += `# ===== loop() =====\ndef loop():\n`;
  let hasSensorRead = false;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def || def.category !== 'sensor') return;
    hasSensorRead = true;
    const vn = getVarName(comp.name);
    if (def.protocol === 'analog') {
      code += `    ${vn}_val = ${vn}.read()  # ${comp.name}\n`;
    } else if (def.protocol === 'i2c') {
      code += `    ${vn}_val = 0  # ${comp.name} (I2C 读取)\n`;
    } else if (def.protocol === 'onewire') {
      code += `    ${vn}_val = 0  # ${comp.name} (OneWire 读取)\n`;
    } else {
      code += `    ${vn}_val = 0  # ${comp.name}\n`;
    }
    if (debugMode) {
      code += `    print(f"__TF_NODE:{comp.id}:{${vn}_val}")\n`;
    }
    code += `    print(f"[数据] ${comp.name}: {${vn}_val}")\n`;
  });
  if (!hasSensorRead && components.length > 0) {
    code += `    print("运行中...")\n`;
  }
  code += `    time.sleep(1)\n`;

  // 主入口
  code += `\n# ===== 主入口 =====\nsetup()\nwhile True:\n    loop()\n`;
  return code;
}

function generateArduino({ lang, boardId, components, nodes, debugMode }: CodeGenOptions): string {
  const board = MOCK_BOARDS.find((b) => b.id === boardId);
  const boardName = board?.name.zh ?? 'Board';

  let code = `// ============================================
// ThingFlow - 自动生成 Arduino 代码
// 开发板: ${boardName}
// 配件数量: ${components.length}
// 生成时间: ${new Date().toISOString().split('T')[0]}
// ============================================

#include <Arduino.h>

`;

  // 导入库
  const libs = new Set<string>();
  components.forEach((comp) => {
    getLibs(comp.componentId).forEach((l) => libs.add(l));
  });
  const hasWireless = nodes.some((n) => n.category === 'wireless');
  if (hasWireless) { libs.add('WiFi.h'); libs.add('WebServer.h'); }
  libs.forEach((l) => {
    code += `#include <${l}>\n`;
  });

  // 引脚定义
  code += `\n// ===== 引脚定义 =====\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def) return;
    const vn = getVarName(comp.name);
    Object.entries(comp.pinMapping).forEach(([pinName, pinVal]) => {
      if (pinName === 'VCC' || pinName === 'GND') return;
      code += `#define ${vn.toUpperCase()}_${pinName.toUpperCase()} ${pinVal}  // ${comp.name} - ${pinName}\n`;
    });
  });

  // 全局对象
  code += `\n// ===== 全局对象 =====\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def) return;
    const vn = getVarName(comp.name);
    if (def.protocol === 'i2c' && def.category === 'display') {
      code += `${def.id.startsWith('lcd') ? 'LiquidCrystal_I2C' : 'Adafruit_SSD1306'} ${vn}(128, 64, &Wire);\n`;
    }
  });

  // setup()
  code += `\n// ===== setup() =====\nvoid setup() {\n    Serial.begin(115200);\n    delay(1000);\n    Serial.println("ThingFlow ${boardName} 启动");\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def) return;
    const vn = getVarName(comp.name);
    Object.entries(comp.pinMapping).forEach(([pinName, pinVal]) => {
      if (pinName === 'VCC' || pinName === 'GND') return;
      if (def.category === 'actuator') {
        code += `    pinMode(${vn.toUpperCase()}_${pinName.toUpperCase()}, OUTPUT);\n`;
      } else {
        code += `    pinMode(${vn.toUpperCase()}_${pinName.toUpperCase()}, INPUT);\n`;
      }
    });
  });
  code += `    Serial.println("所有配件就绪");\n}\n`;

  // loop()
  code += `\n// ===== loop() =====\nvoid loop() {\n`;
  components.forEach((comp) => {
    const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
    if (!def || def.category !== 'sensor') return;
    const vn = getVarName(comp.name);
    if (def.protocol === 'analog') {
      const pin = comp.pinMapping['AO'] ?? comp.pinMapping['OUT'] ?? comp.pinMapping['SIG'] ?? 'A0';
      code += `    float ${vn}_val = analogRead(${pin}) * (3.3 / 4095.0);  // ${comp.name}\n`;
    } else if (def.protocol === 'i2c') {
      code += `    float ${vn}_val = 0;  // ${comp.name} (I2C)\n`;
    } else {
      code += `    float ${vn}_val = 0;  // ${comp.name}\n`;
    }
    if (debugMode) {
      code += `    Serial.printf("__TF_NODE:${comp.id}:%.1f\\n", ${vn}_val);\n`;
    }
    code += `    Serial.print("[数据] ${comp.name}: "); Serial.println(${vn}_val);\n`;
  });
  code += `    delay(1000);\n}\n`;

  return code;
}

export function generateCode(options: CodeGenOptions): string {
  const board = MOCK_BOARDS.find((b) => b.id === options.boardId);
  const isMicroPython = board?.language === 'micropython' || board?.language === 'both';
  if (isMicroPython) return generateMicroPython(options);
  return generateArduino(options);
}

export function checkUnconfigured(components: IComponentInstance[]): { name: string; pins: string[] }[] {
  return components
    .map((comp) => {
      const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
      if (!def) return null;
      const unconfigured = def.pins
        .filter((p) => p.required && !comp.pinMapping[p.name])
        .map((p) => p.name);
      if (unconfigured.length === 0) return null;
      return { name: comp.name, pins: unconfigured };
    })
    .filter(Boolean) as { name: string; pins: string[] }[];
}
