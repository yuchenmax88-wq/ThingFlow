# ThingFlow 物联网开发平台 - 需求拆解文档

## 产品概述

- **产品类型**: 物联网开发 IDE 平台（Web 单页应用）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 初学者、创客、教育场景师生、快速原型验证的工程师
- **核心价值**: 零环境配置的硬件开发闭环——从选板、加配件、布引脚、图形化编程、生成代码到烧录监视，全部在浏览器内完成
- **界面语言**: 中文（支持中英文软切换 i18n）
- **主题偏好**: user_specified（支持浅色/深色/跟随系统三种模式，默认跟随系统）
- **导航模式**: 路径导航（单页内 Tab 切换，非多路由跳转）
- **导航布局**: Topbar（顶部导航栏）+ 左侧配件库面板 + 中间主工作区 + 右侧属性面板（IDE 三栏布局）

---

## 页面结构总览

> **说明**：本应用为单页 SPA，主工作区通过 Tab 切换不同视图，不做多路由跳转。所有功能在同一 IDE 布局内完成。

**页面文件**: `IDEPage.tsx`（单页，内含多个 Tab 视图）

| 区域 | 子区域/视图 | 说明 |
|-----|------------|------|
| 顶部导航栏 | - | 项目名、语言切换、主题切换、生成代码、烧录、分享、帮助按钮 |
| 左侧面板 | 配件库 | 可搜索、分类浏览、拖拽/点击添加配件，不兼容项灰色锁定 |
| 左侧面板 | 项目列表 | 多项目切换、新建、导入、模板选择（可折叠） |
| 中间主工作区 | 逻辑编辑器 Tab | 基于节点连线的图形化编程画布 |
| 中间主工作区 | 接线图视图 Tab | 实物风格接线示意图，高亮联动，支持导出 PNG |
| 中间主工作区 | 代码编辑器 Tab | 语法高亮代码展示，支持复制、下载 |
| 中间主工作区 | 串口监视器 Tab | 原始日志 + 数据仪表盘 + 发送面板 |
| 右侧属性面板 | 节点属性 | 选中逻辑节点时显示参数配置 |
| 右侧属性面板 | 配件属性 | 选中配件时显示引脚分配、引脚占用表、智能推荐按钮 |
| 右侧属性面板 | 项目属性 | 未选中任何元素时显示开发板信息、项目设置 |

---

## 页面布局建议

- **布局模式**: IDE 三栏布局（左配件库 + 中工作区 + 右属性面板），顶部全局导航栏——专业开发工具标准布局，符合用户对 IDE 的预期
- **视觉重心**: 中间主工作区（占比约 60%），核心交互在画布/接线图/代码上；左右面板为辅助，可折叠以扩大工作区
- **结果承载区**:
  - 逻辑编辑器：节点画布，初始态为空白画布 + 引导提示「从左侧拖拽配件或节点开始」
  - 接线图视图：SVG 接线示意图，初始态显示空开发板 + 提示「添加配件后自动生成接线图」
  - 代码编辑器：代码面板，初始态显示占位文案「点击顶部『生成代码』按钮」
  - 串口监视器：日志区 + 仪表盘，初始态显示「未连接设备，点击烧录后自动打开」
