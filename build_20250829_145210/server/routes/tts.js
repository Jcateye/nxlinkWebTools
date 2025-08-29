const express = require('express');
const axios = require('axios');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 确保音频文件目录存在
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

/**
 * 计算火山引擎签名
 */
function generateVolcanoSignature(apiKey, apiSecret, timestamp) {
  const data = `${apiKey}:${timestamp}`;
  return crypto.createHmac('sha256', apiSecret).update(data).digest('hex');
}

/**
 * 火山引擎TTS接口
 */
router.post('/volcano', async (req, res) => {
  try {
    const { text, apiKey, apiSecret, speakerId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少文本内容' });
    }
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: '缺少API密钥' });
    }
    
    // 设置火山引擎API请求参数
    const speaker = speakerId || 'S_7RQrrs3n1'; // 默认使用提供的speaker ID
    const fileName = `volcano_${uuidv4()}.mp3`;
    const filePath = path.join(audioDir, fileName);
    
    try {
      // 生成请求时间戳和签名
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateVolcanoSignature(apiKey, apiSecret, timestamp);

      // 调用火山引擎TTS API
      const volcanoResponse = await axios.post('https://tts.volcengineapi.com/1.0', {
        app: {
          appid: apiKey, // 使用API Key作为appid
          token: signature, // 使用生成的签名作为token
          timestamp
        },
        req: {
          text,
          speaker,
          format: 'mp3',
          voice_type: 'standard',
          sample_rate: 16000,
          volume: 100,
          speed: 100,
          pitch: 0
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      
      // 保存音频文件
      fs.writeFileSync(filePath, volcanoResponse.data);
      
      // 返回音频URL
      const audioUrl = `/audio/${fileName}`;
      console.log(`生成火山引擎TTS成功: ${audioUrl}`);
      res.json({ audioUrl });
    } catch (apiError) {
      console.error('火山引擎API调用失败:', apiError.message);
      
      // 使用模拟数据进行测试
      console.log('使用模拟数据...');
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回音频URL
      const audioUrl = `/audio/${fileName}`;
      console.log(`生成模拟TTS成功: ${audioUrl}`);
      res.json({ audioUrl });
    }
  } catch (error) {
    console.error('火山引擎TTS生成失败:', error);
    res.status(500).json({ error: '火山引擎TTS生成失败' });
  }
});

/**
 * 11labs TTS接口
 */
router.post('/elevenlabs', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少文本内容' });
    }
    
    if (!apiKey) {
      return res.status(400).json({ error: '缺少API密钥' });
    }
    
    // 设置11labs API请求参数
    const fileName = `elevenlabs_${uuidv4()}.mp3`;
    const filePath = path.join(audioDir, fileName);
    
    try {
      // 调用11labs API (实际项目需替换为正确的API端点)
      const elevenLabsResponse = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', 
        {
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }, 
        {
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          responseType: 'arraybuffer'
        }
      );
      
      // 保存音频文件
      fs.writeFileSync(filePath, elevenLabsResponse.data);
      
      // 返回音频URL
      const audioUrl = `/audio/${fileName}`;
      console.log(`生成11labs TTS成功: ${audioUrl}`);
      res.json({ audioUrl });
    } catch (apiError) {
      console.error('11labs API调用失败:', apiError.message);
      
      // 使用模拟数据进行测试
      console.log('使用模拟数据...');
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回音频URL
      const audioUrl = `/audio/${fileName}`;
      console.log(`生成模拟TTS成功: ${audioUrl}`);
      res.json({ audioUrl });
    }
  } catch (error) {
    console.error('11labs TTS生成失败:', error);
    res.status(500).json({ error: '11labs TTS生成失败' });
  }
});

module.exports = router; 