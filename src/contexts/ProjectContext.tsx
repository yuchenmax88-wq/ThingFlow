import { createContext, useContext, useEffect, useMemo, useReducer, useCallback, type ReactNode } from 'react';
import type { IProject, IComponentInstance, ILogicNode, ILogicEdge, ILogicGraph, IBoardInstance } from '@/types/project';
import { PLATFORM_VERSION } from '@/types/project';
import { generateId, debounce } from '@/lib/utils';
import { MOCK_BOARDS, type IBoardDef } from '@/data/boards';
import { MOCK_COMPONENTS, type IComponentDef } from '@/data/components';
import { createProjectFromTemplate } from '@/data/templates';
import {
  isIndexedDBAvailable,
  loadAllProjectsFromDB,
  saveProjectToDB,
  deleteProjectFromDB,
  updateProjectInDB,
  loadProjectFromDB,
} from '@/lib/project-db';
import { validateProject, getValidationErrorMessage, type ValidationErrorType } from '@/lib/validate-project';
import { sanitizeSensitiveFields } from '@/lib/sanitize';
import { toast } from 'sonner';
import { useI18n } from './I18nContext';
import * as pako from 'pako';

interface ProjectState {
  currentProject: IProject;
  projects: IProject[];
  selectedComponentId: string | null;
  selectedNodeId: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  debugMode: boolean;
  useIndexedDB: boolean;
  debugValues: Record<string, string>;
}

type ProjectAction =
  | { type: 'SET_PROJECT'; project: IProject }
  | { type: 'SET_PROJECTS'; projects: IProject[] }
  | { type: 'SET_BOARD'; boardId: string }
  | { type: 'ADD_COMPONENT'; component: IComponentInstance }
  | { type: 'REMOVE_COMPONENT'; id: string }
  | { type: 'UPDATE_COMPONENT'; id: string; updates: Partial<IComponentInstance> }
  | { type: 'SET_PIN_MAPPING'; componentId: string; pinName: string; pinValue: string }
  | { type: 'SELECT_COMPONENT'; id: string | null }
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'ADD_NODE'; node: ILogicNode }
  | { type: 'REMOVE_NODE'; id: string }
  | { type: 'UPDATE_NODE'; id: string; updates: Partial<ILogicNode> }
  | { type: 'ADD_EDGE'; edge: ILogicEdge }
  | { type: 'REMOVE_EDGE'; id: string }
  | { type: 'SET_GRAPH_VIEWPORT'; viewport: { x: number; y: number; zoom: number } }
  | { type: 'SET_SAVE_STATUS'; status: 'saved' | 'saving' | 'unsaved' }
  | { type: 'TOGGLE_DEBUG_MODE' }
  | { type: 'RENAME_PROJECT'; name: string }
  | { type: 'SMART_RECOMMEND_PINS'; componentId: string }
  | { type: 'SET_DEBUG_VALUE'; nodeId: string; value: string }
  | { type: 'CLEAR_DEBUG_VALUES' };

const STORAGE_KEY = '__thingflow_projects';
const CURRENT_KEY = '__thingflow_current_project';

/**
 * 迁移旧版项目数据（boardId 字符串 → board: IBoardInstance 嵌套结构）
 */
function migrateProject(proj: Record<string, unknown>): IProject {
  // 如果已经是 board 嵌套结构，直接返回
  if (proj.board && typeof proj.board === 'object') {
    return proj as unknown as IProject;
  }

  // 旧版 boardId 字符串，迁移为嵌套结构
  const boardId = proj.boardId as string | undefined;
  const boardDef = boardId ? MOCK_BOARDS.find((b) => b.id === boardId) : null;
  const board: IBoardInstance = {
    boardId: boardId ?? MOCK_BOARDS[0].id,
    name: boardDef?.name ?? { zh: '未知开发板', en: 'Unknown Board' },
  };

  const { boardId: _oldBoardId, ...rest } = proj;
  return {
    ...(rest as unknown as Omit<IProject, 'board'>),
    board,
    platformVersion: PLATFORM_VERSION,
  } as IProject;
}

function createDefaultProject(): IProject {
  const board = MOCK_BOARDS[0];
  return {
    id: generateId('proj'),
    name: '未命名项目',
    platformVersion: PLATFORM_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    board: {
      boardId: board.id,
      name: board.name,
    },
    components: [],
    logicGraph: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    metadata: {},
  };
}

