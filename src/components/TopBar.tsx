import { useState, useRef, useMemo, type ChangeEvent } from 'react';
import {
  LayoutGrid,
  Code2,
  Zap,
  Share2,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  Globe,
  ChevronDown,
  Plus,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Edit3,
  FileJson,
  Save,
  Search,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useI18n, type Language } from '@/contexts/I18nContext';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_BOARDS } from '@/data/boards';
import { MOCK_TEMPLATES } from '@/data/templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onGenerateCode: () => void;
  onFlash: () => void;
  onShare: () => void;
  onHelp: () => void;
}

export default function TopBar({
  activeTab,
  onTabChange,
  onGenerateCode,
  onFlash,
  onShare,
  onHelp,
}: TopBarProps) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    state,
    renameProject,
    createNewProject,
    createFromTemplate,
    deleteProject,
    switchProject,
    exportProject,
    importProject,
    setBoard,
  } = useProject();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [boardSeries, setBoardSeries] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const boardSeriesList = useMemo(() => {
    const series = new Set(MOCK_BOARDS.map((b) => b.series).filter(Boolean));
    return ['all', ...Array.from(series)];
  }, []);

  const filteredBoards = useMemo(() => {
    return MOCK_BOARDS.filter((b) => {
      if (boardSeries !== 'all' && b.series !== boardSeries) return false;
      if (boardSearch) {
        const name = lang === 'zh' ? b.name.zh : b.name.en;
        const mcu = b.mcu?.toLowerCase() ?? '';
        const s = boardSearch.toLowerCase();
        return name.toLowerCase().includes(s) || mcu.includes(s);
      }
      return true;
    });
  }, [boardSearch, boardSeries, lang]);

  const tabs = [
    { id: 'logic', label: t('workspace.logicEditor'), icon: LayoutGrid },
    { id: 'wiring', label: t('workspace.wiringDiagram'), icon: Zap },
    { id: 'code', label: t('workspace.codeEditor'), icon: Code2 },
    { id: 'serial', label: t('workspace.serialMonitor'), icon: Monitor },
  ];

  const handleRename = () => {
    if (renameValue.trim()) {
      renameProject(renameValue.trim());
      setRenameOpen(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importProject(file);
    }
    e.target.value = '';
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteClick = () => {
    if (state.projects.length <= 1) {
      toast.error('至少保留一个项目');
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteProject(state.currentProject.id);
    toast.success('项目已删除');
    setDeleteConfirmOpen(false);
  };

  const currentBoard = MOCK_BOARDS.find((b) => b.id === state.currentProject.board.boardId);

  const themeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel = theme === 'light' ? t('topbar.themeLight') : theme === 'dark' ? t('topbar.themeDark') : t('topbar.themeSystem');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">ThingFlow</span>
        <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal text-muted-foreground">v1.2.0</Badge>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* 项目菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 font-medium">
              <span className="max-w-[160px] truncate inline-block align-bottom">{state.currentProject.name}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>{t('topbar.projectList')}</DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {state.projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={cn(
                    'cursor-pointer gap-2',
                    p.id === state.currentProject.id && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => switchProject(p.id)}
                >
                  <FileJson className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === state.currentProject.id && (
                    <span className="text-xs text-primary">●</span>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={createNewProject}>
                <Plus className="size-4" />
                {t('topbar.newProject')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => {
                  setRenameValue(state.currentProject.name);
                  setRenameOpen(true);
                }}
              >
                <Edit3 className="size-4" />
                {t('common.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleImportClick}>
                <Upload className="size-4" />
                {t('topbar.importProject')}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportProject}>
                <Download className="size-4" />
                {t('topbar.exportProject')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="size-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('topbar.templates')}</DropdownMenuLabel>
            {MOCK_TEMPLATES.map((tpl) => (
              <DropdownMenuItem
                key={tpl.id}
                className="gap-2 cursor-pointer"
                onClick={() => {
                  createFromTemplate(tpl.id);
                  toast.success(`已从模板「${tpl.name.zh}」创建`);
                }}
              >
                <span className="text-base">{tpl.icon}</span>
                <span className="flex-1 truncate">{tpl.name.zh}</span>
                <span className="text-[10px] text-muted-foreground">
                  {tpl.difficulty === 'beginner' ? '入门' : tpl.difficulty === 'intermediate' ? '进阶' : '高级'}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 开发板选择 */}
        <DropdownMenu open={boardOpen} onOpenChange={setBoardOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs max-w-[160px]">
              <span className="size-1.5 rounded-full bg-success shrink-0" />
              <span className="truncate">{currentBoard?.name.zh}</span>
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
             <DropdownMenuLabel className="flex items-center justify-between">
               <span>{t('topbar.selectBoard')}</span>
               <span className="text-[10px] text-muted-foreground">{MOCK_BOARDS.length} 款</span>
             </DropdownMenuLabel>
             <div className="px-2 pb-2">
               <div className="relative">
                 <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                 <Input
                   value={boardSearch}
                   onChange={(e) => setBoardSearch(e.target.value)}
                   placeholder={t('topbar.boardSearch')}
                   className="h-8 pl-8 text-xs"
                 />
               </div>
             </div>
             <div className="flex flex-wrap gap-1 px-2 pb-2">
               {boardSeriesList.map((s) => (
                 <button
                   key={s}
                   onClick={() => setBoardSeries(s)}
                   className={cn(
                     'rounded px-2 py-0.5 text-[10px] transition-colors',
                     boardSeries === s
                       ? 'bg-primary/15 text-primary'
                       : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                   )}
                 >
                   {s === 'all' ? t('common.all') : s}
                 </button>
               ))}
             </div>
             <div className="max-h-64 overflow-y-auto">
               {filteredBoards.length === 0 ? (
                 <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                   {t('topbar.noBoardFound')}
                 </div>
               ) : (
                 filteredBoards.map((board) => (
                   <DropdownMenuItem
                     key={board.id}
                     className={cn(
                       'cursor-pointer gap-2',
                       board.id === state.currentProject.board.boardId && 'bg-accent text-accent-foreground'
                     )}
                     onClick={() => {
                       setBoard(board.id);
                       setBoardOpen(false);
                       setBoardSearch('');
                     }}
                   >
                     <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10">
                       <Cpu className="size-3.5 text-primary" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <div className="truncate text-sm font-medium">
                         {lang === 'zh' ? board.name.zh : board.name.en}
                       </div>
                       <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                         <span>{board.series}</span>
                         <span>•</span>
                         <span>{board.mcu}</span>
                       </div>
                     </div>
                     <div className="flex shrink-0 gap-0.5">
                       {board.capabilities.wifi && (
                         <span className="rounded bg-cyan-500/15 px-1 text-[9px] text-cyan-400">WiFi</span>
                       )}
                       {board.capabilities.ble && (
                         <span className="rounded bg-blue-500/15 px-1 text-[9px] text-blue-400">BLE</span>
                       )}
                     </div>
                   </DropdownMenuItem>
                 ))
               )}
             </div>
           </DropdownMenuContent>
        </DropdownMenu>

        {/* 保存状态 */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Save className="size-3" />
          {state.saveStatus === 'saved' && t('common.saved')}
          {state.saveStatus === 'saving' && t('common.saving')}
          {state.saveStatus === 'unsaved' && t('common.unsaved')}
        </div>
      </div>

      {/* 中间 Tab */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center gap-2">
        {/* 语言切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Globe className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              className={cn('cursor-pointer', lang === 'zh' && 'bg-accent')}
              onClick={() => setLang('zh' as Language)}
            >
              中文
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn('cursor-pointer', lang === 'en' && 'bg-accent')}
              onClick={() => setLang('en' as Language)}
            >
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 主题切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {theme === 'light' && <Sun className="size-4" />}
              {theme === 'dark' && <Moon className="size-4" />}
              {theme === 'system' && <Monitor className="size-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className={cn('gap-2 cursor-pointer', theme === 'light' && 'bg-accent')}
              onClick={() => setTheme('light' as ThemeMode)}
            >
              <Sun className="size-4" />
              {t('topbar.themeLight')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn('gap-2 cursor-pointer', theme === 'dark' && 'bg-accent')}
              onClick={() => setTheme('dark' as ThemeMode)}
            >
              <Moon className="size-4" />
              {t('topbar.themeDark')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn('gap-2 cursor-pointer', theme === 'system' && 'bg-accent')}
              onClick={() => setTheme('system' as ThemeMode)}
            >
              <Monitor className="size-4" />
              {t('topbar.themeSystem')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button variant="secondary" size="sm" onClick={onGenerateCode}>
          <Code2 className="mr-1.5 size-3.5" />
          {t('topbar.generateCode')}
        </Button>

        <Button size="sm" onClick={onFlash}>
          <Zap className="mr-1.5 size-3.5" />
          {t('topbar.flash')}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
          <Share2 className="size-4" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHelp}>
          <HelpCircle className="size-4" />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".thingflow,.json"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* 重命名对话框 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.rename')}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRename}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('project.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'zh'
                ? `确定要删除项目「${state.currentProject.name}」吗？此操作不可撤销。`
                : `Are you sure you want to delete project "${state.currentProject.name}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
