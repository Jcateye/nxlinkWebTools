import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// 内存存储（临时使用，实际应该使用数据库）
let providers: any[] = [];
let nextId = 1;

// 获取所有厂商配置
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    logger.error('获取厂商配置失败:', error);
    res.status(500).json({ error: '获取厂商配置失败' });
  }
});

// 创建厂商配置
router.post('/', async (req, res) => {
  try {
    const {
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
      customHeaders
    } = req.body;

    if (!name || !displayName || !category || !apiKey) {
      return res.status(400).json({ error: '必填字段不能为空' });
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
    
    logger.info(`创建厂商配置成功: ${displayName}`);
    
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    logger.error('创建厂商配置失败:', error);
    res.status(500).json({ error: '创建厂商配置失败' });
  }
});

// 更新厂商配置
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const providerIndex = providers.findIndex(p => p.id === parseInt(id));
    if (providerIndex === -1) {
      return res.status(404).json({ error: '厂商配置不存在' });
    }

    providers[providerIndex] = {
      ...providers[providerIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    logger.info(`更新厂商配置成功: ${id}`);

    res.json({
      success: true,
      data: providers[providerIndex]
    });
  } catch (error) {
    logger.error('更新厂商配置失败:', error);
    res.status(500).json({ error: '更新厂商配置失败' });
  }
});

// 删除厂商配置
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const providerIndex = providers.findIndex(p => p.id === parseInt(id));
    if (providerIndex === -1) {
      return res.status(404).json({ error: '厂商配置不存在' });
    }

    providers.splice(providerIndex, 1);

    logger.info(`删除厂商配置成功: ${id}`);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('删除厂商配置失败:', error);
    res.status(500).json({ error: '删除厂商配置失败' });
  }
});

export default router; 