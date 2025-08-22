import { useState, useEffect, useRef } from 'react';
import { useUserContext } from '../context/UserContext';
import { getLanguageList, getTenantLanguageList } from '../services/api';

// 缓存语言数据，避免重复请求
const languageCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export const useLanguageData = (formType: 'source' | 'target') => {
  const [languageList, setLanguageList] = useState<any[]>([]);
  const [tenantLanguageList, setTenantLanguageList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { faqUserParams } = useUserContext();
  const fetchingRef = useRef(false);

  const auth = formType === 'source'
    ? faqUserParams?.sourceAuthorization
    : faqUserParams?.targetAuthorization;

  // 获取缓存key
  const getCacheKey = (type: string) => `${type}_${formType}_${auth?.substring(0, 20)}`;

  // 获取语言列表
  const fetchLanguageList = async () => {
    if (!auth || fetchingRef.current) return;

    const cacheKey = getCacheKey('language');
    const cached = languageCache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setLanguageList(cached.data);
      return;
    }

    fetchingRef.current = true;
    try {
      console.log(`获取${formType}租户语言列表...`);
      const response = await getLanguageList(auth);
      
      if (response.data?.code === 0) {
        const languages = response.data.data || [];
        setLanguageList(languages);
        // 更新缓存
        languageCache.set(cacheKey, { data: languages, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('获取语言列表失败:', error);
      setLanguageList([]);
    } finally {
      fetchingRef.current = false;
    }
  };

  // 获取租户语言列表
  const fetchTenantLanguageList = async () => {
    if (!auth || fetchingRef.current) return;

    const cacheKey = getCacheKey('tenantLanguage');
    const cached = languageCache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setTenantLanguageList(cached.data);
      return;
    }

    fetchingRef.current = true;
    try {
      console.log(`获取${formType}租户已有语言列表...`);
      const response = await getTenantLanguageList(auth);
      
      if (response.data?.code === 0) {
        const languages = response.data.data || [];
        setTenantLanguageList(languages);
        // 更新缓存
        languageCache.set(cacheKey, { data: languages, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('获取租户语言列表失败:', error);
      setTenantLanguageList([]);
    } finally {
      fetchingRef.current = false;
    }
  };

  // 清除缓存
  const clearCache = () => {
    const langKey = getCacheKey('language');
    const tenantLangKey = getCacheKey('tenantLanguage');
    languageCache.delete(langKey);
    languageCache.delete(tenantLangKey);
  };

  // 刷新数据（清除缓存后重新获取）
  const refreshData = async () => {
    clearCache();
    setLoading(true);
    await Promise.all([
      fetchLanguageList(),
      fetchTenantLanguageList()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (auth) {
      fetchLanguageList();
      fetchTenantLanguageList();
    } else {
      setLanguageList([]);
      setTenantLanguageList([]);
    }
  }, [auth]);

  return {
    languageList,
    tenantLanguageList,
    loading,
    refreshData,
    clearCache
  };
};
