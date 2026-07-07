import { useState, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import LeftSidebar from '@/components/LeftSidebar';
import RightPanel from '@/components/RightPanel';
import LogicEditor from '@/components/LogicEditor';
import WiringDiagram from '@/components/WiringDiagram';
import CodeEditor from '@/components/CodeEditor';
import SerialMonitor from '@/components/SerialMonitor';
import FlashDialog from '@/components/FlashDialog';
import ShareDialog from '@/components/ShareDialog';
import HelpDialog from '@/components/HelpDialog';
import { I18nProvider } from '@/contexts/I18nContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

function IDEContent() {
  const [activeTab, setActiveTab] = useState('logic');
  const [flashOpen, setFlashOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const handleGenerateCode = useCallback(() => {
    setActiveTab('code');
  }, []);

  const handleFlash = useCallback(() => {
    setFlashOpen(true);
  }, []);

  const handleFlashComplete = useCallback(() => {
    setActiveTab('serial');
  }, []);

  const handleShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  const handleHelp = useCallback(() => {
    setHelpOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGenerateCode={handleGenerateCode}
        onFlash={handleFlash}
        onShare={handleShare}
        onHelp={handleHelp}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 */}
        {!leftCollapsed && <LeftSidebar />}
        <button
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          className="flex w-5 shrink-0 items-center justify-center border-r border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          title={leftCollapsed ? '展开' : '收起'}
        >
          <span className="text-xs">{leftCollapsed ? '›' : '‹'}</span>
        </button>

        {/* 中间主工作区 */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeTab === 'logic' && <LogicEditor />}
          {activeTab === 'wiring' && <WiringDiagram />}
          {activeTab === 'code' && <CodeEditor />}
          {activeTab === 'serial' && <SerialMonitor />}
        </main>

        {/* 右侧面板 */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="flex w-5 shrink-0 items-center justify-center border-l border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          title={rightCollapsed ? '展开' : '收起'}
        >
          <span className="text-xs">{rightCollapsed ? '‹' : '›'}</span>
        </button>
        {!rightCollapsed && <RightPanel />}
      </div>

      {/* 对话框 */}
      <FlashDialog open={flashOpen} onOpenChange={setFlashOpen} onComplete={handleFlashComplete} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default function IDEPage() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ProjectProvider>
          <IDEContent />
        </ProjectProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
