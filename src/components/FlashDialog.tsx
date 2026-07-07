import { useState, useEffect, useRef } from 'react';
import { Zap, Cpu, HardDrive, Eraser, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FlashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type FlashStage = 'confirm' | 'connecting' | 'erasing' | 'writing' | 'verifying' | 'complete' | 'failed';

export default function FlashDialog({ open, onOpenChange, onComplete }: FlashDialogProps) {
  const { t, lang } = useI18n();
  const { currentBoard, state } = useProject();
  const [stage, setStage] = useState<FlashStage>('confirm');
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理所有定时器和动画帧
  const clearAllTimers = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      setStage('confirm');
      setProgress(0);
      clearAllTimers();
    }
    return () => {
      clearAllTimers();
    };
  }, [open]);

  const startFlash = () => {
    setStage('connecting');
    setProgress(5);

    const stages: { stage: FlashStage; duration: number; start: number; end: number }[] = [
      { stage: 'connecting', duration: 800, start: 5, end: 15 },
      { stage: 'erasing', duration: 1200, start: 15, end: 35 },
      { stage: 'writing', duration: 2500, start: 35, end: 85 },
      { stage: 'verifying', duration: 1000, start: 85, end: 100 },
    ];

    let totalDelay = 0;
    stages.forEach((s, idx) => {
      timeoutRef.current = setTimeout(() => {
        setStage(s.stage);
        // 进度条动画
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const ratio = Math.min(elapsed / s.duration, 1);
          setProgress(s.start + (s.end - s.start) * ratio);
          if (ratio < 1) {
            rafRef.current = requestAnimationFrame(animate);
          }
        };
        rafRef.current = requestAnimationFrame(animate);

        if (idx === stages.length - 1) {
          timeoutRef.current = setTimeout(() => {
            setStage('complete');
            toast.success(t('flash.complete'));
            timeoutRef.current = setTimeout(() => {
              onOpenChange(false);
              onComplete();
            }, 1500);
          }, s.duration + 200);
        }
      }, totalDelay);
      totalDelay += s.duration + 200;
    });
  };

  const isCpp = currentBoard?.language === 'arduino-cpp';
  const firmwareSize = Math.round(120 + Math.random() * 80);

  const stageInfo: Record<FlashStage, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    confirm: { label: t('flash.confirm'), icon: Cpu },
    connecting: { label: t('flash.connecting'), icon: Loader2 },
    erasing: { label: t('flash.erasing'), icon: Eraser },
    writing: { label: t('flash.writing'), icon: HardDrive },
    verifying: { label: t('flash.verifying'), icon: CheckCircle2 },
    complete: { label: t('flash.complete'), icon: CheckCircle2 },
    failed: { label: t('flash.failed'), icon: AlertCircle },
  };

  const currentStage = stageInfo[stage];
  const StageIcon = currentStage.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            {t('flash.title')}
          </DialogTitle>
          <DialogDescription>
            {stage === 'confirm' && (lang === 'zh' ? '确认以下信息后开始烧录' : 'Review and confirm before flashing')}
          </DialogDescription>
        </DialogHeader>

        {stage === 'confirm' && (
          <div className="space-y-4">
            {isCpp && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-warning">
                  <AlertCircle className="size-4" />
                  {t('flash.agentRequired')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'zh' ? 'Arduino 开发板需要本地代理服务才能烧录' : 'Arduino boards require a local agent'}
                </p>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">
                  <Download className="mr-1.5 size-3" />
                  {t('flash.downloadAgent')}
                </Button>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('flash.chip')}</span>
                <span className="font-medium">{currentBoard?.name.zh}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('flash.size')}</span>
                <span className="font-mono">{firmwareSize} KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('flash.eraseArea')}</span>
                <span className="font-mono">
                  0x1000 - 0x{Math.floor(firmwareSize * 4).toString(16).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {lang === 'zh' ? '配件数量' : 'Components'}
                </span>
                <span>{state.currentProject.components.length}</span>
              </div>
            </div>

            {!('serial' in navigator) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="size-3.5" />
                  {t('flash.unsupported')}
                </div>
              </div>
            )}
          </div>
        )}

        {stage !== 'confirm' && stage !== 'complete' && stage !== 'failed' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <StageIcon className="size-5 animate-spin" />
              </div>
              <div>
                <div className="text-sm font-medium">{currentStage.label}</div>
                <div className="text-xs text-muted-foreground">{progress.toFixed(0)}%</div>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex flex-wrap gap-1">
              {(['connecting', 'erasing', 'writing', 'verifying'] as FlashStage[]).map((s) => {
                const stages = ['connecting', 'erasing', 'writing', 'verifying'];
                const currentIdx = stages.indexOf(stage);
                const sIdx = stages.indexOf(s);
                const done = sIdx < currentIdx;
                const active = sIdx === currentIdx;
                return (
                  <Badge
                    key={s}
                    variant={done ? 'default' : active ? 'secondary' : 'outline'}
                    className={cn(
                      'text-[10px]',
                      done && 'bg-success/20 text-success-foreground',
                      active && 'bg-primary/20 text-primary'
                    )}
                  >
                    {stageInfo[s].label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {stage === 'complete' && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-7 text-success" />
            </div>
            <div className="text-base font-semibold">{t('flash.complete')}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === 'zh' ? '固件烧录成功，正在打开串口监视器...' : 'Firmware flashed successfully, opening serial monitor...'}
            </p>
          </div>
        )}

        <DialogFooter>
          {stage === 'confirm' && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={startFlash}>
                <Zap className="mr-1.5 size-4" />
                {isCpp ? t('flash.confirm') + ' (模拟)' : t('flash.confirm')}
              </Button>
            </>
          )}
          {stage !== 'confirm' && stage !== 'complete' && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