- **源材料承载区**: 左侧配件库始终可见，作为硬件选型的源材料区；右侧属性面板随选中对象动态变化

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 开发板库数据 | demo-mock | `src/data/boards.ts` 内置 20+ 款开发板 JSON 数据（含能力模型、引脚定义、多语言名称） | ✅ 本身就是 mock |
| 配件库数据 | demo-mock | `src/data/components.ts` 内置 30+ 款配件 JSON 数据（含引脚需求、协议、代码模板、多语言名称） | ✅ 本身就是 mock |
| 项目数据持久化 | local-persist | IndexedDB（主存储）+ localStorage（偏好设置），项目结构为 `.thingflow` JSON，自动保存 | 无（IndexedDB 不可用时降级到 localStorage） |
| 项目导入/导出 | import-export | 导出：Blob + a.click 下载 `.thingflow` 文件；导入：File API 读取 JSON 文件 | 无 |
| 接线图 PNG 导出 | import-export | SVG → Canvas 转换 → `toDataURL` → 下载 PNG | 无 |
| 分享链接生成 | import-export | pako deflate 压缩项目 JSON + Base64 编码拼到 URL hash + 二维码生成 + clipboard 复制 | 无（超限提示改用文件分享） |
| 代码下载/复制 | import-export | 复制用 `navigator.clipboard`；下载用 Blob + a.click | 无 |
| 串口模拟数据流 | demo-mock | `src/data/mockSerial.ts` 模拟传感器数据、日志输出、调试信息 | ✅ 本身就是 mock |
| 烧录流程模拟 | demo-mock | 状态机模拟连接→擦除→写入→验证→完成的进度流程 | ✅ 本身就是 mock |
| 内置项目模板 | demo-mock | `src/data/templates.ts` 内置「闪烁 LED」「气象站」等只读模板项目 | ✅ 本身就是 mock |
| 用户偏好（主题/语言） | local-persist | localStorage key=`__thingflow_preferences`，存 theme/language | 无（默认跟随系统+中文） |
| 节点逻辑图数据 | local-persist | 随项目存入 IndexedDB，含节点位置、连线、属性 | 无 |
| 引脚分配数据 | local-persist | 随项目存入 IndexedDB，含配件实例与引脚映射关系 | 无 |

> 本项目无 AI 插件需求，所有功能均为前端规则化逻辑 + 内置 mock 数据。

---

## 导航配置

- **导航布局**: Topbar（顶部固定导航栏）+ 左侧可折叠面板 + 右侧可折叠属性面板
- **顶部导航项**（一级操作按钮）:

| 导航/操作项 | 类型 | 说明 |
|-----------|------|------|
| 项目名称（下拉） | 菜单 | 点击展开项目列表：新建、打开、重命名、删除、导入、导出 |
| 语言切换 | 下拉 | 中文 / English 切换 |
| 主题切换 | 按钮组 | 浅色 / 深色 / 跟随系统 三态切换 |
| 生成代码 | 主按钮 | 触发代码生成，切换到代码编辑器 Tab |
| 烧录 | 主按钮 | 触发烧录流程弹窗，完成后打开串口监视器 |
| 分享 | 按钮 | 生成分享链接弹窗（二维码 + 复制） |
| 帮助 | 按钮 | 打开帮助中心抽屉（FAQ + 故障排除） |

- **主工作区 Tab 切换**（非导航，是视图切换）:

| Tab 名称 | 视图 |
|---------|------|
| 逻辑编辑器 | 节点画布 |
| 接线图 | 接线可视化视图 |
| 代码 | 代码编辑器 |
| 串口监视器 | 串口监控视图 |

---

## 功能列表

### 顶部导航栏

- **页面目标**: 提供全局操作入口和项目管理
- **功能点**:
  - **项目管理下拉菜单**: 展示项目列表，支持新建项目、切换项目、重命名、删除、导入 `.thingflow` 文件、导出当前项目、从模板创建
  - **语言切换**: 下拉选择中文/English，即时切换所有 UI 文案、硬件名称、代码注释，用户自定义内容保持原样
  - **主题切换**: 三态按钮（浅色/深色/跟随系统），切换 CSS 变量，偏好存 localStorage，串口监视器深色模式为黑底绿字终端风
  - **生成代码按钮**: 触发拓扑排序 + 代码生成逻辑，自动切换到代码 Tab，按钮带加载状态
  - **烧录按钮**: 打开烧录确认弹窗（芯片型号、固件大小、擦除区域），确认后模拟烧录进度，完成自动跳转串口监视器
  - **分享按钮**: 打开分享弹窗，显示压缩后的 URL、二维码、复制按钮，敏感字段自动替换为占位符
  - **帮助按钮**: 右侧抽屉式帮助中心，含 FAQ 分类和故障排除指南

### 左侧配件库面板

