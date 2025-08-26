import React, { useEffect, useState } from 'react';
import { Form, Button, Card, message, Typography, Tag, Space, Dropdown, Menu, Spin } from 'antd';
import { DownOutlined, SwapOutlined, KeyOutlined, LogoutOutlined } from '@ant-design/icons';
import { FaqUserParams } from '../types';
import { useUserContext } from '../context/UserContext';
import axios from 'axios';
import { getTenantList, switchTenant, nxlinkClientLogout, nxlinkClientIsLogin } from '../services/api';
import AuthModal from './AuthModal';
import UserInfoCard from './UserInfoCard';

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
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { faqUserParams, setFaqUserParams, sessionId, isCollaborationMode, activeCollaborationSession } = useUserContext();
  
  // 添加状态用于存储公司和团队信息
  const [sourceCompanyInfo, setSourceCompanyInfo] = useState<{company?: string, tenantName?: string, customerCode?: string, defaultTenantId?: number, email?: string, phone?: string} | null>(null);
  const [targetCompanyInfo, setTargetCompanyInfo] = useState<{company?: string, tenantName?: string, customerCode?: string, defaultTenantId?: number, email?: string, phone?: string} | null>(null);
  
  // 添加租户列表状态
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantDropdownVisible, setTenantDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // 组件加载时从本地存储加载参数并验证
  useEffect(() => {
    const loadAndValidateTokens = async () => {
      if (isCollaborationMode) return;
      
      try {
        const persistedSource = localStorage.getItem('nxlink_source_token') || '';
        const persistedTarget = localStorage.getItem('nxlink_target_token') || '';
        
        let validSourceToken = '';
        let validTargetToken = '';
        
        // 验证源租户token
        if (persistedSource) {
          try {
            await verifyToken(persistedSource, true);
            validSourceToken = persistedSource;
            console.log('✅ 源租户持久化token验证成功');
          } catch (e) {
            console.warn('❌ 源租户持久化token验证失败，已清除');
            localStorage.removeItem('nxlink_source_token');
          }
        }
        
        // 验证目标租户token
        if (persistedTarget) {
          try {
            await verifyToken(persistedTarget, false);
            validTargetToken = persistedTarget;
            console.log('✅ 目标租户持久化token验证成功');
          } catch (e) {
            console.warn('❌ 目标租户持久化token验证失败，已清除');
            localStorage.removeItem('nxlink_target_token');
          }
        }
        
        // 只使用验证通过的token
        if (validSourceToken || validTargetToken) {
          const newParams = {
            sourceAuthorization: validSourceToken || faqUserParams?.sourceAuthorization || '',
            targetAuthorization: validTargetToken || faqUserParams?.targetAuthorization || ''
          };
          setFaqUserParams(newParams);
          const storageKey = `faqUserParams_${sessionId}`;
          localStorage.setItem(storageKey, JSON.stringify(newParams));
        }
      } catch (e) {
        console.error('自动登录token验证流程异常:', e);
      }
    };
    
    loadAndValidateTokens();
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

  // 监听授权状态变化，清理对应的公司信息
  useEffect(() => {
    if (formType === 'source') {
      // 如果源租户授权被清除，清理源租户公司信息
      if (!faqUserParams?.sourceAuthorization) {
        console.log('🧹 [FaqParamsForm] 清理源租户公司信息');
        setSourceCompanyInfo(null);
        // 同时清理本地存储的公司信息
        if (!isCollaborationMode) {
          const sourceInfoKey = `sourceCompanyInfo_${sessionId}`;
          localStorage.removeItem(sourceInfoKey);
        }
      }
    } else {
      // 如果目标租户授权被清除，清理目标租户公司信息
      if (!faqUserParams?.targetAuthorization) {
        console.log('🧹 [FaqParamsForm] 清理目标租户公司信息');
        setTargetCompanyInfo(null);
        // 同时清理本地存储的公司信息
        if (!isCollaborationMode) {
          const targetInfoKey = `targetCompanyInfo_${sessionId}`;
          localStorage.removeItem(targetInfoKey);
        }
      }
    }
  }, [faqUserParams, formType, sessionId, isCollaborationMode]);

  // 处理登出操作
  const handleLogout = async () => {
    const currentToken = formType === 'source' ? faqUserParams?.sourceAuthorization : faqUserParams?.targetAuthorization;
    
    if (!currentToken) {
      message.warning('没有可登出的授权信息');
      return;
    }

    try {
      console.log(`🚪 [FaqParamsForm] 开始登出${formType === 'source' ? '源' : '目标'}租户...`);
      
      // 调用登出API
      await nxlinkClientLogout(currentToken);
      
      // 清理本地状态
      const newParams = {
        sourceAuthorization: formType === 'source' ? '' : (faqUserParams?.sourceAuthorization || ''),
        targetAuthorization: formType === 'target' ? '' : (faqUserParams?.targetAuthorization || '')
      };
      setFaqUserParams(newParams);
      
      // 清理本地存储
      if (!isCollaborationMode) {
        const storageKey = `faqUserParams_${sessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(newParams));
        
        // 清理公司信息和持久化token
        if (formType === 'source') {
          const sourceInfoKey = `sourceCompanyInfo_${sessionId}`;
          localStorage.removeItem(sourceInfoKey);
          setSourceCompanyInfo(null);
          // 清除持久化的源租户token
          localStorage.removeItem('nxlink_source_token');
        } else {
          const targetInfoKey = `targetCompanyInfo_${sessionId}`;
          localStorage.removeItem(targetInfoKey);
          setTargetCompanyInfo(null);
          // 清除持久化的目标租户token
          localStorage.removeItem('nxlink_target_token');
        }
      }
      
      message.success(`${formType === 'source' ? '源' : '目标'}租户登出成功`);
    } catch (error: any) {
      console.error(`❌ [FaqParamsForm] 登出失败:`, error);
      // 即使登出API失败，也清理本地状态（可能token已过期）
      const newParams = {
        sourceAuthorization: formType === 'source' ? '' : (faqUserParams?.sourceAuthorization || ''),
        targetAuthorization: formType === 'target' ? '' : (faqUserParams?.targetAuthorization || '')
      };
      setFaqUserParams(newParams);
      
      if (!isCollaborationMode) {
        const storageKey = `faqUserParams_${sessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(newParams));
      }
      
      message.success('已清理本地授权信息');
    }
  };

  // 验证用户token
  const verifyToken = async (token: string, isSource: boolean) => {
    try {
      console.log(`验证${isSource ? '源' : '目标'}租户token...`);
      
      // 使用统一的 nxlinkClientIsLogin 方法
      const response = await nxlinkClientIsLogin(token);
      
      if (response.code === 0 && response.data) {
        // 只验证token有效性，不处理用户信息
        // 用户信息由 UserInfoCard 组件统一处理
        console.log(`${isSource ? '源' : '目标'}租户token验证成功`);
        return true;
      } else {
        console.error(`${isSource ? '源' : '目标'}租户token验证失败`);
        return false;
      }
    } catch (err: any) {
      console.error(`${isSource ? '源' : '目标'}租户验证失败:`, err.response?.data || err.message);
      return false;
    }
  };

  const handleSubmit = async (values: FaqUserParams) => {
    // 现在身份认证通过AuthModal处理，这个函数主要用于其他逻辑
    console.log('Form submission (mainly for validation):', values);
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
      >
        {formType === 'source' && (
          <div style={{ 
            padding: 16, 
            border: '1px solid #d9d9d9', 
            borderRadius: 8, 
            background: '#fafafa',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>源租户身份认证</Text>
                <div style={{ marginTop: 4 }}>
                  {faqUserParams?.sourceAuthorization ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#52c41a' 
                      }}></span>
                      <Text type="success" style={{ fontSize: 12 }}>已授权</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {faqUserParams.sourceAuthorization.substring(0, 15)}...
                      </Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#ff4d4f' 
                      }}></span>
                      <Text type="danger" style={{ fontSize: 12 }}>未授权</Text>
                    </div>
                  )}
                </div>
              </div>
              <Space size={8}>
                <Button
                  type="primary"
                  icon={<KeyOutlined />}
                  onClick={() => setAuthModalVisible(true)}
                  size="small"
                >
                  {faqUserParams?.sourceAuthorization ? '重新授权' : '设置授权'}
                </Button>
                {faqUserParams?.sourceAuthorization && (
                  <Button
                    type="default"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                    size="small"
                  >
                    登出
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}

        {/* 用户信息显示 - 仅在源租户已授权时显示 */}
        {formType === 'source' && faqUserParams?.sourceAuthorization && (
          <div style={{ marginBottom: 16 }}>
            <UserInfoCard compact={true} showRefresh={false} />
          </div>
        )}

        {formType === 'target' && (
          <div style={{ 
            padding: 16, 
            border: '1px solid #d9d9d9', 
            borderRadius: 8, 
            background: '#fafafa',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>目标租户身份认证</Text>
                <div style={{ marginTop: 4 }}>
                  {faqUserParams?.targetAuthorization ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#52c41a' 
                      }}></span>
                      <Text type="success" style={{ fontSize: 12 }}>已授权</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {faqUserParams.targetAuthorization.substring(0, 15)}...
                      </Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#ff4d4f' 
                      }}></span>
                      <Text type="danger" style={{ fontSize: 12 }}>未授权</Text>
                    </div>
                  )}
                </div>
              </div>
              <Space size={8}>
                <Button
                  type="primary"
                  icon={<KeyOutlined />}
                  onClick={() => setAuthModalVisible(true)}
                  size="small"
                >
                  {faqUserParams?.targetAuthorization ? '重新授权' : '设置授权'}
                </Button>
                {faqUserParams?.targetAuthorization && (
                  <Button
                    type="default"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                    size="small"
                  >
                    登出
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}

        {/* 切换租户功能 - 仅在已授权时显示 */}
        {(formType === 'source' ? !!faqUserParams?.sourceAuthorization : !!faqUserParams?.targetAuthorization) && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
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
                size="small"
                type="dashed"
              >
                切换租户
              </Button>
            </Dropdown>
          </div>
        )}
      </Form>

      <AuthModal
        visible={authModalVisible}
        onCancel={() => setAuthModalVisible(false)}
        onSuccess={async (token, method, remember) => {
          // 保存token到用户参数
          const newParams = {
            sourceAuthorization: formType === 'source' ? token : (faqUserParams?.sourceAuthorization || ''),
            targetAuthorization: formType === 'target' ? token : (faqUserParams?.targetAuthorization || '')
          };
          setFaqUserParams(newParams);
          
          // 清理对应的公司信息，等待重新获取
          if (formType === 'source') {
            console.log('🧹 [FaqParamsForm] 重新授权，清理源租户公司信息');
            setSourceCompanyInfo(null);
          } else {
            console.log('🧹 [FaqParamsForm] 重新授权，清理目标租户公司信息');
            setTargetCompanyInfo(null);
          }
          
          // 非协作模式下保存到localStorage
          if (!isCollaborationMode) {
            const storageKey = `faqUserParams_${sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify(newParams));
            
            // 无论是否勾选自动登录，都更新持久化的token
            // 这样确保持久化的token始终是最新的
            if (formType === 'source') {
              if (remember) {
                localStorage.setItem('nxlink_source_token', token);
              } else {
                localStorage.removeItem('nxlink_source_token');
              }
            } else {
              if (remember) {
                localStorage.setItem('nxlink_target_token', token);
              } else {
                localStorage.removeItem('nxlink_target_token');
              }
            }
            
            // 同时清理本地存储的公司信息
            if (formType === 'source') {
              const sourceInfoKey = `sourceCompanyInfo_${sessionId}`;
              localStorage.removeItem(sourceInfoKey);
            } else {
              const targetInfoKey = `targetCompanyInfo_${sessionId}`;
              localStorage.removeItem(targetInfoKey);
            }
          }
          
          // 关闭弹窗
          setAuthModalVisible(false);
          message.success('身份认证设置成功');
        }}
        title={`${formType === 'source' ? '源' : '目标'}租户身份认证`}
        description={`为${formType === 'source' ? '源' : '目标'}租户设置身份认证Token，您可以选择登录获取或手动输入`}
        currentToken={formType === 'source' ? faqUserParams?.sourceAuthorization : faqUserParams?.targetAuthorization}
      />
    </Card>
  );
};

export default FaqParamsForm; 