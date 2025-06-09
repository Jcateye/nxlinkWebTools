import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Tag, Space, Dropdown, Menu, Spin } from 'antd';
import { DownOutlined, SwapOutlined } from '@ant-design/icons';
import { FaqUserParams } from '../types';
import { useUserContext } from '../context/UserContext';
import axios from 'axios';
import { getTenantList, switchTenant } from '../services/api';

const { Text } = Typography;

// 定义组件属性
interface FaqParamsFormProps {
  formType?: 'source' | 'target';
}

// 定义租户类型
interface Tenant {
  tenant_id: number;
  tenant_name: string;
  company_name: string;
  role_name: string;
}

// 创建特定的axios实例用于is_login请求
const loginApi = axios.create({
  timeout: 30000, // 30秒超时
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  }
});

// 添加请求拦截器，打印请求内容
loginApi.interceptors.request.use(config => {
  console.log('======== 发送请求 ========');
  console.log('请求URL:', config.url);
  console.log('请求方法:', config.method?.toUpperCase());
  console.log('请求头:', JSON.stringify(config.headers, null, 2));
  console.log('请求体:', config.data || '无');
  console.log('========================');
  return config;
});

// 添加响应拦截器，打印响应内容
loginApi.interceptors.response.use(
  response => {
    console.log('======== 响应成功 ========');
    console.log('状态码:', response.status);
    console.log('响应头:', JSON.stringify(response.headers, null, 2));
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    console.log('=========================');
    return response;
  },
  error => {
    console.error('======== 响应错误 ========');
    console.error('错误信息:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers, null, 2));
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
      console.error('请求信息:', error.request);
    }
    console.error('=========================');
    return Promise.reject(error);
  }
);