- **页面目标**: 硬件选型与配件添加的入口
- **功能点**:
  - **配件分类导航**: 传感器/执行器/显示/通信/其他 五类 Tab 切换
  - **搜索过滤**: 输入关键词实时过滤配件列表
  - **配件卡片列表**: 每个配件显示图标+名称，不兼容当前开发板的配件灰色锁定并悬停提示「当前开发板不支持 XX 协议」
  - **拖拽/点击添加**: 拖拽到逻辑画布或接线图即创建配件实例；点击也可添加
  - **项目列表折叠区**: 顶部可折叠的项目切换区，显示当前项目名和模板入口

### 逻辑编辑器（主工作区 Tab 1）

- **页面目标**: 图形化节点编程，构建硬件逻辑
- **功能点**:
  - **节点画布**: 支持拖拽移动、缩放、框选、平移，节点类型包括输入/处理/输出/流程控制/无线五大类
  - **端口类型校验**: 连线仅允许类型兼容的端口（数字/模拟/I2C/SPI/通用）相连，不兼容时连线显示红色禁止态
  - **节点属性配置**: 点击节点在右侧面板显示属性表单（阈值、延时、URL、引脚等参数）
  - **节点操作**: 支持复制/粘贴/删除节点，框选多选批量操作
  - **调试高亮联动**: 串口监视器解析到 `__TF_NODE:ID` 调试输出时，对应节点高亮闪烁
  - **自动布局**（可选增强）: 一键整理节点位置

### 接线图视图（主工作区 Tab 2）⭐ 重点功能

- **页面目标**: 可视化展示硬件接线方式，支持手动引脚分配
- **功能点**:
  - **自动生成接线示意图**: SVG 绘制开发板插画 + 配件插画，彩色连线（红=电源、黑=GND、黄/蓝=信号），标注引脚号与引脚名
  - **接线图 PNG 导出**: 点击导出按钮，将 SVG 转换为 PNG 图片下载
  - **配件选中联动高亮**: 在左侧配件列表/逻辑图中选中配件，接线图中对应配件和连线高亮发光；点击接线图中的配件也反向选中
  - **引脚标注**: 每根线两端标注「配件引脚名 → 开发板引脚号」，文字随主题适配颜色
  - **配件布局**: 配件自动排列在开发板两侧，可手动拖拽调整位置

### 代码编辑器（主工作区 Tab 3）

- **页面目标**: 展示生成的代码，支持复制下载
- **功能点**:
  - **语法高亮代码显示**: 根据开发板类型生成 MicroPython 或 Arduino C++ 代码，带语法高亮
  - **代码结构**: 自动处理库导入、对象初始化、setup/loop 主循环，每个节点代码块带注释标注
  - **节点调试开关**: 右侧面板有「节点调试」开关，开启时代码插入 `__TF_NODE:ID:value` 打印语句
  - **复制/下载按钮**: 一键复制全部代码到剪贴板；下载为 `.py` 或 `.ino` 文件
  - **代码注释国际化**: 中文模式下注释为中文，英文模式下为英文

### 串口监视器（主工作区 Tab 4）

- **页面目标**: 模拟串口通信，展示日志与数据
- **功能点**:
  - **原始日志面板**: 带时间戳、行号，支持关键词过滤、搜索，`[WiFi]` 等标签自动着色，深色模式黑底绿字
  - **数据仪表盘**: 解析 `DATA:T:xx,H:xx` 格式数据，实时绘制折线图 + 数值卡片（温度/湿度等）
  - **发送面板**: 输入框发送文本，预置命令按钮（如 `AT`、`reset`），定时发送开关
  - **危险指令二次确认**: 输入 `erase` 等危险指令时弹出确认对话框
  - **模拟数据流**: 自动生成模拟传感器数据（温湿度、光照等），演示完整监控效果
  - **调试节点联动**: 解析 `__TF_NODE:ID:value` 格式输出，触发逻辑画布对应节点闪烁

### 右侧属性配置面板 ⭐ 重点功能（引脚分配）

