import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Alert, Descriptions, Space, Typography, Table, Tabs, Tag } from 'antd';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface PhoneValidationResult {
  isValid: boolean;
  countryCode: string;
  nationalNumber: string;
  internationalFormat: string;
  nationalFormat: string;
  e164Format: string;
  numberType: string;
  possibleCountries: string[];
  processedNumber?: string; // 处理后的号码（如果自动补全了+号）
  errorMessage?: string;
}

interface PhoneHistoryRecord {
  id: string;
  phoneNumber: string;
  timestamp: string;
  result: PhoneValidationResult;
}

const PhoneNumberValidator: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [result, setResult] = useState<PhoneValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<PhoneHistoryRecord[]>([]);

  const phoneUtil = PhoneNumberUtil.getInstance();

  // 从localStorage加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('phoneValidationHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory.slice(0, 100)); // 只保留最近100条
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    }
  }, []);

  // 保存历史记录到localStorage
  const saveToHistory = (phoneNumber: string, result: PhoneValidationResult) => {
    const newRecord: PhoneHistoryRecord = {
      id: Date.now().toString(),
      phoneNumber,
      timestamp: new Date().toLocaleString('zh-CN'),
      result
    };

    const newHistory = [newRecord, ...history].slice(0, 100); // 保留最近100条
    setHistory(newHistory);
    localStorage.setItem('phoneValidationHistory', JSON.stringify(newHistory));
  };

  const getNumberType = (type: number): string => {
    const types = {
      0: '固定电话',
      1: '移动电话',
      2: '固定电话或移动电话',
      3: '免费电话',
      4: '付费电话',
      5: '共享费用电话',
      6: 'VOIP',
      7: '个人号码',
      8: '寻呼机',
      9: 'UAN',
      10: '未知',
      '-1': '未知'
    };
    return types[type as keyof typeof types] || '未知';
  };

  const validatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      const emptyResult: PhoneValidationResult = {
        isValid: false,
        countryCode: '',
        nationalNumber: '',
        internationalFormat: '',
        nationalFormat: '',
        e164Format: '',
        numberType: '',
        possibleCountries: [],
        errorMessage: '请输入电话号码'
      };
      setResult(emptyResult);
      return;
    }

    setLoading(true);
    
    try {
      // 如果用户没有输入+号，自动补全+号
      let processedNumber = phoneNumber;
      if (!phoneNumber.includes('+')) {
        // 移除所有非数字字符，然后在前面加上+号
        const numbersOnly = phoneNumber.replace(/\D/g, '');
        if (numbersOnly) {
          processedNumber = '+' + numbersOnly;
        }
      }
      
      // 直接按原始输入进行解析，不做任何国家代码推测
      let parsedNumber = null;
      let parseError = null;
      
      try {
        // 直接解析处理后的号码，不指定任何默认国家
        parsedNumber = phoneUtil.parseAndKeepRawInput(processedNumber, undefined);
      } catch (e) {
        parseError = e;
      }
      
      if (!parsedNumber) {
        throw parseError || new Error('无法解析号码');
      }
      
      // 检查号码是否有效
      const isValid = phoneUtil.isValidNumber(parsedNumber);
      
      // 获取国家代码
      const countryCode = `+${parsedNumber.getCountryCode()}`;
      
      // 获取各种格式
      const nationalNumber = parsedNumber.getNationalNumber()?.toString() || '';
      const internationalFormat = phoneUtil.format(parsedNumber, PhoneNumberFormat.INTERNATIONAL);
      const nationalFormat = phoneUtil.format(parsedNumber, PhoneNumberFormat.NATIONAL);
      const e164Format = phoneUtil.format(parsedNumber, PhoneNumberFormat.E164);
      
      // 获取号码类型
      const numberType = getNumberType(phoneUtil.getNumberType(parsedNumber));
      
      // 获取可能的国家
      const countryCodeNum = parsedNumber.getCountryCode();
      const regionCode = countryCodeNum ? phoneUtil.getRegionCodeForCountryCode(countryCodeNum) : null;
      const possibleCountries = regionCode ? [regionCode] : [];
      
      const validationResult: PhoneValidationResult = {
        isValid,
        countryCode,
        nationalNumber,
        internationalFormat,
        nationalFormat,
        e164Format,
        numberType,
        possibleCountries,
        processedNumber: processedNumber !== phoneNumber ? processedNumber : undefined,
        errorMessage: isValid ? undefined : '号码格式不正确或不是有效的电话号码'
      };
      
      setResult(validationResult);
      saveToHistory(phoneNumber, validationResult);
      
    } catch (error) {
      // 解析失败，直接返回失败结果，不做任何推测
      const processedNumber = phoneNumber.includes('+') ? phoneNumber : '+' + phoneNumber.replace(/\D/g, '');
      const failedResult: PhoneValidationResult = {
        isValid: false,
        countryCode: '',
        nationalNumber: '',
        internationalFormat: '',
        nationalFormat: '',
        e164Format: '',
        numberType: '',
        possibleCountries: [],
        processedNumber: processedNumber !== phoneNumber ? processedNumber : undefined,
        errorMessage: `无法解析输入的号码: ${error instanceof Error ? error.message : '号码格式不正确'}`
      };
      
      setResult(failedResult);
      saveToHistory(phoneNumber, failedResult);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validatePhoneNumber();
    }
  };

  // 清空历史记录
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('phoneValidationHistory');
  };

  // 历史记录表格列定义
  const historyColumns = [
    {
      title: '检测时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
    },
    {
      title: '输入号码',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 200,
    },
    {
      title: '检测结果',
      key: 'result',
      width: 100,
      render: (record: PhoneHistoryRecord) => (
        <Tag color={record.result.isValid ? 'green' : 'red'}>
          {record.result.isValid ? '有效' : '无效'}
        </Tag>
      ),
    },
    {
      title: '国家代码',
      key: 'countryCode',
      width: 100,
      render: (record: PhoneHistoryRecord) => (
        <Text strong>{record.result.countryCode || '未识别'}</Text>
      ),
    },
    {
      title: '国际格式',
      key: 'internationalFormat',
      render: (record: PhoneHistoryRecord) => (
        <Text>{record.result.internationalFormat || record.result.errorMessage}</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>电话号码检测工具</Title>
      
      <Tabs defaultActiveKey="validator" type="card">
        <TabPane tab="号码检测" key="validator">
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong>输入电话号码：</Text>
                <Input
                  placeholder="请输入电话号码（例如：+8613800138000 或 8613800138000）"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ marginTop: '8px' }}
                />
              </div>
              
              <Button 
                type="primary" 
                onClick={validatePhoneNumber}
                loading={loading}
                style={{ width: '200px' }}
              >
                检测号码
              </Button>
              
              {result && (
                <div>
                  <Alert
                    message={result.isValid ? '号码有效' : '号码无效'}
                    description={result.errorMessage}
                    type={result.isValid ? 'success' : 'error'}
                    style={{ marginBottom: '16px' }}
                  />
                  
                  <Descriptions title="检测结果" bordered column={1}>
                    <Descriptions.Item label="是否有效">
                      <Text type={result.isValid ? 'success' : 'danger'}>
                        {result.isValid ? '✅ 有效' : '❌ 无效'}
                      </Text>
                    </Descriptions.Item>
                    
                    {result.processedNumber && (
                      <Descriptions.Item label="处理后的号码">
                        <Text type="warning">
                          系统自动补全为: {result.processedNumber}
                        </Text>
                      </Descriptions.Item>
                    )}
                    
                    <Descriptions.Item label="国家代码">
                      <Text strong>{result.countryCode || '未识别'}</Text>
                    </Descriptions.Item>
                    
                    {result.possibleCountries.length > 0 && (
                      <Descriptions.Item label="可能的国家/地区">
                        <Text>{result.possibleCountries.join(', ')}</Text>
                      </Descriptions.Item>
                    )}
                    
                    {result.isValid && (
                      <>
                        <Descriptions.Item label="国内号码">
                          <Text>{result.nationalNumber}</Text>
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="国际格式">
                          <Text>{result.internationalFormat}</Text>
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="国内格式">
                          <Text>{result.nationalFormat}</Text>
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="E164格式">
                          <Text>{result.e164Format}</Text>
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="号码类型">
                          <Text>{result.numberType}</Text>
                        </Descriptions.Item>
                      </>
                    )}
                  </Descriptions>
                </div>
              )}
            </Space>
          </Card>
        </TabPane>
        
        <TabPane tab={`检测历史 (${history.length})`} key="history">
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>检测历史记录</Title>
              <Button 
                type="primary" 
                danger 
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                清空历史
              </Button>
            </div>
            
            <Table
              dataSource={history}
              columns={historyColumns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
              }}
              locale={{
                emptyText: '暂无检测记录'
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PhoneNumberValidator; 