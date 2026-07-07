import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeTypeDef } from '@/lib/node-types';
import { cn } from '@/lib/utils';
import type { ILogicNode } from '@/types/project';
import { useI18n } from '@/contexts/I18nContext';

export interface CustomNodeData {
  label: string;
  nodeType: string;
  category: string;
  isDebug?: boolean;
  debugValue?: string;
  [key: string]: unknown;
}

function CustomNodeComponent({ data, selected, id }: { data: CustomNodeData; selected?: boolean; id: string }) {
  const { lang } = useI18n();
  const def = getNodeTypeDef(data.nodeType);
  const Icon = def?.icon;
  const categoryColor = def?.color ?? 'bg-gray-500';

  const labelText =
    lang === 'zh' ? def?.label.zh ?? (data.label as string) : def?.label.en ?? (data.label as string);

  return (
    <div
      className={cn(
        'relative min-w-[160px] rounded-lg border bg-card shadow-sm transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/30 shadow-md'
          : 'border-border hover:border-primary/50',
        data.isDebug && 'ring-2 ring-warning animate-pulse'
      )}
    >
      {/* 顶部条 */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-medium text-white',
          categoryColor
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="truncate">{labelText}</span>
      </div>

      {/* 主体 */}
      <div className="px-3 py-2">
        {data.isDebug && data.debugValue !== undefined && (
          <div className="mb-1 rounded bg-warning/20 px-2 py-1 text-center font-mono text-xs text-warning-foreground">
            {String(data.debugValue)}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">ID: {String(id).slice(0, 8)}</div>
      </div>

      {/* 输入端口 */}
      {def?.inputs.map((port, idx) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: 40 + idx * 18,
            width: 10,
            height: 10,
            backgroundColor: 'hsl(210 10% 20%)',
            border: '2px solid hsl(210 8% 40%)',
          }}
        />
      ))}

      {/* 输出端口 */}
      {def?.outputs.map((port, idx) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: 40 + idx * 18,
            width: 10,
            height: 10,
            backgroundColor: 'hsl(192 85% 55%)',
            border: '2px solid hsl(192 85% 70%)',
          }}
        />
      ))}
    </div>
  );
}

export default memo(CustomNodeComponent);

// 类型辅助：将 ILogicNode 转换为 React Flow Node
export function logicNodeToFlowNode(node: ILogicNode) {
  const def = getNodeTypeDef(node.type);
  return {
    id: node.id,
    type: 'custom',
    position: node.position,
    data: {
      label: node.label.zh,
      nodeType: node.type,
      category: node.category,
    } as CustomNodeData,
  };
}

// 将 React Flow Node 转换回 ILogicNode
export function flowNodeToLogicNode(flowNode: {
  id: string;
  position: { x: number; y: number };
  data: CustomNodeData;
}): ILogicNode {
  const def = getNodeTypeDef(String(flowNode.data.nodeType));
  return {
    id: flowNode.id,
    type: String(flowNode.data.nodeType),
    category: flowNode.data.category as ILogicNode['category'],
    label: def?.label ?? { zh: String(flowNode.data.label), en: String(flowNode.data.label) },
    position: flowNode.position,
    properties: {},
  };
}
