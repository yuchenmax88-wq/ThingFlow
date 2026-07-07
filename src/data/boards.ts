// EXPORTS: IBoardDef, IPinDef, MOCK_BOARDS, BOARD_SERIES
export interface IPinDef {
  number: string
  physicalPin: number
  functions: ('GPIO' | 'ADC' | 'PWM' | 'I2C-SDA' | 'I2C-SCL' | 'SPI-MOSI' | 'SPI-MISO' | 'SPI-SCK' | 'UART-TX' | 'UART-RX' | 'VCC' | 'GND')[]
  voltage?: '3.3V' | '5V'
}

export interface IBoardDef {
  id: string
  name: { zh: string; en: string }
  manufacturer: string
  series: string
  mcu: string
  flash: string
  sram: string
  clockSpeed: string
  capabilities: {
    wifi: boolean
    ble: boolean
    gpio: number
    adc: number
    pwm: number
    i2c: number
    spi: number
    uart: number
  }
  voltage: '3.3V' | '5V' | 'dual'
  language: 'micropython' | 'arduino-cpp' | 'both'
  pins: IPinDef[]
}

export const BOARD_SERIES = [
  { id: 'espressif', name: { zh: 'Espressif 乐鑫', en: 'Espressif' } },
  { id: 'arduino', name: { zh: 'Arduino', en: 'Arduino' } },
  { id: 'raspberrypi', name: { zh: 'Raspberry Pi', en: 'Raspberry Pi' } },
  { id: 'stm32', name: { zh: 'STM32', en: 'STM32' }, },
  { id: 'other', name: { zh: '其他', en: 'Others' } },
]

// 通用引脚生成辅助
const genEsp32Pins = (prefix = 'GPIO', count = 40, extras: Record<string, string[]> = {}): IPinDef[] => {
  const pins: IPinDef[] = []
  let p = 1
  pins.push({ number: '3V3', physicalPin: p++, functions: ['VCC'], voltage: '3.3V' })
  pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] })
  pins.push({ number: 'EN', physicalPin: p++, functions: ['GPIO'] })
  for (let i = 0; i < Math.min(count, 10); i++) {
    const fns: IPinDef['functions'] = ['GPIO']
    if (i === 0) fns.push('PWM')
    if (i === 2) fns.push('PWM', 'ADC')
    if (i === 4) fns.push('PWM')
    if (i === 5) fns.push('PWM', 'SPI-SCK')
    if (i === 12) fns.push('PWM', 'SPI-MISO')
    if (i === 13) fns.push('PWM', 'SPI-MOSI')
    if (i === 14) fns.push('PWM', 'SPI-SCK')
    if (i === 16) fns.push('UART-TX')
    if (i === 17) fns.push('UART-RX')
    if (i === 21) fns.push('I2C-SDA')
    if (i === 22) fns.push('I2C-SCL')
    pins.push({ number: `${prefix}${i}`, physicalPin: p++, functions: fns })
  }
  // 补齐更多引脚
  for (let i = 25; i < count; i++) {
    const fns: IPinDef['functions'] = ['GPIO', 'PWM']
    if (i === 32 || i === 33 || i === 34 || i === 35 || i === 36 || i === 39) fns.push('ADC')
    pins.push({ number: `${prefix}${i}`, physicalPin: p++, functions: fns })
  }
  pins.push({ number: '5V', physicalPin: p++, functions: ['VCC'], voltage: '5V' })
  pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] })
  // 应用 extras
  extras && Object.entries(extras).forEach(([num, fns]) => {
    const pin = pins.find(p => p.number === num)
    if (pin) fns.forEach(fn => { if (!pin.functions.includes(fn as any)) pin.functions.push(fn as any) })
  })
  return pins
}

// Arduino 风格引脚 (数字 + 模拟)
const genArduinoPins = (digital = 14, analog = 6, hasI2C = true): IPinDef[] => {
  const pins: IPinDef[] = []
  let p = 1
  pins.push({ number: '5V', physicalPin: p++, functions: ['VCC'], voltage: '5V' })
  pins.push({ number: '3.3V', physicalPin: p++, functions: ['VCC'], voltage: '3.3V' })
  pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] })
  for (let i = 0; i < digital; i++) {
    const fns: IPinDef['functions'] = ['GPIO']
    if ([3, 5, 6, 9, 10, 11].includes(i)) fns.push('PWM')
    if (i === 0) fns.push('UART-RX')
    if (i === 1) fns.push('UART-TX')
    if (i === 10) fns.push('SPI-MISO')
    if (i === 11) fns.push('SPI-MOSI')
    if (i === 13) fns.push('SPI-SCK')
    pins.push({ number: `D${i}`, physicalPin: p++, functions: fns })
  }
  for (let i = 0; i < analog; i++) {
    const fns: IPinDef['functions'] = ['GPIO', 'ADC']
    if (hasI2C && i === 4) fns.push('I2C-SDA')
    if (hasI2C && i === 5) fns.push('I2C-SCL')
    pins.push({ number: `A${i}`, physicalPin: p++, functions: fns })
  }
  pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] })
  return pins
}

