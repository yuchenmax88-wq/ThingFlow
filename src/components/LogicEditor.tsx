import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Thermometer, Cog, GitBranch, Repeat, Clock, Terminal,
  Wifi, Bluetooth, MessageSquare, Code2, Plus, Trash2,
  GripVertical, ChevronDown, Play, Layers, X, Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_COMPONENTS } from '@/data/components';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

let idCounter = 0;
function genId(prefix = 'blk') { idCounter += 1; return `${prefix}_${Date.now()}_${idCounter}`; }

interface BlockDef {
  type: string;
  label: { zh: string; en: string };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isContainer: boolean;
}

const BLOCK_TYPES: BlockDef[] = [
  { type: 'read_sensor', label: { zh: '读取传感器', en: 'Read Sensor' }, icon: Thermometer, color: 'bg-emerald-500', isContainer: false },
  { type: 'condition', label: { zh: '条件判断', en: 'Condition' }, icon: GitBranch, color: 'bg-purple-500', isContainer: true },
  { type: 'loop', label: { zh: '循环', en: 'Loop' }, icon: Repeat, color: 'bg-sky-500', isContainer: true },
  { type: 'delay', label: { zh: '延时', en: 'Delay' }, icon: Clock, color: 'bg-amber-500', isContainer: false },
  { type: 'control_actuator', label: { zh: '控制执行器', en: 'Control Actuator' }, icon: Cog, color: 'bg-rose-500', isContainer: false },
  { type: 'serial_output', label: { zh: '串口输出', en: 'Serial Output' }, icon: Terminal, color: 'bg-teal-500', isContainer: false },
  { type: 'wifi_connect', label: { zh: 'WiFi 连接', en: 'WiFi Connect' }, icon: Wifi, color: 'bg-cyan-500', isContainer: false },
  { type: 'ble_send', label: { zh: '蓝牙发送', en: 'BLE Send' }, icon: Bluetooth, color: 'bg-blue-500', isContainer: false },
  { type: 'comment', label: { zh: '注释', en: 'Comment' }, icon: MessageSquare, color: 'bg-muted-foreground', isContainer: false },
  { type: 'custom_code', label: { zh: '自定义代码', en: 'Custom Code' }, icon: Code2, color: 'bg-indigo-500', isContainer: false },
];

interface LogicBlock {
  id: string;
  type: string;
  config: Record<string, unknown>;
  triggerComponentId?: string;
  children: LogicBlock[];
}

const OPERATORS = [
  { v: '>', l: '大于 >' }, { v: '<', l: '小于 <' }, { v: '>=', l: '大于等于 >=' },
  { v: '<=', l: '小于等于 <=' }, { v: '==', l: '等于 ==' }, { v: '!=', l: '不等于 !=' },
];

