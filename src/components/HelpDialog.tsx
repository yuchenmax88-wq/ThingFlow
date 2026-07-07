import { useState } from 'react';
import { X, HelpCircle, BookOpen, AlertCircle, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const faqData = [
  {
    q: { zh: '如何开始第一个项目？', en: 'How to start my first project?' },
    a: { zh: '1. 点击顶部项目菜单 → 新建项目\n2. 选择你的开发板型号\n3. 从左侧配件库拖拽配件到画布\n4. 在右侧面板配置引脚\n5. 切换到逻辑编辑器搭建逻辑\n6. 点击生成代码 → 烧录', en: '1. Click project menu → New Project\n2. Select your board model\n3. Drag components from left panel\n4. Configure pins in right panel\n5. Switch to logic editor\n6. Generate code → Flash' },
  },
  {
    q: { zh: '为什么配件是灰色的？', en: 'Why are some components grayed out?' },
    a: { zh: '灰色表示该配件与当前选择的开发板不兼容。可能的原因：\n• 配件使用的协议（如 I2C/SPI）开发板不支持\n• 电压不匹配\n请在顶部切换到支持的开发板后再添加。', en: 'Gray means the component is incompatible with your current board. Possible reasons:\n• Protocol not supported (I2C/SPI etc.)\n• Voltage mismatch\nSwitch to a compatible board first.' },
  },
  {
    q: { zh: '引脚冲突是什么意思？', en: 'What does pin conflict mean?' },
    a: { zh: '当两个配件试图使用同一个物理引脚时，就会发生引脚冲突。系统会自动检测并用红色高亮显示。\n解决方法：\n• 手动修改其中一个配件的引脚分配\n• 点击「智能推荐引脚」按钮自动分配', en: 'Pin conflict occurs when two components try to use the same physical pin. The system auto-detects and highlights in red.\nSolutions:\n• Manually change pin assignment\n• Click "Smart Recommend" to auto-assign' },
  },
  {
    q: { zh: '如何导出接线图？', en: 'How to export wiring diagram?' },
    a: { zh: '切换到「接线图」视图 → 点击右上角「导出 PNG」按钮，接线图将下载为图片文件。', en: 'Switch to "Wiring Diagram" view → click "Export PNG" button in top-right corner.' },
  },
  {
    q: { zh: '支持哪些开发板？', en: 'Which boards are supported?' },
    a: { zh: '目前支持：\n• Espressif: ESP32 系列、ESP8266\n• Arduino: Uno、Nano、Mega 等\n• Raspberry Pi: Pico、Pico W\n• STM32: F103、F411\n• 其他: Teensy、micro:bit、M5Stack', en: 'Currently supported:\n• Espressif: ESP32 series, ESP8266\n• Arduino: Uno, Nano, Mega, etc.\n• Raspberry Pi: Pico, Pico W\n• STM32: F103, F411\n• Others: Teensy, micro:bit, M5Stack' },
  },
];

const troubleshootData = [
  {
    title: { zh: '烧录失败', en: 'Flash Failed' },
    items: [
      { zh: '检查 USB 线是否为数据线（非充电线）', en: 'Check if USB cable is data cable (not charging only)' },
      { zh: '确认开发板驱动已安装', en: 'Ensure board drivers are installed' },
      { zh: '尝试按住 BOOT 按钮再连接', en: 'Try holding BOOT button while connecting' },
      { zh: '检查串口是否被其他程序占用', en: 'Check if serial port is occupied by other programs' },
    ],
  },
  {
    title: { zh: '串口无数据', en: 'No Serial Data' },
    items: [
      { zh: '确认波特率设置正确', en: 'Verify baud rate setting' },
      { zh: '检查 TX/RX 是否接反', en: 'Check if TX/RX are reversed' },
      { zh: '确认代码中已初始化串口', en: 'Ensure serial is initialized in code' },
    ],
  },
  {
    title: { zh: '传感器读数异常', en: 'Sensor Readings Abnormal' },
    items: [
      { zh: '检查 VCC 和 GND 是否接反', en: 'Check if VCC/GND are reversed' },
      { zh: '确认电压匹配（3.3V/5V）', en: 'Verify voltage match (3.3V/5V)' },
      { zh: '检查 I2C 地址是否冲突', en: 'Check for I2C address conflicts' },
      { zh: '上拉电阻是否正确', en: 'Verify pull-up resistors' },
    ],
  },
];

export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<'faq' | 'troubleshoot' | 'getting-started'>('faq');
  const [search, setSearch] = useState('');

  const filteredFaqs = faqData.filter(
    (f) =>
      f.q[lang].toLowerCase().includes(search.toLowerCase()) ||
      f.a[lang].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            {t('help.title')}
          </SheetTitle>
          <SheetDescription>
            {lang === 'zh' ? '常见问题与故障排除指南' : 'FAQ and troubleshooting guide'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* 搜索 */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'zh' ? '搜索帮助内容...' : 'Search help...'}
              className="pl-9"
            />
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {[
              { id: 'faq', label: t('help.faq'), icon: BookOpen },
              { id: 'troubleshoot', label: t('help.troubleshoot'), icon: AlertCircle },
              { id: 'getting-started', label: t('help.gettingStarted'), icon: ChevronRight },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 内容区 */}
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {activeTab === 'faq' && (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {faq.q[lang]}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="whitespace-pre-line text-xs text-muted-foreground">
                        {faq.a[lang]}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {activeTab === 'troubleshoot' && (
              <div className="space-y-4">
                {troubleshootData.map((section, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="size-4 text-warning" />
                      {section.title[lang]}
                    </div>
                    <ul className="space-y-1.5">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                          {item[lang]}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'getting-started' && (
              <div className="space-y-3">
                {[
                  { step: 1, title: { zh: '选择开发板', en: 'Select Board' }, desc: { zh: '从顶部菜单选择你的开发板型号', en: 'Select your board from top menu' } },
                  { step: 2, title: { zh: '添加配件', en: 'Add Components' }, desc: { zh: '从左侧配件库拖拽配件到项目', en: 'Drag components from left library' } },
                  { step: 3, title: { zh: '配置引脚', en: 'Configure Pins' }, desc: { zh: '在右侧面板分配引脚或使用智能推荐', en: 'Assign pins in right panel or use smart recommend' } },
                  { step: 4, title: { zh: '搭建逻辑', en: 'Build Logic' }, desc: { zh: '在逻辑编辑器中用节点连接功能', en: 'Connect nodes in logic editor' } },
                  { step: 5, title: { zh: '生成代码', en: 'Generate Code' }, desc: { zh: '点击生成代码查看结果', en: 'Click generate code to see results' } },
                  { step: 6, title: { zh: '烧录运行', en: 'Flash & Run' }, desc: { zh: '连接设备并烧录固件', en: 'Connect device and flash firmware' } },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.title[lang]}</div>
                      <div className="text-xs text-muted-foreground">{item.desc[lang]}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
