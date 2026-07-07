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
import { generateCode, checkUnconfigured } from '@/lib/code-gen';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

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
    if (!currentBoard) return '// 请先选择开发板';
    return generateCode({
      lang: lang as 'zh' | 'en',
      boardId: currentBoard.id,
      components: state.currentProject.components,
      nodes: state.currentProject.logicGraph.nodes,
      debugMode: state.debugMode,
    });
  }, [currentBoard, state.currentProject.components, state.currentProject.logicGraph.nodes, state.debugMode, lang]);

  const unconfigured = useMemo(
    () => checkUnconfigured(state.currentProject.components),
    [state.currentProject.components]
  );

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
          {unconfigured.length > 0 && (
            <Badge variant="destructive" className="h-5 gap-1 text-[10px]">
              <AlertTriangle className="size-3" />
              {lang === 'zh' ? `${unconfigured.length}个配件引脚未配置` : `${unconfigured.length} pins unconfigured`}
            </Badge>
          )}
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