// Pico 风格引脚
const genPicoPins = (hasWifi = false): IPinDef[] => {
  const pins: IPinDef[] = []
  let p = 1
  for (let i = 0; i < 40; i++) {
    if (i === 0) { pins.push({ number: 'GP0', physicalPin: p++, functions: ['GPIO', 'UART-TX', 'I2C-SDA'] }); continue }
    if (i === 1) { pins.push({ number: 'GP1', physicalPin: p++, functions: ['GPIO', 'UART-RX', 'I2C-SCL'] }); continue }
    if (i === 2) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 3) { pins.push({ number: 'GP2', physicalPin: p++, functions: ['GPIO', 'I2C-SDA'] }); continue }
    if (i === 4) { pins.push({ number: 'GP3', physicalPin: p++, functions: ['GPIO', 'I2C-SCL'] }); continue }
    if (i === 5) { pins.push({ number: 'GP4', physicalPin: p++, functions: ['GPIO', 'UART-TX'] }); continue }
    if (i === 6) { pins.push({ number: 'GP5', physicalPin: p++, functions: ['GPIO', 'UART-RX'] }); continue }
    if (i === 7) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 8) { pins.push({ number: 'GP6', physicalPin: p++, functions: ['GPIO', 'SPI-SCK'] }); continue }
    if (i === 9) { pins.push({ number: 'GP7', physicalPin: p++, functions: ['GPIO', 'SPI-MOSI'] }); continue }
    if (i === 10) { pins.push({ number: 'GP8', physicalPin: p++, functions: ['GPIO', 'SPI-MISO'] }); continue }
    if (i === 11) { pins.push({ number: 'GP9', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 12) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 13) { pins.push({ number: 'GP10', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 14) { pins.push({ number: 'GP11', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 15) { pins.push({ number: 'GP12', physicalPin: p++, functions: ['GPIO', 'PWM'] }); continue }
    if (i === 16) { pins.push({ number: 'GP13', physicalPin: p++, functions: ['GPIO', 'PWM'] }); continue }
    if (i === 17) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 18) { pins.push({ number: 'GP14', physicalPin: p++, functions: ['GPIO', 'PWM'] }); continue }
    if (i === 19) { pins.push({ number: 'GP15', physicalPin: p++, functions: ['GPIO', 'PWM'] }); continue }
    if (i === 20) { pins.push({ number: 'GP16', physicalPin: p++, functions: ['GPIO', 'PWM', 'SPI-MISO'] }); continue }
    if (i === 21) { pins.push({ number: 'GP17', physicalPin: p++, functions: ['GPIO', 'PWM', 'SPI-SCK'] }); continue }
    if (i === 22) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 23) { pins.push({ number: 'GP18', physicalPin: p++, functions: ['GPIO', 'PWM'] }); continue }
    if (i === 24) { pins.push({ number: 'GP19', physicalPin: p++, functions: ['GPIO', 'PWM', 'SPI-MOSI'] }); continue }
    if (i === 25) { pins.push({ number: 'GP20', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 26) { pins.push({ number: 'GP21', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 27) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 28) { pins.push({ number: 'GP22', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 29) { pins.push({ number: 'RUN', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 30) { pins.push({ number: 'GP26', physicalPin: p++, functions: ['GPIO', 'ADC'] }); continue }
    if (i === 31) { pins.push({ number: 'GP27', physicalPin: p++, functions: ['GPIO', 'ADC'] }); continue }
    if (i === 32) { pins.push({ number: 'GP28', physicalPin: p++, functions: ['GPIO', 'ADC'] }); continue }
    if (i === 33) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 34) { pins.push({ number: 'ADC_VREF', physicalPin: p++, functions: ['VCC'], voltage: '3.3V' }); continue }
    if (i === 35) { pins.push({ number: '3V3', physicalPin: p++, functions: ['VCC'], voltage: '3.3V' }); continue }
    if (i === 36) { pins.push({ number: '3V3_EN', physicalPin: p++, functions: ['GPIO'] }); continue }
    if (i === 37) { pins.push({ number: 'GND', physicalPin: p++, functions: ['GND'] }); continue }
    if (i === 38) { pins.push({ number: 'VSYS', physicalPin: p++, functions: ['VCC'], voltage: '5V' }); continue }
    if (i === 39) { pins.push({ number: 'VBUS', physicalPin: p++, functions: ['VCC'], voltage: '5V' }); continue }
  }
  return pins
}

export const MOCK_BOARDS: IBoardDef[] = [
  // ========== Espressif 系列 ==========
  {
    id: 'esp32-devkitc-v4',
    name: { zh: 'ESP32-DevKitC V4', en: 'ESP32-DevKitC V4' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-WROOM-32',
    flash: '4MB',
    sram: '520KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: true, gpio: 34, adc: 18, pwm: 16, i2c: 2, spi: 3, uart: 3 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 36),
  },
  {
    id: 'esp32-c3-devkitm-1',
    name: { zh: 'ESP32-C3-DevKitM-1', en: 'ESP32-C3-DevKitM-1' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-C3',
    flash: '4MB',
    sram: '400KB',
    clockSpeed: '160MHz',
    capabilities: { wifi: true, ble: true, gpio: 22, adc: 6, pwm: 6, i2c: 1, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 22),
  },
  {
    id: 'esp32-s3-devkitc-1',
    name: { zh: 'ESP32-S3-DevKitC-1', en: 'ESP32-S3-DevKitC-1' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-S3-WROOM-1',
    flash: '8MB',
    sram: '512KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: true, gpio: 45, adc: 20, pwm: 8, i2c: 2, spi: 3, uart: 3 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 48),
  },
  {
    id: 'esp32-s2-saola-1',
    name: { zh: 'ESP32-S2-Saola-1', en: 'ESP32-S2-Saola-1' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-S2',
    flash: '4MB',
    sram: '320KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: false, gpio: 43, adc: 20, pwm: 8, i2c: 2, spi: 3, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 46),
  },
  {
    id: 'esp8266-nodemcu-v3',
    name: { zh: 'ESP8266 NodeMCU V3', en: 'ESP8266 NodeMCU V3' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP8266',
    flash: '4MB',
    sram: '80KB',
    clockSpeed: '80/160MHz',
    capabilities: { wifi: true, ble: false, gpio: 17, adc: 1, pwm: 4, i2c: 1, spi: 1, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: [
      { number: '3V3', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'D0', physicalPin: 3, functions: ['GPIO'] },
      { number: 'D1', physicalPin: 4, functions: ['GPIO', 'I2C-SCL'] },
      { number: 'D2', physicalPin: 5, functions: ['GPIO', 'I2C-SDA'] },
      { number: 'D3', physicalPin: 6, functions: ['GPIO'] },
      { number: 'D4', physicalPin: 7, functions: ['GPIO', 'PWM'] },
      { number: 'D5', physicalPin: 8, functions: ['GPIO', 'PWM', 'SPI-SCK'] },
      { number: 'D6', physicalPin: 9, functions: ['GPIO', 'PWM', 'SPI-MISO'] },
      { number: 'D7', physicalPin: 10, functions: ['GPIO', 'PWM', 'SPI-MOSI'] },
      { number: 'D8', physicalPin: 11, functions: ['GPIO', 'PWM'] },
      { number: 'RX', physicalPin: 12, functions: ['GPIO', 'UART-RX'] },
      { number: 'TX', physicalPin: 13, functions: ['GPIO', 'UART-TX'] },
      { number: 'A0', physicalPin: 14, functions: ['GPIO', 'ADC'] },
      { number: '5V', physicalPin: 15, functions: ['VCC'], voltage: '5V' },
      { number: 'GND', physicalPin: 16, functions: ['GND'] },
      { number: 'Vin', physicalPin: 17, functions: ['VCC'], voltage: '5V' },
    ],
  },
  {
    id: 'esp32-c6-devkitc-1',
    name: { zh: 'ESP32-C6-DevKitC-1', en: 'ESP32-C6-DevKitC-1' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-C6',
    flash: '4MB',
    sram: '512KB',
    clockSpeed: '160MHz',
    capabilities: { wifi: true, ble: true, gpio: 30, adc: 7, pwm: 6, i2c: 2, spi: 2, uart: 3 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 30),
  },
  {
    id: 'esp32-h2',
    name: { zh: 'ESP32-H2 (BLE/Zigbee)', en: 'ESP32-H2 (BLE/Zigbee)' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-H2',
    flash: '4MB',
    sram: '256KB',
    clockSpeed: '96MHz',
    capabilities: { wifi: false, ble: true, gpio: 28, adc: 5, pwm: 5, i2c: 1, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 28),
  },
  {
    id: 'esp32-cam',
    name: { zh: 'ESP32-CAM', en: 'ESP32-CAM' },
    manufacturer: 'Espressif',
    series: 'espressif',
    mcu: 'ESP32-S',
    flash: '4MB',
    sram: '520KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: false, gpio: 10, adc: 10, pwm: 16, i2c: 2, spi: 3, uart: 2 },
    voltage: '5V',
    language: 'both',
    pins: [
      { number: '5V', physicalPin: 1, functions: ['VCC'], voltage: '5V' },
      { number: '3V3', physicalPin: 2, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 3, functions: ['GND'] },
      { number: 'GPIO0', physicalPin: 4, functions: ['GPIO'] },
      { number: 'GPIO1', physicalPin: 5, functions: ['GPIO', 'UART-TX'] },
      { number: 'GPIO2', physicalPin: 6, functions: ['GPIO'] },
      { number: 'GPIO3', physicalPin: 7, functions: ['GPIO', 'UART-RX'] },
      { number: 'GPIO4', physicalPin: 8, functions: ['GPIO', 'ADC'] },
      { number: 'GPIO5', physicalPin: 9, functions: ['GPIO'] },
      { number: 'GPIO12', physicalPin: 10, functions: ['GPIO', 'ADC'] },
      { number: 'GPIO13', physicalPin: 11, functions: ['GPIO', 'ADC'] },
      { number: 'GPIO14', physicalPin: 12, functions: ['GPIO', 'ADC'] },
      { number: 'GPIO15', physicalPin: 13, functions: ['GPIO', 'ADC'] },
      { number: 'GPIO16', physicalPin: 14, functions: ['GPIO'] },
    ],
  },

  // ========== Arduino 系列 ==========
  {
    id: 'arduino-uno-r3',
    name: { zh: 'Arduino Uno R3', en: 'Arduino Uno R3' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'ATmega328P',
    flash: '32KB',
    sram: '2KB',
    clockSpeed: '16MHz',
    capabilities: { wifi: false, ble: false, gpio: 14, adc: 6, pwm: 6, i2c: 1, spi: 1, uart: 1 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 6),
  },
  {
    id: 'arduino-uno-r4-minima',
    name: { zh: 'Arduino Uno R4 Minima', en: 'Arduino Uno R4 Minima' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'RA4M1',
    flash: '256KB',
    sram: '32KB',
    clockSpeed: '48MHz',
    capabilities: { wifi: false, ble: false, gpio: 14, adc: 6, pwm: 6, i2c: 1, spi: 1, uart: 1 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 6),
  },
  {
    id: 'arduino-uno-r4-wifi',
    name: { zh: 'Arduino Uno R4 WiFi', en: 'Arduino Uno R4 WiFi' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'RA4M1 + ESP32-S3',
    flash: '256KB',
    sram: '32KB',
    clockSpeed: '48MHz',
    capabilities: { wifi: true, ble: true, gpio: 14, adc: 6, pwm: 6, i2c: 1, spi: 1, uart: 1 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 6),
  },
  {
    id: 'arduino-nano',
    name: { zh: 'Arduino Nano', en: 'Arduino Nano' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'ATmega328P',
    flash: '32KB',
    sram: '2KB',
    clockSpeed: '16MHz',
    capabilities: { wifi: false, ble: false, gpio: 14, adc: 8, pwm: 6, i2c: 1, spi: 1, uart: 1 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 8),
  },
  {
    id: 'arduino-nano-every',
    name: { zh: 'Arduino Nano Every', en: 'Arduino Nano Every' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'ATmega4809',
    flash: '48KB',
    sram: '6KB',
    clockSpeed: '20MHz',
    capabilities: { wifi: false, ble: false, gpio: 14, adc: 8, pwm: 5, i2c: 1, spi: 1, uart: 4 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 8),
  },
  {
    id: 'arduino-nano-33-iot',
    name: { zh: 'Arduino Nano 33 IoT', en: 'Arduino Nano 33 IoT' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'SAMD21G18',
    flash: '256KB',
    sram: '32KB',
    clockSpeed: '48MHz',
    capabilities: { wifi: true, ble: true, gpio: 14, adc: 7, pwm: 12, i2c: 1, spi: 1, uart: 1 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genArduinoPins(14, 7),
  },
  {
    id: 'arduino-nano-rp2040-connect',
    name: { zh: 'Arduino Nano RP2040 Connect', en: 'Arduino Nano RP2040 Connect' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'RP2040 + NINA-W102',
    flash: '16MB',
    sram: '264KB',
    clockSpeed: '133MHz',
    capabilities: { wifi: true, ble: true, gpio: 20, adc: 4, pwm: 16, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: genPicoPins(true),
  },
  {
    id: 'arduino-mega-2560',
    name: { zh: 'Arduino Mega 2560', en: 'Arduino Mega 2560' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'ATmega2560',
    flash: '256KB',
    sram: '8KB',
    clockSpeed: '16MHz',
    capabilities: { wifi: false, ble: false, gpio: 54, adc: 16, pwm: 15, i2c: 1, spi: 1, uart: 4 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(54, 16),
  },
  {
    id: 'arduino-mkr-wifi-1010',
    name: { zh: 'Arduino MKR WiFi 1010', en: 'Arduino MKR WiFi 1010' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'SAMD21 + NINA-W102',
    flash: '256KB',
    sram: '32KB',
    clockSpeed: '48MHz',
    capabilities: { wifi: true, ble: true, gpio: 8, adc: 7, pwm: 12, i2c: 1, spi: 1, uart: 1 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: [
      { number: 'VCC', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'D0', physicalPin: 3, functions: ['GPIO', 'UART-RX'] },
      { number: 'D1', physicalPin: 4, functions: ['GPIO', 'UART-TX'] },
      { number: 'D2', physicalPin: 5, functions: ['GPIO', 'PWM'] },
      { number: 'D3', physicalPin: 6, functions: ['GPIO', 'PWM'] },
      { number: 'D4', physicalPin: 7, functions: ['GPIO', 'PWM'] },
      { number: 'D5', physicalPin: 8, functions: ['GPIO', 'PWM'] },
      { number: 'D6', physicalPin: 9, functions: ['GPIO', 'PWM'] },
      { number: 'D7', physicalPin: 10, functions: ['GPIO', 'PWM'] },
      { number: 'A0', physicalPin: 11, functions: ['GPIO', 'ADC'] },
      { number: 'A1', physicalPin: 12, functions: ['GPIO', 'ADC'] },
      { number: 'A2', physicalPin: 13, functions: ['GPIO', 'ADC'] },
      { number: 'A3', physicalPin: 14, functions: ['GPIO', 'ADC'] },
      { number: 'A4', physicalPin: 15, functions: ['GPIO', 'ADC', 'I2C-SDA'] },
      { number: 'A5', physicalPin: 16, functions: ['GPIO', 'ADC', 'I2C-SCL'] },
      { number: 'A6', physicalPin: 17, functions: ['GPIO', 'ADC'] },
      { number: '5V', physicalPin: 18, functions: ['VCC'], voltage: '5V' },
    ],
  },
  {
    id: 'arduino-mkr-nb-1500',
    name: { zh: 'Arduino MKR NB 1500 (NB-IoT)', en: 'Arduino MKR NB 1500 (NB-IoT)' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'SAMD21 + SARA-R410M',
    flash: '256KB',
    sram: '32KB',
    clockSpeed: '48MHz',
    capabilities: { wifi: false, ble: false, gpio: 8, adc: 7, pwm: 12, i2c: 1, spi: 1, uart: 2 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: [
      { number: 'VCC', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'D0', physicalPin: 3, functions: ['GPIO', 'UART-RX'] },
      { number: 'D1', physicalPin: 4, functions: ['GPIO', 'UART-TX'] },
      { number: 'D2', physicalPin: 5, functions: ['GPIO', 'PWM'] },
      { number: 'D3', physicalPin: 6, functions: ['GPIO', 'PWM'] },
      { number: 'D4', physicalPin: 7, functions: ['GPIO', 'PWM'] },
      { number: 'D5', physicalPin: 8, functions: ['GPIO', 'PWM'] },
      { number: 'A0', physicalPin: 9, functions: ['GPIO', 'ADC'] },
      { number: 'A1', physicalPin: 10, functions: ['GPIO', 'ADC'] },
      { number: 'A2', physicalPin: 11, functions: ['GPIO', 'ADC'] },
      { number: 'A3', physicalPin: 12, functions: ['GPIO', 'ADC'] },
      { number: 'A4', physicalPin: 13, functions: ['GPIO', 'ADC', 'I2C-SDA'] },
      { number: 'A5', physicalPin: 14, functions: ['GPIO', 'ADC', 'I2C-SCL'] },
      { number: 'A6', physicalPin: 15, functions: ['GPIO', 'ADC'] },
      { number: '5V', physicalPin: 16, functions: ['VCC'], voltage: '5V' },
    ],
  },
  {
    id: 'arduino-portenta-h7',
    name: { zh: 'Arduino Portenta H7', en: 'Arduino Portenta H7' },
    manufacturer: 'Arduino',
    series: 'arduino',
    mcu: 'STM32H747XI',
    flash: '2MB',
    sram: '1MB',
    clockSpeed: '480MHz',
    capabilities: { wifi: true, ble: true, gpio: 40, adc: 16, pwm: 12, i2c: 3, spi: 4, uart: 6 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('PG', 40),
  },

  // ========== Raspberry Pi 系列 ==========
  {
    id: 'raspberry-pico',
    name: { zh: 'Raspberry Pi Pico', en: 'Raspberry Pi Pico' },
    manufacturer: 'Raspberry Pi',
    series: 'raspberrypi',
    mcu: 'RP2040',
    flash: '2MB',
    sram: '264KB',
    clockSpeed: '133MHz',
    capabilities: { wifi: false, ble: false, gpio: 26, adc: 3, pwm: 16, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'micropython',
    pins: genPicoPins(false),
  },
  {
    id: 'raspberry-pico-w',
    name: { zh: 'Raspberry Pi Pico W', en: 'Raspberry Pi Pico W' },
    manufacturer: 'Raspberry Pi',
    series: 'raspberrypi',
    mcu: 'RP2040 + CYW43439',
    flash: '2MB',
    sram: '264KB',
    clockSpeed: '133MHz',
    capabilities: { wifi: true, ble: true, gpio: 26, adc: 3, pwm: 16, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'micropython',
    pins: genPicoPins(true),
  },
  {
    id: 'raspberry-pico-2',
    name: { zh: 'Raspberry Pi Pico 2', en: 'Raspberry Pi Pico 2' },
    manufacturer: 'Raspberry Pi',
    series: 'raspberrypi',
    mcu: 'RP2350',
    flash: '4MB',
    sram: '520KB',
    clockSpeed: '150MHz',
    capabilities: { wifi: false, ble: false, gpio: 26, adc: 4, pwm: 24, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'micropython',
    pins: genPicoPins(false),
  },
  {
    id: 'raspberry-pico-2-w',
    name: { zh: 'Raspberry Pi Pico 2 W', en: 'Raspberry Pi Pico 2 W' },
    manufacturer: 'Raspberry Pi',
    series: 'raspberrypi',
    mcu: 'RP2350 + CYW43439',
    flash: '4MB',
    sram: '520KB',
    clockSpeed: '150MHz',
    capabilities: { wifi: true, ble: true, gpio: 26, adc: 4, pwm: 24, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'micropython',
    pins: genPicoPins(true),
  },

  // ========== STM32 系列 ==========
  {
    id: 'stm32-f103c8t6-bluepill',
    name: { zh: 'STM32F103C8T6 Blue Pill', en: 'STM32F103C8T6 Blue Pill' },
    manufacturer: 'STMicroelectronics',
    series: 'stm32',
    mcu: 'STM32F103C8T6',
    flash: '64KB',
    sram: '20KB',
    clockSpeed: '72MHz',
    capabilities: { wifi: false, ble: false, gpio: 37, adc: 10, pwm: 10, i2c: 2, spi: 2, uart: 3 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: [
      { number: '3V3', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'PA0', physicalPin: 3, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'PA1', physicalPin: 4, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'PA2', physicalPin: 5, functions: ['GPIO', 'ADC', 'PWM', 'UART-TX'] },
      { number: 'PA3', physicalPin: 6, functions: ['GPIO', 'ADC', 'PWM', 'UART-RX'] },
      { number: 'PA4', physicalPin: 7, functions: ['GPIO', 'ADC', 'SPI-SCK'] },
      { number: 'PA5', physicalPin: 8, functions: ['GPIO', 'ADC', 'SPI-SCK'] },
      { number: 'PA6', physicalPin: 9, functions: ['GPIO', 'ADC', 'PWM', 'SPI-MISO'] },
      { number: 'PA7', physicalPin: 10, functions: ['GPIO', 'ADC', 'PWM', 'SPI-MOSI'] },
      { number: 'PA8', physicalPin: 11, functions: ['GPIO', 'PWM'] },
      { number: 'PA9', physicalPin: 12, functions: ['GPIO', 'PWM', 'UART-TX'] },
      { number: 'PA10', physicalPin: 13, functions: ['GPIO', 'PWM', 'UART-RX'] },
      { number: 'PA11', physicalPin: 14, functions: ['GPIO'] },
      { number: 'PA12', physicalPin: 15, functions: ['GPIO'] },
      { number: 'PA13', physicalPin: 16, functions: ['GPIO'] },
      { number: 'PA14', physicalPin: 17, functions: ['GPIO'] },
      { number: 'PA15', physicalPin: 18, functions: ['GPIO'] },
      { number: 'PB0', physicalPin: 19, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'PB1', physicalPin: 20, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'PB3', physicalPin: 21, functions: ['GPIO'] },
      { number: 'PB4', physicalPin: 22, functions: ['GPIO'] },
      { number: 'PB5', physicalPin: 23, functions: ['GPIO'] },
      { number: 'PB6', physicalPin: 24, functions: ['GPIO', 'I2C-SCL'] },
      { number: 'PB7', physicalPin: 25, functions: ['GPIO', 'I2C-SDA'] },
      { number: 'PB8', physicalPin: 26, functions: ['GPIO', 'PWM'] },
      { number: 'PB9', physicalPin: 27, functions: ['GPIO', 'PWM'] },
      { number: 'PB10', physicalPin: 28, functions: ['GPIO', 'UART-TX'] },
      { number: 'PB11', physicalPin: 29, functions: ['GPIO', 'UART-RX'] },
      { number: 'PB12', physicalPin: 30, functions: ['GPIO', 'SPI-SCK'] },
      { number: 'PB13', physicalPin: 31, functions: ['GPIO', 'SPI-SCK'] },
      { number: 'PB14', physicalPin: 32, functions: ['GPIO', 'SPI-MISO'] },
      { number: 'PB15', physicalPin: 33, functions: ['GPIO', 'SPI-MOSI'] },
      { number: '5V', physicalPin: 34, functions: ['VCC'], voltage: '5V' },
      { number: 'GND', physicalPin: 35, functions: ['GND'] },
      { number: '3.3V', physicalPin: 36, functions: ['VCC'], voltage: '3.3V' },
    ],
  },
  {
    id: 'stm32-f411-blackpill',
    name: { zh: 'STM32F411 Black Pill', en: 'STM32F411 Black Pill' },
    manufacturer: 'STMicroelectronics',
    series: 'stm32',
    mcu: 'STM32F411CEU6',
    flash: '512KB',
    sram: '128KB',
    clockSpeed: '100MHz',
    capabilities: { wifi: false, ble: false, gpio: 32, adc: 10, pwm: 12, i2c: 3, spi: 3, uart: 3 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genEsp32Pins('PB', 32),
  },
  {
    id: 'stm32-f407-discovery',
    name: { zh: 'STM32F407 Discovery', en: 'STM32F407 Discovery' },
    manufacturer: 'STMicroelectronics',
    series: 'stm32',
    mcu: 'STM32F407VGT6',
    flash: '1MB',
    sram: '192KB',
    clockSpeed: '168MHz',
    capabilities: { wifi: false, ble: false, gpio: 80, adc: 16, pwm: 12, i2c: 3, spi: 3, uart: 6 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genEsp32Pins('PD', 40),
  },
  {
    id: 'stm32-l476rg-nucleo',
    name: { zh: 'STM32L476RG Nucleo', en: 'STM32L476RG Nucleo' },
    manufacturer: 'STMicroelectronics',
    series: 'stm32',
    mcu: 'STM32L476RGT6',
    flash: '1MB',
    sram: '128KB',
    clockSpeed: '80MHz',
    capabilities: { wifi: false, ble: false, gpio: 51, adc: 16, pwm: 12, i2c: 3, spi: 3, uart: 5 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genArduinoPins(22, 6),
  },

  // ========== 其他 ==========
  {
    id: 'teensy-40',
    name: { zh: 'Teensy 4.0', en: 'Teensy 4.0' },
    manufacturer: 'PJRC',
    series: 'other',
    mcu: 'i.MX RT1062',
    flash: '2MB',
    sram: '1MB',
    clockSpeed: '600MHz',
    capabilities: { wifi: false, ble: false, gpio: 34, adc: 14, pwm: 12, i2c: 3, spi: 3, uart: 7 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genArduinoPins(24, 14),
  },
  {
    id: 'teensy-41',
    name: { zh: 'Teensy 4.1', en: 'Teensy 4.1' },
    manufacturer: 'PJRC',
    series: 'other',
    mcu: 'i.MX RT1062',
    flash: '8MB',
    sram: '1MB',
    clockSpeed: '600MHz',
    capabilities: { wifi: false, ble: false, gpio: 55, adc: 20, pwm: 20, i2c: 3, spi: 3, uart: 7 },
    voltage: '3.3V',
    language: 'arduino-cpp',
    pins: genArduinoPins(40, 20),
  },
  {
    id: 'microbit-v2',
    name: { zh: 'micro:bit V2', en: 'micro:bit V2' },
    manufacturer: 'BBC',
    series: 'other',
    mcu: 'nRF52833',
    flash: '512KB',
    sram: '128KB',
    clockSpeed: '64MHz',
    capabilities: { wifi: false, ble: true, gpio: 25, adc: 6, pwm: 6, i2c: 2, spi: 2, uart: 1 },
    voltage: '3.3V',
    language: 'micropython',
    pins: [
      { number: '3V3', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'P0', physicalPin: 3, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'P1', physicalPin: 4, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'P2', physicalPin: 5, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'P3', physicalPin: 6, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'P4', physicalPin: 7, functions: ['GPIO', 'ADC', 'PWM'] },
      { number: 'P5', physicalPin: 8, functions: ['GPIO'] },
      { number: 'P6', physicalPin: 9, functions: ['GPIO'] },
      { number: 'P7', physicalPin: 10, functions: ['GPIO'] },
      { number: 'P8', physicalPin: 11, functions: ['GPIO'] },
      { number: 'P9', physicalPin: 12, functions: ['GPIO'] },
      { number: 'P10', physicalPin: 13, functions: ['GPIO', 'ADC'] },
      { number: 'P11', physicalPin: 14, functions: ['GPIO'] },
      { number: 'P12', physicalPin: 15, functions: ['GPIO'] },
      { number: 'P13', physicalPin: 16, functions: ['GPIO', 'SPI-SCK'] },
      { number: 'P14', physicalPin: 17, functions: ['GPIO', 'SPI-MISO'] },
      { number: 'P15', physicalPin: 18, functions: ['GPIO', 'SPI-MOSI'] },
      { number: 'P16', physicalPin: 19, functions: ['GPIO'] },
      { number: 'P19', physicalPin: 20, functions: ['GPIO', 'I2C-SCL'] },
      { number: 'P20', physicalPin: 21, functions: ['GPIO', 'I2C-SDA'] },
      { number: '5V', physicalPin: 22, functions: ['VCC'], voltage: '5V' },
    ],
  },
  {
    id: 'm5stack-core2',
    name: { zh: 'M5Stack Core2', en: 'M5Stack Core2' },
    manufacturer: 'M5Stack',
    series: 'other',
    mcu: 'ESP32-D0WDQ6-V3',
    flash: '16MB',
    sram: '520KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: true, gpio: 28, adc: 18, pwm: 16, i2c: 2, spi: 3, uart: 3 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 30),
  },
  {
    id: 'm5stickc-plus',
    name: { zh: 'M5StickC Plus', en: 'M5StickC Plus' },
    manufacturer: 'M5Stack',
    series: 'other',
    mcu: 'ESP32-PICO-D4',
    flash: '4MB',
    sram: '520KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: true, gpio: 12, adc: 8, pwm: 16, i2c: 2, spi: 2, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: genEsp32Pins('GPIO', 14),
  },
  {
    id: 'seeed-xiao-esp32s3',
    name: { zh: 'Seeed XIAO ESP32S3', en: 'Seeed XIAO ESP32S3' },
    manufacturer: 'Seeed Studio',
    series: 'other',
    mcu: 'ESP32-S3R8',
    flash: '8MB',
    sram: '512KB',
    clockSpeed: '240MHz',
    capabilities: { wifi: true, ble: true, gpio: 11, adc: 7, pwm: 8, i2c: 1, spi: 1, uart: 2 },
    voltage: '3.3V',
    language: 'both',
    pins: [
      { number: '3V3', physicalPin: 1, functions: ['VCC'], voltage: '3.3V' },
      { number: 'GND', physicalPin: 2, functions: ['GND'] },
      { number: 'D0', physicalPin: 3, functions: ['GPIO', 'ADC'] },
      { number: 'D1', physicalPin: 4, functions: ['GPIO', 'ADC'] },
      { number: 'D2', physicalPin: 5, functions: ['GPIO', 'ADC'] },
      { number: 'D3', physicalPin: 6, functions: ['GPIO', 'ADC'] },
      { number: 'D4', physicalPin: 7, functions: ['GPIO', 'I2C-SDA'] },
      { number: 'D5', physicalPin: 8, functions: ['GPIO', 'I2C-SCL'] },
      { number: 'D6', physicalPin: 9, functions: ['GPIO', 'UART-TX'] },
      { number: 'D7', physicalPin: 10, functions: ['GPIO', 'UART-RX'] },
      { number: 'D8', physicalPin: 11, functions: ['GPIO', 'SPI-SCK'] },
      { number: 'D9', physicalPin: 12, functions: ['GPIO', 'SPI-MOSI'] },
      { number: 'D10', physicalPin: 13, functions: ['GPIO', 'SPI-MISO'] },
      { number: '5V', physicalPin: 14, functions: ['VCC'], voltage: '5V' },
    ],
  },
  {
    id: 'wio-terminal',
    name: { zh: 'Wio Terminal', en: 'Wio Terminal' },
    manufacturer: 'Seeed Studio',
    series: 'other',
    mcu: 'SAMD51P19A + RTL8720DN',
    flash: '512KB',
    sram: '192KB',
    clockSpeed: '120MHz',
    capabilities: { wifi: true, ble: true, gpio: 40, adc: 12, pwm: 12, i2c: 3, spi: 2, uart: 3 },
    voltage: '5V',
    language: 'arduino-cpp',
    pins: genArduinoPins(30, 12),
  },
]
