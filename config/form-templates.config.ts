/**
 * 表单模板配置文件
 * 支持动态配置表单模板，无需修改代码
 */

export interface TemplateFieldMapping {
  /** 电话号码字段名 */
  phone: string;
  /** 姓名字段名（可选） */
  name?: string;
  /** 邮箱字段名（可选） */
  email?: string;
  /** 公司字段名（可选） */
  company?: string;
  /** 留言字段名（可选） */
  message?: string;
  /** 地区字段名（可选） */
  region?: string;
  /** 其他自定义字段映射 */
  [key: string]: string | undefined;
}

export interface FormTemplate {
  /** 模板ID */
  templateId: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 字段映射配置 */
  fieldMapping: TemplateFieldMapping;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 模板标签（可选） */
  tags?: string[];
  /** 适用场景（可选） */
  useCase?: string;
}

/**
 * 默认表单模板配置
 * 用户可以在这里添加、修改或删除模板
 */
export const DEFAULT_FORM_TEMPLATES: FormTemplate[] = [
  {
    templateId: 'contact',
    name: '联系我们表单',
    description: '标准联系表单模板，适用于网站联系表单',
    fieldMapping: {
      phone: 'field_5',
      name: 'field_2',
      email: 'field_6',
      message: 'field_3'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['contact', 'website', 'standard'],
    useCase: '网站联系表单、客户咨询'
  },
  {
    templateId: 'registration',
    name: '活动报名表单',
    description: '活动报名表单模板，包含公司信息',
    fieldMapping: {
      phone: 'field_5',
      name: 'field_2',
      email: 'field_6',
      company: 'field_3',
      message: 'field_4'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['registration', 'event', 'business'],
    useCase: '活动报名、展会登记'
  },
  {
    templateId: 'inquiry',
    name: '产品咨询表单',
    description: '产品咨询表单模板，适用于产品页面的咨询表单',
    fieldMapping: {
      phone: 'field_5',
      name: 'field_2',
      email: 'field_6',
      company: 'field_3',
      message: 'field_4'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['inquiry', 'product', 'consultation'],
    useCase: '产品咨询、售前咨询'
  },
  {
    templateId: 'feedback',
    name: '意见反馈表单',
    description: '用户意见反馈表单模板',
    fieldMapping: {
      phone: 'field_5',
      name: 'field_2',
      email: 'field_6',
      message: 'field_3',
      region: 'field_4'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['feedback', 'survey', 'user'],
    useCase: '用户反馈、满意度调查'
  },
  {
    templateId: 'demo',
    name: '演示申请表单',
    description: '产品演示申请表单模板',
    fieldMapping: {
      phone: 'field_5',
      name: 'field_2',
      email: 'field_6',
      company: 'field_3',
      message: 'field_4'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['demo', 'trial', 'sales'],
    useCase: '产品演示申请、试用申请'
  }
  // 用户可以在这里添加更多模板
  // {
  //   templateId: 'custom_template',
  //   name: '自定义模板',
  //   description: '自定义表单模板',
  //   fieldMapping: {
  //     phone: 'phone_field',
  //     name: 'name_field',
  //     email: 'email_field',
  //     custom_field: 'custom_value'
  //   },
  //   enabled: true,
  //   createdAt: new Date().toISOString(),
  //   updatedAt: new Date().toISOString(),
  //   tags: ['custom'],
  //   useCase: '自定义场景'
  // }
];

/**
 * 获取所有启用的模板
 */
export function getEnabledTemplates(): FormTemplate[] {
  return DEFAULT_FORM_TEMPLATES.filter(template => template.enabled);
}

/**
 * 根据模板ID获取模板
 */
export function getTemplateById(templateId: string): FormTemplate | null {
  return DEFAULT_FORM_TEMPLATES.find(template =>
    template.templateId === templateId && template.enabled
  ) || null;
}

/**
 * 获取所有可用模板的基本信息
 */
export function getAvailableTemplates() {
  return getEnabledTemplates().map(template => ({
    templateId: template.templateId,
    name: template.name,
    description: template.description,
    tags: template.tags,
    useCase: template.useCase
  }));
}

/**
 * 验证模板ID是否存在
 */
export function isValidTemplateId(templateId: string): boolean {
  return DEFAULT_FORM_TEMPLATES.some(template =>
    template.templateId === templateId && template.enabled
  );
}

/**
 * 根据标签获取模板
 */
export function getTemplatesByTag(tag: string): FormTemplate[] {
  return getEnabledTemplates().filter(template =>
    template.tags?.includes(tag)
  );
}

/**
 * 获取模板统计信息
 */
export function getTemplateStats() {
  const enabled = getEnabledTemplates();
  const tags = new Set<string>();
  enabled.forEach(template => {
    template.tags?.forEach(tag => tags.add(tag));
  });

  return {
    total: DEFAULT_FORM_TEMPLATES.length,
    enabled: enabled.length,
    disabled: DEFAULT_FORM_TEMPLATES.length - enabled.length,
    uniqueTags: Array.from(tags),
    templates: enabled.map(t => ({
      id: t.templateId,
      name: t.name,
      tags: t.tags?.length || 0
    }))
  };
}
