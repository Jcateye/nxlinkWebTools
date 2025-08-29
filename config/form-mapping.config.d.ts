export interface FormMapping {
    formId: string;
    taskId: string;
    formName: string;
    description?: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare const DEFAULT_FORM_MAPPINGS: FormMapping[];
export declare function getFormMappings(): FormMapping[];
export declare function getTaskIdByFormId(formId: string): string | null;
export declare function isValidFormId(formId: string): boolean;
export declare function getAvailableFormMappings(): {
    formId: string;
    formName: string;
    taskId: string;
    description: string | undefined;
}[];
//# sourceMappingURL=form-mapping.config.d.ts.map