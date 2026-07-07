import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  MousePointer2,
  Trash2,
  Copy,
  ClipboardPaste,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  GripVertical,
  X,
  Layers,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/contexts/I18nContext';
import { useProject } from '@/contexts/ProjectContext';
import { MOCK_COMPONENTS } from '@/data/components';
import { NODE_TYPE_DEFS, getNodeTypeDef, arePortTypesCompatible, getPortType } from '@/lib/node-types';
import CustomNode, { logicNodeToFlowNode, type CustomNodeData } from '@/components/CustomNode';
import { generateId, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ILogicEdge, ILogicNode, IPortType } from '@/types/project';

const nodeTypes = {
  custom: CustomNode,
};

const CATEGORIES = [
  { id: 'input', label: { zh: '输入', en: 'Input' } },
  { id: 'process', label: { zh: '处理', en: 'Process' } },
  { id: 'output', label: { zh: '输出', en: 'Output' } },
  { id: 'flow', label: { zh: '流程', en: 'Flow' } },
  { id: 'wireless', label: { zh: '无线', en: 'Wireless' } },
] as const;

export default function LogicEditor() {
  const { t, lang } = useI18n();
  const { state, dispatch, selectNode, addComponent } = useProject();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [paletteCategory, setPaletteCategory] = useState<string>('input');
  const [searchKeyword, setSearchKeyword] = useState('');

  const nodes = state.currentProject.logicGraph.nodes;
  const edges = state.currentProject.logicGraph.edges;
  const selectedNodeId = state.selectedNodeId;
  const debugValues = state.debugValues;

  // 将 ILogicNode 转换为 React Flow Node
  const flowNodes: Node<CustomNodeData>[] = useMemo(() => {
    return nodes.map((node) => {
      const base = logicNodeToFlowNode(node);
      const debugValue = debugValues[node.id];
      return {
        ...base,
        data: {
          ...base.data,
          isDebug: !!debugValue,
          debugValue,
        },
        selected: selectedNodeId === node.id,
      } as Node<CustomNodeData>;
    });
  }, [nodes, selectedNodeId, debugValues]);

  // 将 ILogicEdge 转换为 React Flow Edge
  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => {
      const sourceType = getPortType(
        nodes.find((n) => n.id === edge.source)?.type ?? '',
        edge.sourcePort,
        'output'
      );
      const color = getEdgeColor(sourceType);
      return {
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourcePort,
        target: edge.target,
        targetHandle: edge.targetPort,
        animated: false,
        style: { stroke: color, strokeWidth: 2 },
      };
    });
  }, [edges, nodes]);

  // 连线颜色
  function getEdgeColor(portType: IPortType): string {
    const colors: Record<IPortType, string> = {
      digital: '#22c55e',
      analog: '#f59e0b',
      i2c: '#8b5cf6',
      spi: '#ec4899',
      uart: '#06b6d4',
      pwm: '#10b981',
      generic: 'hsl(210 10% 60%)',
    };
    return colors[portType] ?? colors.generic;
  }

  // 节点选择
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // 节点位置变化
  const onNodesChange = useCallback(
    (changes: any[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          dispatch({
            type: 'UPDATE_NODE',
            id: change.id,
            updates: { position: change.position },
          });
        }
      });
    },
    [dispatch]
  );

  // 连线验证
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return false;
      }
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceType = getPortType(sourceNode.type, connection.sourceHandle, 'output');
      const targetType = getPortType(targetNode.type, connection.targetHandle, 'input');

      return arePortTypesCompatible(sourceType, targetType);
    },
    [nodes]
  );

  // 新建连线
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;

      const edge: ILogicEdge = {
        id: generateId('edge'),
        source: params.source,
        sourcePort: params.sourceHandle,
        target: params.target,
        targetPort: params.targetHandle,
      };
      dispatch({ type: 'ADD_EDGE', edge });
    },
    [dispatch]
  );

  // 删除连线
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        dispatch({ type: 'REMOVE_EDGE', id: edge.id });
      });
    },
    [dispatch]
  );

  // 删除节点
  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      dispatch({ type: 'REMOVE_NODE', id: selectedNodeId });
    }
  }, [selectedNodeId, dispatch]);

  // 复制节点
  const copyNode = useCallback(() => {
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    const newNode: ILogicNode = {
      ...node,
      id: generateId('node'),
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      properties: { ...node.properties },
    };
    dispatch({ type: 'ADD_NODE', node: newNode });
    toast.success(lang === 'zh' ? '已复制节点' : 'Node copied');
  }, [selectedNodeId, nodes, dispatch, lang]);

  // 自动布局
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // 简单分层布局：按入度分层
    const inDegree = new Map<string, number>();
    nodes.forEach((n) => inDegree.set(n.id, 0));
    edges.forEach((e) => {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    });

    // BFS 分层
    const layers: ILogicNode[][] = [];
    const visited = new Set<string>();
    let currentLayer = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach((n) => visited.add(n.id));
      const nextIds = new Set<string>();
      edges.forEach((e) => {
        if (visited.has(e.source) && !visited.has(e.target)) {
          nextIds.add(e.target);
        }
      });
      currentLayer = nodes.filter((n) => nextIds.has(n.id));
    }

    // 剩余未分层的（环或孤立节点）
    const remaining = nodes.filter((n) => !visited.has(n.id));
    if (remaining.length > 0) layers.push(remaining);

    // 分配位置
    const layerGap = 280;
    const nodeGap = 100;
    layers.forEach((layer, layerIdx) => {
      layer.forEach((node, nodeIdx) => {
        const x = layerIdx * layerGap + 50;
        const y = nodeIdx * nodeGap + 50;
        dispatch({
          type: 'UPDATE_NODE',
          id: node.id,
          updates: { position: { x, y } },
        });
      });
    });

    toast.success(lang === 'zh' ? '已自动布局' : 'Auto layout applied');
  }, [nodes, edges, dispatch, lang]);

  // 从调色板拖入节点
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const def = getNodeTypeDef(type);
      if (!def) return;

      const newNode: ILogicNode = {
        id: generateId('node'),
        type: def.type,
        category: def.category,
        label: def.label,
        position,
        properties: { ...def.defaultProperties },
      };

      dispatch({ type: 'ADD_NODE', node: newNode });
    },
    [reactFlowInstance, dispatch]
  );

  // 过滤节点调色板
  const filteredNodes = useMemo(() => {
    const cats = NODE_TYPE_DEFS.filter((n) => n.category === paletteCategory);
    if (!searchKeyword.trim()) return cats;
    const kw = searchKeyword.toLowerCase();
    return cats.filter(
      (n) =>
        n.label.zh.toLowerCase().includes(kw) ||
        n.label.en.toLowerCase().includes(kw) ||
        n.type.toLowerCase().includes(kw)
    );
  }, [paletteCategory, searchKeyword]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          deleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        copyNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteSelected, copyNode]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-full w-full overflow-hidden bg-background">
        {/* 节点调色板 */}
        {showPalette && (
          <div className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card/50">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span className="text-xs font-medium">
                  {lang === 'zh' ? '节点库' : 'Node Library'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowPalette(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="p-2">
              <Input
                size={1}
                placeholder={lang === 'zh' ? '搜索节点...' : 'Search nodes...'}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Tabs value={paletteCategory} onValueChange={setPaletteCategory} className="flex-1">
              <TabsList className="mx-2 grid grid-cols-5 h-7">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-[10px] px-1">
                    {lang === 'zh' ? cat.label.zh : cat.label.en}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {filteredNodes.map((nodeDef) => {
                    const Icon = nodeDef.icon;
                    return (
                      <div
                        key={nodeDef.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, nodeDef.type)}
                        className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-accent active:cursor-grabbing"
                      >
                        <GripVertical className="size-3 text-muted-foreground" />
                        <div className={cn('size-4 rounded', nodeDef.color)} />
                        <span className="flex-1 truncate">
                          {lang === 'zh' ? nodeDef.label.zh : nodeDef.label.en}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => {
                                const newNode: ILogicNode = {
                                  id: generateId('node'),
                                  type: nodeDef.type,
                                  category: nodeDef.category,
                                  label: nodeDef.label,
                                  position: { x: 200, y: 200 },
                                  properties: { ...nodeDef.defaultProperties },
                                };
                                dispatch({ type: 'ADD_NODE', node: newNode });
                              }}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {lang === 'zh' ? '添加节点' : 'Add node'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Tabs>
          </div>
        )}

        {/* 主画布区 */}
        <div className="relative flex flex-1 flex-col" ref={reactFlowWrapper}>
          {/* 工具栏 */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/80 p-1 backdrop-blur-sm">
            {!showPalette && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowPalette(true)}
                  >
                    <Layers className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{lang === 'zh' ? '节点库' : 'Node Palette'}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={deleteSelected} disabled={!selectedNodeId}>
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{lang === 'zh' ? '删除节点' : 'Delete'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyNode} disabled={!selectedNodeId}>
                  <Copy className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{lang === 'zh' ? '复制节点' : 'Duplicate'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={autoLayout} disabled={nodes.length === 0}>
                  <Wand2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{lang === 'zh' ? '自动布局' : 'Auto Layout'}</TooltipContent>
            </Tooltip>
          </div>

          {/* 节点/连线统计 */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
            <Badge variant="outline" className="h-4 text-[10px]">
              {nodes.length} {lang === 'zh' ? '节点' : 'nodes'}
            </Badge>
            <Badge variant="outline" className="h-4 text-[10px]">
              {edges.length} {lang === 'zh' ? '连线' : 'edges'}
            </Badge>
          </div>

          {/* React Flow 画布 */}
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange as any}
            onEdgesDelete={onEdgesDelete}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            isValidConnection={isValidConnection}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={4}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(210 8% 22%)" />
            <Controls
              className="!rounded-lg !border-border !bg-card"
              position="bottom-right"
            />
            <MiniMap
              className="!rounded-lg !border-border !bg-card"
              position="bottom-left"
              nodeColor={() => 'hsl(192 85% 55%)'}
              maskColor="hsl(210 12% 10% / 0.7)"
            />
          </ReactFlow>

          {/* 空状态 */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Grid3X3 className="mx-auto mb-3 size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {lang === 'zh' ? '从左侧节点库拖拽节点到画布' : 'Drag nodes from the left panel'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {lang === 'zh' ? '或点击节点右侧 + 号快速添加' : 'Or click + to add quickly'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
