// EXPORTS: IProject, IComponentInstance, IPinMapping, ILogicGraph, ILogicNode, ILogicEdge, IPreferences, IBoardInstance, IPortType
// 项目类型定义（无外部依赖）

export type IPortType = 'digital' | 'analog' | 'i2c' | 'spi' | 'uart' | 'pwm' | 'generic';

export interface IPinMapping {
  [componentPinName: string]: string;
}

export interface IBoardInstance {
  boardId: string;
  name: { zh: string; en: string };
}

export interface IComponentInstance {
  id: string;
  componentId: string;
  name: string;
  pinMapping: IPinMapping;
  position?: { x: number; y: number };
}

export interface ILogicNode {
  id: string;
  type: string;
  category: 'input' | 'process' | 'output' | 'flow' | 'wireless';
  label: { zh: string; en: string };
  position: { x: number; y: number };
  properties: Record<string, any>;
  componentInstanceId?: string;
}

export interface ILogicEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

export interface ILogicGraph {
  nodes: ILogicNode[];
  edges: ILogicEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface IProject {
  id: string;
  name: string;
  platformVersion: string;
  createdAt: number;
  updatedAt: number;
  board: IBoardInstance;
  components: IComponentInstance[];
  logicGraph: ILogicGraph;
  customCode?: string;
  metadata: {
    template?: boolean;
    description?: string;
  };
}

export interface IPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  debugMode: boolean;
}

// 平台版本（用于迁移判断）
export const PLATFORM_VERSION = '1.1.0';
