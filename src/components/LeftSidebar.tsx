import { useState, useMemo } from 'react';
import {
  Search,
  Thermometer,
  Lightbulb,
  Monitor,
  Radio,
  Cpu,
  Zap,
  Sun,
  RotateCw,
  Eye,
  Lock,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_COMPONENTS, type IComponentDef } from '@/data/components';
import { MOCK_BOARDS } from '@/data/boards';
import { cn } from '@/lib/utils';

const categoryConfig = [
  { id: 'sensor', labelKey: 'sidebar.category.sensor', icon: Thermometer },
  { id: 'actuator', labelKey: 'sidebar.category.actuator', icon: Zap },
  { id: 'display', labelKey: 'sidebar.category.display', icon: Monitor },
  { id: 'communication', labelKey: 'sidebar.category.communication', icon: Radio },
  { id: 'other', labelKey: 'sidebar.category.other', icon: Cpu },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  thermometer: Thermometer,
  lightbulb: Lightbulb,
  monitor: Monitor,
  zap: Zap,
  sun: Sun,
  'rotate-cw': RotateCw,
  cpu: Cpu,
};

function checkCompatibility(comp: IComponentDef, boardId: string): { compatible: boolean; reason?: string } {
  const board = MOCK_BOARDS.find((b) => b.id === boardId);
  if (!board) return { compatible: true };

  if (comp.protocol === 'i2c' && board.capabilities.i2c === 0) {
    return { compatible: false, reason: '不支持 I2C 协议' };
  }
  if (comp.protocol === 'spi' && board.capabilities.spi === 0) {
    return { compatible: false, reason: '不支持 SPI 协议' };
  }
  if (comp.protocol === 'uart' && board.capabilities.uart === 0) {
    return { compatible: false, reason: '不支持 UART 协议' };
  }
  if (comp.protocol === 'analog' && board.capabilities.adc === 0) {
    return { compatible: false, reason: '不支持 ADC 模拟输入' };
  }
  return { compatible: true };
}

