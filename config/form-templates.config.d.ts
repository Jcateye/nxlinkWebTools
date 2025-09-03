export interface TemplateFieldMapping {
    phone: string;
    name?: string;
    email?: string;
    company?: string;
    message?: string;
    region?: string;
    [key: string]: string | undefined;
}
export interface FormTemplate {
    templateId: string;
    name: string;
    description: string;
    fieldMapping: TemplateFieldMapping;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    useCase?: string;
}
export declare const DEFAULT_FORM_TEMPLATES: FormTemplate[];
export declare function getEnabledTemplates(): FormTemplate[];
export declare function getTemplateById(templateId: string): FormTemplate | null;
export declare function getAvailableTemplates(): {
    templateId: string;
    name: string;
    description: string;
    tags: string[] | undefined;
    useCase: string | undefined;
}[];
export declare function isValidTemplateId(templateId: string): boolean;
export declare function getTemplatesByTag(tag: string): FormTemplate[];
export declare function getTemplateStats(): {
    total: number;
    enabled: number;
    disabled: number;
    uniqueTags: string[];
    templates: {
        id: string;
        name: string;
        tags: number;
    }[];
};
//# sourceMappingURL=form-templates.config.d.ts.map