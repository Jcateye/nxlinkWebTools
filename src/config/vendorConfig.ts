// AI供应商厂商配置
export interface VendorConfig {
  value: string;
  name: string;
  codeName: string;
}

// AI供应商厂商配置 - 根据AI服务类型分类
export const aiSupplierManufacturerConfig: Record<number, VendorConfig[]> = {
  1: [ // ASR
    { value: '2', name: "腾讯", codeName: "Delta" },
    { value: '4', name: "微软", codeName: "Upsilon" },
    { value: '5', name: "谷歌", codeName: "Iota" },
    { value: '8', name: 'NX', codeName:'NX' },
    { value: '9', name: '阿里', codeName:'Eta' },
    { value: '10', name: "Deepgram", codeName: "Gamma" },
  ],
  2: [ // TTS
    { value: '4', name: '微软', codeName:'Upsilon' },
    { value: '5', name: '谷歌', codeName:'Iota' },
    { value: '9', name: '阿里', codeName:'Eta' },
    { value: '12', name: 'Cartesia', codeName:'Zeta' },
    { value: '13', name: '11labs', codeName:'Tau' },
  ],
  3: [ // LLM
    { value: '14', name: "Azure-openai", codeName: "Azure-openai" },
  ]
};

// 服务类型映射
export const SERVICE_TYPE_MAP = {
  ASR: 1,
  TTS: 2,
  LLM: 3
} as const;

// 获取当前类型的厂商配置
export const getCurrentVendorConfig = (activeTab: string): VendorConfig[] => {
  const type = SERVICE_TYPE_MAP[activeTab as keyof typeof SERVICE_TYPE_MAP];
  return aiSupplierManufacturerConfig[type] || [];
};

// 创建厂商名称映射 (codeName -> name)
export const createVendorNameMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.values(aiSupplierManufacturerConfig).flat().forEach(vendor => {
    map[vendor.codeName] = vendor.name;
  });
  return map;
};

// 创建厂商代号映射 (value -> codeName)  
export const createVendorCodeMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.values(aiSupplierManufacturerConfig).flat().forEach(vendor => {
    map[vendor.value] = vendor.codeName;
  });
  return map;
};

// 创建从value到name的直接映射
export const createValueToNameMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.values(aiSupplierManufacturerConfig).flat().forEach(vendor => {
    map[vendor.value] = vendor.name;
  });
  return map;
};

// 创建从codeName到value的映射
export const createCodeNameToValueMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.values(aiSupplierManufacturerConfig).flat().forEach(vendor => {
    map[vendor.codeName] = vendor.value;
  });
  return map;
};

// 智能厂商名称获取函数
export const getVendorName = (code: string): string => {
  // 动态创建映射（避免循环引用）
  const nameMap = createVendorNameMap();
  const valueMap = createValueToNameMap();
  
  // 1. 尝试通过codeName映射 (Eta -> 阿里)
  if (nameMap[code]) {
    return nameMap[code];
  }
  
  // 2. 尝试通过value映射 (9 -> 阿里)
  if (valueMap[code]) {
    return valueMap[code];
  }
  
  // 3. 尝试在所有配置中查找name字段匹配
  const allVendors = Object.values(aiSupplierManufacturerConfig).flat();
  const vendor = allVendors.find(v => 
    v.name === code || 
    v.codeName === code || 
    v.value === code
  );
  
  if (vendor) {
    return vendor.name;
  }
  
  // 4. 返回原值
  return code;
};

// 预创建映射对象
export const vendorNameMap = createVendorNameMap(); // codeName -> name
export const vendorCodeMap = createVendorCodeMap(); // value -> codeName
export const valueToNameMap = createValueToNameMap(); // value -> name
export const codeNameToValueMap = createCodeNameToValueMap(); // codeName -> value

// 映射对象已创建并可供使用 