- **页面目标**: 配置选中对象的属性，核心是手动引脚分配功能
- **功能点**:
  - **配件引脚手动分配**: 每个配件实例的每个引脚有下拉选择框，选择开发板可用物理引脚号
  - **引脚冲突实时检测**: 同一引脚被两个配件占用时，下拉框红色边框 + 错误提示「引脚 X 已被 Y 占用」
  - **功能类型冲突警告**: 数字配件接到模拟引脚、I2C 配件接到非 I2C 引脚时黄色警告（不禁止但提示）
  - **电压不匹配警告**: 5V 配件接到 3.3V 引脚时警告「电压不匹配，可能损坏元件」
  - **智能推荐引脚按钮**: 一键自动为当前配件分配合适的空闲引脚（优先匹配协议/电压/功能类型）
  - **引脚占用表**: 表格展示开发板所有引脚的当前状态（空闲/被谁占用/功能类型），冲突行红色高亮
  - **配件重命名**: 可修改配件实例的显示名称

### 项目生命周期管理

- **页面目标**: 管理多个项目的创建、存储、切换、导入导出
- **功能点**:
  - **多项目列表**: IndexedDB 中存储所有项目，顶部项目下拉菜单可切换
  - **自动保存**: 编辑后防抖自动保存到 IndexedDB，状态指示器显示「已保存/保存中」
  - **模板项目**: 内置「闪烁 LED」「气象站」等只读模板，打开即用，另存为后可编辑
  - **导入/导出**: 导出为 `.thingflow` JSON 文件；导入文件解析后添加到项目列表
  - **离开提醒**: 未保存变更时关闭页面弹出确认提醒

### 安全与错误处理

- **页面目标**: 防呆设计，降低用户犯错成本
- **功能点**:
  - **引脚电压检查**: 电压不匹配时禁止生成代码（可强制跳过但有警告）
  - **强电模块安全确认**: 添加继电器等强电配件时弹出安全提示「请注意高压安全」
  - **供电过载提示**: 统计所有配件总电流，超过开发板供电能力时警告
  - **撤销/重做**: 逻辑编辑器和引脚分配支持 Ctrl+Z/Y 撤销重做
  - **错误中文翻译**: 编译/烧录错误翻译成通俗中文，附带排查建议，并定位到对应节点或代码行

### 首次使用向导

- **页面目标**: 引导新用户快速上手
- **功能点**:
  - **四步向导**: 选开发板 → 选模板 → 连接设备（模拟） → 烧录第一个项目
  - **进度指示**: 顶部进度条显示当前步骤
  - **可跳过**: 随时关闭向导，从空白项目开始

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用区域 |
|---------|---------|---------|
| `__thingflow_currentProject` | 当前打开的项目 ID，类型 `string` | 全局 |
| `__thingflow_preferences` | 用户偏好设置，类型 `IPreferences` | 全局（主题/语言） |
| `__thingflow_projects` | 项目列表数据，类型 `IProject[]`，主存 IndexedDB | 项目管理、模板 |

```ts
// 项目根结构 (.thingflow 文件格式)
interface IProject {
  id: string;
  name: string;
  platformVersion: string;
  createdAt: number;
  updatedAt: number;
  board: IBoardInstance;          // 开发板实例
  components: IComponentInstance[]; // 配件实例列表
  logicGraph: ILogicGraph;       // 逻辑图拓扑
  customCode?: string;           // 用户自定义代码
  metadata: {
    template?: boolean;          // 是否为只读模板
    description?: string;
  };
}

// 开发板实例
interface IBoardInstance {
  boardId: string;               // 关联 boards 数据中的 ID
  name: { zh: string; en: string };
}

// 配件实例
interface IComponentInstance {
  id: string;                    // 实例唯一 ID
  componentId: string;           // 关联 components 数据中的 ID
  name: string;                  // 用户可修改的实例名
  pinMapping: IPinMapping;       // 引脚分配映射
  position?: { x: number; y: number }; // 在接线图中的位置
}

// 引脚映射：配件引脚名 -> 开发板引脚号
interface IPinMapping {
  [componentPinName: string]: string | number; // 如 "VCC" -> "3.3V", "SDA" -> "GPIO21"
}

// 逻辑图数据
interface ILogicGraph {
  nodes: ILogicNode[];
  edges: ILogicEdge[];
  viewport: { x: number; y: number; zoom: number };
}

// 逻辑节点
interface ILogicNode {
  id: string;
  type: string;                  // 节点类型：sensor-read / led-control / if-else 等
  category: 'input' | 'process' | 'output' | 'flow' | 'wireless';
  position: { x: number; y: number };
  properties: Record<string, any>; // 节点配置参数
}

// 逻辑连线
interface ILogicEdge {
  id: string;
  source: string;                // 源节点 ID
  sourcePort: string;            // 源端口名
  target: string;                // 目标节点 ID
  targetPort: string;            // 目标端口名
}

// 用户偏好
interface IPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  debugMode: boolean;            // 节点调试开关
}
```