export default function LeftSidebar() {
  const { t, lang } = useI18n();
  const { state, addComponent, selectComponent, currentBoard } = useProject();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('sensor');
  const [activeProtocol, setActiveProtocol] = useState<string>('all');
  const [componentsOpen, setComponentsOpen] = useState(true);

  const protocols = ['all', 'gpio', 'analog', 'i2c', 'spi', 'uart', 'onewire'];

  const filteredComponents = useMemo(() => {
    return MOCK_COMPONENTS.filter((c) => {
      if (c.category !== activeCategory) return false;
      if (activeProtocol !== 'all' && c.protocol !== activeProtocol) return false;
      if (search) {
        const name = lang === 'zh' ? c.name.zh : c.name.en;
        return name.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [activeCategory, activeProtocol, search, lang]);

  const [hvDialogOpen, setHvDialogOpen] = useState(false);
  const [hvPendingComp, setHvPendingComp] = useState<string | null>(null);
  const [hvConfirmed, setHvConfirmed] = useState(false);

  const handleAddComponent = (compId: string) => {
    const comp = MOCK_COMPONENTS.find((c) => c.id === compId);
    if (comp?.isHighVoltage) {
      setHvPendingComp(compId);
      setHvConfirmed(false);
      setHvDialogOpen(true);
    } else {
      addComponent(compId);
    }
  };

  const handleHvConfirm = () => {
    if (hvPendingComp && hvConfirmed) {
      addComponent(hvPendingComp);
      setHvDialogOpen(false);
      setHvPendingComp(null);
      setHvConfirmed(false);
    }
  };

  const handleHvCancel = () => {
    setHvDialogOpen(false);
    setHvPendingComp(null);
    setHvConfirmed(false);
  };

  return (
    <>
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/30">
      {/* 项目区 */}
      <Collapsible open={componentsOpen} onOpenChange={setComponentsOpen} className="border-b border-border">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-primary" />
              <span>{t('sidebar.projects')}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {state.projects.length}
              </Badge>
            </div>
            {componentsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-0.5 px-2 pb-2">
            {state.currentProject.components.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                暂无配件，从下方添加
              </div>
            ) : (
              state.currentProject.components.map((comp) => {
                const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
                const Icon = def ? iconMap[def.icon] ?? Cpu : Cpu;
                const isSelected = state.selectedComponentId === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => selectComponent(comp.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-primary/15 text-primary'
                        : 'text-foreground hover:bg-accent/50'
                    )}
                  >
                    <GripVertical className="size-3 text-muted-foreground opacity-50" />
                    <Icon className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{comp.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 配件库 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('sidebar.componentLib')}</h3>
            <Badge variant="outline" className="h-5 text-[10px]">
              {MOCK_COMPONENTS.length}
            </Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* 分类 Tab */}
         <div className="flex gap-0.5 px-2 pb-2">
           {categoryConfig.map((cat) => {
             const Icon = cat.icon;
             const isActive = activeCategory === cat.id;
             return (
               <TooltipProvider key={cat.id}>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <button
                       onClick={() => { setActiveCategory(cat.id); setActiveProtocol('all'); }}
                       className={cn(
                         'flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors',
                         isActive
                           ? 'bg-primary/15 text-primary'
                           : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                       )}
                     >
                       <Icon className="size-4" />
                     </button>
                   </TooltipTrigger>
                   <TooltipContent side="bottom">{t(cat.labelKey)}</TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             );
           })}
         </div>

         {/* 协议筛选 */}
         <div className="flex flex-wrap gap-1 px-2 pb-2">
           {protocols.map((p) => (
             <button
               key={p}
               onClick={() => setActiveProtocol(p)}
               className={cn(
                 'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                 activeProtocol === p
                   ? 'bg-primary/15 text-primary'
                   : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
               )}
             >
               {p === 'all' ? t('common.all') : p.toUpperCase()}
             </button>
           ))}
         </div>

        {/* 配件列表 */}
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {filteredComponents.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-muted-foreground">
              未找到匹配的配件
            </div>
          ) : (
            filteredComponents.map((comp) => {
              const Icon = iconMap[comp.icon] ?? Cpu;
              const { compatible, reason } = checkCompatibility(comp, state.currentProject.board.boardId);
              return (
                <div
                  key={comp.id}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-lg border p-2.5 transition-all',
                    compatible
                      ? 'border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer'
                      : 'border-border/50 bg-muted/30 opacity-60 cursor-not-allowed'
                  )}
                  onClick={() => compatible && handleAddComponent(comp.id)}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-md',
                      compatible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">
                      {lang === 'zh' ? comp.name.zh : comp.name.en}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
                        {comp.protocol.toUpperCase()}
                      </Badge>
                      {comp.isHighVoltage && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px] font-normal">
                          ⚡ HV
                        </Badge>
                      )}
                    </div>
                  </div>
                  {compatible ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddComponent(comp.id);
                      }}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="size-3" />
                      <span className="hidden sm:inline">不兼容</span>
                    </div>
                  )}
                  {!compatible && reason && (
                    <div className="pointer-events-none absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-popover p-2 text-[10px] text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {t('sidebar.incompatible')}：{reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>

    {/* 强电配件安全确认对话框 */}
    <Dialog open={hvDialogOpen} onOpenChange={setHvDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" />
            {t('safety.highVoltage')}
          </DialogTitle>
          <DialogDescription>
            <p className="text-foreground">{t('safety.relayWarn')}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• {lang === 'zh' ? '请确保在断电状态下接线' : 'Ensure power is off when wiring'}</li>
              <li>• {lang === 'zh' ? '高压危险，请注意绝缘防护' : 'High voltage danger, use insulation protection'}</li>
              <li>• {lang === 'zh' ? '错误接线可能导致设备损坏或人身伤害' : 'Incorrect wiring may cause damage or injury'}</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
          <Checkbox
            id="hv-confirm"
            checked={hvConfirmed}
            onCheckedChange={(v) => setHvConfirmed(!!v)}
          />
          <label htmlFor="hv-confirm" className="text-sm cursor-pointer">
            {lang === 'zh'
              ? '我已了解风险并确认安全操作规范'
              : 'I understand the risks and confirm safe operation'}
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleHvCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleHvConfirm}
            disabled={!hvConfirmed}
          >
            {lang === 'zh' ? '确认添加' : 'Confirm Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
