import { useState, useMemo, useCallback } from 'react';
import { Copy, Check, Share2, AlertTriangle, Link2, FileDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { copyToClipboard, downloadText } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import * as pako from 'pako';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function encodeMinimal(data: object): string {
  const json = JSON.stringify(data);
  const compressed = pako.deflate(json);
  let binary = '';
  const bytes = new Uint8Array(compressed);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { t, lang } = useI18n();
  const { state } = useProject();
  const [copied, setCopied] = useState(false);

  const shareResult = useMemo(() => {
    try {
      const minimal = {
        v: '1',
        n: state.currentProject.name,
        b: state.currentProject.board.boardId,
        c: state.currentProject.components.map((c) => ({
          i: c.componentId,
          m: c.pinMapping,
        })),
        g: {
          n: state.currentProject.logicGraph.nodes.map((n) => ({
            t: n.type,
            a: n.category,
            p: n.position,
            r: n.properties,
          })),
          e: state.currentProject.logicGraph.edges.map((e) => ({
            s: e.source,
            p: e.sourcePort,
            t: e.target,
            q: e.targetPort,
          })),
        },
      };
      const encoded = encodeMinimal(minimal);
      const baseUrl = window.location.origin + window.location.pathname + '#';
      const url = `${baseUrl}share=${encoded}`;
      const qrOk = encoded.length < 600;
      return { url, qrOk, error: null };
    } catch {
      return { url: window.location.href, qrOk: false, error: true };
    }
  }, [state.currentProject]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(shareResult.url);
    if (ok) {
      setCopied(true);
      toast.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareResult.url]);

  const handleDownloadFile = useCallback(() => {
    const minimal = {
      version: '1',
      name: state.currentProject.name,
      boardId: state.currentProject.board.boardId,
      components: state.currentProject.components.map((c) => ({
        componentId: c.componentId,
        name: c.name,
        pinMapping: c.pinMapping,
      })),
      logicGraph: state.currentProject.logicGraph,
    };
    downloadText(JSON.stringify(minimal, null, 2), `${state.currentProject.name}.thingflow`, 'application/json');
    toast.success('文件已导出');
  }, [state.currentProject]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            {t('share.title')}
          </DialogTitle>
          <DialogDescription>
            {lang === 'zh' ? '通过链接或文件分享你的项目' : 'Share via link or file'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 二维码 - 仅数据量小时显示 */}
          {shareResult.qrOk && !shareResult.error && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 text-center text-xs font-medium text-muted-foreground">
                {lang === 'zh' ? '扫码打开项目' : 'Scan to open'}
              </div>
              <div className="mx-auto flex size-36 items-center justify-center rounded-lg border border-border bg-background p-2">
                <QRCodeSVG
                  value={shareResult.url}
                  size={120}
                  level="L"
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-foreground"
                />
              </div>
            </div>
          )}

          {/* 链接复制 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {lang === 'zh' ? '分享链接' : 'Share Link'}
            </label>
            <div className="flex gap-2">
              <div
                className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs"
                title={shareResult.url}
              >
                {shareResult.error ? (lang === 'zh' ? '生成失败' : 'Failed') : shareResult.url}
              </div>
              <Button size="sm" onClick={handleCopy} disabled={shareResult.error}>
                {copied ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
                {copied ? '已复制' : t('common.copy')}
              </Button>
            </div>
          </div>

          {!shareResult.qrOk && !shareResult.error && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 text-warning shrink-0" />
                <div className="text-xs text-muted-foreground">
                  {lang === 'zh'
                    ? '项目数据较大，二维码可能无法扫描。请复制链接或使用下方文件分享。'
                    : 'Project is large, QR may not scan. Copy link or use file share below.'}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileDown className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium">
                  {lang === 'zh' ? '导出文件' : 'Export File'}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleDownloadFile}>
                <FileDown className="mr-1 size-3.5" />
                .thingflow
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success shrink-0" />
              {lang === 'zh' ? '密码等敏感信息不会包含在分享数据中' : 'Sensitive info excluded from shared data'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