---

## 内置数据结构说明

### 开发板数据结构（`src/data/boards.ts`）

```ts
interface IBoardDef {
  id: string;
  name: { zh: string; en: string };
  manufacturer: string;
  capabilities: {
    wifi: boolean;
    ble: boolean;
    gpio: number;     // GPIO 引脚数量
    adc: number;      // ADC 通道数
    pwm: number;      // PWM 通道数
    i2c: number;      // I2C 数量
    spi: number;      // SPI 数量
    uart: number;     // UART 数量
  };
  voltage: '3.3V' | '5V' | 'dual';
  language: 'micropython' | 'arduino-cpp' | 'both';
  pins: IPinDef[];   // 详细引脚定义
}

interface IPinDef {
  number: string;     // 物理引脚号/名称，如 "GPIO0"、"A0"、"D1"
  physicalPin: number; // 物理位置序号
  functions: ('GPIO' | 'ADC' | 'PWM' | 'I2C-SDA' | 'I2C-SCL' | 'SPI-MOSI' | 'SPI-MISO' | 'SPI-SCK' | 'UART-TX' | 'UART-RX' | 'VCC' | 'GND')[];
  voltage?: '3.3V' | '5V';
}
```

### 配件数据结构（`src/data/components.ts`）

```ts
interface IComponentDef {
  id: string;
  name: { zh: string; en: string };
  category: 'sensor' | 'actuator' | 'display' | 'communication' | 'other';
  icon: string;       // 图标标识
  protocol: 'gpio' | 'analog' | 'i2c' | 'spi' | 'uart' | 'onewire';
  voltage: '3.3V' | '5V' | 'both';
  pins: IComponentPinDef[];  // 物理引脚需求
  requiredLibs: string[];    // 所需库名
  codeTemplate: {            // 代码模板（多语言注释）
    init: { zh: string; en: string };
    read?: { zh: string; en: string };
    write?: { zh: string; en: string };
  };
  needsExtraComponents?: { zh: string; en: string }; // 额外元件提示，如"需限流电阻"
  isHighVoltage?: boolean;   // 是否强电（继电器等）
}

interface IComponentPinDef {
  name: string;       // 引脚名，如 "VCC"、"GND"、"SDA"、"OUT"
  type: 'power' | 'ground' | 'signal';
  signalType?: 'digital' | 'analog' | 'i2c-sda' | 'i2c-scl' | 'spi' | 'uart-tx' | 'uart-rx';
  required: boolean;
}
```

---

## 技术选型说明

- **前端框架**: React + TypeScript + Tailwind CSS
- **逻辑图画布**: 使用 `@xyflow/react`（React Flow）实现节点连线编辑器
- **接线图绘制**: 原生 SVG 实现（开发板与配件用简化 SVG 插画），导出 PNG 用 `html-to-image` 或 Canvas 转换
- **代码编辑器**: 使用 `@monaco-editor/react`（Monaco Editor）实现语法高亮
- **图表库**: 串口监视器数据仪表盘使用 `recharts`
- **二维码**: 使用 `qrcode.react` 生成分享二维码
- **压缩库**: 使用 `pako` 进行项目 JSON 的 deflate 压缩
- **本地存储**: IndexedDB 使用 `idb` 库封装；偏好设置用 localStorage
- **状态管理**: React Context + useReducer（项目状态、偏好设置）
- **国际化**: 自研轻量 i18n 方案（翻译字典 + Context），无需引入 i18next

> 所有依赖均为前端库，纯浏览器运行，无需后端服务。

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free —— 无参考材料，从产品语义与使用场景自主建立视觉方向
- **核心情绪 / 应用类型**: 面向创客与教育场景的物联网 IDE，专业但不冰冷，清晰、可信赖、有动手探索的乐趣
- **独特记忆点**: 接线图视图中"实物风格简化插画 + 彩色功能线 + 引脚标签联动高亮"，成为产品最直观的识别符号

