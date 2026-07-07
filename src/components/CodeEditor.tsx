import { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Download, Play, Code2, Check, RefreshCw, Edit3, Eye } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MOCK_COMPONENTS } from '@/data/components';
import { MOCK_BOARDS } from '@/data/boards';
import { cn, copyToClipboard, downloadText } from '@/lib/utils';
import { toast } from 'sonner';

export default function CodeEditor() {
  const { t, lang } = useI18n();
  const { state, currentBoard, toggleDebugMode } = useProject();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const editorRef = useRef<any>(null);

  const isMicroPython =
    currentBoard?.language === 'micropython' || currentBoard?.language === 'both';
  const language = isMicroPython ? 'python' : 'cpp';
  const fileExt = isMicroPython ? 'py' : 'ino';

  // 生成代码
  const generatedCode = useMemo(() => {
    if (!currentBoard) return '';
    const components = state.currentProject.components;
    const nodes = state.currentProject.logicGraph.nodes;
    const hasWireless = nodes.some((n) => n.category === 'wireless');
    const hasWifi = nodes.some(
      (n) =>
        n.type.startsWith('wifi-') ||
        n.type.startsWith('http-') ||
        n.type.startsWith('mqtt-') ||
        n.type.startsWith('websocket-') ||
        n.type.startsWith('ntp-') ||
        n.type.startsWith('tcp-') ||
        n.type.startsWith('udp-') ||
        n.type.startsWith('cloud-') ||
        n.type === 'get-time'
    );
    const hasBle = nodes.some((n) => n.type.startsWith('ble-') || n.type === 'bt-spp');

    if (components.length === 0 && nodes.length === 0) {
      return isMicroPython
        ? `# ============================================
# ThingFlow 自动生成 MicroPython 代码
# 开发板: ${currentBoard.name.zh}
# 生成时间: ${new Date().toLocaleString()}
# ============================================

from machine import Pin
import time

print("Hello, ThingFlow!")
`
        : `// ============================================
// ThingFlow 自动生成 Arduino 代码
// 开发板: ${currentBoard.name.zh}
// 生成时间: ${new Date().toLocaleString()}
// ============================================

void setup() {
  Serial.begin(9600);
  Serial.println("Hello, ThingFlow!");
}

void loop() {
  delay(1000);
}
`;
    }

    if (isMicroPython) {
      let code = `# ============================================
# ThingFlow 自动生成 MicroPython 代码
# 开发板: ${currentBoard.name.zh}
# 生成时间: ${new Date().toLocaleString()}
# ============================================

# --- 库导入 ---
from machine import Pin, I2C, ADC, PWM
import time
`;

      // 导入库
      const libs = new Set<string>();
      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (def) {
          def.requiredLibs.forEach((lib) => libs.add(lib));
        }
      });
      if (hasWifi) {
        libs.add('network');
        if (nodes.some((n) => n.type.startsWith('http-'))) libs.add('urequests');
        if (nodes.some((n) => n.type.startsWith('mqtt-'))) libs.add('umqtt.simple');
        if (nodes.some((n) => n.type.startsWith('ntp-'))) libs.add('ntptime');
      }
      libs.forEach((lib) => {
        code += `import ${lib}\n`;
      });

      code += `
# --- 对象初始化 ---
`;

      components.forEach((comp, idx) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (!def) return;

        code += `\n# ${lang === 'zh' ? def.codeTemplate.init.zh : def.codeTemplate.init.en} (${comp.name})\n`;

        if (def.protocol === 'gpio' && def.category === 'actuator') {
          const pin = comp.pinMapping['VCC'] || comp.pinMapping['IN'] || 'GPIO2';
          code += `${comp.name.replace(/\s+/g, '_').toLowerCase()} = Pin(${JSON.stringify(pin)}, Pin.OUT)\n`;
        } else if (def.protocol === 'i2c') {
          const sda = comp.pinMapping['SDA'] || 'GPIO21';
          const scl = comp.pinMapping['SCL'] || 'GPIO22';
          code += `i2c${idx} = I2C(0, sda=Pin(${JSON.stringify(sda)}), scl=Pin(${JSON.stringify(scl)}))\n`;
          code += `${comp.name.replace(/\s+/g, '_').toLowerCase()} = ${def.requiredLibs[0] || 'sensor'}.${def.id.toUpperCase()}(i2c${idx})\n`;
        } else if (def.protocol === 'analog') {
          const pin = comp.pinMapping['OUT'] || comp.pinMapping['SIG'] || 'GPIO34';
          code += `${comp.name.replace(/\s+/g, '_').toLowerCase()} = ADC(Pin(${JSON.stringify(pin)}))\n`;
        } else {
          code += `# ${comp.name} 初始化\n`;
        }
      });

      // 主循环
      code += `
# --- 主循环 ---
while True:
    # ${lang === 'zh' ? '读取传感器数据' : 'Read sensor data'}
`;

      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (!def || def.category !== 'sensor') return;
        const varName = comp.name.replace(/\s+/g, '_').toLowerCase();
        if (def.codeTemplate.read) {
          code += `    # ${lang === 'zh' ? def.codeTemplate.read.zh : def.codeTemplate.read.en}\n`;
        }
        code += `    ${varName}_value = ${varName}.read()\n`;
        if (state.debugMode) {
          code += `    print(f"__TF_NODE:${comp.id}:{${varName}_value}")\n`;
        }
      });

      code += `
    # ${lang === 'zh' ? '延时' : 'Delay'}
    time.sleep(1)
`;

      return code;
    } else {
      // Arduino C++
      let code = `// ============================================
// ThingFlow 自动生成 Arduino 代码
// 开发板: ${currentBoard.name.zh}
// 生成时间: ${new Date().toLocaleString()}
// ============================================

// --- 库导入 ---
#include <Arduino.h>
`;

      const libs = new Set<string>();
      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (def) {
          def.requiredLibs.forEach((lib) => libs.add(`${lib}.h`));
        }
      });
      if (hasWifi) libs.add('WiFi.h');
      libs.forEach((lib) => {
        code += `#include <${lib}>\n`;
      });

      code += `
// --- 全局变量 ---
`;

      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (!def) return;
        const varName = comp.name.replace(/\s+/g, '_');
        if (def.protocol === 'gpio' && def.category === 'actuator') {
          const pin = comp.pinMapping['VCC'] || comp.pinMapping['IN'] || '2';
          code += `const int ${varName}_PIN = ${pin};\n`;
        }
      });

      code += `
// --- Setup 初始化 ---
void setup() {
    Serial.begin(115200);
`;

      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (!def) return;
        const varName = comp.name.replace(/\s+/g, '_');
        if (def.protocol === 'gpio' && def.category === 'actuator') {
          code += `    pinMode(${varName}_PIN, OUTPUT);\n`;
        }
      });

      code += `}

// --- Loop 主循环 ---
void loop() {
`;

      components.forEach((comp) => {
        const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
        if (!def || def.category !== 'sensor') return;
        const varName = comp.name.replace(/\s+/g, '_');
        code += `    // ${comp.name}\n`;
        if (def.protocol === 'analog') {
          const pin = comp.pinMapping['OUT'] || comp.pinMapping['SIG'] || 'A0';
          code += `    float ${varName}_value = analogRead(${pin}) * (3.3 / 4095.0);\n`;
        } else if (def.protocol === 'i2c') {
          const libName = def.requiredLibs[0] || 'Sensor';
          const objName = varName.toLowerCase();
          code += `    float ${varName}_value = ${objName}.read();\n`;
        } else if (def.protocol === 'onewire') {
          const pin = comp.pinMapping['DATA'] || comp.pinMapping['DQ'] || '2';
          code += `    float ${varName}_value = ${varName.toLowerCase()}.getTempCByIndex(0);\n`;
        } else if (def.protocol === 'gpio') {
          const pin = comp.pinMapping['OUT'] || comp.pinMapping['SIG'] || '2';
          code += `    int ${varName}_value = digitalRead(${pin});\n`;
        } else {
          code += `    float ${varName}_value = 0;\n`;
        }
        if (state.debugMode) {
          code += `    Serial.printf("__TF_NODE:${comp.id}:%f\\n", ${varName}_value);\n`;
        }
      });

      code += `
    delay(1000);
}
`;
      return code;
    }
  }, [currentBoard, state.currentProject.components, state.currentProject.logicGraph.nodes, state.debugMode, lang]);

  // 当生成代码变化时同步到编辑器值（仅在非编辑模式）
  useEffect(() => {
    if (!isEditable) {
      setCodeValue(generatedCode);
    }
  }, [generatedCode, isEditable]);

  const handleCopy = async () => {
    const code = codeValue || generatedCode;
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      toast.success(t('code.copySuccess'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const code = codeValue || generatedCode;
    downloadText(code, `${state.currentProject.name}.${fileExt}`, 'text/plain');
    toast.success(t('code.download'));
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Code2 className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {lang === 'zh' ? '代码编辑器' : 'Code Editor'}
          </span>
          <Badge variant="outline" className="h-5 text-[10px]">
            {isMicroPython ? 'MicroPython' : 'Arduino C++'}
          </Badge>
          <Badge variant="outline" className="h-5 text-[10px]">
            {state.currentProject.components.length}{' '}
            {lang === 'zh' ? '个配件' : 'components'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1">
            <span className="text-[11px] text-muted-foreground">
              {t('code.debugMode')}
            </span>
            <Switch
              checked={state.debugMode}
              onCheckedChange={toggleDebugMode}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsEditable(!isEditable)}
          >
            {isEditable ? (
              <>
                <Eye className="mr-1 size-3.5" />
                {lang === 'zh' ? '只读' : 'Read Only'}
              </>
            ) : (
              <>
                <Edit3 className="mr-1 size-3.5" />
                {lang === 'zh' ? '编辑' : 'Edit'}
              </>
            )}
          </Button>

          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1 size-3.5" />
            ) : (
              <Copy className="mr-1 size-3.5" />
            )}
            {copied ? t('common.success') : t('code.copy')}
          </Button>

          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownload}>
            <Download className="mr-1 size-3.5" />
            {t('code.download')}
          </Button>
        </div>
      </div>

      {/* 代码编辑器 */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={codeValue || generatedCode}
          theme={monacoTheme}
          onChange={(value) => setCodeValue(value ?? '')}
          onMount={handleEditorMount}
          options={{
            readOnly: !isEditable,
            minimap: { enabled: true },
            fontSize: 13,
            fontFamily: 'IBM Plex Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: isMicroPython ? 4 : 2,
            insertSpaces: true,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            fixedOverflowWidgets: true,
          } as any}
        />
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between border-t border-border bg-card/50 px-4 py-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {lang === 'zh' ? '行数' : 'Lines'}: {(codeValue || generatedCode).split('\n').length}
          </span>
          <span>
            {lang === 'zh' ? '字符数' : 'Chars'}: {(codeValue || generatedCode).length}
          </span>
        </div>
        <div>{isEditable ? (lang === 'zh' ? '编辑模式' : 'Edit Mode') : (lang === 'zh' ? '只读模式' : 'Read Only')}</div>
      </div>
    </div>
  );
}
