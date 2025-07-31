import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// 内存存储（临时使用）
let prompts: any[] = [];
let nextId = 1;

// 获取所有提示词
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    logger.error('获取提示词失败:', error);
    res.status(500).json({ error: '获取提示词失败' });
  }
});

// 创建提示词
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      category,
      tags
    } = req.body;

    if (!name || !userPrompt) {
      return res.status(400).json({ error: '名称和用户提示词不能为空' });
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
    
    logger.info(`创建提示词成功: ${name}`);
    
    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    logger.error('创建提示词失败:', error);
    res.status(500).json({ error: '创建提示词失败' });
  }
});

// 更新提示词
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
    if (promptIndex === -1) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    prompts[promptIndex] = {
      ...prompts[promptIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    logger.info(`更新提示词成功: ${id}`);

    res.json({
      success: true,
      data: prompts[promptIndex]
    });
  } catch (error) {
    logger.error('更新提示词失败:', error);
    res.status(500).json({ error: '更新提示词失败' });
  }
});

// 删除提示词
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
    if (promptIndex === -1) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    prompts.splice(promptIndex, 1);

    logger.info(`删除提示词成功: ${id}`);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('删除提示词失败:', error);
    res.status(500).json({ error: '删除提示词失败' });
  }
});

export default router; 