/**
 * 从存储加载项目（优先 IndexedDB，降级 localStorage）
 */
async function loadProjects(): Promise<{ projects: IProject[]; current: IProject; useIndexedDB: boolean }> {
  const idbAvailable = isIndexedDBAvailable();

  if (idbAvailable) {
    try {
      const dbProjects = await loadAllProjectsFromDB();
      let currentId: string | null = null;
      try {
        currentId = localStorage.getItem(CURRENT_KEY);
      } catch {
        /* ignore */
      }

      if (dbProjects.length > 0) {
        const current =
          dbProjects.find((p) => p.id === currentId) ?? dbProjects[0];
        return { projects: dbProjects, current, useIndexedDB: true };
      }
    } catch {
      // IndexedDB 读取失败，降级到 localStorage
    }
  }

  // localStorage 兜底
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const currentId = localStorage.getItem(CURRENT_KEY);
    if (raw) {
      const rawProjects = JSON.parse(raw) as Record<string, unknown>[];
      const projects = rawProjects.map((p) => migrateProject(p));
      const current = projects.find((p) => p.id === currentId) ?? projects[0] ?? createDefaultProject();
      return { projects, current, useIndexedDB: false };
    }
  } catch {
    /* ignore */
  }

  const def = createDefaultProject();
  return { projects: [def], current: def, useIndexedDB: idbAvailable };
}

function saveProjectsLocal(projects: IProject[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    /* ignore */
  }
}

function reducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        currentProject: action.project,
        saveStatus: 'saved',
        selectedComponentId: null,
        selectedNodeId: null,
      };
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects };
    case 'SET_BOARD': {
      const boardDef = MOCK_BOARDS.find((b) => b.id === action.boardId);
      const updated = {
        ...state.currentProject,
        board: {
          boardId: action.boardId,
          name: boardDef?.name ?? { zh: '未知', en: 'Unknown' },
        },
        updatedAt: Date.now(),
        components: [],
      };
      return {
        ...state,
        currentProject: updated,
        saveStatus: 'unsaved',
        selectedComponentId: null,
      };
    }
    case 'ADD_COMPONENT': {
      const updated = {
        ...state.currentProject,
        components: [...state.currentProject.components, action.component],
        updatedAt: Date.now(),
      };
      return {
        ...state,
        currentProject: updated,
        saveStatus: 'unsaved',
        selectedComponentId: action.component.id,
      };
    }
    case 'REMOVE_COMPONENT': {
      const updated = {
        ...state.currentProject,
        components: state.currentProject.components.filter((c) => c.id !== action.id),
        updatedAt: Date.now(),
      };
      return {
        ...state,
        currentProject: updated,
        saveStatus: 'unsaved',
        selectedComponentId: state.selectedComponentId === action.id ? null : state.selectedComponentId,
      };
    }
    case 'UPDATE_COMPONENT': {
      const updated = {
        ...state.currentProject,
        components: state.currentProject.components.map((c) =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'SET_PIN_MAPPING': {
      const updated = {
        ...state.currentProject,
        components: state.currentProject.components.map((c) =>
          c.id === action.componentId
            ? { ...c, pinMapping: { ...c.pinMapping, [action.pinName]: action.pinValue } }
            : c
        ),
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'SELECT_COMPONENT':
      return { ...state, selectedComponentId: action.id, selectedNodeId: null };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id, selectedComponentId: null };
    case 'ADD_NODE': {
      const updated = {
        ...state.currentProject,
        logicGraph: {
          ...state.currentProject.logicGraph,
          nodes: [...state.currentProject.logicGraph.nodes, action.node],
        },
        updatedAt: Date.now(),
      };
      return {
        ...state,
        currentProject: updated,
        saveStatus: 'unsaved',
        selectedNodeId: action.node.id,
      };
    }
    case 'REMOVE_NODE': {
      const updated = {
        ...state.currentProject,
        logicGraph: {
          ...state.currentProject.logicGraph,
          nodes: state.currentProject.logicGraph.nodes.filter((n) => n.id !== action.id),
          edges: state.currentProject.logicGraph.edges.filter(
            (e) => e.source !== action.id && e.target !== action.id
          ),
        },
        updatedAt: Date.now(),
      };
      return {
        ...state,
        currentProject: updated,
        saveStatus: 'unsaved',
        selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
      };
    }
    case 'UPDATE_NODE': {
      const updated = {
        ...state.currentProject,
        logicGraph: {
          ...state.currentProject.logicGraph,
          nodes: state.currentProject.logicGraph.nodes.map((n) =>
            n.id === action.id ? { ...n, ...action.updates } : n
          ),
        },
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'ADD_EDGE': {
      const updated = {
        ...state.currentProject,
        logicGraph: {
          ...state.currentProject.logicGraph,
          edges: [...state.currentProject.logicGraph.edges, action.edge],
        },
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'REMOVE_EDGE': {
      const updated = {
        ...state.currentProject,
        logicGraph: {
          ...state.currentProject.logicGraph,
          edges: state.currentProject.logicGraph.edges.filter((e) => e.id !== action.id),
        },
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'SET_GRAPH_VIEWPORT': {
      const updated = {
        ...state.currentProject,
        logicGraph: { ...state.currentProject.logicGraph, viewport: action.viewport },
      };
      return { ...state, currentProject: updated };
    }
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.status };
    case 'TOGGLE_DEBUG_MODE':
      return { ...state, debugMode: !state.debugMode };
    case 'RENAME_PROJECT': {
      const updated = { ...state.currentProject, name: action.name, updatedAt: Date.now() };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'SMART_RECOMMEND_PINS': {
      const board = MOCK_BOARDS.find((b) => b.id === state.currentProject.board.boardId);
      const comp = state.currentProject.components.find((c) => c.id === action.componentId);
      const compDef = MOCK_COMPONENTS.find((c) => c.id === comp?.componentId);
      if (!board || !comp || !compDef) return state;

      const usedPins = new Set<string>();
      state.currentProject.components.forEach((c) => {
        if (c.id !== action.componentId) {
          Object.values(c.pinMapping).forEach((p) => usedPins.add(p));
        }
      });

      const newMapping: Record<string, string> = { ...comp.pinMapping };

      compDef.pins.forEach((pin) => {
        if (newMapping[pin.name] && !usedPins.has(newMapping[pin.name])) return;

        let candidates: string[] = [];
        if (pin.type === 'power') {
          candidates = board.pins
            .filter((p) => p.functions.includes('VCC'))
            .filter(
              (p) =>
                compDef.voltage === 'both' ||
                !pin.required ||
                p.voltage === compDef.voltage ||
                p.voltage === '5V' ||
                p.voltage === '3.3V'
            )
            .map((p) => p.number);
        } else if (pin.type === 'ground') {
          candidates = board.pins.filter((p) => p.functions.includes('GND')).map((p) => p.number);
        } else if (pin.signalType === 'i2c-sda') {
          candidates = board.pins.filter((p) => p.functions.includes('I2C-SDA')).map((p) => p.number);
        } else if (pin.signalType === 'i2c-scl') {
          candidates = board.pins.filter((p) => p.functions.includes('I2C-SCL')).map((p) => p.number);
        } else if (pin.signalType === 'analog') {
          candidates = board.pins.filter((p) => p.functions.includes('ADC')).map((p) => p.number);
        } else {
          candidates = board.pins
            .filter(
              (p) => p.functions.includes('GPIO') && !p.functions.includes('VCC') && !p.functions.includes('GND')
            )
            .map((p) => p.number);
        }

        const available = candidates.filter((c) => !usedPins.has(c));
        if (available.length > 0) {
          newMapping[pin.name] = available[0];
          usedPins.add(available[0]);
        } else if (candidates.length > 0) {
          newMapping[pin.name] = candidates[0];
        }
      });

      const updated = {
        ...state.currentProject,
        components: state.currentProject.components.map((c) =>
          c.id === action.componentId ? { ...c, pinMapping: newMapping } : c
        ),
        updatedAt: Date.now(),
      };
      return { ...state, currentProject: updated, saveStatus: 'unsaved' };
    }
    case 'SET_DEBUG_VALUE': {
      const newDebugValues = { ...state.debugValues, [action.nodeId]: action.value };
      return { ...state, debugValues: newDebugValues };
    }
    case 'CLEAR_DEBUG_VALUES': {
      return { ...state, debugValues: {} };
    }
    default:
      return state;
  }
}

interface ProjectContextValue {
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  currentBoard: IBoardDef | undefined;
  getComponentDef: (id: string) => IComponentDef | undefined;
  getPinConflicts: () => { pin: string; components: string[] }[];
  addComponent: (componentDefId: string) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  setPinMapping: (componentId: string, pinName: string, pinValue: string) => void;
  smartRecommendPins: (componentId: string) => void;
  setBoard: (boardId: string) => void;
  renameProject: (name: string) => void;
  createNewProject: () => void;
  createFromTemplate: (templateId: string) => void;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  exportProject: () => void;
  importProject: (file: File) => Promise<void>;
  toggleDebugMode: () => void;
  loadSharedProject: (data: string) => Promise<void>;
  setDebugValue: (nodeId: string, value: string) => void;
  clearDebugValues: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  // 初始状态：先用默认值，等异步加载 IndexedDB 后再更新
  const [state, dispatch] = useReducer(reducer, {
    currentProject: createDefaultProject(),
    projects: [],
    selectedComponentId: null,
    selectedNodeId: null,
    saveStatus: 'saved',
    debugMode: false,
    useIndexedDB: isIndexedDBAvailable(),
    debugValues: {},
  });

  // 异步加载项目数据
  useEffect(() => {
    let mounted = true;
    loadProjects().then(({ projects, current, useIndexedDB }) => {
      if (!mounted) return;
      dispatch({ type: 'SET_PROJECTS', projects });
      dispatch({ type: 'SET_PROJECT', project: current });
      if (!useIndexedDB) {
        // 标记为使用 localStorage
        dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
      }

      // 检查 URL hash 中是否有分享数据
      try {
        const hash = window.location.hash;
        if (hash.startsWith('#share=')) {
          const encoded = hash.slice(7);
          if (encoded) {
            // 延迟到下一帧加载，确保状态已初始化
            requestAnimationFrame(() => {
              loadSharedProjectFromHash(encoded);
            });
          }
        }
      } catch {
        /* ignore hash parse errors */
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentBoard = useMemo(
    () => MOCK_BOARDS.find((b) => b.id === state.currentProject.board.boardId),
    [state.currentProject.board.boardId]
  );

  const getComponentDef = useCallback((id: string) => MOCK_COMPONENTS.find((c) => c.id === id), []);

  const getPinConflicts = useCallback(() => {
    const pinMap = new Map<string, string[]>();
    state.currentProject.components.forEach((comp) => {
      Object.values(comp.pinMapping).forEach((pin) => {
        if (!pin) return;
        if (!pinMap.has(pin)) pinMap.set(pin, []);
        pinMap.get(pin)!.push(comp.name);
      });
    });
    const conflicts: { pin: string; components: string[] }[] = [];
    pinMap.forEach((comps, pin) => {
      if (comps.length > 1 && pin !== 'GND' && !pin.includes('GND')) {
        conflicts.push({ pin, components: comps });
      }
    });
    return conflicts;
  }, [state.currentProject.components]);

  const addComponent = useCallback(
    (componentDefId: string) => {
      const def = MOCK_COMPONENTS.find((c) => c.id === componentDefId);
      if (!def) return;

      const board = currentBoard;
      if (board) {
        const compatible = checkCompatibility(def, board);
        if (!compatible) {
          toast.error(t('sidebar.incompatible'));
          return;
        }
      }

      const count =
        state.currentProject.components.filter((c) => c.componentId === componentDefId).length + 1;
      const instance: IComponentInstance = {
        id: generateId('comp'),
        componentId: componentDefId,
        name: `${def.name.zh} ${count}`,
        pinMapping: {},
      };
      dispatch({ type: 'ADD_COMPONENT', component: instance });
      dispatch({ type: 'SMART_RECOMMEND_PINS', componentId: instance.id });

      // 自动创建对应的逻辑节点
      const nodeTypeMap: Record<string, string> = {
        sensor: 'sensor-read',
        actuator: 'led-control',
        display: 'display-out',
        communication: 'sensor-read',
      };
      const nodeType = nodeTypeMap[def.category] ?? 'sensor-read';
      const nodeLabel = def.name.zh;
      const autoNode: ILogicNode = {
        id: generateId('node'),
        type: nodeType,
        category: def.category === 'actuator' ? 'output' : def.category === 'display' ? 'output' : 'input',
        label: { zh: nodeLabel, en: def.name.en },
        position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
        properties: { componentId: instance.id },
        componentInstanceId: instance.id,
      };
      dispatch({ type: 'ADD_NODE', node: autoNode });
    },
    [currentBoard, state.currentProject.components, t]
  );

  const removeComponent = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', id });
  }, []);

  const selectComponent = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_COMPONENT', id });
  }, []);

  const selectNode = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_NODE', id });
  }, []);

  const setPinMapping = useCallback((componentId: string, pinName: string, pinValue: string) => {
    dispatch({ type: 'SET_PIN_MAPPING', componentId, pinName, pinValue });
  }, []);

  const smartRecommendPins = useCallback((componentId: string) => {
    dispatch({ type: 'SMART_RECOMMEND_PINS', componentId });
    toast.success(t('props.smartRecommend'));
  }, [t]);

  const setBoard = useCallback((boardId: string) => {
    dispatch({ type: 'SET_BOARD', boardId });
  }, []);

  const renameProject = useCallback((name: string) => {
    dispatch({ type: 'RENAME_PROJECT', name });
  }, []);

  const createNewProject = useCallback(() => {
    const newProj = createDefaultProject();
    const updated = [...state.projects, newProj];
    dispatch({ type: 'SET_PROJECTS', projects: updated });
    dispatch({ type: 'SET_PROJECT', project: newProj });
    try {
      localStorage.setItem(CURRENT_KEY, newProj.id);
    } catch {
      /* ignore */
    }
    // 异步写入 IndexedDB
    if (state.useIndexedDB) {
      saveProjectToDB(newProj).catch(() => {
        /* ignore */
      });
    }
  }, [state.projects, state.useIndexedDB]);

  const createFromTemplate = useCallback(
    (templateId: string) => {
      const newId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newProj = createProjectFromTemplate(templateId, newId);
      if (!newProj) return;
      const updated = [...state.projects, newProj];
      dispatch({ type: 'SET_PROJECTS', projects: updated });
      dispatch({ type: 'SET_PROJECT', project: newProj });
      try {
        localStorage.setItem(CURRENT_KEY, newProj.id);
      } catch {
        /* ignore */
      }
      if (state.useIndexedDB) {
        saveProjectToDB(newProj).catch(() => {
          /* ignore */
        });
      }
    },
    [state.projects, state.useIndexedDB]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const updated = state.projects.filter((p) => p.id !== id);
      let nextProject: IProject;
      if (updated.length === 0) {
        nextProject = createDefaultProject();
        updated.push(nextProject);
      } else {
        nextProject = updated[0];
      }
      dispatch({ type: 'SET_PROJECTS', projects: updated });
      if (state.currentProject.id === id) {
        dispatch({ type: 'SET_PROJECT', project: nextProject });
        try {
          localStorage.setItem(CURRENT_KEY, nextProject.id);
        } catch {
          /* ignore */
        }
      }
      // 异步删除 IndexedDB
      if (state.useIndexedDB) {
        deleteProjectFromDB(id).catch(() => {
          /* ignore */
        });
      }
    },
    [state.projects, state.currentProject.id, state.useIndexedDB]
  );

  const switchProject = useCallback(
    (id: string) => {
      const proj = state.projects.find((p) => p.id === id);
      if (proj) {
        dispatch({ type: 'SET_PROJECT', project: proj });
        try {
          localStorage.setItem(CURRENT_KEY, id);
        } catch {
          /* ignore */
        }
      }
    },
    [state.projects]
  );

  const exportProject = useCallback(() => {
    // 导出前脱敏敏感字段
    const sanitized = sanitizeSensitiveFields(state.currentProject);
    const data = JSON.stringify(sanitized, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentProject.name}.thingflow`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('project.exportSuccess'));
  }, [state.currentProject, t]);

  const importProject = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const raw = JSON.parse(text);

        // Schema 校验
        const validated = validateProject(raw);

        // 迁移旧格式
        const migrated = migrateProject(validated as unknown as Record<string, unknown>);

        // 生成新 ID，避免冲突
        migrated.id = generateId('proj');
        migrated.createdAt = Date.now();
        migrated.updatedAt = Date.now();

        const updated = [...state.projects, migrated];
        dispatch({ type: 'SET_PROJECTS', projects: updated });
        dispatch({ type: 'SET_PROJECT', project: migrated });
        try {
          localStorage.setItem(CURRENT_KEY, migrated.id);
        } catch {
          /* ignore */
        }

        // 异步写入 IndexedDB
        if (state.useIndexedDB) {
          saveProjectToDB(migrated).catch(() => {
            /* ignore */
          });
        }

        toast.success(t('project.importSuccess'));
      } catch (e) {
        const errorType = (e as { type?: ValidationErrorType })?.type;
        if (errorType) {
          toast.error(getValidationErrorMessage(errorType));
        } else {
          toast.error(t('common.error'));
        }
      }
    },
    [state.projects, state.useIndexedDB, t]
  );

  const loadSharedProject = useCallback(
    async (encodedData: string) => {
      try {
        // 1. 恢复 Base64 (short format: - → +, _ → /, add padding)
        const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLen);
        const binaryStr = atob(padded);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // 2. pako inflate 解压
        const decompressed = pako.inflate(bytes);
        const jsonStr = new TextDecoder().decode(decompressed);
        const raw = JSON.parse(jsonStr);

        let migrated: IProject;

        // 3. 处理新格式 (minimal: {v, n, b, c, g}) vs 旧格式 (完整 IProject)
        if (raw.v && raw.b && raw.c) {
          // 新格式 - 从最小字段重建项目
          const boardDef = MOCK_BOARDS.find((board) => board.id === raw.b);
          const components: IComponentInstance[] = (raw.c as Array<{ i: string; m: Record<string, string> }>).map((c) => {
            const def = MOCK_COMPONENTS.find((comp) => comp.id === c.i);
            return {
              id: generateId('comp'),
              componentId: c.i,
              name: def?.name.zh ?? c.i,
              pinMapping: c.m,
            };
          });
          const logicGraph: ILogicGraph = {
            nodes: ((raw.g?.n ?? []) as Array<{ t: string; a: string; p: { x: number; y: number }; r: Record<string, any> }>).map((n) => ({
              id: generateId('node'),
              type: n.t,
              category: n.a as ILogicNode['category'],
              label: { zh: n.t, en: n.t },
              position: n.p,
              properties: n.r ?? {},
            })),
            edges: ((raw.g?.e ?? []) as Array<{ s: string; p: string; t: string; q: string }>).map((e) => ({
              id: generateId('edge'),
              source: e.s,
              sourcePort: e.p,
              target: e.t,
              targetPort: e.q,
            })),
            viewport: { x: 0, y: 0, zoom: 1 },
          };
          migrated = {
            id: generateId('proj'),
            name: raw.n || '导入项目',
            platformVersion: PLATFORM_VERSION,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            board: {
              boardId: raw.b,
              name: boardDef?.name ?? { zh: '未知开发板', en: 'Unknown Board' },
            },
            components,
            logicGraph,
            metadata: { description: '从分享链接导入' },
          };
        } else {
          // 旧格式 - Schema 校验 + 迁移
          const validated = validateProject(raw);
          migrated = migrateProject(validated as unknown as Record<string, unknown>);
          migrated.id = generateId('proj');
          migrated.createdAt = Date.now();
          migrated.updatedAt = Date.now();
          migrated.metadata = { ...migrated.metadata, description: '从分享链接导入' };
        }

        const updated = [...state.projects, migrated];
        dispatch({ type: 'SET_PROJECTS', projects: updated });
        dispatch({ type: 'SET_PROJECT', project: migrated });
        try {
          localStorage.setItem(CURRENT_KEY, migrated.id);
        } catch {
          /* ignore */
        }

        if (state.useIndexedDB) {
          saveProjectToDB(migrated).catch(() => {
            /* ignore */
          });
        }

        toast.success(t('share.externalWarning'));
      } catch {
        toast.error(t('share.linkBroken'));
      }
    },
    [state.projects, state.useIndexedDB, t]
  );

  // 从 URL hash 加载分享项目（内部使用，不依赖 state）
  const loadSharedProjectFromHash = useCallback(
    async (encodedData: string) => {
      try {
        const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLen);
        const binaryStr = atob(padded);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const decompressed = pako.inflate(bytes);
        const jsonStr = new TextDecoder().decode(decompressed);
        const raw = JSON.parse(jsonStr);

        let migrated: IProject;
        if (raw.v && raw.b && raw.c) {
          const boardDef = MOCK_BOARDS.find((board) => board.id === raw.b);
          const components: IComponentInstance[] = (raw.c as Array<{ i: string; m: Record<string, string> }>).map((c) => {
            const def = MOCK_COMPONENTS.find((comp) => comp.id === c.i);
            return { id: generateId('comp'), componentId: c.i, name: def?.name.zh ?? c.i, pinMapping: c.m };
          });
          const logicGraph: ILogicGraph = {
            nodes: ((raw.g?.n ?? []) as Array<any>).map((n: any) => ({
              id: generateId('node'), type: n.t, category: n.a as ILogicNode['category'],
              label: { zh: n.t, en: n.t }, position: n.p, properties: n.r ?? {},
            })),
            edges: ((raw.g?.e ?? []) as Array<any>).map((e: any) => ({
              id: generateId('edge'), source: e.s, sourcePort: e.p, target: e.t, targetPort: e.q,
            })),
            viewport: { x: 0, y: 0, zoom: 1 },
          };
          migrated = {
            id: generateId('proj'), name: raw.n || '导入项目', platformVersion: PLATFORM_VERSION,
            createdAt: Date.now(), updatedAt: Date.now(),
            board: { boardId: raw.b, name: boardDef?.name ?? { zh: '未知开发板', en: 'Unknown Board' } },
            components, logicGraph, metadata: { description: '从分享链接导入' },
          };
        } else {
          const validated = validateProject(raw);
          migrated = migrateProject(validated as unknown as Record<string, unknown>);
          migrated.id = generateId('proj');
          migrated.createdAt = Date.now();
          migrated.updatedAt = Date.now();
          migrated.metadata = { ...migrated.metadata, description: '从分享链接导入' };
        }

        dispatch({ type: 'SET_PROJECTS', projects: [migrated] });
        dispatch({ type: 'SET_PROJECT', project: migrated });
        try {
          localStorage.setItem(CURRENT_KEY, migrated.id);
        } catch {
          /* ignore */
        }

        if (isIndexedDBAvailable()) {
          saveProjectToDB(migrated).catch(() => {
            /* ignore */
          });
        }

        history.replaceState(null, '', window.location.pathname);

        toast.success(t('share.externalWarning'));
      } catch {
        toast.error(t('share.linkBroken'));
      }
    },
    [t]
  );

  // 设置调试节点数值（串口联动）
  const setDebugValue = useCallback((nodeId: string, value: string) => {
    dispatch({ type: 'SET_DEBUG_VALUE', nodeId, value });
  }, []);

  const clearDebugValues = useCallback(() => {
    dispatch({ type: 'CLEAR_DEBUG_VALUES' });
  }, []);

  const toggleDebugMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEBUG_MODE' });
  }, []);

  // 自动保存（防抖 500ms）
  useEffect(() => {
    if (state.saveStatus !== 'unsaved') return;
    if (state.projects.length === 0) return; // 还没加载完

    dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });

    const debouncedSave = debounce(async () => {
      const updatedProjects = state.projects.map((p) =>
        p.id === state.currentProject.id ? state.currentProject : p
      );

      try {
        if (state.useIndexedDB) {
          await updateProjectInDB(state.currentProject);
        } else {
          saveProjectsLocal(updatedProjects);
        }
        dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
      } catch {
        dispatch({ type: 'SET_SAVE_STATUS', status: 'unsaved' });
      }
    }, 500);

    debouncedSave();
  }, [state.saveStatus, state.currentProject, state.projects, state.useIndexedDB]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      state,
      dispatch,
      currentBoard,
      getComponentDef,
      getPinConflicts,
      addComponent,
      removeComponent,
      selectComponent,
      selectNode,
      setPinMapping,
      smartRecommendPins,
      setBoard,
      renameProject,
      createNewProject,
      createFromTemplate,
      deleteProject,
      switchProject,
      exportProject,
      importProject,
      toggleDebugMode,
      loadSharedProject,
      setDebugValue,
      clearDebugValues,
    }),
    [
      state,
      currentBoard,
      getComponentDef,
      getPinConflicts,
      addComponent,
      removeComponent,
      selectComponent,
      selectNode,
      setPinMapping,
      smartRecommendPins,
      setBoard,
      renameProject,
      createNewProject,
      createFromTemplate,
      deleteProject,
      switchProject,
      exportProject,
      importProject,
      toggleDebugMode,
      loadSharedProject,
      setDebugValue,
      clearDebugValues,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}

function checkCompatibility(comp: IComponentDef, board: IBoardDef): boolean {
  if (comp.protocol === 'i2c' && board.capabilities.i2c === 0) return false;
  if (comp.protocol === 'spi' && board.capabilities.spi === 0) return false;
  if (comp.protocol === 'uart' && board.capabilities.uart === 0) return false;
  if (comp.protocol === 'analog' && board.capabilities.adc === 0) return false;
  return true;
}
