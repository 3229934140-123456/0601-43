import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS } from '../types';
import type { API } from '../types';

function SampleData() {
  const { projects, currentProjectId, apis, loadAllApis, currentApiId, updateApi, loadApi } = useAppStore();
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [generatedSample, setGeneratedSample] = useState<string>('');
  const [sampleType, setSampleType] = useState<'success' | 'error' | 'custom'>('success');
  const [generating, setGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentProjectId) {
      loadAllApis(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (apis.length > 0 && !selectedApi) {
      setSelectedApi(apis[0] as API);
    }
  }, [apis]);

  const generateSample = () => {
    if (!selectedApi) return;
    setGenerating(true);
    
    setTimeout(() => {
      let sample: any = {};
      
      if (sampleType === 'success') {
        sample = {
          code: 0,
          message: 'success',
          data: generateMockData(selectedApi.response_body),
          timestamp: Date.now(),
          request_id: generateRequestId(),
        };
      } else if (sampleType === 'error') {
        const errorCodes = [
          { code: 400, message: 'Bad Request - 请求参数错误' },
          { code: 401, message: 'Unauthorized - 未授权' },
          { code: 403, message: 'Forbidden - 禁止访问' },
          { code: 404, message: 'Not Found - 资源不存在' },
          { code: 500, message: 'Internal Server Error - 服务器内部错误' },
        ];
        const error = errorCodes[Math.floor(Math.random() * errorCodes.length)];
        sample = {
          code: error.code,
          message: error.message,
          error_details: {
            field: 'example_field',
            reason: '示例错误原因',
          },
          timestamp: Date.now(),
          request_id: generateRequestId(),
        };
      } else {
        try {
          sample = JSON.parse(selectedApi.response_body || '{}');
        } catch {
          sample = { message: 'custom data' };
        }
      }
      
      setGeneratedSample(JSON.stringify(sample, null, 2));
      setGenerating(false);
    }, 500);
  };

  const generateMockData = (template: string): any => {
    try {
      const parsed = JSON.parse(template || '{}');
      return generateFromTemplate(parsed);
    } catch {
      return generateRandomData();
    }
  };

  const generateFromTemplate = (obj: any): any => {
    if (Array.isArray(obj)) {
      return [generateFromTemplate(obj[0] || {})];
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      Object.keys(obj).forEach(key => {
        result[key] = generateValueByKey(key, obj[key]);
      });
      return result;
    }
    return obj;
  };

  const generateValueByKey = (key: string, templateValue: any): any => {
    const keyLower = key.toLowerCase();
    
    if (typeof templateValue === 'number') {
      if (keyLower.includes('id')) return Math.floor(Math.random() * 10000);
      if (keyLower.includes('count') || keyLower.includes('total')) return Math.floor(Math.random() * 100);
      if (keyLower.includes('page')) return 1;
      if (keyLower.includes('size') || keyLower.includes('limit')) return 10;
      return Math.floor(Math.random() * 100);
    }
    
    if (typeof templateValue === 'boolean') {
      return Math.random() > 0.5;
    }
    
    if (keyLower.includes('id')) return String(Math.floor(Math.random() * 100000));
    if (keyLower.includes('name')) return `示例${key}`;
    if (keyLower.includes('email')) return 'example@test.com';
    if (keyLower.includes('phone') || keyLower.includes('mobile')) return '13800138000';
    if (keyLower.includes('url') || keyLower.includes('image') || keyLower.includes('avatar')) {
      return 'https://example.com/image.png';
    }
    if (keyLower.includes('time') || keyLower.includes('date')) {
      return new Date().toISOString();
    }
    if (keyLower.includes('status') || keyLower.includes('state')) {
      return 'active';
    }
    if (keyLower.includes('description') || keyLower.includes('desc')) {
      return '这是一段示例描述文字';
    }
    if (keyLower.includes('list') || keyLower.includes('items') || keyLower.includes('records')) {
      return [
        { id: 1, name: '示例项1' },
        { id: 2, name: '示例项2' },
        { id: 3, name: '示例项3' },
      ];
    }
    
    return `示例${key}值`;
  };

  const generateRandomData = () => {
    return {
      id: Math.floor(Math.random() * 10000),
      name: '示例数据',
      description: '这是自动生成的示例数据',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const generateRequestId = () => {
    return 'req_' + Math.random().toString(36).substring(2, 15);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSample);
    alert('已复制到剪贴板');
  };

  const saveAsResponse = async () => {
    if (!selectedApi || !generatedSample) return;
    
    const apiData = {
      name: selectedApi.name,
      method: selectedApi.method,
      path: selectedApi.path,
      description: selectedApi.description,
      request_params: selectedApi.request_params,
      request_headers: selectedApi.request_headers,
      request_body_type: selectedApi.request_body_type,
      request_body: selectedApi.request_body,
      response_description: selectedApi.response_description || '由示例数据生成',
      response_body: generatedSample,
    };
    
    await updateApi(selectedApi.id, apiData, '保存示例数据到响应体');
    
    const updatedApi = await loadApi(selectedApi.id);
    if (updatedApi) {
      setSelectedApi(updatedApi as API);
    }
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-lg">请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex p-4 gap-4">
      <div className="w-72 card p-3 overflow-y-auto">
        <h3 className="font-medium text-gray-700 mb-3">选择接口</h3>
        <div className="space-y-1">
          {apis.map((api: any) => (
            <div
              key={api.id}
              className={`p-2 rounded cursor-pointer ${
                selectedApi?.id === api.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedApi(api as API)}
            >
              <div className="flex items-center gap-2">
                <span className={`method-badge text-xs ${METHOD_COLORS[api.method]}`}>
                  {api.method}
                </span>
                <span className="text-sm truncate">{api.name}</span>
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                {api.path}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">
              {selectedApi ? selectedApi.name : '请选择接口'}
            </h3>
            <div className="flex gap-2">
              {(['success', 'error', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  className={`px-3 py-1.5 text-sm rounded ${
                    sampleType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSampleType(type)}
                >
                  {type === 'success' ? '成功示例' : type === 'error' ? '错误示例' : '基于模板'}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={generateSample}
            disabled={!selectedApi || generating}
          >
            {generating ? '生成中...' : '🎲 生成示例数据'}
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">生成结果</span>
            {generatedSample && (
              <div className="flex gap-2">
                <button className="text-sm text-blue-600 hover:text-blue-800" onClick={copyToClipboard}>
                  📋 复制
                </button>
                <button 
                  className={`text-sm hover:text-green-800 ${saveSuccess ? 'text-green-600' : 'text-green-600'}`}
                  onClick={saveAsResponse}
                >
                  {saveSuccess ? '✓ 已保存' : '💾 保存到接口'}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {generatedSample ? (
              <pre className="code-editor" style={{ minHeight: '100%' }}>
                {generatedSample}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">点击"生成示例数据"按钮生成</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SampleData;
