"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
let providers = [];
let nextId = 1;
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: providers
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取厂商配置失败:', error);
        res.status(500).json({ error: '获取厂商配置失败' });
        return;
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, displayName, category, apiKey, baseUrl, azureEndpoint, azureApiVersion, azureDeploymentName, projectId, region, customHeaders } = req.body;
        if (!name || !displayName || !category || !apiKey) {
            res.status(400).json({ error: '必填字段不能为空' });
            return;
        }
        const provider = {
            id: nextId++,
            name,
            displayName,
            category,
            apiKey,
            baseUrl,
            azureEndpoint,
            azureApiVersion,
            azureDeploymentName,
            projectId,
            region,
            customHeaders,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        providers.push(provider);
        logger_1.logger.info(`创建厂商配置成功: ${displayName}`);
        res.json({
            success: true,
            data: provider
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('创建厂商配置失败:', error);
        res.status(500).json({ error: '创建厂商配置失败' });
        return;
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const providerIndex = providers.findIndex(p => p.id === parseInt(id));
        if (providerIndex === -1) {
            res.status(404).json({ error: '厂商配置不存在' });
            return;
        }
        providers[providerIndex] = {
            ...providers[providerIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        logger_1.logger.info(`更新厂商配置成功: ${id}`);
        res.json({
            success: true,
            data: providers[providerIndex]
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('更新厂商配置失败:', error);
        res.status(500).json({ error: '更新厂商配置失败' });
        return;
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const providerIndex = providers.findIndex(p => p.id === parseInt(id));
        if (providerIndex === -1) {
            res.status(404).json({ error: '厂商配置不存在' });
            return;
        }
        providers.splice(providerIndex, 1);
        logger_1.logger.info(`删除厂商配置成功: ${id}`);
        res.json({
            success: true,
            message: '删除成功'
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('删除厂商配置失败:', error);
        res.status(500).json({ error: '删除厂商配置失败' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=providers.js.map