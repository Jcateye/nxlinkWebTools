/**
 * 表单映射配置文件
 * 用于配置表单ID到taskID的映射关系
 */

export interface FormMapping {
  /** 表单ID */
  formId: string;
  /** 对应的taskID */
  taskId: string;
  /** 表单名称 */
  formName: string;
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 默认表单映射配置
 * 用户可以在这里添加或修改表单映射
 */
export const DEFAULT_FORM_MAPPINGS: FormMapping[] = [
  {
    formId: 'E0Tqhk',
    taskId: '23ac8c5d-4e43-4669-bff8-1ab1f8436933', // 需要用户配置实际的taskID
    formName: '华为全连接大会 | NXAI AI互动体验信息登记',
    description: '华为全连接大会表单数据推送',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  // 用户可以在这里添加更多表单映射
  // {
  //   formId: 'ANOTHER_FORM_ID',
  //   taskId: 'ANOTHER_TASK_ID',
  //   formName: '另一个表单名称',
  //   description: '另一个表单的描述',
  //   enabled: true,
  //   createdAt: new Date().toISOString(),
  //   updatedAt: new Date().toISOString()
  // }
];

/**
 * 获取表单映射
 */
export function getFormMappings(): FormMapping[] {
  return DEFAULT_FORM_MAPPINGS.filter(mapping => mapping.enabled);
}

/**
 * 根据表单ID获取taskID
 */
export function getTaskIdByFormId(formId: string): string | null {
  const mapping = DEFAULT_FORM_MAPPINGS.find(m => m.formId === formId && m.enabled);
  return mapping ? mapping.taskId : null;
}

/**
 * 验证表单ID是否存在
 */
export function isValidFormId(formId: string): boolean {
  return DEFAULT_FORM_MAPPINGS.some(m => m.formId === formId && m.enabled);
}

/**
 * 获取所有可用的表单映射信息
 */
export function getAvailableFormMappings() {
  return DEFAULT_FORM_MAPPINGS
    .filter(m => m.enabled)
    .map(m => ({
      formId: m.formId,
      formName: m.formName,
      taskId: m.taskId,
      description: m.description
    }));
}
