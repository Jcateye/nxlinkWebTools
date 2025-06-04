import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AutoComplete, Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Company } from '../../types/bill';
import { queryCompaniesByName } from '../../services/billApi';

// 简单的防抖函数实现
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface CompanySelectorProps {
  value?: Company | null;
  onChange?: (company: Company | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({
  value,
  onChange,
  placeholder = '请输入公司名称进行搜索（至少2个字符）',
  disabled = false
}) => {
  const [searchText, setSearchText] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  // 新增：用于在选中后忽略一次onChange事件
  const ignoreNextChange = useRef<boolean>(false);

  // 防抖搜索函数 - 增加延迟到800ms，减少频繁请求
  const debouncedSearch = useCallback(
    debounce(async (searchValue: string) => {
      // 最小字符数限制：至少2个字符才开始搜索
      if (!searchValue.trim() || searchValue.trim().length < 2) {
        setCompanies([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      try {
        console.log(`[公司搜索] 搜索关键字: "${searchValue}"`);
        const result = await queryCompaniesByName(searchValue);
        console.log(`[公司搜索] 找到 ${result.length} 个结果`);
        setCompanies(result);
        setOpen(true);
      } catch (error) {
        console.error('搜索公司失败:', error);
        setCompanies([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 800), // 从300ms增加到800ms
    []
  );

  // 处理输入框变化
  const handleChange = (inputValue: string) => {
    // 如果标记为忽略，则仅重置标记并返回
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
      setSearchText(inputValue);
      return;
    }

    setSearchText(inputValue);
    if (!inputValue.trim()) {
      onChange?.(null);
      setCompanies([]);
      setOpen(false);
    } else {
      // 如果输入值与当前已选公司名称一致，则不再触发搜索
      if (value && inputValue.trim() === value.companyName) {
        return;
      }
      debouncedSearch(inputValue);
    }
  };

  // 处理清空
  const handleClear = () => {
    setSearchText('');
    setCompanies([]);
    setOpen(false);
    onChange?.(null);
  };

  // 当value从外部改变时，更新搜索文本
  useEffect(() => {
    if (value) {
      setSearchText(value.companyName);
    } else {
      setSearchText('');
    }
  }, [value]);

  // 构建选项数据
  const options = companies.map(company => ({
    value: company.id.toString(),
    label: (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 500 }}>{company.companyName}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          ID: {company.id} | 客户代码: {company.customerCode || '无'}
        </div>
      </div>
    ),
    company
  }));

  // 根据搜索文本长度显示不同的提示内容
  const getNotFoundContent = () => {
    if (loading) {
      return <Spin size="small" />;
    }
    if (searchText.trim().length === 0) {
      return '请输入公司名称进行搜索';
    }
    if (searchText.trim().length < 2) {
      return '请输入至少2个字符进行搜索';
    }
    return '未找到匹配的公司';
  };

  return (
    <AutoComplete
      value={searchText}
      options={options}
      onSelect={(selectedValue, option) => {
        const selectedCompany = companies.find(company => company.id.toString() === selectedValue);
        if (selectedCompany) {
          setSearchText(selectedCompany.companyName);
          onChange?.(selectedCompany);
          setOpen(false);
          // 选中后忽略随后的onChange触发
          ignoreNextChange.current = true;
        }
      }}
      onChange={handleChange}
      open={open}
      onDropdownVisibleChange={setOpen}
      placeholder={placeholder}
      disabled={disabled}
      allowClear
      onClear={handleClear}
      notFoundContent={getNotFoundContent()}
      dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
      style={{ width: '100%' }}
    >
      <Input
        prefix={<SearchOutlined />}
        suffix={loading ? <Spin size="small" /> : null}
        allowClear
      />
    </AutoComplete>
  );
};

export default CompanySelector; 