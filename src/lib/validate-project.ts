// EXPORTS: validateProject, ProjectValidationError, ValidationErrorType
// .thingflow 文件 Schema 校验

import type { IProject } from '@/types/project';
import { MOCK_BOARDS } from '@/data/boards';

export type ValidationErrorType =
  | 'invalid_json'
  | 'missing_version'
  | 'version_too_old'
  | 'version_too_new'
  | 'missing_board'
  | 'invalid_board'
  | 'invalid_components'
  | 'invalid_logic_graph'
  | 'unknown_error';

export class ProjectValidationError extends Error {
  type: ValidationErrorType;
  constructor(type: ValidationErrorType, message: string) {
    super(message);
    this.type = type;
    this.name = 'ProjectValidationError';
  }
}

const MIN_SUPPORTED_VERSION = '1.0.0';
const MAX_SUPPORTED_VERSION = '2.0.0';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * 校验导入的项目数据是否合法
 * 校验通过返回 IProject，失败抛出 ProjectValidationError
 */
export function validateProject(data: unknown): IProject {
  if (typeof data !== 'object' || data === null) {
    throw new ProjectValidationError('invalid_json', '不是有效的 JSON 对象');
  }

  const proj = data as Record<string, unknown>;

  // 1. 版本校验
  if (!proj.platformVersion || typeof proj.platformVersion !== 'string') {
    throw new ProjectValidationError('missing_version', '缺少平台版本信息');
  }
  if (compareVersions(proj.platformVersion, MIN_SUPPORTED_VERSION) < 0) {
    throw new ProjectValidationError(
      'version_too_old',
      `文件版本过旧（${proj.platformVersion}），请使用新版本平台打开`
    );
  }
  if (compareVersions(proj.platformVersion, MAX_SUPPORTED_VERSION) >= 0) {
    throw new ProjectValidationError(
      'version_too_new',
      `文件版本过新（${proj.platformVersion}），请升级平台后再打开`
    );
  }

  // 2. 开发板校验
  const boardId = proj.boardId ?? (proj.board as Record<string, unknown> | undefined)?.boardId;
  if (!boardId || typeof boardId !== 'string') {
    throw new ProjectValidationError('missing_board', '缺少开发板信息');
  }
  const boardExists = MOCK_BOARDS.some((b) => b.id === boardId);
  if (!boardExists) {
    throw new ProjectValidationError('invalid_board', `开发板 "${boardId}" 不存在或不支持`);
  }

  // 3. 配件列表校验
  if (proj.components !== undefined && !Array.isArray(proj.components)) {
    throw new ProjectValidationError('invalid_components', '配件列表格式错误');
  }

  // 4. 逻辑图校验
  if (proj.logicGraph !== undefined) {
    const graph = proj.logicGraph as Record<string, unknown>;
    if (typeof graph !== 'object' || graph === null) {
      throw new ProjectValidationError('invalid_logic_graph', '逻辑图格式错误');
    }
    if (graph.nodes !== undefined && !Array.isArray(graph.nodes)) {
      throw new ProjectValidationError('invalid_logic_graph', '逻辑节点列表格式错误');
    }
    if (graph.edges !== undefined && !Array.isArray(graph.edges)) {
      throw new ProjectValidationError('invalid_logic_graph', '逻辑连线列表格式错误');
    }
  }

  // 5. 基本字段校验通过，返回（调用方负责迁移 boardId → board 嵌套结构）
  return data as IProject;
}

/**
 * 将校验错误类型映射为中文用户提示
 */
export function getValidationErrorMessage(type: ValidationErrorType): string {
  const messages: Record<ValidationErrorType, string> = {
    invalid_json: '文件损坏或不是有效的 JSON 格式',
    missing_version: '文件缺少版本信息，可能不是 ThingFlow 项目文件',
    version_too_old: '文件版本过旧，请使用新版本平台打开',
    version_too_new: '文件版本过新，请升级平台后再打开',
    missing_board: '文件缺少开发板信息',
    invalid_board: '开发板型号不支持',
    invalid_components: '配件数据格式错误',
    invalid_logic_graph: '逻辑图数据格式错误',
    unknown_error: '文件解析失败，未知错误',
  };
  return messages[type] ?? messages.unknown_error;
}
