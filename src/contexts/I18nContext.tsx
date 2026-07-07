import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';

export type Language = 'zh' | 'en';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// 翻译字典
const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 通用
    'app.name': 'ThingFlow 物联网开发平台',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.rename': '重命名',
    'common.export': '导出',
    'common.import': '导入',
    'common.copy': '复制',
    'common.download': '下载',
    'common.close': '关闭',
    'common.search': '搜索',
    'common.all': '全部',
    'common.warning': '警告',
    'common.error': '错误',
    'common.success': '成功',
    'common.info': '信息',
    'common.loading': '加载中...',
    'common.saved': '已保存',
    'common.saving': '保存中...',
    'common.unsaved': '未保存',

    // 顶部导航
    'topbar.newProject': '新建项目',
    'topbar.projectList': '项目列表',
    'topbar.templates': '模板库',
    'topbar.importProject': '导入项目',
    'topbar.exportProject': '导出项目',
    'topbar.language': '语言',
    'topbar.theme': '主题',
    'topbar.themeLight': '浅色',
    'topbar.themeDark': '深色',
    'topbar.themeSystem': '跟随系统',
    'topbar.generateCode': '生成代码',
    'topbar.flash': '烧录',
    'topbar.share': '分享',
    'topbar.help': '帮助',
    'topbar.selectBoard': '选择开发板',
    'topbar.boardSearch': '搜索开发板型号...',
    'topbar.noBoardFound': '未找到匹配的开发板',

    // 左侧面板
    'sidebar.componentLib': '配件库',
    'sidebar.projects': '项目',
    'sidebar.category.sensor': '传感器',
    'sidebar.category.actuator': '执行器',
    'sidebar.category.display': '显示',
    'sidebar.category.communication': '通信',
    'sidebar.category.other': '其他',
    'sidebar.searchPlaceholder': '搜索配件...',
    'sidebar.incompatible': '当前开发板不支持',
    'sidebar.clickToAdd': '点击添加',
    'sidebar.dragToCanvas': '拖拽到画布',

    // 主工作区 Tab
    'workspace.logicEditor': '逻辑编辑器',
    'workspace.wiringDiagram': '接线图',
    'workspace.codeEditor': '代码编辑器',
    'workspace.serialMonitor': '串口监视器',

    // 逻辑编辑器
    'logic.emptyTitle': '开始构建你的逻辑',
    'logic.emptyDesc': '从左侧拖拽配件或节点到画布',
    'logic.category.input': '输入',
    'logic.category.process': '处理',
    'logic.category.output': '输出',
    'logic.category.flow': '流程控制',
    'logic.category.wireless': '无线',

    // 接线图
    'wiring.title': '接线示意图',
    'wiring.exportPng': '导出 PNG',
    'wiring.emptyDesc': '添加配件后自动生成接线图',
    'wiring.legends': '接线规范',
    'wiring.power': '电源 (VCC)',
    'wiring.ground': '地线 (GND)',
    'wiring.signal': '信号线',
    'wiring.board': '开发板',
    'wiring.component': '配件',
    'wiring.pin': '引脚',
    'wiring.to': '→',

    // 代码编辑器
    'code.emptyTitle': '尚未生成代码',
    'code.emptyDesc': '点击顶部「生成代码」按钮生成代码',
    'code.generating': '正在生成代码...',
    'code.copySuccess': '代码已复制到剪贴板',
    'code.download': '下载代码',
    'code.copy': '复制代码',
    'code.debugMode': '节点调试模式',
    'code.debugDesc': '开启后在代码中插入调试打印语句',

    // 串口监视器
    'serial.title': '串口监视器',
    'serial.connect': '连接',
    'serial.disconnect': '断开',
    'serial.connected': '已连接',
    'serial.disconnected': '未连接',
    'serial.baudRate': '波特率',
    'serial.filter': '过滤',
    'serial.search': '搜索日志...',
    'serial.clear': '清空',
    'serial.send': '发送',
    'serial.sendPlaceholder': '输入要发送的内容...',
    'serial.presetCmds': '预置命令',
    'serial.timedSend': '定时发送',
    'serial.dashboard': '数据仪表盘',
    'serial.rawLog': '原始日志',
    'serial.temperature': '温度',
    'serial.humidity': '湿度',
    'serial.light': '光照',
    'serial.dangerConfirm': '危险指令确认',
    'serial.dangerWarn': '此操作可能导致数据丢失，确定要执行吗？',

    // 右侧属性面板
    'props.title': '属性配置',
    'props.noSelection': '未选中任何元素',
    'props.projectInfo': '项目信息',
    'props.boardInfo': '开发板信息',
    'props.componentInfo': '配件信息',
    'props.nodeInfo': '节点属性',
    'props.pinAssignment': '引脚分配',
    'props.pinConflict': '引脚冲突',
    'props.pinOccupiedBy': '已被占用',
    'props.voltageMismatch': '电压不匹配',
    'props.functionMismatch': '功能类型不匹配',
    'props.smartRecommend': '智能推荐引脚',
    'props.pinUsageTable': '引脚占用表',
    'props.pinNumber': '引脚号',
    'props.pinFunction': '功能',
    'props.pinStatus': '状态',
    'props.pinFree': '空闲',
    'props.pinOccupied': '已占用',
    'props.renameComponent': '重命名配件',
    'props.save': '保存',

    // 项目管理
    'project.new': '新建项目',
    'project.name': '项目名称',
    'project.board': '开发板',
    'project.created': '创建时间',
    'project.updated': '更新时间',
    'project.deleteConfirm': '确定要删除此项目吗？',
    'project.importSuccess': '项目导入成功',
    'project.exportSuccess': '项目导出成功',
    'project.fromTemplate': '从模板创建',

    // 烧录
    'flash.title': '烧录固件',
    'flash.chip': '芯片型号',
    'flash.size': '固件大小',
    'flash.eraseArea': '擦除区域',
    'flash.confirm': '确认烧录',
    'flash.progress': '烧录进度',
    'flash.connecting': '正在连接设备...',
    'flash.erasing': '正在擦除...',
    'flash.writing': '正在写入...',
    'flash.verifying': '正在校验...',
    'flash.complete': '烧录完成',
    'flash.failed': '烧录失败',
    'flash.unsupported': '当前浏览器不支持 Web Serial，请使用 Chrome/Edge 89+',
    'flash.agentRequired': 'C++ 烧录需要本地代理',
    'flash.downloadAgent': '下载代理',

    // 分享
    'share.title': '分享项目',
    'share.copyLink': '复制链接',
    'share.copied': '链接已复制',
    'share.qrCode': '扫码打开',
    'share.sizeWarning': '项目过大，建议使用文件分享',
    'share.externalWarning': '外部分享项目，请检查硬件兼容性',
    'share.sensitiveReplaced': '敏感信息已自动替换为占位符',
    'share.linkBroken': '分享链接损坏或格式不支持',

    // 帮助
    'help.title': '帮助中心',
    'help.faq': '常见问题',
    'help.troubleshoot': '故障排除',
    'help.gettingStarted': '快速上手',

    // 向导
    'wizard.title': '欢迎使用 ThingFlow',
    'wizard.step1': '选择开发板',
    'wizard.step2': '选择模板',
    'wizard.step3': '连接设备',
    'wizard.step4': '烧录项目',
    'wizard.skip': '跳过向导',
    'wizard.next': '下一步',
    'wizard.prev': '上一步',
    'wizard.finish': '完成',

    // 安全
    'safety.highVoltage': '高压警告',
    'safety.relayWarn': '继电器涉及强电，操作时请注意安全，避免触电危险',
    'safety.overload': '供电过载警告',
    'safety.overloadDesc': '配件总功耗可能超过开发板供电能力',
  },
  en: {
    // Common
    'app.name': 'ThingFlow IoT Development Platform',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.rename': 'Rename',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.copy': 'Copy',
    'common.download': 'Download',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.all': 'All',
    'common.warning': 'Warning',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.info': 'Info',
    'common.loading': 'Loading...',
    'common.saved': 'Saved',
    'common.saving': 'Saving...',
    'common.unsaved': 'Unsaved',

    // Topbar
    'topbar.newProject': 'New Project',
    'topbar.projectList': 'Project List',
    'topbar.templates': 'Templates',
    'topbar.importProject': 'Import Project',
    'topbar.exportProject': 'Export Project',
    'topbar.language': 'Language',
    'topbar.theme': 'Theme',
    'topbar.themeLight': 'Light',
    'topbar.themeDark': 'Dark',
    'topbar.themeSystem': 'System',
    'topbar.generateCode': 'Generate Code',
    'topbar.flash': 'Flash',
    'topbar.share': 'Share',
    'topbar.help': 'Help',
    'topbar.selectBoard': 'Select Board',
    'topbar.boardSearch': 'Search boards...',
    'topbar.noBoardFound': 'No boards found',

    // Sidebar
    'sidebar.componentLib': 'Component Library',
    'sidebar.projects': 'Projects',
    'sidebar.category.sensor': 'Sensors',
    'sidebar.category.actuator': 'Actuators',
    'sidebar.category.display': 'Displays',
    'sidebar.category.communication': 'Communication',
    'sidebar.category.other': 'Other',
    'sidebar.searchPlaceholder': 'Search components...',
    'sidebar.incompatible': 'Not supported by current board',
    'sidebar.clickToAdd': 'Click to add',
    'sidebar.dragToCanvas': 'Drag to canvas',

    // Workspace tabs
    'workspace.logicEditor': 'Logic Editor',
    'workspace.wiringDiagram': 'Wiring Diagram',
    'workspace.codeEditor': 'Code Editor',
    'workspace.serialMonitor': 'Serial Monitor',

    // Logic editor
    'logic.emptyTitle': 'Start building your logic',
    'logic.emptyDesc': 'Drag components or nodes from the left panel',
    'logic.category.input': 'Input',
    'logic.category.process': 'Process',
    'logic.category.output': 'Output',
    'logic.category.flow': 'Flow Control',
    'logic.category.wireless': 'Wireless',

    // Wiring diagram
    'wiring.title': 'Wiring Diagram',
    'wiring.exportPng': 'Export PNG',
    'wiring.emptyDesc': 'Add components to auto-generate wiring diagram',
    'wiring.legends': 'Wiring Legend',
    'wiring.power': 'Power (VCC)',
    'wiring.ground': 'Ground (GND)',
    'wiring.signal': 'Signal',
    'wiring.board': 'Board',
    'wiring.component': 'Component',
    'wiring.pin': 'Pin',
    'wiring.to': '→',

    // Code editor
    'code.emptyTitle': 'No code generated yet',
    'code.emptyDesc': 'Click "Generate Code" button to generate',
    'code.generating': 'Generating code...',
    'code.copySuccess': 'Code copied to clipboard',
    'code.download': 'Download',
    'code.copy': 'Copy',
    'code.debugMode': 'Node Debug Mode',
    'code.debugDesc': 'Insert debug print statements in code',

    // Serial monitor
    'serial.title': 'Serial Monitor',
    'serial.connect': 'Connect',
    'serial.disconnect': 'Disconnect',
    'serial.connected': 'Connected',
    'serial.disconnected': 'Disconnected',
    'serial.baudRate': 'Baud Rate',
    'serial.filter': 'Filter',
    'serial.search': 'Search logs...',
    'serial.clear': 'Clear',
    'serial.send': 'Send',
    'serial.sendPlaceholder': 'Enter content to send...',
    'serial.presetCmds': 'Preset Commands',
    'serial.timedSend': 'Timed Send',
    'serial.dashboard': 'Dashboard',
    'serial.rawLog': 'Raw Log',
    'serial.temperature': 'Temperature',
    'serial.humidity': 'Humidity',
    'serial.light': 'Light',
    'serial.dangerConfirm': 'Dangerous Command Confirmation',
    'serial.dangerWarn': 'This may cause data loss. Are you sure?',

    // Properties panel
    'props.title': 'Properties',
    'props.noSelection': 'Nothing selected',
    'props.projectInfo': 'Project Info',
    'props.boardInfo': 'Board Info',
    'props.componentInfo': 'Component Info',
    'props.nodeInfo': 'Node Properties',
    'props.pinAssignment': 'Pin Assignment',
    'props.pinConflict': 'Pin Conflict',
    'props.pinOccupiedBy': 'Occupied by',
    'props.voltageMismatch': 'Voltage Mismatch',
    'props.functionMismatch': 'Function Mismatch',
    'props.smartRecommend': 'Smart Recommend',
    'props.pinUsageTable': 'Pin Usage Table',
    'props.pinNumber': 'Pin',
    'props.pinFunction': 'Function',
    'props.pinStatus': 'Status',
    'props.pinFree': 'Free',
    'props.pinOccupied': 'Occupied',
    'props.renameComponent': 'Rename',
    'props.save': 'Save',

    // Project management
    'project.new': 'New Project',
    'project.name': 'Project Name',
    'project.board': 'Board',
    'project.created': 'Created',
    'project.updated': 'Updated',
    'project.deleteConfirm': 'Delete this project?',
    'project.importSuccess': 'Project imported',
    'project.exportSuccess': 'Project exported',
    'project.fromTemplate': 'Create from Template',

    // Flash
    'flash.title': 'Flash Firmware',
    'flash.chip': 'Chip',
    'flash.size': 'Firmware Size',
    'flash.eraseArea': 'Erase Area',
    'flash.confirm': 'Confirm Flash',
    'flash.progress': 'Progress',
    'flash.connecting': 'Connecting...',
    'flash.erasing': 'Erasing...',
    'flash.writing': 'Writing...',
    'flash.verifying': 'Verifying...',
    'flash.complete': 'Flash Complete',
    'flash.failed': 'Flash Failed',
    'flash.unsupported': 'Web Serial not supported. Use Chrome/Edge 89+',
    'flash.agentRequired': 'C++ flash requires local agent',
    'flash.downloadAgent': 'Download Agent',

    // Share
    'share.title': 'Share Project',
    'share.copyLink': 'Copy Link',
    'share.copied': 'Link Copied',
    'share.qrCode': 'Scan to Open',
    'share.sizeWarning': 'Project too large, use file sharing instead',
    'share.externalWarning': 'External shared project, check hardware compatibility',
    'share.sensitiveReplaced': 'Sensitive info replaced with placeholders',
    'share.linkBroken': 'Share link is broken or unsupported',

    // Help
    'help.title': 'Help Center',
    'help.faq': 'FAQ',
    'help.troubleshoot': 'Troubleshooting',
    'help.gettingStarted': 'Getting Started',

    // Wizard
    'wizard.title': 'Welcome to ThingFlow',
    'wizard.step1': 'Select Board',
    'wizard.step2': 'Select Template',
    'wizard.step3': 'Connect Device',
    'wizard.step4': 'Flash Project',
    'wizard.skip': 'Skip',
    'wizard.next': 'Next',
    'wizard.prev': 'Previous',
    'wizard.finish': 'Finish',

    // Safety
    'safety.highVoltage': 'High Voltage Warning',
    'safety.relayWarn': 'Relay involves high voltage. Be careful to avoid electric shock.',
    'safety.overload': 'Power Overload Warning',
    'safety.overloadDesc': 'Total power may exceed board capacity',
  },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('__thingflow_lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch {}
    return 'zh';
  });

  useEffect(() => {
    try {
      localStorage.setItem('__thingflow_lang', lang);
    } catch {}
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string): string => {
      return translations[lang][key] ?? key;
    };
    return { lang, setLang: setLangState, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