## 2. Art Direction

- **方向名**: Maker Workbench
- **Design Style**: Modern Dark 主风格 + Soft Industrial 辅助 —— 深色工作台基底配功能色高亮，像一块焊接实验台；节点、引脚、连线用功能色区分，符合硬件开发者直觉
- **DNA 参数**: 圆角 subtle (rounded-md) / 阴影 subtle (shadow-sm) / 间距 compact (gap-2 / p-4) / 字体方向 无衬线正文 + 等宽代码 / 装饰手法 细线分隔、功能色描边、引脚点阵
- **应用类型**: Tool —— 三栏 IDE 布局，信息密度高，操作即时反馈

## 3. Color System

**色彩关系**: 深青灰工作台底 + 青蓝主交互色 + 功能色线（红/黑/黄/蓝）+ 暖白文字；浅色模式为纸白底 + 墨色文字 + 同一主色
**配色设计理由**: 深色模式模拟硬件工作台氛围，长时间盯屏不累；主色青蓝代表信号与连接，用于 CTA、激活态、品牌锚点；接线功能色（红电源/黑地/黄信号/蓝数据）严格遵循硬件行业惯例，降低学习成本
**主色推导**: 从"信号、连接、物联网"语义出发，选青蓝色系而非通用 SaaS 蓝，偏绿调暗示硬件与物理世界交互，饱和度中等避免刺眼
**使用比例**: 65% 中性底 / 25% 功能色与辅助 / 10% primary；primary 仅用于主按钮、当前 tab、品牌标识、关键连线高亮

| 角色 | CSS 变量 | Tailwind Class | HSL 值 (深色) | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 12% 10%) | 工作台深底，接近焊接台哑光黑 |
| card | `--card` | `bg-card` | hsl(210 10% 14%) | 面板与浮层，比 bg 亮 2 阶 |
| text | `--foreground` | `text-foreground` | hsl(210 15% 92%) | 主文字，暖白不发蓝 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(210 10% 60%) | 辅助文字、引脚号、说明 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(192 85% 55%) | 青蓝主色，信号与连接语义 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(210 20% 10%) | 主色上的深色文字，高对比 |
| accent | `--accent` | `bg-accent` | hsl(210 10% 20%) | hover/选中浅底、菜单项状态 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(210 15% 85%) | accent 上的文字 |
| border | `--border` | `border-border` | hsl(210 8% 22%) | 面板边界、输入框、分隔线 |

**语义色提示**:
- 成功（连接/烧录完成）: hsl(145 65% 50%) — bg hsl(145 50% 15%) / border hsl(145 55% 30%) / text hsl(145 70% 70%)
- 警告（电压不匹配/功能冲突）: hsl(38 90% 55%) — bg hsl(38 60% 15%) / border hsl(38 70% 35%) / text hsl(38 90% 70%)
- 错误（引脚冲突/烧录失败）: hsl(0 75% 60%) — bg hsl(0 40% 15%) / border hsl(0 60% 35%) / text hsl(0 80% 75%)
- 接线功能色: 电源红 hsl(0 80% 55%) / GND 黑 hsl(0 0% 35%) / 信号黄 hsl(45 90% 55%) / 数据蓝 hsl(210 80% 60%)
- 所有语义色饱和度与 primary 对齐 ±15%，避免状态色刺眼盖过主界面

## 4. 字体与节奏

