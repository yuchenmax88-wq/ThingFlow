import { useState, useMemo, useRef, type MouseEvent } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_COMPONENTS } from '@/data/components';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function WiringDiagram() {
  const { t, lang } = useI18n();
  const { state, currentBoard, selectComponent } = useProject();
  const svgRef = useRef<SVGSVGElement>(null);
  const debugValues = state.debugValues;

  // 配件拖拽位置偏移
  const [compOffsets, setCompOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const handleCompMouseDown = (e: React.MouseEvent, compId: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const offset = compOffsets[compId] || { dx: 0, dy: 0 };
    dragStartRef.current = { x: svgP.x, y: svgP.y, dx: offset.dx, dy: offset.dy };
    setDraggingId(compId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !dragStartRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const newDx = dragStartRef.current.dx + (svgP.x - dragStartRef.current.x);
    const newDy = dragStartRef.current.dy + (svgP.y - dragStartRef.current.y);
    setCompOffsets((prev) => ({
      ...prev,
      [draggingId]: { dx: newDx, dy: newDy },
    }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const components = state.currentProject.components;
  const selectedId = state.selectedComponentId;

  // 布局计算：开发板在中间，配件分布在两侧
  const layout = useMemo(() => {
    const boardWidth = 180;
    const boardHeight = 320;
    const boardX = 400;
    const boardY = 100;

    const compWidth = 120;
    const compHeight = 80;
    const compGap = 20;

    const leftComps = components.filter((_, i) => i % 2 === 0);
    const rightComps = components.filter((_, i) => i % 2 === 1);

    const leftPositions = leftComps.map((comp, i) => ({
      comp,
      x: 40,
      y: boardY + i * (compHeight + compGap) + 20,
      side: 'left' as const,
    }));

    const rightPositions = rightComps.map((comp, i) => ({
      comp,
      x: boardX + boardWidth + 60,
      y: boardY + i * (compHeight + compGap) + 20,
      side: 'right' as const,
    }));

    const allPositions = [...leftPositions, ...rightPositions];

    return {
      board: { x: boardX, y: boardY, w: boardWidth, h: boardHeight },
      components: allPositions,
      compWidth,
      compHeight,
    };
  }, [components]);

  // 获取开发板引脚位置（搜索所有引脚，不限于同侧）
  const getBoardPinPosition = (pinNumber: string, compSide: 'left' | 'right'): {
    x: number;
    y: number;
    pinSide: 'left' | 'right';
  } => {
    if (!currentBoard) return { x: 0, y: 0, pinSide: 'left' };
    const { board } = layout;

    const leftPins = currentBoard.pins.filter((_, i) => i % 2 === 0);
    const rightPins = currentBoard.pins.filter((_, i) => i % 2 === 1);

    const findPin = (pins: typeof leftPins, side: 'left' | 'right') => {
      const pinIndex = pins.findIndex((p) => p.number === pinNumber);
      if (pinIndex === -1) {
        const gpioPin = pins.find((p) => p.functions.includes('GPIO') && !p.functions.includes('VCC') && !p.functions.includes('GND'));
        const idx = gpioPin ? pins.indexOf(gpioPin) : Math.floor(pins.length / 2);
        return {
          x: side === 'left' ? board.x : board.x + board.w,
          y: board.y + 30 + idx * 18,
          pinSide: side,
        };
      }
      return {
        x: side === 'left' ? board.x : board.x + board.w,
        y: board.y + 30 + pinIndex * 18,
        pinSide: side,
      };
    };

    // 优先搜索同侧，找不到再搜异侧
    if (compSide === 'left') {
      const result = findPin(leftPins, 'left');
      if (leftPins.findIndex((p) => p.number === pinNumber) !== -1) return result;
      // 左侧没找到，搜索右侧
      return findPin(rightPins, 'right');
    } else {
      const result = findPin(rightPins, 'right');
      if (rightPins.findIndex((p) => p.number === pinNumber) !== -1) return result;
      // 右侧没找到，搜索左侧
      return findPin(leftPins, 'left');
    }
  };

  // 获取配件引脚位置
  const getComponentPinPosition = (
    compX: number,
    compY: number,
    compW: number,
    compH: number,
    pinIndex: number,
    totalPins: number,
    side: 'left' | 'right'
  ) => {
    const spacing = compH / (totalPins + 1);
    return {
      x: side === 'left' ? compX + compW : compX,
      y: compY + spacing * (pinIndex + 1),
    };
  };

  // 线颜色（按信号类型区分）
  const getWireColor = (pinDef: { type: string; signalType?: string }) => {
    if (pinDef.type === 'power') return '#ef4444'; // 红色 - 电源
    if (pinDef.type === 'ground') return '#1f2937'; // 黑色 - 地线
    // 信号线按协议区分
    if (pinDef.signalType === 'i2c-sda') return '#3b82f6'; // 蓝 - I2C SDA
    if (pinDef.signalType === 'i2c-scl') return '#8b5cf6'; // 紫 - I2C SCL
    if (pinDef.signalType === 'spi') return '#ec4899'; // 粉 - SPI
    if (pinDef.signalType === 'uart-tx') return '#06b6d4'; // 青 - UART TX
    if (pinDef.signalType === 'uart-rx') return '#22c55e'; // 绿 - UART RX
    if (pinDef.signalType === 'analog') return '#f97316'; // 橙 - 模拟信号
    return '#eab308'; // 黄色 - 普通 GPIO 信号
  };

  const getWireColorDark = (pinDef: { type: string; signalType?: string }) => {
    if (pinDef.type === 'power') return '#f87171';
    if (pinDef.type === 'ground') return '#6b7280';
    if (pinDef.signalType === 'i2c-sda') return '#60a5fa';
    if (pinDef.signalType === 'i2c-scl') return '#a78bfa';
    if (pinDef.signalType === 'spi') return '#f472b6';
    if (pinDef.signalType === 'uart-tx') return '#22d3ee';
    if (pinDef.signalType === 'uart-rx') return '#4ade80';
    if (pinDef.signalType === 'analog') return '#fb923c';
    return '#facc15';
  };

  // 生成曲线路径
  const generateWirePath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    direction: 'left-to-right' | 'right-to-left' | 'cross'
  ) => {
    const { board: b } = layout;
    const ext = 14;
    if (direction === 'cross') {
      const goTop = y1 < b.y + b.h / 2;
      const routeY = goTop ? b.y - 25 : b.y + b.h + 25;
      const x1Ext = x1 < b.x ? x1 + ext : x1 - ext;
      const x2Ext = x2 < b.x ? x2 - ext : x2 + ext;
      return `M ${x1} ${y1} L ${x1Ext} ${y1} L ${x1Ext} ${routeY} L ${x2Ext} ${routeY} L ${x2Ext} ${y2} L ${x2} ${y2}`;
    }
    const midX = (x1 + x2) / 2;
    // Both sides go left-to-right, extend outward for clarity
    return `M ${x1} ${y1} L ${x1 + ext} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - ext} ${y2} L ${x2} ${y2}`;
  };

  // 导出 PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(svgHeight / svgWidth, 1.2);
      canvas.width = 900;
      canvas.height = Math.round(900 * ratio);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${state.currentProject.name}_wiring.png`;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
    toast.success('接线图已导出');
  };

  const { board, compWidth, compHeight } = layout;

  // 开发板引脚渲染
  const leftPins = currentBoard?.pins.filter((_, i) => i % 2 === 0) ?? [];
  const rightPins = currentBoard?.pins.filter((_, i) => i % 2 === 1) ?? [];

  // 动态计算 SVG viewBox
  const maxPins = Math.max(leftPins.length, rightPins.length, 1);
  const pinHeight = board.y + 30 + maxPins * 18 + 20;
  const maxCompY = layout.components.reduce((max, c) => {
    const offset = compOffsets[c.comp.id];
    const dy = offset ? offset.dy : 0;
    return Math.max(max, c.y + compHeight + dy + 40);
  }, 0);
  const svgHeight = Math.max(600, pinHeight, maxCompY) + 40;
  const svgWidth = 900;

  const getPinBgColor = (funcs: string[]) => {
    if (funcs.includes('VCC')) return '#ef4444';
    if (funcs.includes('GND')) return '#1f2937';
    if (funcs.includes('ADC')) return '#f97316';
    if (funcs.includes('I2C-SDA') || funcs.includes('I2C-SCL')) return '#3b82f6';
    if (funcs.includes('SPI-MOSI') || funcs.includes('SPI-MISO') || funcs.includes('SPI-SCK')) return '#a855f7';
    if (funcs.includes('UART-TX') || funcs.includes('UART-RX')) return '#22c55e';
    return '#6b7280';
  };

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">{t('wiring.title')}</h2>
          <Badge variant="outline" className="text-[10px]">
            {components.length} {lang === 'zh' ? '个配件' : 'components'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* 图例 */}
          <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">VCC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-gray-800 dark:bg-gray-600" />
              <span className="text-muted-foreground">GND</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">{lang === 'zh' ? '信号' : 'Signal'}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExportPNG}>
            <Download className="mr-1.5 size-3.5" />
            {t('wiring.exportPng')}
          </Button>
        </div>
      </div>

      {/* SVG 画布 */}
      <div className="flex-1 overflow-auto bg-background/50 p-6">
        {components.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-muted">
                <Maximize2 className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('wiring.emptyDesc')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === 'zh' ? '从左侧配件库添加配件后，这里将自动生成接线示意图' : 'Add components from the left panel to auto-generate wiring diagram'}
              </p>
            </div>
          </div>
        ) : (
           <svg
             ref={svgRef}
             viewBox={`0 0 ${svgWidth} ${svgHeight}`}
             className="mx-auto h-auto w-full max-w-5xl"
             style={{ minHeight: '500px', cursor: draggingId ? 'grabbing' : 'default' }}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
           >
            {/* 背景网格 */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/50" />
              </pattern>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
              </filter>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

            {/* 开发板 */}
            <g filter="url(#shadow)">
              {/* 板身 */}
              <rect
                x={board.x}
                y={board.y}
                width={board.w}
                height={board.h}
                rx="8"
                fill="#1e3a5f"
                stroke="#0f2744"
                strokeWidth="2"
              />
              {/* 板上丝印 */}
              <text
                x={board.x + board.w / 2}
                y={board.y + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontWeight="600"
                fontFamily="monospace"
              >
                {currentBoard?.name.zh ?? 'BOARD'}
              </text>
              {/* USB 接口 */}
              <rect
                x={board.x + board.w / 2 - 20}
                y={board.y - 8}
                width="40"
                height="10"
                rx="2"
                fill="#374151"
                stroke="#1f2937"
              />
              {/* 左侧引脚 */}
              {leftPins.map((pin, i) => {
                const y = board.y + 30 + i * 18;
                const isUsed = components.some((c) =>
                  Object.values(c.pinMapping).includes(pin.number)
                );
                return (
                  <g key={`left-${pin.number}`}>
                    <rect
                      x={board.x - 6}
                      y={y - 4}
                      width="6"
                      height="8"
                      rx="1"
                      fill={isUsed ? '#fbbf24' : '#9ca3af'}
                      stroke="#4b5563"
                      strokeWidth="0.5"
                    />
                    <circle
                      cx={board.x - 3}
                      cy={y}
                      r="1.5"
                      fill={isUsed ? '#f59e0b' : '#374151'}
                    />
                    <text
                      x={board.x + 8}
                      y={y + 3}
                      fill={isUsed ? '#fbbf24' : '#94a3b8'}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {pin.number}
                    </text>
                    <rect
                      x={board.x + 38}
                      y={y - 3}
                      width="6"
                      height="6"
                      rx="1"
                      fill={getPinBgColor(pin.functions)}
                      opacity="0.8"
                    />
                  </g>
                );
              })}
              {/* 右侧引脚 */}
              {rightPins.map((pin, i) => {
                const y = board.y + 30 + i * 18;
                const isUsed = components.some((c) =>
                  Object.values(c.pinMapping).includes(pin.number)
                );
                return (
                  <g key={`right-${pin.number}`}>
                    <rect
                      x={board.x + board.w}
                      y={y - 4}
                      width="6"
                      height="8"
                      rx="1"
                      fill={isUsed ? '#fbbf24' : '#9ca3af'}
                      stroke="#4b5563"
                      strokeWidth="0.5"
                    />
                    <circle
                      cx={board.x + board.w + 3}
                      cy={y}
                      r="1.5"
                      fill={isUsed ? '#f59e0b' : '#374151'}
                    />
                    <text
                      x={board.x + board.w - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill={isUsed ? '#fbbf24' : '#94a3b8'}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {pin.number}
                    </text>
                    <rect
                      x={board.x + board.w - 44}
                      y={y - 3}
                      width="6"
                      height="6"
                      rx="1"
                      fill={getPinBgColor(pin.functions)}
                      opacity="0.8"
                    />
                  </g>
                );
              })}
              {/* 芯片 */}
              <rect
                x={board.x + board.w / 2 - 30}
                y={board.y + board.h / 2 - 20}
                width="60"
                height="40"
                rx="3"
                fill="#0f172a"
                stroke="#1e40af"
                strokeWidth="1"
              />
              <text
                x={board.x + board.w / 2}
                y={board.y + board.h / 2 + 4}
                textAnchor="middle"
                fill="#60a5fa"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ESP32
              </text>
            </g>

            {/* 面包板 */}
            {(() => {
              const bbComp = state.currentProject.components.find((c) => c.componentId === 'breadboard');
              if (!bbComp) return null;
              const bbX = 100;
              const bbY = board.y + board.h + 50;
              const bbW = 700;
              const bbH = 120;
              const railW = 20;
              const holeR = 4;
              const holeGap = 14;

              return (
                <g className="opacity-90">
                  {/* 面板 */}
                  <rect x={bbX} y={bbY} width={bbW} height={bbH} rx="12" fill="#fafafa" stroke="#d1d5db" strokeWidth="2" filter="url(#shadow)" />
                  <text x={bbX + bbW / 2} y={bbY - 8} textAnchor="middle" fill="#6b7280" fontSize="11" fontWeight="600" fontFamily="monospace">
                    {lang === 'zh' ? '面包板' : 'Breadboard'}
                  </text>

                  {/* 顶部电源轨 */}
                  <rect x={bbX + 10} y={bbY + 8} width={bbW - 20} height="18" rx="3" fill="#fee2e2" stroke="#fca5a5" strokeWidth="1" />
                  <text x={bbX + 30} y={bbY + 21} fill="#dc2626" fontSize="9" fontWeight="bold" fontFamily="monospace">+</text>
                  {Array.from({ length: Math.floor((bbW - 60) / holeGap) }).map((_, i) => (
                    <circle key={`bb-top-${i}`} cx={bbX + 45 + i * holeGap} cy={bbY + 17} r={holeR} fill="#dc2626" />
                  ))}
                  {/* 底部电源轨 */}
                  <rect x={bbX + 10} y={bbY + 94} width={bbW - 20} height="18" rx="3" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
                  <text x={bbX + 30} y={bbY + 107} fill="#2563eb" fontSize="9" fontWeight="bold" fontFamily="monospace">−</text>
                  {Array.from({ length: Math.floor((bbW - 60) / holeGap) }).map((_, i) => (
                    <circle key={`bb-bottom-${i}`} cx={bbX + 45 + i * holeGap} cy={bbY + 103} r={holeR} fill="#2563eb" />
                  ))}

                  {/* 中间连接行 (5 rows) */}
                  <rect x={bbX + bbW / 2 - 1} y={bbY + 32} width="2" height="56" fill="#d1d5db" />
                  {Array.from({ length: 5 }).map((_, row) => {
                    const rowY = bbY + 36 + row * 12;
                    const cols = Math.floor((bbW - 60) / holeGap) / 2;
                    return (
                      <g key={`bb-row-${row}`}>
                        {/* 左半 */}
                        {Array.from({ length: cols }).map((_, col) => (
                          <g key={`bb-left-${row}-${col}`}>
                            <circle cx={bbX + 45 + col * holeGap} cy={rowY} r={holeR} fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
                            {col < cols - 1 && (
                              <line x1={bbX + 45 + col * holeGap + holeR} y1={rowY} x2={bbX + 45 + (col + 1) * holeGap - holeR} y2={rowY} stroke="#d1d5db" strokeWidth="1.5" />
                            )}
                          </g>
                        ))}
                        {/* 右半 */}
                        {Array.from({ length: cols }).map((_, col) => (
                          <g key={`bb-right-${row}-${col}`}>
                            <circle cx={bbX + bbW / 2 + 10 + col * holeGap} cy={rowY} r={holeR} fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
                            {col < cols - 1 && (
                              <line x1={bbX + bbW / 2 + 10 + col * holeGap + holeR} y1={rowY} x2={bbX + bbW / 2 + 10 + (col + 1) * holeGap - holeR} y2={rowY} stroke="#d1d5db" strokeWidth="1.5" />
                            )}
                          </g>
                        ))}
                      </g>
                    );
                  })}

                  {/* 行编号 */}
                  {Array.from({ length: 5 }).map((_, row) => (
                    <text key={`bb-label-${row}`} x={bbX + 14} y={bbY + 40 + row * 12} textAnchor="middle" fill="#9ca3af" fontSize="7" fontFamily="monospace">
                      {row + 1}
                    </text>
                  ))}
                  {Array.from({ length: 5 }).map((_, row) => (
                    <text key={`bb-label-r-${row}`} x={bbX + 14} y={bbY + 40 + row * 12} textAnchor="middle" fill="#9ca3af" fontSize="7" fontFamily="monospace">
                      {/* labels already shown above */}
                    </text>
                  ))}
                </g>
              );
            })()}

            {/* 配件 + 连线 */}
            {layout.components.map(({ comp, x, y, side }) => {
              const def = MOCK_COMPONENTS.find((c) => c.id === comp.componentId);
              if (!def) return null;
              const isSelected = selectedId === comp.id;
              const compPins = def.pins;

               const offset = compOffsets[comp.id] || { dx: 0, dy: 0 };
               return (
                 <g
                   key={comp.id}
                   className="cursor-pointer"
                   style={{ cursor: draggingId === comp.id ? 'grabbing' : 'grab' }}
                   onClick={() => selectComponent(comp.id)}
                   onMouseDown={(e) => handleCompMouseDown(e, comp.id)}
                   transform={`translate(${offset.dx}, ${offset.dy})`}
                 >
                   {/* 连线 */}
                   {compPins.map((pinDef, pinIdx) => {
                     const boardPinNumber = comp.pinMapping[pinDef.name];
                     if (!boardPinNumber) return null;

                     const compPos = getComponentPinPosition(
                       x,
                       y,
                       compWidth,
                       compHeight,
                       pinIdx,
                       compPins.length,
                       side
                     );
                     const boardResult = getBoardPinPosition(boardPinNumber, side);
                     const boardPos = { x: boardResult.x, y: boardResult.y };
                     const isCrossSide = boardResult.pinSide !== side;
                     const color = getWireColor(pinDef);
                     const colorDark = getWireColorDark(pinDef);

                     // 确定路径方向和起点终点
                     let x1: number, x2: number, dir: 'left-to-right' | 'right-to-left' | 'cross';
                     if (isCrossSide) {
                       dir = 'cross';
                       x1 = side === 'left' ? compPos.x : compPos.x;
                       x2 = boardPos.x;
                     } else if (side === 'left') {
                       dir = 'left-to-right';
                       x1 = compPos.x;
                       x2 = boardPos.x;
                     } else {
                       dir = 'right-to-left';
                       x1 = boardPos.x;
                       x2 = compPos.x;
                     }

                     const path = generateWirePath(x1, compPos.y, x2, boardPos.y, dir);

                     return (
                       <g key={`wire-${pinDef.name}`}>
                         <path
                           d={path}
                           fill="none"
                           stroke={isSelected ? color : colorDark}
                           strokeWidth={isSelected ? 3 : 2}
                           strokeLinecap="round"
                           opacity={isSelected ? 1 : 0.85}
                           className="transition-all"
                         />
                         {/* 引脚标签 - 配件侧 */}
                         <text
                           x={side === 'left' ? compPos.x - 4 : compPos.x + 4}
                           y={compPos.y - 4}
                           textAnchor={side === 'left' ? 'end' : 'start'}
                           fill={color}
                           fontSize="8"
                           fontWeight="600"
                           fontFamily="monospace"
                         >
                           {pinDef.name}
                         </text>
                         {/* 引脚标签 - 开发板侧 */}
                         <text
                           x={boardResult.pinSide === 'left' ? boardPos.x + 4 : boardPos.x - 4}
                           y={boardPos.y - 4}
                           textAnchor={boardResult.pinSide === 'left' ? 'start' : 'end'}
                           fill={color}
                           fontSize="8"
                           fontWeight="600"
                           fontFamily="monospace"
                         >
                           {boardPinNumber}
                         </text>
                       </g>
                     );
                   })}

                  {/* 配件卡片 */}
                  <g filter="url(#shadow)">
                    <rect
                      x={x}
                      y={y}
                      width={compWidth}
                      height={compHeight}
                      rx="8"
                      fill={isSelected ? '#fef3c7' : '#ffffff'}
                      stroke={isSelected ? '#f59e0b' : '#e5e7eb'}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all"
                    />
                    {/* 配件图标区 */}
                    <rect
                      x={x + 8}
                      y={y + 8}
                      width="28"
                      height="28"
                      rx="4"
                      fill={isSelected ? '#fde68a' : '#f3f4f6'}
                    />
                    <text
                      x={x + 22}
                      y={y + 28}
                      textAnchor="middle"
                      fontSize="14"
                    >
                      {(() => {
                        if (def.icon === 'thermometer') return '🌡️';
                        if (def.icon === 'lightbulb') return '💡';
                        if (def.icon === 'monitor') return '📺';
                        if (def.icon === 'zap') return '⚡';
                        if (def.icon === 'sun') return '☀️';
                        if (def.icon === 'rotate-cw') return '🔄';
                        if (def.id.startsWith('resistor-')) return '⚡';
                        if (def.id.startsWith('capacitor-')) return '🔋';
                        if (def.id.startsWith('transistor-')) return '💠';
                        if (def.id.startsWith('mosfet-')) return '💠';
                        if (def.id.startsWith('diode-')) return '🔺';
                        if (def.id === 'level-shifter-4ch') return '↕️';
                        if (def.id === 'breadboard') return '📋';
                        if (def.id === 'jumper-wires') return '🔗';
                        return '🔧';
                      })()}
                    </text>
                    {/* 配件名称 */}
                     <text
                       x={x + compWidth / 2}
                       y={y + 52}
                       textAnchor="middle"
                       fill={isSelected ? '#92400e' : '#374151'}
                       fontSize="10"
                       fontWeight="600"
                     >
                       {comp.name.length > 10 ? comp.name.slice(0, 10) + '...' : comp.name}
                     </text>
                     {/* 调试数值气泡 */}
                     {(() => {
                       // 查找与此配件关联的节点调试值
                       const nodes = state.currentProject.logicGraph.nodes;
                       const compNode = nodes.find((n) =>
                         n.properties?.componentId === comp.id ||
                         n.type.includes(comp.componentId?.replace(/-/g, '_'))
                       );
                       const debugVal = compNode ? debugValues[compNode.id] : null;
                       if (!debugVal) return null;
                       return (
                         <g className="animate-pulse">
                           <rect
                             x={x + compWidth / 2 - 30}
                             y={y - 22}
                             width="60"
                             height="20"
                             rx="10"
                             fill="hsl(26 90% 49%)"
                             stroke="white"
                             strokeWidth="1.5"
                           />
                           <text
                             x={x + compWidth / 2}
                             y={y - 8}
                             textAnchor="middle"
                             fill="white"
                             fontSize="10"
                             fontWeight="bold"
                             fontFamily="monospace"
                           >
                             {String(debugVal).slice(0, 8)}
                           </text>
                         </g>
                       );
                     })()}
                    {/* 协议标签 */}
                    <text
                      x={x + compWidth / 2}
                      y={y + 66}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {def.protocol.toUpperCase()}
                    </text>
                    {/* 配件引脚点 */}
                    {compPins.map((pinDef, pinIdx) => {
                      const pos = getComponentPinPosition(
                        x,
                        y,
                        compWidth,
                        compHeight,
                        pinIdx,
                        compPins.length,
                        side
                      );
                      const color = getWireColor(pinDef);
                      const pinX = side === 'left' ? x + compWidth : x;
                      return (
                        <circle
                          key={`pin-dot-${pinDef.name}`}
                          cx={pinX}
                          cy={pos.y}
                          r="4"
                          fill={color}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
