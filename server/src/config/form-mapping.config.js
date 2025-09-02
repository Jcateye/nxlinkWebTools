export const DEFAULT_FORM_MAPPINGS = [
    {
        formId: 'E0Tqhk',
        taskId: '9cf75e77-223e-4f17-8da5-40b4c6da467b',
        formName: '华为全连接大会 | NXAI AI互动体验信息登记',
        description: '华为全连接大会表单数据推送（中文版）',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        formId: 'wE4D2a',
        taskId: 'huawei-connect-2025-task-001',
        formName: 'HUAWEI CONNECT 2025 | NXAI AI Interactive Experience Sign-up',
        description: '华为CONNECT 2025英文版表单数据推送',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
export function getFormMappings() {
    return DEFAULT_FORM_MAPPINGS.filter(mapping => mapping.enabled);
}
export function getTaskIdByFormId(formId) {
    const mapping = DEFAULT_FORM_MAPPINGS.find(m => m.formId === formId && m.enabled);
    return mapping ? mapping.taskId : null;
}
export function isValidFormId(formId) {
    return DEFAULT_FORM_MAPPINGS.some(m => m.formId === formId && m.enabled);
}
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
//# sourceMappingURL=form-mapping.config.js.map