- **font-display**: Space Grotesk —— 几何感强，字母紧凑有科技感，用于 Logo、大标题、引脚编号标签
- **font-body**: Noto Sans SC + Inter —— 中文清晰可读，英文数字等宽感好，适合高密度工具界面
- **font-mono**: IBM Plex Mono —— 代码编辑器、串口监视器、引脚号，等宽对齐便于阅读代码与日志
- **字号**: H1 text-2xl；H2 text-lg；body text-sm（IDE 高密度）；muted text-xs；代码 text-sm 行高 1.6
- **圆角**: 小 —— rounded-md，模拟硬件面板的工业感，不做过度圆润

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，采用 IDE 三栏布局
- **Page / Section Order**: 顶部导航栏 → 左侧配件库 → 中间标签工作区（逻辑编辑器/接线图/代码/串口）→ 右侧属性面板，与 PRD 第五节布局建议一致
- **Standard Content Zone**: Tool —— 工作区占满视口剩余空间，无固定 max-w；面板宽度固定（左 260px / 右 320px），中间弹性
- **Shell / Frame Alignment**: 独立滚动 —— 左中右三栏各自 overflow-auto，顶部导航固定
- **Padding & Rhythm**: 面板内 `p-3`，卡片/分组 `p-4`，间距单位 4px/8px 为主，保持紧凑
- **Full-bleed Zones**: 逻辑画布、接线图视图、代码编辑器、串口监视器均为全高全宽填充工作区
- **Local Narrowing**: 设置弹窗、向导步骤、表单对话框收窄至 max-w-lg
- **Overflow Strategy**: 配件库列表、引脚占用表、日志列表纵向滚动；引脚选择下拉横向不截断
- **Flexibility Boundary**: 允许移动端折叠左右面板为抽屉；不允许改变主色、圆角、阴影语言和接线功能色规范

## 6. 视觉与动效

- **装饰**: 细实线分隔、引脚点阵标记、功能色描边高亮
- **阴影/边界**: 轻 —— 面板用 1px border 分隔，浮层/下拉用 shadow-md，避免重阴影
- **动效**: 克制 —— hover 状态 150ms 过渡；选中联动高亮用 200ms 描边脉动；烧录进度与串口数据用线性动画；不做页面入场动效

## 7. 组件原则

- 按钮、输入、下拉、菜单必须有 Default / Hover / Active / Focus-visible / Disabled 五态
- Primary 按钮用于"生成代码""烧录""智能推荐引脚"等主行动；Outline 用于次级操作；Ghost 用于面板内工具按钮
- 引脚选择下拉需展示引脚号 + 功能标签（GPIO/ADC/I2C/SPI）+ 占用状态（空闲/占用/冲突）
- 冲突/警告/成功状态用"图标 + 文字 + 色条"三重表达，不依赖纯颜色
- 空状态、加载态、错误态延续工作台风格，用线稿插画 + 等宽字体说明

## 8. Image Direction

- **Image Role**: 接线图视图中的开发板与配件 SVG 插画（核心视觉资产）
- **Image Art Direction**: 实物风格简化插画 —— 俯视/斜视 45° 视角，开发板为深绿/蓝 PCB 质感带丝印引脚号，配件为简化立体图标（传感器带金属感探头、LED 带发光点、显示屏带玻璃反光），整体哑光质感，边缘 1px 深色描边，配色与 UI 色板一致；选中时外发光 + 描边变 primary 色
- **Image Prompt Keywords**: isometric PCB board illustration, simplified hardware components, matte finish, dark teal PCB with gold pins, sensor modules, clean technical drawing style, flat vector with subtle gradient, top-down 45 degree view, electronic workbench aesthetic
- **Image Avoidance**: 避免卡通 3D 渲染、廉价科技蓝紫光效、无意义抽象电路图案、照片级真实硬件图、手绘涂鸦风

## 9. Anti-patterns

- **Split personality**: 逻辑编辑器、接线图、代码编辑器各用一套视觉语言；三视图共享同一套功能色与组件规范
- **Phantom tokens**: 编造 shadcn 不存在的 CSS 变量；接线功能色通过语义类名引用，不新增全局 token
- **Default SaaS drift**: 回到通用蓝紫渐变 + 大圆角卡片；坚持工作台深底 + 功能色描边的硬件 IDE 气质
- **Invisible interaction**: 引脚下拉、配件拖拽、节点连线有 hover 但丢了 focus-visible；所有键盘可达元素都有可见焦点环
- **Mono-hue tyranny**: primary 青蓝铺满按钮、tab、图标、边框、链接；按 65-25-10 把 primary 收回到 CTA 与品牌锚点，其余状态用功能色
- **Wire color chaos**: 接线图连线颜色不遵循行业规范（红电源黑地）；严格遵守硬件接线色标，这是用户安全与直觉的基础