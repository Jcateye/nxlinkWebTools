import React, { useState, useEffect } from 'react';
import { Layout, List, Input, Button, Table, Modal, Form, Checkbox, Select, Pagination, Card, message, Space, Typography } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { memberService, type MemberGroup, type Member, type Role } from '../services/memberService';
import { useUserContext } from '../context/UserContext';
import { getDefaultDjbHash } from '../utils/djbHash';
import AuthModal from '../components/AuthModal';

const { Sider, Content } = Layout;
const { Search } = Input;
const { Text } = Typography;

const MemberManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>('0');
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 200,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [webAccountSearchText, setWebAccountSearchText] = useState('');
  const [form] = Form.useForm();
  const [hasToken, setHasToken] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { sessionId, faqUserParams, setFaqUserParams, isCollaborationMode } = useUserContext();
  const [batchInviteList, setBatchInviteList] = useState<Array<{key: string; email: string; name: string}>>([]);

  // 检查源租户token状态并监听变化
  useEffect(() => {
    const checkToken = () => {
      let newHasToken = false;
      
      // 从faqUserParams中检查sourceAuthorization
      if (faqUserParams?.sourceAuthorization) {
        newHasToken = true;
      } else {
        // 兼容性：从localStorage中检查
        try {
          const faqParamsKey = `faqUserParams_${sessionId}`;
          const faqParams = localStorage.getItem(faqParamsKey);
          if (faqParams) {
            const params = JSON.parse(faqParams);
            newHasToken = !!params.sourceAuthorization;
          }
        } catch (error) {
          console.error('解析faqUserParams失败:', error);
        }
      }
      
      if (newHasToken !== hasToken) {
        setHasToken(newHasToken);
        
        // 如果token刚被设置，自动加载数据
        if (newHasToken) {
          loadGroups();
          loadRoles();
        } else {
          // 如果token被清除，清空数据
          setGroups([]);
          setMembers([]);
          setRoles([]);
          setSelectedGroupId(null);
        }
      }
    };

    // 立即检查一次
    checkToken();

    // 设置定时器定期检查
    const interval = setInterval(checkToken, 1000);

    return () => clearInterval(interval);
  }, [hasToken, sessionId, faqUserParams]);



  // 加载分组列表
  const loadGroups = async () => {
    // 检查是否有token，没有则不发起请求
    if (!faqUserParams?.sourceAuthorization) {
      console.log('没有授权token，跳过分组列表加载');
      return;
    }
    
    setLoading(true);
    try {
      const data = await memberService.getMemberGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('加载分组失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载成员列表
  const loadMembers = async (groupId: string, pageNum: number = 1, search: string = '') => {
    if (!groupId) return;
    
    // 检查是否有token，没有则不发起请求
    if (!faqUserParams?.sourceAuthorization) {
      console.log('没有授权token，跳过成员列表加载');
      return;
    }
    
    setLoading(true);
    try {
      const data = await memberService.getMembersByGroup(groupId, pageNum, pagination.pageSize, search);
      setMembers(data.items);
      setPagination({
        current: data.pageNum,
        pageSize: data.pageSize,
        total: data.total,
      });
    } catch (error) {
      console.error('加载成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载角色列表
  const loadRoles = async () => {
    // 检查是否有token，没有则不发起请求
    if (!faqUserParams?.sourceAuthorization) {
      console.log('没有授权token，跳过角色列表加载');
      return;
    }
    
    try {
      const data = await memberService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('加载角色失败:', error);
    }
  };

  // 根据Web账号搜索过滤成员列表
  const filteredMembers = members.filter(member => {
    if (!webAccountSearchText) return true;
    
    const userIdWebAccount = getDefaultDjbHash(String(member.id));
    
    return userIdWebAccount.includes(webAccountSearchText);
  });

  // 当选中分组变化时加载成员（只有在有token时）
  useEffect(() => {
    if (selectedGroupId && hasToken) {
      loadMembers(selectedGroupId, 1, searchText);
    }
  }, [selectedGroupId, hasToken]);

  // 搜索处理
  const onSearch = (value: string) => {
    setSearchText(value);
    if (selectedGroupId) {
      loadMembers(selectedGroupId, 1, value);
    }
  };

  // 分页处理
  const onPageChange = (page: number) => {
    if (selectedGroupId) {
      loadMembers(selectedGroupId, page, searchText);
    }
  };

  // 邀请成员表单提交
  const handleInviteMember = async () => {
    try {
      const values = await form.validateFields();
      
      // 构造请求数据
      const inviteData = {
        invitee_email: values.email,
        invitee_name: values.name,
        system_roles: [{
          role_id: values.role,
          system_id: 5,
        }],
        text_seat: values.seats?.includes('text') || false,
        voice_seat: values.seats?.includes('voice') || false,
        user_group_ids: values.groups || [],
      };

      const success = await memberService.inviteMember(inviteData);
      
      if (success) {
        setIsModalVisible(false);
        form.resetFields();
        // 刷新当前分组的成员列表
        if (selectedGroupId) {
          loadMembers(selectedGroupId, pagination.current, searchText);
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 批量邀请成员表单提交
  const handleBatchInvite = async () => {
    try {
      setLoading(true);
      // 只验证角色、分组和席位
      const values = await form.validateFields(['batch_role', 'batch_groups', 'batch_seats']);
      
      // 从状态中获取最新的成员列表
      if (batchInviteList.length === 0) {
        message.error('请至少输入一个有效的邮箱地址');
        return;
      }

      // 验证邮箱格式和姓名是否为空
      const invalidEntries = batchInviteList.filter(item => 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email) || !item.name.trim()
      );

      if (invalidEntries.length > 0) {
        message.error(`存在无效的邮箱或空的姓名，请检查: ${invalidEntries.map(i => i.email).join(', ')}`);
        return;
      }

      const seats = {
        text_seat: values.batch_seats?.includes('text') || false,
        voice_seat: values.batch_seats?.includes('voice') || false,
      };

      await memberService.batchInviteMembers(batchInviteList, values.batch_role, values.batch_groups, seats);
      
      setIsBatchModalVisible(false);
      setBatchInviteList([]);
      form.resetFields(['batch_role', 'batch_groups', 'batch_seats']);
      // 刷新当前分组的成员列表
      if (selectedGroupId) {
        loadMembers(selectedGroupId, pagination.current, searchText);
      }
    } catch (error) {
      console.error('批量邀请表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns: TableProps<Member>['columns'] = [
    { 
      title: '用户ID', 
      dataIndex: 'id', 
      key: 'id',
      width: 150,
      render: (id: number) => (
        <div>
          <div>{id}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            客户Web账号: {getDefaultDjbHash(String(id))}
          </div>
        </div>
      ),
    },
    { 
      title: '成员姓名', 
      dataIndex: 'nickname', 
      key: 'nickname',
      width: 150,
    },
    { 
      title: '邮箱', 
      dataIndex: 'email', 
      key: 'email',
      width: 200,
    },
    { 
      title: '开通模块', 
      dataIndex: 'accessible_system', 
      key: 'accessible_system',
      width: 150,
    },
    { 
      title: '管理角色', 
      dataIndex: 'role_name', 
      key: 'role_name',
      width: 120,
    },
    { 
      title: '登录状态', 
      dataIndex: 'online_status', 
      key: 'online_status',
      width: 100,
      render: (status: number) => (
        <span style={{ color: status === 1 ? '#52c41a' : '#999' }}>
          {status === 1 ? '在线' : '离线'}
        </span>
      ),
    },
    { 
      title: '最后登入时间', 
      dataIndex: 'last_login_at', 
      key: 'last_login_at',
      width: 180,
    },
    {
      title: '席位类型',
      key: 'seat_type',
      width: 120,
      render: (_, record) => {
        const seats = [];
        if (record.text_seat) seats.push('文本');
        if (record.voice_seat) seats.push('语音');
        return seats.join(', ') || '无';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: () => null,
    },
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      {!hasToken ? (
        <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Card 
            style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}
            bodyStyle={{ padding: '40px 24px' }}
          >
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <KeyOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
                <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>需要身份认证</div>
                <Text type="secondary">
                  成员管理功能需要设置身份认证Token才能正常使用
                </Text>
              </div>
              
              <Button 
                type="primary" 
                size="large"
                icon={<KeyOutlined />}
                onClick={() => setAuthModalVisible(true)}
              >
                立即设置授权
              </Button>
            </Space>
          </Card>
        </div>
      ) : (
        <>
          <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>成员分组</h3>
                <Button 
                  icon={<KeyOutlined />}
                  type="primary"
                  size="small"
                  onClick={() => setAuthModalVisible(true)}
                >
                  设置授权
                </Button>
              </div>
              <div style={{ fontSize: '12px', color: hasToken ? '#52c41a' : '#ff4d4f', padding: 8, background: hasToken ? '#f6ffed' : '#fff2f0', borderRadius: 4, border: `1px solid ${hasToken ? '#b7eb8f' : '#ffccc7'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{hasToken ? '✓' : '✗'}</span>
                  <span>{hasToken ? 'Token已配置' : '请配置授权Token'}</span>
                </div>
                {hasToken && faqUserParams?.sourceAuthorization && (
                  <div style={{ marginTop: 4, opacity: 0.8 }}>
                    Token: {faqUserParams.sourceAuthorization.substring(0, 10)}...
                  </div>
                )}
              </div>
            </div>
            <List
              dataSource={[{ id: '0', group_name: '全部成员', group_size: 0 }, ...groups]}
              renderItem={(item) => (
                <List.Item
                  onClick={() => {
                    setSelectedGroupId(item.id);
                    setPagination(prev => ({ ...prev, current: 1 }));
                    setSearchText('');
                    loadMembers(item.id, 1, '');
                  }}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedGroupId === item.id ? '#f6ffed' : 'transparent',
                    borderLeft: selectedGroupId === item.id ? '3px solid #52c41a' : '3px solid transparent',
                  }}
                >
                  <div style={{ padding: '8px 16px', width: '100%' }}>
                    <div>{item.group_name}</div>
                    {item.group_size > 0 && <div style={{ fontSize: '12px', color: '#999' }}>({item.group_size}人)</div>}
                  </div>
                </List.Item>
              )}
            />
          </Sider>

          <Content style={{ padding: '24px', background: '#fff' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <Search 
                  placeholder="搜索成员姓名/邮箱" 
                  onSearch={onSearch} 
                  style={{ width: 300 }} 
                  allowClear
                  disabled={!hasToken}
                />
                <Search 
                  placeholder="搜索用户ID对应的客户Web账号" 
                  onSearch={(value) => setWebAccountSearchText(value)}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setWebAccountSearchText('');
                    }
                  }}
                  style={{ width: 300 }} 
                  allowClear
                  disabled={!hasToken}
                />
              </div>
              <div>
                <Button type="primary" onClick={() => setIsModalVisible(true)} disabled={!hasToken}>
                  + 邀请成员
                </Button>
                <Button 
                  style={{ marginLeft: 8 }} 
                  onClick={() => setIsBatchModalVisible(true)} 
                  disabled={!hasToken}
                >
                  批量邀请
                </Button>
                <Button style={{ marginLeft: 8 }} disabled={!hasToken}>
                  批量处理
                </Button>
              </div>
            </div>
            
            <Table 
              columns={columns} 
              dataSource={filteredMembers} 
              rowKey="id" 
              loading={loading}
              pagination={false}
              scroll={{ x: 1200 }}
            />
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={webAccountSearchText ? filteredMembers.length : pagination.total}
                onChange={onPageChange}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) => {
                  if (webAccountSearchText) {
                    return `显示 ${filteredMembers.length} 条 (从 ${pagination.total} 条中筛选)`;
                  }
                  return `${range[0]}-${range[1]} 共 ${total} 条`;
                }}
                disabled={!hasToken}
              />
            </div>
          </Content>
          
          {/* 邀请成员 Modal */}
          <Modal
            title="邀请成员"
            open={isModalVisible}
            onOk={handleInviteMember}
            onCancel={() => {
              setIsModalVisible(false);
              form.resetFields();
            }}
            confirmLoading={loading}
            width={600}
          >
            <Form 
              form={form} 
              layout="vertical"
              initialValues={{
                seats: ['text'],
                groups: selectedGroupId ? [selectedGroupId] : [],
              }}
            >
              <Form.Item 
                label="成员姓名" 
                name="name"
                rules={[{ required: true, message: '请输入成员姓名' }]}
              >
                <Input placeholder="请输入成员姓名" />
              </Form.Item>
              
              <Form.Item 
                label="邮箱" 
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
              
              <Form.Item label="授权席位" name="seats">
                <Checkbox.Group>
                  <Checkbox value="text">文本席位 (对应菜单: 在线聊天)</Checkbox>
                  <Checkbox value="voice">语音席位 (对应菜单: 呼叫中心)</Checkbox>
                </Checkbox.Group>
              </Form.Item>
              
              <Form.Item 
                label="成员分组" 
                name="groups"
                rules={[{ required: true, message: '请选择分组' }]}
              >
                <Select mode="multiple" placeholder="请选择分组" allowClear>
                  {groups.map(g => (
                    <Select.Option key={g.id} value={g.id}>{g.group_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="角色" 
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色" allowClear>
                  {roles.map(role => (
                    <Select.Option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                      {role.describe && <span style={{ color: '#999', fontSize: '12px' }}> - {role.describe}</span>}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>
          
          {/* 批量邀请成员 Modal */}
          <Modal
            title="批量邀请成员"
            open={isBatchModalVisible}
            onOk={handleBatchInvite}
            onCancel={() => {
              setIsBatchModalVisible(false);
              setBatchInviteList([]);
              form.resetFields(['batch_role', 'batch_groups', 'batch_seats']);
            }}
            confirmLoading={loading}
            width={700}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="请输入成员邮箱，每行一个，或用逗号、分号分隔。"
              style={{ marginBottom: 16 }}
              onChange={(e) => {
                const emails = e.target.value.split(/[\n,;]+/).filter(Boolean);
                const newList = emails.map((email: string, index: number) => ({
                  key: `${index}-${email}`,
                  email: email.trim(),
                  name: email.split('@')[0].trim(),
                }));
                setBatchInviteList(newList);
              }}
            />
            
            <Table
              dataSource={batchInviteList}
              pagination={false}
              size="small"
              bordered
              style={{ marginBottom: 16 }}
              columns={[
                {
                  title: '邮箱地址',
                  dataIndex: 'email',
                  key: 'email',
                  width: '50%',
                },
                {
                  title: '成员姓名 (可编辑)',
                  dataIndex: 'name',
                  key: 'name',
                  width: '50%',
                  render: (text, record) => (
                    <Input 
                      value={text}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setBatchInviteList(currentList =>
                          currentList.map(item => 
                            item.key === record.key ? { ...item, name: newName } : item
                          )
                        );
                      }}
                    />
                  )
                },
              ]}
            />

            <Form 
              form={form} 
              layout="vertical"
              initialValues={{
                batch_groups: selectedGroupId && selectedGroupId !== '0' ? [selectedGroupId] : [],
                batch_seats: ['text', 'voice'], // 默认选中所有席位
              }}
            >
              <Form.Item 
                label="授权席位" 
                name="batch_seats"
                rules={[{ required: true, message: '请至少选择一个席位' }]}
              >
                <Checkbox.Group>
                  <Checkbox value="text">文本席位 (对应菜单: 在线聊天)</Checkbox>
                  <Checkbox value="voice">语音席位 (对应菜单: 呼叫中心)</Checkbox>
                </Checkbox.Group>
              </Form.Item>
              
              <Form.Item 
                label="成员分组" 
                name="batch_groups"
                rules={[{ required: true, message: '请至少选择一个分组' }]}
              >
                <Select mode="multiple" placeholder="请选择成员所属的分组" allowClear>
                  {groups.map(g => (
                    <Select.Option key={g.id} value={g.id}>{g.group_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item 
                label="角色" 
                name="batch_role"
                rules={[{ required: true, message: '请为所有成员选择一个角色' }]}
              >
                <Select placeholder="请为所有受邀成员选择一个统一的角色" allowClear>
                  {roles.map(role => (
                    <Select.Option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                      {role.describe && <span style={{ color: '#999', fontSize: '12px' }}> - {role.describe}</span>}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>
          
          <AuthModal
            visible={authModalVisible}
            onCancel={() => setAuthModalVisible(false)}
            onSuccess={(token) => {
              // 保存token到用户参数
              const newParams = {
                sourceAuthorization: token,
                targetAuthorization: faqUserParams?.targetAuthorization || ''
              };
              setFaqUserParams(newParams);
              
              // 非协作模式下保存到localStorage
              if (!isCollaborationMode) {
                const storageKey = `faqUserParams_${sessionId}`;
                localStorage.setItem(storageKey, JSON.stringify(newParams));
              }
              
              setAuthModalVisible(false);
              message.success('Token设置成功');
              
              // 重新加载数据
              loadGroups();
              loadRoles();
            }}
            title="成员管理身份认证"
            description="设置用于成员管理功能的身份认证Token"
            currentToken={faqUserParams?.sourceAuthorization}
          />
        </>
      )}
    </Layout>
  );
};

export default MemberManagementPage; 