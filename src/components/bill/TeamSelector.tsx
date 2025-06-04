import React, { useState, useEffect, useCallback } from 'react';
import { Select, Spin } from 'antd';
import { Team, Company } from '../../types/bill';
import { queryTeamsByCompanyId } from '../../services/billApi';

interface TeamSelectorProps {
  value?: Team | null;
  onChange?: (team: Team | null) => void;
  selectedCompany?: Company | null;
  placeholder?: string;
  disabled?: boolean;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({
  value,
  onChange,
  selectedCompany,
  placeholder = '请先选择公司',
  disabled = false
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 使用useCallback优化loadTeams函数
  const loadTeams = useCallback(async (companyId: number) => {
    setLoading(true);
    try {
      const result = await queryTeamsByCompanyId(companyId);
      setTeams(result);
    } catch (error) {
      console.error('加载团队列表失败:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 当选定的公司改变时，获取团队列表
  useEffect(() => {
    if (selectedCompany) {
      loadTeams(selectedCompany.id);
    } else {
      setTeams([]);
      onChange?.(null);
    }
  }, [selectedCompany, loadTeams]); // 移除onChange依赖，添加loadTeams

  // 处理团队选择
  const handleChange = (teamId: number | undefined) => {
    if (teamId !== undefined) {
      const selectedTeam = teams.find(team => team.id === teamId);
      onChange?.(selectedTeam || null);
    } else {
      onChange?.(null);
    }
  };

  // 计算是否禁用
  const isDisabled = disabled || !selectedCompany || loading;

  // 计算占位符文本
  const getPlaceholder = () => {
    if (!selectedCompany) {
      return '请先选择公司';
    }
    if (loading) {
      return '正在加载团队列表...';
    }
    if (teams.length === 0) {
      return '该公司暂无可用团队';
    }
    return '请选择团队';
  };

  return (
    <Select
      value={value?.id}
      onChange={handleChange}
      placeholder={getPlaceholder()}
      disabled={isDisabled}
      allowClear
      loading={loading}
      style={{ width: '100%' }}
      notFoundContent={loading ? <Spin size="small" /> : '无可用团队'}
    >
      {teams.map(team => (
        <Select.Option key={team.id} value={team.id}>
          {team.name}
        </Select.Option>
      ))}
    </Select>
  );
};

export default TeamSelector; 