const FaqParamsForm: React.FC<FaqParamsFormProps> = ({ formType = 'source' }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { faqUserParams, setFaqUserParams, sessionId, isCollaborationMode, activeCollaborationSession } = useUserContext();
  
  // 添加状态用于存储公司和团队信息
  const [sourceCompanyInfo, setSourceCompanyInfo] = useState<{company?: string, tenantName?: string, customerCode?: string, defaultTenantId?: number, email?: string, phone?: string} | null>(null);
  const [targetCompanyInfo, setTargetCompanyInfo] = useState<{company?: string, tenantName?: string, customerCode?: string, defaultTenantId?: number, email?: string, phone?: string} | null>(null);
  
  // 添加租户列表状态
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantDropdownVisible, setTenantDropdownVisible] = useState(false);

  // 组件加载时从本地存储加载参数
  useEffect(() => {
    if (isCollaborationMode && activeCollaborationSession) {
      // 协作模式下从会话中读取
      const params = activeCollaborationSession.faqUserParams;
      if (params) {
        if (formType === 'source' && params.sourceAuthorization) {
          form.setFieldsValue({ sourceAuthorization: params.sourceAuthorization });
          setSourceCompanyInfo(activeCollaborationSession.companyInfo?.source || null);
        }
        if (formType === 'target' && params.targetAuthorization) {
          form.setFieldsValue({ targetAuthorization: params.targetAuthorization });
          setTargetCompanyInfo(activeCollaborationSession.companyInfo?.target || null);
        }
      }
    } else {
      // 非协作模式下使用本地存储
      const storageKey = `faqUserParams_${sessionId}`;
      const savedParams: Partial<FaqUserParams> = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (formType === 'source' && savedParams.sourceAuthorization) {
        form.setFieldsValue({ sourceAuthorization: savedParams.sourceAuthorization });
        const sourceInfoKey = `sourceCompanyInfo_${sessionId}`;
        try {
          const savedSourceInfo = JSON.parse(localStorage.getItem(sourceInfoKey) || 'null');
          if (savedSourceInfo) setSourceCompanyInfo(savedSourceInfo);
        } catch (e) {
          console.error('加载源租户公司信息失败', e);
        }
      }
      if (formType === 'target' && savedParams.targetAuthorization) {
        form.setFieldsValue({ targetAuthorization: savedParams.targetAuthorization });
        const targetInfoKey = `targetCompanyInfo_${sessionId}`;
        try {
          const savedTargetInfo = JSON.parse(localStorage.getItem(targetInfoKey) || 'null');
          if (savedTargetInfo) setTargetCompanyInfo(savedTargetInfo);
        } catch (e) {
          console.error('加载目标租户公司信息失败', e);
        }
      }
    }
  }, [form, sessionId, formType, isCollaborationMode, activeCollaborationSession]);

  // 验证用户token
  const verifyToken = async (token: string, isSource: boolean) => {
    try {
      console.log(`验证${isSource ? '源' : '目标'}租户token...`);
      
      // 尝试直接访问原始URL
      const url = 'https://nxlink.nxcloud.com/admin/saas_plat/user/is_login';
      console.log(`开始请求: ${url}`);
      
      const headers = {
        'authorization': token,
        'system_id': '5',
        'time_zone': 'UTC+08:00',
        'Content-Type': ''  // 显式设置为空
      };
      
      try {
        console.log(`使用直接URL方式请求: ${url}`);
        // 明确传入空数据，并设置 transformRequest 以防止默认行为
        const response = await loginApi.put(url, '', { 
          headers,
          transformRequest: [(data, headers) => {
            // 确保不会设置默认的 Content-Type
            if (headers) {
              headers['Content-Type'] = '';
            }
            return data;
          }]
        });
        
        const info = response.data?.data?.userInfo;
        if (info) {
          // 打印API响应的用户信息，以便调试
          console.log('API响应用户信息:', info);
          console.log('defaultTenantId:', info.defaultTenantId);
          
          const { company, tenantName, email, phone } = info;
          // 获取customerCode (tenantID)和defaultTenantId
          const customerCode = info.customerCode || '未知';
          const tenantId = info.defaultTenantId || info.id || null;
          
          // 保存公司和团队信息到状态，增加email和phone
          const companyInfo = { 
            company, 
            tenantName, 
            customerCode, 
            defaultTenantId: tenantId,
            email,
            phone
          };
          if (isSource) {
            setSourceCompanyInfo(companyInfo);
            // 缓存信息
            localStorage.setItem(`sourceCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
          } else {
            setTargetCompanyInfo(companyInfo);
            // 缓存信息
            localStorage.setItem(`targetCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
          }
          
          message.success(`${isSource ? '源' : '目标'}租户验证成功 - 公司: ${company || '-'}，团队: ${tenantName || '-'}`);
          return true;
        } else {
          message.warning(`${isSource ? '源' : '目标'}租户响应成功但未获取到用户信息`);
          return false;
        }
      } catch (directErr: any) {
        console.error(`直接URL方式请求失败:`, directErr.message);
        
        // 如果直接请求失败，尝试使用fetch API
        try {
          console.log(`尝试使用fetch API请求`);
          const fetchResponse = await fetch(url, {
            method: 'PUT',
            headers: {
              'authorization': token,
              'system_id': '5',
              'time_zone': 'UTC+08:00'
            }
          });
          
          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            console.log(`fetch请求成功:`, JSON.stringify(data, null, 2));
            
            const fetchInfo = data?.data?.userInfo;
            if (fetchInfo) {
              // 打印fetch请求返回的用户信息
              console.log('Fetch响应用户信息:', fetchInfo);
              console.log('Fetch defaultTenantId:', fetchInfo.defaultTenantId);
              
              const { company, tenantName, email, phone } = fetchInfo;
              // 获取customerCode (tenantID)和defaultTenantId
              const customerCode = fetchInfo.customerCode || '未知';
              const tenantId = fetchInfo.defaultTenantId || fetchInfo.id || null;
              
              // 保存公司和团队信息到状态，增加email和phone
              const companyInfo = { 
                company, 
                tenantName, 
                customerCode, 
                defaultTenantId: tenantId,
                email,
                phone
              };
              if (isSource) {
                setSourceCompanyInfo(companyInfo);
                // 缓存信息
                localStorage.setItem(`sourceCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
              } else {
                setTargetCompanyInfo(companyInfo);
                // 缓存信息
                localStorage.setItem(`targetCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
              }
              
              message.success(`${isSource ? '源' : '目标'}租户验证成功 - 公司: ${company || '-'}，团队: ${tenantName || '-'}`);
              return true;
            }
          } else {
            throw new Error(`状态码: ${fetchResponse.status}`);
          }
        } catch (fetchErr: any) {
          console.error(`fetch请求也失败了:`, fetchErr.message);
          
          // 最后尝试使用代理请求
          try {
            console.log(`尝试使用代理方式请求: /api/admin/saas_plat/user/is_login`);
            const proxyResponse = await axios({
              method: 'put',
              url: '/api/admin/saas_plat/user/is_login',
              headers: {
                'authorization': token,
                'system_id': '5',
                'time_zone': 'UTC+08:00'
              },
              data: '',
              transformRequest: [(data, headers) => {
                if (headers) {
                  delete headers['Content-Type'];
                }
                return data;
              }]
            });
            
            console.log(`代理请求成功:`, JSON.stringify(proxyResponse.data, null, 2));
            
            const proxyInfo = proxyResponse.data?.data?.userInfo;
            if (proxyInfo) {
              // 打印代理请求返回的用户信息
              console.log('代理响应用户信息:', proxyInfo);
              console.log('代理 defaultTenantId:', proxyInfo.defaultTenantId);
              
              const { company, tenantName, email, phone } = proxyInfo;
              // 获取customerCode (tenantID)和defaultTenantId
              const customerCode = proxyInfo.customerCode || '未知';
              const tenantId = proxyInfo.defaultTenantId || proxyInfo.id || null;
              
              // 保存公司和团队信息到状态，增加email和phone
              const companyInfo = { 
                company, 
                tenantName, 
                customerCode, 
                defaultTenantId: tenantId,
                email,
                phone
              };
              if (isSource) {
                setSourceCompanyInfo(companyInfo);
                // 缓存信息
                localStorage.setItem(`sourceCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
              } else {
                setTargetCompanyInfo(companyInfo);
                // 缓存信息
                localStorage.setItem(`targetCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
              }
              
              message.success(`${isSource ? '源' : '目标'}租户验证成功 - 公司: ${company || '-'}，团队: ${tenantName || '-'}`);
              return true;
            } else {
              message.warning(`${isSource ? '源' : '目标'}租户响应成功但未获取到用户信息`);
              return false;
            }
          } catch (proxyErr: any) {
            console.error(`代理方式请求也失败了:`, proxyErr.message);
            throw proxyErr;
          }
        }
      }
    } catch (err: any) {
      console.error(`${isSource ? '源' : '目标'}租户验证失败:`, err.response?.data || err.message);
      
      // 清除对应的公司信息
      if (isSource) {
        setSourceCompanyInfo(null);
        localStorage.removeItem(`sourceCompanyInfo_${sessionId}`);
      } else {
        setTargetCompanyInfo(null);
        localStorage.removeItem(`targetCompanyInfo_${sessionId}`);
      }
      
      // 提取错误信息
      let errorMsg = '验证失败';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.code) {
        errorMsg = `错误代码: ${err.response.data.code}`;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      message.error(`${isSource ? '源' : '目标'}租户验证失败: ${errorMsg}`);
      return false;
    }
  };

  const handleSubmit = async (values: FaqUserParams) => {
    setLoading(true);
    try {
      // 验证源租户token
      if (values.sourceAuthorization) {
        await verifyToken(values.sourceAuthorization, true);
      }
      
      // 验证目标租户token
      if (values.targetAuthorization) {
        await verifyToken(values.targetAuthorization, false);
      }

      // 合并保存参数到上下文和本地存储
      const newParams: FaqUserParams = {
        sourceAuthorization: values.sourceAuthorization ?? faqUserParams?.sourceAuthorization ?? '',
        targetAuthorization: values.targetAuthorization ?? faqUserParams?.targetAuthorization ?? ''
      };
      setFaqUserParams(newParams);
      if (!isCollaborationMode) {
        // 非协作模式下才写本地存储
        const storageKey = `faqUserParams_${sessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(newParams));
      }

      message.success('身份信息保存成功');
    } catch (error) {
      message.error('保存身份信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 尝试自动保存，只在必填字段有值时执行
  const tryAutoSave = () => {
    const values = form.getFieldsValue() as FaqUserParams;
    const { sourceAuthorization, targetAuthorization } = values;
    if (
      (formType === 'source' && sourceAuthorization) ||
      (formType === 'target' && targetAuthorization)
    ) {
      handleSubmit(values);
    }
  };

  // 渲染公司和团队信息标签
  const renderCompanyInfo = (info: {company?: string, tenantName?: string, customerCode?: string, defaultTenantId?: number, email?: string, phone?: string} | null) => {
    if (!info) return null;
    
    console.log('渲染公司信息:', info);
    
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Space size={4} wrap>
            {info.company && (
              <Tag color="blue">公司: {info.company}</Tag>
            )}
            {info.tenantName && (
              <Tag color="green">团队: {info.tenantName}</Tag>
            )}
            {/* 当defaultTenantId存在时显示租户ID，否则使用customerCode */}
            <Tag color="red">租户ID: {info.defaultTenantId || info.customerCode}</Tag>
          </Space>
        </div>
        <div>
          <Space size={4} wrap>
            {info.email && (
              <Tag color="purple">邮箱: {info.email}</Tag>
            )}
            {info.phone && (
              <Tag color="orange">电话: {info.phone}</Tag>
            )}
          </Space>
        </div>
      </div>
    );
  };

  // 获取租户列表
  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const token = formType === 'source' 
        ? faqUserParams?.sourceAuthorization 
        : faqUserParams?.targetAuthorization;
      
      if (!token) {
        message.warning(`请先完成${formType === 'source' ? '源' : '目标'}租户身份认证`);
        return;
      }
      
      const tenantList = await getTenantList(token);
      setTenants(tenantList);
    } catch (error) {
      console.error('获取租户列表失败:', error);
      message.error('获取租户列表失败');
    } finally {
      setLoadingTenants(false);
    }
  };

  // 处理租户切换
  const handleSwitchTenant = async (tenant: Tenant) => {
    try {
      setLoading(true);
      const token = formType === 'source' 
        ? faqUserParams?.sourceAuthorization 
        : faqUserParams?.targetAuthorization;
      
      if (!token) {
        message.warning(`请先完成${formType === 'source' ? '源' : '目标'}租户身份认证`);
        return;
      }
      
      const success = await switchTenant(token, tenant.tenant_id);
      if (success) {
        message.success(`已切换到租户: ${tenant.tenant_name} (${tenant.company_name})`);
        
        // 更新当前的公司信息
        const companyInfo = { 
          company: tenant.company_name, 
          tenantName: tenant.tenant_name, 
          customerCode: String(tenant.tenant_id), 
          defaultTenantId: tenant.tenant_id
        };
        
        if (formType === 'source') {
          setSourceCompanyInfo(companyInfo as any);
          localStorage.setItem(`sourceCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
        } else {
          setTargetCompanyInfo(companyInfo as any);
          localStorage.setItem(`targetCompanyInfo_${sessionId}`, JSON.stringify(companyInfo));
        }
        
        // 重新验证token，获取完整的用户信息
        await verifyToken(token, formType === 'source');
      }
    } catch (error) {
      console.error('切换租户失败:', error);
      message.error('切换租户失败');
    } finally {
      setLoading(false);
      setTenantDropdownVisible(false);
    }
  };

  // 创建租户下拉菜单
  const tenantMenu = (
    <Menu 
      onClick={({ key }) => {
        const tenant = tenants.find(t => t.tenant_id === parseInt(key));
        if (tenant) {
          handleSwitchTenant(tenant);
        }
      }}
    >
      {loadingTenants ? (
        <Menu.Item key="loading" disabled>
          <Spin size="small" /> 加载中...
        </Menu.Item>
      ) : tenants.length === 0 ? (
        <Menu.Item key="empty" disabled>
          无可用租户
        </Menu.Item>
      ) : (
        tenants.map(tenant => (
          <Menu.Item key={tenant.tenant_id}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tenant.company_name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                <span>{tenant.tenant_name}</span>
                <span>{tenant.role_name}</span>
              </div>
            </div>
          </Menu.Item>
        ))
      )}
    </Menu>
  );

  return (
    <Card 
      title={`${formType === 'source' ? '源' : '目标'}租户身份认证`}
      style={{ marginBottom: 16 }}
      extra={
        formType === 'source'
          ? renderCompanyInfo(sourceCompanyInfo)
          : renderCompanyInfo(targetCompanyInfo)
      }
    >
      <div style={{ marginBottom: 12, color: '#f5222d', fontWeight: 'bold' }}>
        注意：必须使用两个不同的账号登录
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onBlurCapture={tryAutoSave}
      >
        {formType === 'source' && (
          <Form.Item
            name="sourceAuthorization"
            label={
              <>
                源租户Authorization
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  获取路径: NXLink网页界面-开发者工具(F12)-应用（Application）-左边目录的Cookies-nxlink域名下Name是"token"的Value
                </Text>
              </>
            }
            rules={[{ required: false, message: '请输入源租户Authorization令牌' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入源租户NXLink Authorization令牌（可选，如过期会自动清除）" 
            />
          </Form.Item>
        )}

        {formType === 'target' && (
          <Form.Item
            name="targetAuthorization"
            label={
              <>
                目标租户Authorization
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  获取路径: 使用目标租户账号登录后，NXLink网页界面-开发者工具(F12)-应用（Application）-左边目录的Cookies-nxlink域名下Name是"token"的Value
                </Text>
              </>
            }
            rules={[{ required: false, message: '请输入目标租户Authorization令牌' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入目标租户NXLink Authorization令牌（可选，如过期会自动清除）" 
            />
          </Form.Item>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存身份信息
          </Button>
          
          {/* 切换租户按钮 - 放在红色区域 */}
          {(formType === 'source' ? !!faqUserParams?.sourceAuthorization : !!faqUserParams?.targetAuthorization) && (
            <Dropdown 
              overlay={tenantMenu} 
              onVisibleChange={(visible) => {
                if (visible) fetchTenants();
                setTenantDropdownVisible(visible);
              }}
              visible={tenantDropdownVisible}
              trigger={['click']}
            >
              <Button 
                icon={<SwapOutlined />} 
                style={{ marginLeft: 16 }}
              >
                切换租户
              </Button>
            </Dropdown>
          )}
        </div>
      </Form>
    </Card>
  );
};

export default FaqParamsForm; 