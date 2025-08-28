import express from 'express';
import { 
  getAllApiKeys, 
  addApiKey, 
  updateApiKey, 
  deleteApiKey, 
  validateApiKeyConfig,
  getConfigStats
} from '../services/configManager';
import { ExternalApiKeyConfig } from '../../../config/project.config';

const router = express.Router();

/**
 * 获取所有API Keys
 * GET /api/keys/list
 */
router.get('/list', (req, res): Promise<void> => {
  try {
    const apiKeys = getAllApiKeys();
    const stats = getConfigStats();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        totalKeys: apiKeys.length,
        keys: apiKeys.map(key => ({
          apiKey: key.apiKey,
          alias: key.alias,
          description: key.description,
          hasOpenApiConfig: !!(key.openapi.accessKey && key.openapi.accessSecret),
          openApiBaseUrl: key.openapi.baseUrl,
          bizType: key.openapi.bizType,
          // 不返回敏感信息
          openapi: {
            accessKey: key.openapi.accessKey ? '***' : '',
            accessSecret: key.openapi.accessSecret ? '***' : '',
            bizType: key.openapi.bizType,
            baseUrl: key.openapi.baseUrl
          }
        })),
        stats
      }
    });
    return Promise.resolve();
  } catch (error: any) {
    console.error('获取API Keys失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败',
      error: error.message
    });
    return Promise.resolve();
  }
});

/**
 * 添加API Key
 * POST /api/keys/add
 */
router.post('/add', (req, res): Promise<void> => {
  try {
    const apiKeyConfig: ExternalApiKeyConfig = req.body;
    
    // 验证配置
    const errors = validateApiKeyConfig(apiKeyConfig);
    if (errors.length > 0) {
      res.status(400).json({
        code: 400,
        message: '配置验证失败',
        errors
      });
      return Promise.resolve();
    }

    // 添加API Key
    addApiKey(apiKeyConfig);

    res.json({
      code: 200,
      message: 'API Key 添加成功',
      data: {
        apiKey: apiKeyConfig.apiKey,
        alias: apiKeyConfig.alias
      }
    });

    console.log(`✅ API Key已添加: ${apiKeyConfig.alias} (${apiKeyConfig.apiKey})`);
    return Promise.resolve();
  } catch (error: any) {
    console.error('添加API Key失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '添加失败'
    });
    return Promise.resolve();
  }
});

/**
 * 更新API Key
 * PUT /api/keys/update/:apiKey
 */
router.put('/update/:apiKey', (req, res): Promise<void> => {
  try {
    const apiKey = req.params.apiKey;
    const updates: Partial<ExternalApiKeyConfig> = req.body;
    
    // 验证更新数据
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        code: 400,
        message: '没有提供更新数据'
      });
      return Promise.resolve();
    }

    // 如果有完整配置，进行验证
    if (updates.apiKey || updates.alias || updates.openapi) {
      const errors = validateApiKeyConfig(updates);
      if (errors.length > 0) {
        res.status(400).json({
          code: 400,
          message: '配置验证失败',
          errors
        });
        return Promise.resolve();
      }
    }

    // 更新API Key
    updateApiKey(apiKey, updates);

    res.json({
      code: 200,
      message: 'API Key 更新成功',
      data: {
        apiKey: updates.apiKey || apiKey,
        alias: updates.alias
      }
    });

    console.log(`✅ API Key已更新: ${apiKey}`);
    return Promise.resolve();
  } catch (error: any) {
    console.error('更新API Key失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '更新失败'
    });
    return Promise.resolve();
  }
});

/**
 * 删除API Key
 * DELETE /api/keys/delete/:apiKey
 */
router.delete('/delete/:apiKey', (req, res): Promise<void> => {
  try {
    const apiKey = req.params.apiKey;
    
    // 删除API Key
    deleteApiKey(apiKey);

    res.json({
      code: 200,
      message: 'API Key 删除成功',
      data: {
        apiKey
      }
    });

    console.log(`✅ API Key已删除: ${apiKey}`);
    return Promise.resolve();
  } catch (error: any) {
    console.error('删除API Key失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '删除失败'
    });
    return Promise.resolve();
  }
});

/**
 * 获取单个API Key详情
 * GET /api/keys/detail/:apiKey
 */
router.get('/detail/:apiKey', (req, res): Promise<void> => {
  try {
    const apiKey = req.params.apiKey;
    const allKeys = getAllApiKeys();
    
    const keyConfig = allKeys.find(key => key.apiKey === apiKey);
    if (!keyConfig) {
      res.status(404).json({
        code: 404,
        message: 'API Key 不存在'
      });
      return Promise.resolve();
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        apiKey: keyConfig.apiKey,
        alias: keyConfig.alias,
        description: keyConfig.description,
        openapi: {
          // 返回部分敏感信息用于编辑
          accessKey: keyConfig.openapi.accessKey ? 
            keyConfig.openapi.accessKey.substring(0, 10) + '***' : '',
          accessSecret: keyConfig.openapi.accessSecret ? '***' : '',
          bizType: keyConfig.openapi.bizType,
          baseUrl: keyConfig.openapi.baseUrl
        }
      }
    });
    return Promise.resolve();
  } catch (error: any) {
    console.error('获取API Key详情失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取失败'
    });
    return Promise.resolve();
  }
});

/**
 * 测试API Key
 * POST /api/keys/test
 */
router.post('/test', async (req, res): Promise<void> => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      res.status(400).json({
        code: 400,
        message: 'API Key 不能为空'
      });
      return;
    }

    // 这里可以调用实际的OpenAPI进行测试
    // 目前返回模拟结果
    const allKeys = getAllApiKeys();
    const keyConfig = allKeys.find(key => key.apiKey === apiKey);
    
    if (!keyConfig) {
      res.status(404).json({
        code: 404,
        message: 'API Key 不存在'
      });
      return;
    }

    const hasValidConfig = keyConfig.openapi.accessKey && keyConfig.openapi.accessSecret;

    res.json({
      code: 200,
      message: '测试完成',
      data: {
        apiKey: keyConfig.apiKey,
        alias: keyConfig.alias,
        description: keyConfig.description,
        testResult: {
          isValid: hasValidConfig,
          message: hasValidConfig ? 'API Key配置有效' : 'OpenAPI配置不完整',
          timestamp: new Date().toISOString()
        },
        config: {
          hasOpenApiConfig: hasValidConfig,
          openApiBaseUrl: keyConfig.openapi.baseUrl,
          bizType: keyConfig.openapi.bizType
        }
      }
    });
    return;

  } catch (error: any) {
    console.error('测试API Key失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '测试失败'
    });
    return;
  }
});

/**
 * 获取配置统计信息
 * GET /api/keys/stats
 */
router.get('/stats', (req, res): Promise<void> => {
  try {
    const stats = getConfigStats();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    });
    return Promise.resolve();
  } catch (error: any) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取失败'
    });
    return Promise.resolve();
  }
});

export default router;
