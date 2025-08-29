import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

// 模拟用户数据（实际项目中应该从数据库获取）
const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin User'
};

// 登录
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: '邮箱不能为空' });
      return;
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    logger.info(`用户登录成功: ${email}`);
    
    res.json({
      success: true,
      data: {
        user: mockUser,
        token
      }
    });
    return;
  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
    return;
  }
});

// 获取当前用户信息
router.get('/me', async (req, res): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: '访问令牌缺失' });
      return;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    
    res.json({
      success: true,
      data: {
        user: decoded
      }
    });
    return;
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(401).json({ error: '无效的访问令牌' });
    return;
  }
});

// 登出
router.post('/logout', async (req, res): Promise<void> => {
  try {
    // 简单的登出响应（实际项目中可能需要将token加入黑名单）
    res.json({
      success: true,
      message: '登出成功'
    });
    return;
  } catch (error) {
    logger.error('登出失败:', error);
    res.status(500).json({ error: '登出失败' });
    return;
  }
});

export default router; 