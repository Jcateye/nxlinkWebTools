"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
let prompts = [];
let nextId = 1;
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: prompts
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取提示词失败:', error);
        res.status(500).json({ error: '获取提示词失败' });
        return;
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, description, systemPrompt, userPrompt, variables, category, tags } = req.body;
        if (!name || !userPrompt) {
            res.status(400).json({ error: '名称和用户提示词不能为空' });
            return;
        }
        const prompt = {
            id: nextId++,
            name,
            description,
            systemPrompt,
            userPrompt,
            variables,
            category,
            tags,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        prompts.push(prompt);
        logger_1.logger.info(`创建提示词成功: ${name}`);
        res.json({
            success: true,
            data: prompt
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('创建提示词失败:', error);
        res.status(500).json({ error: '创建提示词失败' });
        return;
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
        if (promptIndex === -1) {
            res.status(404).json({ error: '提示词不存在' });
            return;
        }
        prompts[promptIndex] = {
            ...prompts[promptIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        logger_1.logger.info(`更新提示词成功: ${id}`);
        res.json({
            success: true,
            data: prompts[promptIndex]
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('更新提示词失败:', error);
        res.status(500).json({ error: '更新提示词失败' });
        return;
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
        if (promptIndex === -1) {
            res.status(404).json({ error: '提示词不存在' });
            return;
        }
        prompts.splice(promptIndex, 1);
        logger_1.logger.info(`删除提示词成功: ${id}`);
        res.json({
            success: true,
            message: '删除成功'
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('删除提示词失败:', error);
        res.status(500).json({ error: '删除提示词失败' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=prompts.js.map