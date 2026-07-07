import { useState, useMemo, useCallback } from 'react';
import { X, Copy, Check, Share2, AlertTriangle, Link2, QrCode, FileDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { sanitizeSensitiveFields } from '@/lib/sanitize';
import { QRCodeSVG } from 'qrcode.react';
import * as pako from 'pako';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { t, lang } = useI18n();
  const { state } = useProject();
  const [copied, setCopied] = useState(false);
  const [shareMethod, setShareMethod] = useState<'link' | 'file'>('link');

  // 生成分享链接（pako 压缩 + Base64）
  const shareUrl = useMemo(() => {
    try {
      // 1. 脱敏敏感字段
      const sanitized = sanitizeSensitiveFields(state.currentProject);

      // 2. JSON 序列化
      const jsonStr = JSON.stringify(sanitized);

      // 3. pako deflate 压缩
      const compressed = pako.deflate(jsonStr);

      // 4. 转 Base64（用 btoa + Uint8Array -> binary string）
      let binary = '';
      const bytes = new Uint8Array(compressed);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const encoded = btoa(binary);

      // 5. 拼 URL
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}#share=${encoded}`;
    } catch {
      return window.location.href;
    }
  }, [state.currentProject]);

  const isTooLarge = shareUrl.length > 2000;

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success(t('share.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, t]);

  const handleDownloadFile = useCallback(() => {
    const sanitized = sanitizeSensitiveFields(state.currentProject);
    const data = JSON.stringify(sanitized, null, 2);
    downloadText(data, `${state.currentProject.name}.thingflow`, 'application/json');
    toast.success(t('project.exportSuccess'));
  }, [state.currentProject, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            {t('share.title')}
          </DialogTitle>
          <DialogDescription>
            {lang === 'zh' ? '分享你的项目给其他人' : 'Share your project with others'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={shareMethod} onValueChange={(v) => setShareMethod(v as 'link' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 className="mr-1.5 size-3.5" />
              {lang === 'zh' ? '链接分享' : 'Link'}
            </TabsTrigger>
            <TabsTrigger value="file">
              <Share2 className="mr-1.5 size-3.5" />
              {lang === 'zh' ? '文件分享' : 'File'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 pt-4">
            {isTooLarge && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 text-warning" />
                  <div>
                    <div className="text-sm font-medium text-warning-foreground">
                      {t('share.sizeWarning')}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lang === 'zh' ? '建议使用文件分享方式' : 'Recommended to use file sharing'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <QrCode className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('share.qrCode')}
                  </span>
                </div>
                <div className="mx-auto flex size-36 items-center justify-center rounded-lg border border-border bg-background p-2">
                  {shareUrl && (
                    <QRCodeSVG
                      value={shareUrl}
                      size={128}
                      level="M"
                      includeMargin={false}
                      bgColor="transparent"
                      fgColor="currentColor"
                      className="text-foreground"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t('share.copyLink')}
                </label>
                <div className="flex gap-2">
                  <div
                    className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs"
                    title={shareUrl}
                  >
                    {shareUrl}
                  </div>
                  <Button size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="mr-1 size-3.5" />
                    ) : (
                      <Copy className="mr-1 size-3.5" />
                    )}
                    {copied ? t('common.success') : t('common.copy')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" />
                {t('share.sensitiveReplaced')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <FileDown className="mx-auto mb-2 size-8 text-muted-foreground" />
              <div className="text-sm font-medium">
                {lang === 'zh' ? '导出为 .thingflow 文件' : 'Export as .thingflow file'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === 'zh' ? '适合大型项目，可离线保存' : 'Suitable for large projects, offline storage'}
              </p>
              <Button size="sm" className="mt-3" onClick={handleDownloadFile}>
                <FileDown className="mr-1.5 size-3.5" />
                {t('common.export')}
              </Button>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" />
                {t('share.sensitiveReplaced')}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