function BlockEditor() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useProject();

  const storageKey = `__tf_blocks_${state.currentProject.id}`;

  const [showPalette, setShowPalette] = useState(true);
  const [paletteCategory, setPaletteCategory] = useState('all');

  const [blocks, setBlocksState] = useState<LogicBlock[]>(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(blocks)); } catch { /* ignore */ }
  }, [blocks, storageKey]);

  const setBlocks = useCallback((b: LogicBlock[] | ((prev: LogicBlock[]) => LogicBlock[])) => {
    setBlocksState(b);
    dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any);
  }, [dispatch]);

  const sensorComponents = state.currentProject.components.filter((c) => {
    const def = MOCK_COMPONENTS.find((m) => m.id === c.componentId);
    return def?.category === 'sensor';
  });
  const actuatorComponents = state.currentProject.components.filter((c) => {
    const def = MOCK_COMPONENTS.find((m) => m.id === c.componentId);
    return def?.category === 'actuator';
  });

  const categories = [
    { id: 'all', label: { zh: '全部', en: 'All' } },
    { id: 'sensor', label: { zh: '传感器', en: 'Sensor' } },
    { id: 'actuator', label: { zh: '执行器', en: 'Actuator' } },
    { id: 'flow', label: { zh: '流程', en: 'Flow' } },
    { id: 'wireless', label: { zh: '无线', en: 'Wireless' } },
  ];

  const filteredBlocks = useMemo(() => {
    if (paletteCategory === 'all') return BLOCK_TYPES;
    const map: Record<string, string[]> = {
      sensor: ['read_sensor'],
      actuator: ['control_actuator'],
      flow: ['condition', 'loop', 'delay'],
      wireless: ['wifi_connect', 'ble_send'],
    };
    return BLOCK_TYPES.filter((b) => map[paletteCategory]?.includes(b.type));
  }, [paletteCategory]);

  const addBlock = (type: string) => {
    const def = BLOCK_TYPES.find((b) => b.type === type);
    if (!def) return;
    const newBlock: LogicBlock = {
      id: genId(),
      type,
      config: {},
      children: [],
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any);
    toast.success(`${lang === 'zh' ? '已添加' : 'Added'}: ${lang === 'zh' ? def.label.zh : def.label.en}`);
  };

  const deleteBlock = (id: string) => {
    const remove = (list: LogicBlock[]): LogicBlock[] =>
      list.filter((b) => b.id !== id).map((b) => ({ ...b, children: remove(b.children) }));
    setBlocks(remove(blocks));
    dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any);
  };

  const updateBlock = (id: string, updates: Partial<LogicBlock>) => {
    const update = (list: LogicBlock[]): LogicBlock[] =>
      list.map((b) => b.id === id ? { ...b, ...updates } : { ...b, children: update(b.children) });
    setBlocks(update(blocks));
    dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any);
  };

  const addChildBlock = (parentId: string, childType: string) => {
    const def = BLOCK_TYPES.find((b) => b.type === childType);
    if (!def) return;
    const child: LogicBlock = { id: genId(), type: childType, config: {}, children: [] };
    const add = (list: LogicBlock[]): LogicBlock[] =>
      list.map((b) => b.id === parentId ? { ...b, children: [...b.children, child] } : { ...b, children: add(b.children) });
    setBlocks(add(blocks));
    dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any);
  };

  const renderBlock = (block: LogicBlock, depth: number): React.ReactNode => {
    const def = BLOCK_TYPES.find((b) => b.type === block.type);
    if (!def) return null;
    const Icon = def.icon;
    const [expanded, setExpanded] = useState(true);

    return (
      <div key={block.id} className={depth > 0 ? 'ml-6' : ''}>
        <motion.div
          layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-md border border-border bg-card/60 overflow-hidden mb-1.5', def.isContainer && 'shadow-sm border-l-[3px]', def.isContainer ? 'border-l-purple-500/60' : 'border-l-transparent')}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
            <div className={cn('size-6 rounded flex items-center justify-center shrink-0', def.color, 'text-white')}>
              <Icon className="size-3.5" />
            </div>
            <span className="text-xs font-medium truncate flex-1">{lang === 'zh' ? def.label.zh : def.label.en}</span>

            {block.triggerComponentId && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                {(() => { const c = state.currentProject.components.find((x) => x.id === block.triggerComponentId); return c?.name ?? '?'; })()}
              </Badge>
            )}

            {def.isContainer && block.children.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">{block.children.length}</Badge>
            )}

            <Button variant="ghost" size="icon" className="size-5 shrink-0" onClick={() => setExpanded(!expanded)}>
              <ChevronDown className={cn('size-3 transition-transform', !expanded && '-rotate-90')} />
            </Button>
            <Button variant="ghost" size="icon" className="size-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteBlock(block.id)}>
              <Trash2 className="size-3" />
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-3 pb-2 pt-1 space-y-2 border-t border-border/50">

                  {block.type === 'read_sensor' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '选择传感器' : 'Select Sensor'}</div>
                      <Select value={block.triggerComponentId || ''} onValueChange={(v) => updateBlock(block.id, { triggerComponentId: v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={lang === 'zh' ? '选择传感器...' : 'Select sensor...'} /></SelectTrigger>
                        <SelectContent>
                          {sensorComponents.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                          {sensorComponents.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground text-center">{lang === 'zh' ? '请先在配件库添加传感器' : 'Add a sensor first'}</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {block.type === 'control_actuator' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '选择执行器' : 'Select Actuator'}</div>
                      <Select value={block.triggerComponentId || ''} onValueChange={(v) => updateBlock(block.id, { triggerComponentId: v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={lang === 'zh' ? '选择执行器...' : 'Select actuator...'} /></SelectTrigger>
                        <SelectContent>
                          {actuatorComponents.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                          {actuatorComponents.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground text-center">{lang === 'zh' ? '请先在配件库添加执行器' : 'Add an actuator first'}</div>}
                        </SelectContent>
                      </Select>
                      <div className="text-[10px] text-muted-foreground mt-1">{lang === 'zh' ? '动作' : 'Action'}</div>
                      <Select value={(block.config.action as string) || 'on'} onValueChange={(v) => updateBlock(block.id, { config: { ...block.config, action: v } })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on" className="text-xs">{lang === 'zh' ? '开启' : 'On'}</SelectItem>
                          <SelectItem value="off" className="text-xs">{lang === 'zh' ? '关闭' : 'Off'}</SelectItem>
                          <SelectItem value="toggle" className="text-xs">{lang === 'zh' ? '切换' : 'Toggle'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {block.type === 'condition' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '触发条件' : 'Condition'}</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Select value={(block.config.field as string) || 'temperature'} onValueChange={(v) => updateBlock(block.id, { config: { ...block.config, field: v } })}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="temperature" className="text-[10px]">{lang === 'zh' ? '温度' : 'Temp'}</SelectItem>
                            <SelectItem value="humidity" className="text-[10px]">{lang === 'zh' ? '湿度' : 'Humidity'}</SelectItem>
                            <SelectItem value="light" className="text-[10px]">{lang === 'zh' ? '光照' : 'Light'}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={(block.config.operator as string) || '>'} onValueChange={(v) => updateBlock(block.id, { config: { ...block.config, operator: v } })}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((o) => <SelectItem key={o.v} value={o.v} className="text-[10px]">{o.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input size={1} type="number" className="h-7 text-xs" placeholder="0" value={(block.config.threshold as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, threshold: e.target.value } })} />
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={() => addChildBlock(block.id, 'read_sensor')}>+ {lang === 'zh' ? '是分支' : 'Then'}</Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={() => {
                          const newBlocks = blocks.map((b) => {
                            if (b.id === block.id) {
                              return { ...b, children: [...b.children, { id: genId(), type: 'comment', config: { text: lang === 'zh' ? '否则分支' : 'Else' }, children: [] }] };
                            }
                            return b;
                          });
                          setBlocks(newBlocks);
                        }}>+ {lang === 'zh' ? '否分支' : 'Else'}</Button>
                      </div>
                    </div>
                  )}

                  {block.type === 'loop' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '循环次数' : 'Loop Count'}</div>
                      <Input size={1} type="number" className="h-7 text-xs" placeholder="5" min={1} value={(block.config.count as number) ?? 5} onChange={(e) => updateBlock(block.id, { config: { ...block.config, count: Math.max(1, parseInt(e.target.value) || 1) } })} />
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {[1, 3, 5, 10].map((n) => (
                          <Badge key={n} variant="outline" className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-accent" onClick={() => updateBlock(block.id, { config: { ...block.config, count: n } })}>{n}x</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {block.type === 'delay' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '延时(毫秒)' : 'Delay(ms)'}</div>
                      <Input size={1} type="number" className="h-7 text-xs" placeholder="1000" min={0} value={(block.config.ms as number) ?? 1000} onChange={(e) => updateBlock(block.id, { config: { ...block.config, ms: Math.max(0, parseInt(e.target.value) || 0) } })} />
                      <div className="flex gap-1 flex-wrap">
                        {[100, 500, 1000, 2000].map((ms) => (
                          <Badge key={ms} variant="outline" className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-accent" onClick={() => updateBlock(block.id, { config: { ...block.config, ms } })}>{ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {block.type === 'serial_output' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '输出内容' : 'Output Text'}</div>
                      <Input size={1} className="h-7 text-xs" placeholder={lang === 'zh' ? 'Hello ThingFlow' : 'Hello ThingFlow'} value={(block.config.text as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, text: e.target.value } })} />
                    </div>
                  )}

                  {block.type === 'wifi_connect' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">SSID</div>
                      <Input size={1} className="h-7 text-xs" placeholder="WiFi名称" value={(block.config.ssid as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, ssid: e.target.value } })} />
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '密码' : 'Password'}</div>
                      <Input size={1} type="password" className="h-7 text-xs" placeholder="****" value={(block.config.password as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, password: '[HIDDEN]' } })} />
                    </div>
                  )}

                  {block.type === 'ble_send' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '设备名称' : 'Device Name'}</div>
                      <Input size={1} className="h-7 text-xs" placeholder="ThingFlow" value={(block.config.deviceName as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, deviceName: e.target.value } })} />
                    </div>
                  )}

                  {block.type === 'comment' && (
                    <div className="space-y-1">
                      <Input size={1} className="h-7 text-xs" placeholder={lang === 'zh' ? '备注说明...' : 'Comment...'} value={(block.config.text as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, text: e.target.value } })} />
                    </div>
                  )}

                  {block.type === 'custom_code' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">{lang === 'zh' ? '自定义代码' : 'Custom Code'}</div>
                      <textarea className="w-full h-20 rounded border border-border bg-background p-2 text-xs font-mono resize-none" placeholder={lang === 'zh' ? '// 输入代码...' : '// Enter code...'} value={(block.config.code as string) || ''} onChange={(e) => updateBlock(block.id, { config: { ...block.config, code: e.target.value } })} />
                    </div>
                  )}

                  {def.isContainer && (
                    <div className="pt-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => {
                        (block.children as LogicBlock[]).push({ id: genId(), type: 'comment', config: { text: '' }, children: [] });
                        updateBlock(block.id, { children: [...(block.children as LogicBlock[])] });
                      }}>+ {lang === 'zh' ? '添加子块' : 'Add Child Block'}</Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 子块 */}
          {block.children.map((child) => renderBlock(child, depth + 1))}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      {/* 块类型面板 */}
      {showPalette && (
        <div className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-card/50">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="text-xs font-medium">{lang === 'zh' ? '逻辑块' : 'Blocks'}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPalette(false)}><X className="size-3.5" /></Button>
          </div>
          <div className="flex gap-0.5 p-1.5 flex-wrap">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setPaletteCategory(cat.id)}
                className={cn('rounded px-2 py-1 text-[10px] transition-colors',
                  paletteCategory === cat.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/50')}>
                {lang === 'zh' ? cat.label.zh : cat.label.en}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredBlocks.map((b) => {
              const Icon = b.icon;
              return (
                <button key={b.type}
                  onClick={() => addBlock(b.type)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-accent">
                  <GripVertical className="size-3 text-muted-foreground" />
                  <div className={cn('size-5 rounded flex items-center justify-center text-white', b.color)}>
                    <Icon className="size-3" />
                  </div>
                  <span className="truncate">{lang === 'zh' ? b.label.zh : b.label.en}</span>
                  <Plus className="size-3 ml-auto text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 主编辑区 */}
      <div className="flex flex-1 flex-col">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
          {!showPalette && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg border border-border bg-card/80" onClick={() => setShowPalette(true)}>
              <Layers className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg border border-border bg-card/80" onClick={() => { setBlocks([]); dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' } as any); }}>
            <Wand2 className="size-4" />
          </Button>
          <div className="rounded-lg border border-border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground">{blocks.length} {lang === 'zh' ? '块' : 'blocks'}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-12">
          {blocks.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Layers className="mx-auto mb-3 size-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{lang === 'zh' ? '从左侧添加逻辑块开始' : 'Add blocks from the left'}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{lang === 'zh' ? '块从上到下按顺序执行' : 'Blocks execute top to bottom'}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              {blocks.map((b) => renderBlock(b, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockEditor;
