import { useState } from 'react';
import {
  Settings,
  Cpu,
  Pin,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Trash2,
  Edit3,
  X,
  ChevronRight,
  Zap,
  Thermometer,
  Lightbulb,
  Monitor,
  Radio,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_COMPONENTS, type IComponentPinDef } from '@/data/components';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RightPanel() {
  const { t, lang } = useI18n();
  const {
    state,
    dispatch,
    currentBoard,
    getComponentDef,
    getPinConflicts,
    setPinMapping,
    smartRecommendPins,
    selectComponent,
    removeComponent,
    toggleDebugMode,
  } = useProject();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const selectedComponent = state.currentProject.components.find(
    (c) => c.id === state.selectedComponentId
  );
  const selectedComponentDef = selectedComponent
    ? getComponentDef(selectedComponent.componentId)
    : null;

  const conflicts = getPinConflicts();

  const handleStartRename = () => {
    if (!selectedComponent) return;
    setNameValue(selectedComponent.name);
    setEditingName(true);
  };

  const handleFinishRename = () => {
    if (selectedComponent && nameValue.trim()) {
      // 通过 dispatch 更新组件名称
      dispatch({ type: 'UPDATE_COMPONENT', id: selectedComponent.id, updates: { name: nameValue.trim() } });
    }
    setEditingName(false);
  };

  const handleRemove = () => {
    if (!selectedComponent) return;
    removeComponent(selectedComponent.id);
    toast.success(`已删除 ${selectedComponent.name}`);
  };

  const getPinStatus = (pinNumber: string) => {
    const conflict = conflicts.find((c) => c.pin === pinNumber);
    if (conflict) return { status: 'conflict', owner: conflict.components.join(', ') };

    for (const comp of state.currentProject.components) {
      for (const [, pinVal] of Object.entries(comp.pinMapping)) {
        if (pinVal === pinNumber) {
          return { status: 'occupied', owner: comp.name, compId: comp.id };
        }
      }
    }
    return { status: 'free' };
  };

  const getPinColor = (pin: { functions: string[]; voltage?: string }) => {
    if (pin.functions.includes('VCC')) return 'bg-red-500';
    if (pin.functions.includes('GND')) return 'bg-gray-800 dark:bg-gray-600';
    if (pin.functions.includes('ADC')) return 'bg-orange-500';
    if (pin.functions.includes('I2C-SDA') || pin.functions.includes('I2C-SCL')) return 'bg-blue-500';
    if (pin.functions.includes('SPI-MOSI') || pin.functions.includes('SPI-MISO') || pin.functions.includes('SPI-SCK')) return 'bg-purple-500';
    if (pin.functions.includes('UART-TX') || pin.functions.includes('UART-RX')) return 'bg-green-500';
    return 'bg-muted-foreground';
  };

  const getWireColor = (pinType: string) => {
    if (pinType === 'power') return '#ef4444'; // 红色 - 电源
    if (pinType === 'ground') return '#374151'; // 黑色 - 地线
    return '#eab308'; // 黄色 - 信号
  };

  const getAvailablePins = (pinDef: IComponentPinDef) => {
    if (!currentBoard) return [];
    const used = new Set<string>();
    state.currentProject.components.forEach((comp) => {
      if (comp.id === selectedComponent?.id) return;
      Object.values(comp.pinMapping).forEach((p) => used.add(p));
    });

    return currentBoard.pins.filter((pin) => {
      if (pinDef.type === 'power') {
        return pin.functions.includes('VCC');
      }
      if (pinDef.type === 'ground') {
        return pin.functions.includes('GND');
      }
      // 信号引脚
      if (pinDef.signalType === 'i2c-sda') return pin.functions.includes('I2C-SDA');
      if (pinDef.signalType === 'i2c-scl') return pin.functions.includes('I2C-SCL');
      if (pinDef.signalType === 'analog') return pin.functions.includes('ADC');
      if (pinDef.signalType === 'spi') return pin.functions.some((f) => f.startsWith('SPI-'));
      if (pinDef.signalType === 'uart-tx') return pin.functions.includes('UART-TX');
      if (pinDef.signalType === 'uart-rx') return pin.functions.includes('UART-RX');
      return pin.functions.includes('GPIO') && !pin.functions.includes('VCC') && !pin.functions.includes('GND');
    });
  };

  const checkPinWarning = (pinDef: IComponentPinDef, pinValue: string) => {
    if (!currentBoard || !pinValue) return null;
    const boardPin = currentBoard.pins.find((p) => p.number === pinValue);
    if (!boardPin) return null;

    const warnings: { type: 'error' | 'warning'; message: string }[] = [];

    // 电压检查
    if (pinDef.type === 'power' && selectedComponentDef) {
      const compVoltage = selectedComponentDef.voltage;
      if (compVoltage !== 'both' && boardPin.voltage && boardPin.voltage !== compVoltage) {
        warnings.push({ type: 'error', message: t('props.voltageMismatch') });
      }
    }

    // 功能类型检查
    if (pinDef.type === 'signal' && pinDef.signalType) {
      const funcMap: Record<string, string> = {
        'digital': 'GPIO',
        'analog': 'ADC',
        'i2c-sda': 'I2C-SDA',
        'i2c-scl': 'I2C-SCL',
        'spi': 'SPI-',
        'uart-tx': 'UART-TX',
        'uart-rx': 'UART-RX',
      };
      const expected = funcMap[pinDef.signalType];
      if (expected && !boardPin.functions.some((f) => f.startsWith(expected))) {
        warnings.push({ type: 'warning', message: t('props.functionMismatch') });
      }
    }

    // 引脚冲突检查
    const conflict = conflicts.find((c) => c.pin === pinValue);
    if (conflict && conflict.components.length > 1) {
      warnings.push({ type: 'error', message: `${t('props.pinConflict')}: ${conflict.components.join(', ')}` });
    }

    return warnings.length > 0 ? warnings : null;
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card/30">
      {/* 标题 */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Settings className="size-4 text-primary" />
          <h3 className="text-sm font-medium">{t('props.title')}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 选中配件时显示配件属性 */}
        {selectedComponent && selectedComponentDef ? (
          <div className="space-y-4 p-3">
            {/* 配件头部 */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {selectedComponentDef.icon === 'thermometer' && <Thermometer className="size-5" />}
                    {selectedComponentDef.icon === 'lightbulb' && <Lightbulb className="size-5" />}
                    {selectedComponentDef.icon === 'monitor' && <Monitor className="size-5" />}
                    {selectedComponentDef.icon === 'zap' && <Zap className="size-5" />}
                    {selectedComponentDef.icon === 'sun' && <Sun className="size-5" />}
                    {!['thermometer', 'lightbulb', 'monitor', 'zap', 'sun'].includes(selectedComponentDef.icon) && <Cpu className="size-5" />}
                  </div>
                  <div>
                    {editingName ? (
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm font-medium">{selectedComponent.name}</div>
                    )}
                   <div className="mt-0.5 text-xs text-muted-foreground truncate">
                     {lang === 'zh' ? selectedComponentDef.name.zh : selectedComponentDef.name.en}
                   </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleStartRename}
                  >
                    <Edit3 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={handleRemove}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {selectedComponentDef.needsExtraComponents && (
                <div className="mt-2.5 flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-[11px] text-warning-foreground">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" />
                  <span>{lang === 'zh' ? selectedComponentDef.needsExtraComponents.zh : selectedComponentDef.needsExtraComponents.en}</span>
                </div>
              )}

              {selectedComponentDef.isHighVoltage && (
                <div className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>{t('safety.relayWarn')}</span>
                </div>
              )}
            </div>

            {/* 引脚分配 */}
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Pin className="size-3.5 text-primary" />
                  <span className="text-xs font-medium">{t('props.pinAssignment')}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => smartRecommendPins(selectedComponent.id)}
                >
                  <Wand2 className="mr-1 size-3" />
                  {t('props.smartRecommend')}
                </Button>
              </div>
              <div className="space-y-2 p-3">
                {selectedComponentDef.pins.map((pinDef) => {
                  const currentValue = selectedComponent.pinMapping[pinDef.name] ?? '';
                  const warnings = checkPinWarning(pinDef, currentValue);
                  const availablePins = getAvailablePins(pinDef);
                  const hasError = warnings?.some((w) => w.type === 'error');

                  return (
                    <div key={pinDef.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: getWireColor(pinDef.type) }}
                          />
                          <span className="text-xs font-medium">{pinDef.name}</span>
                          {pinDef.required && <span className="text-[10px] text-destructive">*</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {pinDef.type === 'power' && '电源'}
                          {pinDef.type === 'ground' && '地线'}
                          {pinDef.type === 'signal' && (pinDef.signalType || '信号')}
                        </span>
                      </div>
                      <Select
                        value={currentValue}
                        onValueChange={(val) => setPinMapping(selectedComponent.id, pinDef.name, val)}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-8 text-xs',
                            hasError && 'border-destructive focus:ring-destructive'
                          )}
                        >
                          <SelectValue placeholder="选择引脚" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 min-w-[200px]">
                          {availablePins.length === 0 ? (
                            <SelectItem value="none" disabled>无可用引脚</SelectItem>
                          ) : (
                            availablePins.map((pin) => {
                              const status = getPinStatus(pin.number);
                              return (
                                <SelectItem
                                  key={pin.number}
                                  value={pin.number}
                                  className="text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn('size-2 rounded-full', getPinColor(pin))} />
                                    <span className="font-mono">{pin.number}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {pin.functions.slice(0, 2).join('/')}
                                    </span>
                                    {status.status === 'occupied' && status.compId !== selectedComponent.id && (
                                      <Badge variant="secondary" className="ml-auto h-4 text-[9px]">
                                        占用
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      {warnings && warnings.length > 0 && (
                        <div className="space-y-0.5">
                          {warnings.map((w, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex items-center gap-1 text-[10px]',
                                w.type === 'error' ? 'text-destructive' : 'text-warning'
                              )}
                            >
                              {w.type === 'error' ? (
                                <AlertCircle className="size-3" />
                              ) : (
                                <AlertTriangle className="size-3" />
                              )}
                              {w.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 协议/库信息 */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-xs font-medium">协议与库</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {selectedComponentDef.protocol.toUpperCase()}
                </Badge>
                {selectedComponentDef.requiredLibs.map((lib) => (
                  <Badge key={lib} variant="secondary" className="text-[10px]">
                    {lib}
                  </Badge>
                ))}
                {selectedComponentDef.requiredLibs.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">无需额外库</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 未选中时显示项目信息 + 引脚占用表 */
          <div className="space-y-4 p-3">
            {/* 项目信息 */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                <span className="text-xs font-medium">{t('props.boardInfo')}</span>
              </div>
              {currentBoard && (
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold">
                    {lang === 'zh' ? currentBoard.name.zh : currentBoard.name.en}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{currentBoard.manufacturer}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">GPIO</span>
                      <span className="font-medium">{currentBoard.capabilities.gpio}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">ADC</span>
                      <span className="font-medium">{currentBoard.capabilities.adc}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">I2C</span>
                      <span className="font-medium">{currentBoard.capabilities.i2c}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">SPI</span>
                      <span className="font-medium">{currentBoard.capabilities.spi}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">电压</span>
                      <span className="font-medium">{currentBoard.voltage}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">WiFi</span>
                      <span className={cn('font-medium', currentBoard.capabilities.wifi ? 'text-success' : 'text-muted-foreground')}>
                        {currentBoard.capabilities.wifi ? '✓' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 调试模式开关 */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">{t('code.debugMode')}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {t('code.debugDesc')}
                  </div>
                </div>
                <Switch checked={state.debugMode} onCheckedChange={toggleDebugMode} />
              </div>
            </div>

            {/* 引脚占用表 */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Pin className="size-3.5 text-primary" />
                  <span className="text-xs font-medium">{t('props.pinUsageTable')}</span>
                  <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
                    {currentBoard?.pins.length ?? 0}
                  </Badge>
                </div>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[220px] text-[11px]">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{t('props.pinNumber')}</th>
                      <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{t('props.pinFunction')}</th>
                      <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{t('props.pinStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBoard?.pins.map((pin) => {
                      const status = getPinStatus(pin.number);
                      const conflict = conflicts.find((c) => c.pin === pin.number);
                      return (
                        <tr
                          key={pin.number}
                          className={cn(
                            'border-b border-border/50 transition-colors',
                            conflict && 'bg-destructive/10',
                            status.status === 'occupied' && !conflict && 'cursor-pointer hover:bg-accent/30'
                          )}
                          onClick={() => {
                            if (status.status === 'occupied' && status.compId) {
                              selectComponent(status.compId);
                            }
                          }}
                        >
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('size-2 rounded-full', getPinColor(pin))} />
                              <span className="font-mono">{pin.number}</span>
                            </div>
                          </td>
                          <td className="max-w-[100px] truncate px-2 py-1 text-[10px] text-muted-foreground">
                            {pin.functions.slice(0, 2).join(' · ')}
                          </td>
                          <td className="px-2 py-1">
                            {conflict ? (
                              <div className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="size-3" />
                                <span className="text-[10px]">冲突</span>
                              </div>
                            ) : status.status === 'occupied' ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-primary">
                                      <CheckCircle2 className="size-3" />
                                      <span className="max-w-[80px] truncate text-[10px]">
                                        {status.owner}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    {status.owner}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {t('props.pinFree')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="size-3.5" />
                  <span className="text-xs font-medium">
                    {conflicts.length} 个引脚冲突
                  </span>
                </div>
                {conflicts.map((c) => (
                  <div key={c.pin} className="text-[10px] text-destructive/80">
                    • {c.pin}: {c.components.join(' / ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
