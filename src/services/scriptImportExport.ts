import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { TestTask, TestCase, DialogueLine, DialogueRole } from '../types/scriptTest';

/**
 * 导出测试任务为Excel文件
 * @param task 测试任务数据
 */
export function exportTaskToExcel(task: TestTask) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 为每个测试案例创建一个工作表
  task.cases.forEach(testCase => {
    // 转换对话行为表格数据
    const data = testCase.dialogues.map(line => ({
      '角色': line.role === DialogueRole.AGENT ? '坐席' : '客户',
      '内容': line.content,
      '是否符合预期': line.expectation === true ? '是' : 
                    line.expectation === false ? '否' : '',
      'TTS引擎': line.ttsProvider || ''
    }));
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const colWidths = [
      { wch: 10 },  // 角色列
      { wch: 50 },  // 内容列
      { wch: 15 },  // 是否符合预期列
      { wch: 10 }   // TTS引擎列
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, testCase.name);
  });
  
  // 导出Excel文件
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${task.name}-${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 导出测试任务为CSV文件
 * @param task 测试任务数据
 * @param caseIndex 要导出的案例索引，不提供则导出所有案例
 */
export function exportTaskToCSV(task: TestTask, caseIndex?: number) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 确定要导出的测试案例
  const casesToExport = caseIndex !== undefined 
    ? [task.cases[caseIndex]] 
    : task.cases;
  
  // 为每个测试案例创建一个工作表
  casesToExport.forEach((testCase, idx) => {
    // 整理对话数据
    const customerLines: string[] = [];
    const agentLines: string[] = [];
    
    // 分开客户和坐席的对话
    testCase.dialogues.forEach(line => {
      if (line.role === DialogueRole.CUSTOMER) {
        customerLines.push(line.content);
        // 为每个客户对话行对应的坐席行，如果不存在则添加空白
        if (agentLines.length < customerLines.length) {
          agentLines.push('');
        }
      } else {
        agentLines.push(line.content);
        // 为每个坐席对话行对应的客户行，如果不存在则添加空白
        if (customerLines.length < agentLines.length) {
          customerLines.push('');
        }
      }
    });
    
    // 确保两列长度相等
    while (customerLines.length < agentLines.length) {
      customerLines.push('');
    }
    while (agentLines.length < customerLines.length) {
      agentLines.push('');
    }
    
    // 创建CSV数据
    const csvData = customerLines.map((customerLine, i) => ({
      '客户': customerLine,
      '客服': agentLines[i]
    }));
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(csvData);
    
    // 设置列宽
    const colWidths = [
      { wch: 50 },  // 客户列
      { wch: 50 },  // 客服列
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, testCase.name);
  });
  
  // 导出CSV文件
  const csvBuffer = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  const blob = new Blob([csvBuffer], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${task.name}-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * 从Excel文件导入测试任务
 * @param file Excel文件
 * @returns 测试任务数据
 */
export function importTaskFromExcel(file: File): Promise<TestTask> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // 读取Excel数据
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 创建任务对象
        const task: TestTask = {
          id: uuidv4(),
          name: file.name.replace(/\.(xlsx|csv)$/, ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cases: []
        };
        
        // 处理每个工作表作为一个测试案例
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          
          // 创建测试案例
          const testCase: TestCase = {
            id: uuidv4(),
            name: sheetName,
            dialogues: []
          };
          
          // 先检查是否为标准格式（有"角色"列）
          if (json.length > 0 && ('角色' in json[0] || '内容' in json[0])) {
            // 标准Excel格式
            json.forEach((row) => {
              const role = row['角色'] === '坐席' ? DialogueRole.AGENT : DialogueRole.CUSTOMER;
              const content = row['内容'] || '';
              const expectation = row['是否符合预期'] === '是' ? true :
                              row['是否符合预期'] === '否' ? false : undefined;
              
              // 创建对话行
              const dialogueLine: DialogueLine = {
                id: uuidv4(),
                role,
                content,
                expectation
              };
              
              testCase.dialogues.push(dialogueLine);
            });
          } else {
            // 检查是否为CSV格式（有"客户"和"客服"列）
            if (json.length > 0 && ('客户' in json[0] || '客服' in json[0])) {
              // CSV格式处理
              json.forEach((row) => {
                // 处理客户对话
                if (row['客户'] && String(row['客户']).trim()) {
                  const customerLine: DialogueLine = {
                    id: uuidv4(),
                    role: DialogueRole.CUSTOMER,
                    content: String(row['客户']).trim()
                  };
                  testCase.dialogues.push(customerLine);
                }
                
                // 处理客服对话
                if (row['客服'] && String(row['客服']).trim()) {
                  const agentLine: DialogueLine = {
                    id: uuidv4(),
                    role: DialogueRole.AGENT,
                    content: String(row['客服']).trim()
                  };
                  testCase.dialogues.push(agentLine);
                }
              });
            }
          }
          
          // 只有当有对话数据时才添加案例
          if (testCase.dialogues.length > 0) {
            task.cases.push(testCase);
          }
        });
        
        resolve(task);
      } catch (error) {
        reject(new Error('文件解析失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
} 