"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FORM_TEMPLATES = void 0;
exports.getEnabledTemplates = getEnabledTemplates;
exports.getTemplateById = getTemplateById;
exports.getAvailableTemplates = getAvailableTemplates;
exports.isValidTemplateId = isValidTemplateId;
exports.getTemplatesByTag = getTemplatesByTag;
exports.getTemplateStats = getTemplateStats;
exports.DEFAULT_FORM_TEMPLATES = [
    {
        templateId: 'contact',
        name: '联系我们表单',
        description: '标准联系表单模板，适用于网站联系表单',
        fieldMapping: {
            phone: 'field_8',
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
            phone: 'field_8',
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
            phone: 'field_8',
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
            phone: 'field_8',
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
            phone: 'field_8',
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
];
function getEnabledTemplates() {
    return exports.DEFAULT_FORM_TEMPLATES.filter(template => template.enabled);
}
function getTemplateById(templateId) {
    return exports.DEFAULT_FORM_TEMPLATES.find(template => template.templateId === templateId && template.enabled) || null;
}
function getAvailableTemplates() {
    return getEnabledTemplates().map(template => ({
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        tags: template.tags,
        useCase: template.useCase
    }));
}
function isValidTemplateId(templateId) {
    return exports.DEFAULT_FORM_TEMPLATES.some(template => template.templateId === templateId && template.enabled);
}
function getTemplatesByTag(tag) {
    return getEnabledTemplates().filter(template => template.tags?.includes(tag));
}
function getTemplateStats() {
    const enabled = getEnabledTemplates();
    const tags = new Set();
    enabled.forEach(template => {
        template.tags?.forEach(tag => tags.add(tag));
    });
    return {
        total: exports.DEFAULT_FORM_TEMPLATES.length,
        enabled: enabled.length,
        disabled: exports.DEFAULT_FORM_TEMPLATES.length - enabled.length,
        uniqueTags: Array.from(tags),
        templates: enabled.map(t => ({
            id: t.templateId,
            name: t.name,
            tags: t.tags?.length || 0
        }))
    };
}
//# sourceMappingURL=form-templates.config.js.map