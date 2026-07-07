import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Trash2,
  Search,
  Send,
  Activity,
  Thermometer,
  Droplets,
  Sun,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_SERIAL_LOGS, MOCK_SERIAL_DATA, type ISerialLogEntry, type ISerialDataPoint } from '@/data/mockSerial';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function SerialMonitor() {
  const { t, lang } = useI18n();
  const { state, dispatch, setDebugValue } = useProject();
  const [connected, setConnected] = useState(false);
  const [baudRate, setBaudRate] = useState('115200');
  const [logs, setLogs] = useState<ISerialLogEntry[]>(MOCK_SERIAL_LOGS);
  const [dataPoints, setDataPoints] = useState<ISerialDataPoint[]>(MOCK_SERIAL_DATA);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sendText, setSendText] = useState('');
  const [timedSend, setTimedSend] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [pendingCmd, setPendingCmd] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 模拟数据流
  useEffect(() => {
    if (connected) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

        const temp = 24 + Math.random() * 2;
        const humi = 60 + Math.random() * 5;
        const light = 440 + Math.random() * 30;

        // 随机日志
        const logTypes = ['info', 'debug', 'info', 'info'] as const;
        const tags = ['System', 'Sensor', 'WiFi', 'Data'];
        const randomType = logTypes[Math.floor(Math.random() * logTypes.length)];
        const randomTag = tags[Math.floor(Math.random() * tags.length)];

        let message = '';
        if (randomTag === 'Data') {
          message = `DATA:T:${temp.toFixed(1)},H:${humi.toFixed(0)},L:${Math.round(light)}`;
        } else if (randomType === 'debug' && state.debugMode) {
          const nodeId = state.currentProject.logicGraph.nodes[0]?.id || 'node_001';
          message = `__TF_NODE:${nodeId}:${temp.toFixed(1)}`;
        } else {
          message = `${randomTag} status OK`;
        }

        const newLog: ISerialLogEntry = {
          id: String(Date.now()),
          timestamp: timeStr,
          level: randomType,
          tag: randomTag,
          message,
        };

        setLogs((prev) => [...prev.slice(-199), newLog]);

        // __TF_NODE 调试节点联动高亮
        if (message.startsWith('__TF_NODE:')) {
          const parts = message.split(':');
          if (parts.length >= 3) {
            const nodeId = parts[1];
            const value = parts.slice(2).join(':');
            setDebugValue(nodeId, value);
            // 3 秒后自动清除高亮
            setTimeout(() => {
              setDebugValue(nodeId, '');
            }, 3000);
          }
        }

        // 更新数据点
        setDataPoints((prev) => {
          const newPoint: ISerialDataPoint = {
            time: timeStr.slice(0, 8),
            temperature: parseFloat(temp.toFixed(1)),
            humidity: parseFloat(humi.toFixed(0)),
            light: Math.round(light),
          };
          return [...prev.slice(-19), newPoint];
        });
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connected, state.debugMode, state.currentProject.logicGraph.nodes]);

  // 自动滚动
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filter && filter !== 'all' && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.tag?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSend = () => {
    if (!sendText.trim()) return;
    const cmd = sendText.trim().toLowerCase();

    // 危险指令检测
    if (cmd === 'erase' || cmd === 'format' || cmd === 'factory_reset') {
      setPendingCmd(sendText.trim());
      setDangerOpen(true);
      return;
    }

    doSend(sendText.trim());
  };

  const doSend = (cmd: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        timestamp: timeStr,
        level: 'info',
        tag: 'TX',
        message: `> ${cmd}`,
      },
    ]);
    setSendText('');
    toast.success(`已发送: ${cmd}`);
  };

  const handleDangerConfirm = () => {
    doSend(pendingCmd);
    setDangerOpen(false);
    toast.warning('危险指令已执行');
  };

  const presetCommands = ['AT', 'AT+RST', 'AT+GMR', 'reset', 'status'];

  const getLogColor = (level: string, tag?: string) => {
    if (tag === 'TX') return 'text-cyan-400';
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'debug': return 'text-purple-400';
      default: return 'text-green-400';
    }
  };

  const getTagBg = (tag?: string) => {
    if (!tag) return 'bg-gray-700';
    if (tag === 'WiFi') return 'bg-blue-900/60 text-blue-300';
    if (tag === 'Sensor') return 'bg-green-900/60 text-green-300';
    if (tag === 'Data') return 'bg-purple-900/60 text-purple-300';
    if (tag === 'System') return 'bg-gray-700 text-gray-300';
    if (tag === 'TX') return 'bg-cyan-900/60 text-cyan-300';
    if (tag === 'Node') return 'bg-yellow-900/60 text-yellow-300';
    return 'bg-gray-700';
  };

  const latestData = dataPoints[dataPoints.length - 1];

  return (
    <div className="flex h-full flex-col bg-[#0d1117] text-green-400">
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-[#161b22] px-4 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-200">{t('workspace.serialMonitor')}</h2>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              connected ? 'border-green-500/50 text-green-400' : 'border-gray-600 text-gray-500'
            )}
          >
            {connected ? t('serial.connected') : t('serial.disconnected')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">{t('serial.baudRate')}</span>
            <Select value={baudRate} onValueChange={setBaudRate} disabled={connected}>
              <SelectTrigger className="h-7 w-24 border-gray-700 bg-[#0d1117] text-[11px] text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['9600', '19200', '38400', '57600', '115200', '230400', '460800', '921600'].map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            variant={connected ? 'destructive' : 'default'}
            className="h-7 text-xs"
            onClick={() => setConnected(!connected)}
          >
            {connected ? (
              <>
                <Square className="mr-1.5 size-3" />
                {t('serial.disconnect')}
              </>
            ) : (
              <>
                <Play className="mr-1.5 size-3" />
                {t('serial.connect')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：日志 + 发送 */}
        <div className="flex flex-1 flex-col">
          {/* 日志过滤栏 */}
          <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-3 py-1.5">
            <div className="flex gap-0.5">
              {[
                { val: 'all', label: lang === 'zh' ? '全部' : 'All' },
                { val: 'info', label: 'INFO' },
                { val: 'warn', label: 'WARN' },
                { val: 'error', label: 'ERROR' },
                { val: 'debug', label: 'DEBUG' },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => setFilter(f.val)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    filter === f.val || (f.val === 'all' && !filter)
                      ? 'bg-gray-700 text-gray-200'
                      : 'text-gray-500 hover:bg-gray-800 hover:text-gray-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-gray-600" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('serial.search')}
                className="h-6 w-44 border-gray-700 bg-[#0d1117] pl-7 text-[11px] text-gray-300 placeholder:text-gray-600 focus-visible:ring-gray-600"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-gray-300"
              onClick={() => setLogs([])}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          {/* 日志区域 */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto bg-[#0d1117] p-2 font-mono text-[11px] leading-5"
          >
            {filteredLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-600">
                {connected ? (lang === 'zh' ? '等待数据...' : 'Waiting for data...') : (lang === 'zh' ? '点击连接开始监视' : 'Click connect to start monitoring')}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-2 hover:bg-white/[0.02]">
                  <span className="shrink-0 text-gray-600">{log.timestamp}</span>
                  {log.tag && (
                    <span className={cn('shrink-0 rounded px-1 text-[9px] font-medium', getTagBg(log.tag))}>
                      {log.tag}
                    </span>
                  )}
                  <span className={cn('break-all flex-1 min-w-0', getLogColor(log.level, log.tag))}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* 发送栏 */}
          <div className="border-t border-gray-800 bg-[#161b22] p-2">
            {/* 预置命令 */}
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-gray-500">{t('serial.presetCmds')}:</span>
              {presetCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setSendText(cmd)}
                  className="rounded border border-gray-700 bg-[#0d1117] px-1.5 py-0.5 text-[10px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
                >
                  {cmd}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <Switch
                  checked={timedSend}
                  onCheckedChange={setTimedSend}
                  className="scale-75 data-[state=checked]:bg-green-600"
                />
                <span className="text-[10px] text-gray-500">{t('serial.timedSend')}</span>
              </div>
            </div>
            {/* 输入框 */}
            <div className="flex gap-2">
              <Input
                value={sendText}
                onChange={(e) => setSendText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('serial.sendPlaceholder')}
                className="h-7 border-gray-700 bg-[#0d1117] text-xs text-gray-200 placeholder:text-gray-600 focus-visible:ring-green-700"
                disabled={!connected}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSend}
                disabled={!connected || !sendText.trim()}
              >
                <Send className="mr-1 size-3" />
                {t('serial.send')}
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧：数据仪表盘 */}
        <div className="w-80 shrink-0 border-l border-gray-800 bg-[#161b22] p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-300">
            <Activity className="size-3.5 text-green-400" />
            {t('serial.dashboard')}
          </h3>

          {/* 数值卡片 */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Card className="border-gray-800 bg-[#0d1117]">
              <CardContent className="p-2 text-center">
                <Thermometer className="mx-auto mb-1 size-4 text-orange-400" />
                <div className="text-lg font-bold text-orange-400 tabular-nums">
                  {latestData?.temperature.toFixed(1) ?? '--'}
                </div>
                <div className="text-[9px] text-gray-500">°C</div>
              </CardContent>
            </Card>
            <Card className="border-gray-800 bg-[#0d1117]">
              <CardContent className="p-2 text-center">
                <Droplets className="mx-auto mb-1 size-4 text-blue-400" />
                <div className="text-lg font-bold text-blue-400 tabular-nums">
                  {latestData?.humidity ?? '--'}
                </div>
                <div className="text-[9px] text-gray-500">%RH</div>
              </CardContent>
            </Card>
            <Card className="border-gray-800 bg-[#0d1117]">
              <CardContent className="p-2 text-center">
                <Sun className="mx-auto mb-1 size-4 text-yellow-400" />
                <div className="text-lg font-bold text-yellow-400 tabular-nums">
                  {latestData?.light ?? '--'}
                </div>
                <div className="text-[9px] text-gray-500">lux</div>
              </CardContent>
            </Card>
          </div>

          {/* 图表 */}
          <Card className="border-gray-800 bg-[#0d1117]">
            <CardHeader className="border-b border-gray-800 p-2 pb-1.5">
              <CardTitle className="text-[11px] font-medium text-gray-400">
                {lang === 'zh' ? '实时数据趋势' : 'Real-time Trend'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={{ stroke: '#374151' }} width={30} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        border: '1px solid #374151',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Line type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={1.5} dot={false} name="温度" />
                    <Line type="monotone" dataKey="humidity" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="湿度" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 连接状态 */}
          <div className="mt-3 rounded-md border border-gray-800 bg-[#0d1117] p-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">{lang === 'zh' ? '设备' : 'Device'}</span>
              <span className="text-gray-300">{connected ? 'COM3 (模拟)' : '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">{lang === 'zh' ? '波特率' : 'Baud Rate'}</span>
              <span className="text-gray-300 font-mono">{baudRate}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">{lang === 'zh' ? '数据点' : 'Data Points'}</span>
              <span className="text-gray-300 font-mono">{dataPoints.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 危险指令确认 */}
      <AlertDialog open={dangerOpen} onOpenChange={setDangerOpen}>
        <AlertDialogContent className="border-destructive/50 bg-[#161b22] text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {t('serial.dangerConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t('serial.dangerWarn')}
              <div className="mt-2 rounded bg-[#0d1117] p-2 font-mono text-sm text-red-400">
                {pendingCmd}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDangerConfirm}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
