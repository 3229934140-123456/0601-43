import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Project, Environment } from '../types';

interface EnvVar {
  key: string;
  value: string;
}

interface EnvironmentManagerProps {
  project: Project;
  onClose: () => void;
}

function EnvironmentManager({ project, onClose }: EnvironmentManagerProps) {
  const {
    environments,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setDefaultEnvironment,
  } = useAppStore();

  const [activeEnvId, setActiveEnvId] = useState<number | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envName, setEnvName] = useState('');
  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  useEffect(() => {
    loadEnvironments(project.id);
  }, [project.id]);

  useEffect(() => {
    if (environments.length > 0 && !activeEnvId) {
      const defaultEnv = environments.find(e => e.is_default);
      if (defaultEnv) {
        selectEnvironment(defaultEnv);
      } else {
        selectEnvironment(environments[0]);
      }
    }
  }, [environments]);

  const selectEnvironment = (env: Environment) => {
    setActiveEnvId(env.id);
    setEnvName(env.name);
    try {
      const vars = JSON.parse(env.variables);
      const varList = Object.entries(vars).map(([key, value]) => ({ key, value: value as string }));
      setEnvVars(varList.length > 0 ? varList : [{ key: '', value: '' }]);
    } catch {
      setEnvVars([{ key: '', value: '' }]);
    }
  };

  const handleAddVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveVar = (index: number) => {
    const newVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newVars.length > 0 ? newVars : [{ key: '', value: '' }]);
  };

  const handleVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  const handleSave = async () => {
    if (!activeEnvId || !envName.trim()) return;

    const varsObj: Record<string, string> = {};
    envVars.forEach(v => {
      if (v.key.trim()) {
        varsObj[v.key.trim()] = v.value;
      }
    });

    await updateEnvironment(activeEnvId, envName.trim(), JSON.stringify(varsObj));
    alert('环境变量已保存');
  };

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    await createEnvironment(project.id, newEnvName.trim(), JSON.stringify({ baseURL: '' }));
    setNewEnvName('');
    setShowNewEnv(false);
  };

  const handleDeleteEnv = async (env: Environment) => {
    if (!confirm(`确定要删除环境"${env.name}"吗？`)) return;
    await deleteEnvironment(env.id);
    if (activeEnvId === env.id) {
      setActiveEnvId(null);
    }
  };

  const handleSetDefault = async (envId: number) => {
    await setDefaultEnvironment(project.id, envId);
  };

  const activeEnv = environments.find(e => e.id === activeEnvId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-[700px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">环境变量管理 - {project.name}</h3>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">环境列表</div>
            <div className="space-y-1">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`p-2 rounded cursor-pointer flex items-center justify-between group ${
                    activeEnvId === env.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'
                  }`}
                  onClick={() => selectEnvironment(env)}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {env.is_default && <span className="text-xs">⭐</span>}
                    <span className="text-sm truncate">{env.name}</span>
                  </div>
                  <div className="hidden group-hover:flex gap-0.5">
                    {!env.is_default && (
                      <button
                        className="p-0.5 hover:bg-gray-300 rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(env.id); }}
                        title="设为默认"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      className="p-0.5 hover:bg-red-200 rounded text-xs"
                      onClick={(e) => { e.stopPropagation(); handleDeleteEnv(env); }}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {showNewEnv ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  className="input text-sm"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  placeholder="环境名称"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button className="btn btn-primary text-xs flex-1" onClick={handleCreateEnv}>
                    添加
                  </button>
                  <button className="btn btn-secondary text-xs flex-1" onClick={() => setShowNewEnv(false)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full mt-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded border border-dashed border-blue-300"
                onClick={() => setShowNewEnv(true)}
              >
                + 添加环境
              </button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {activeEnv ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">环境名称</label>
                  <input
                    type="text"
                    className="input"
                    value={envName}
                    onChange={(e) => setEnvName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">变量列表</label>
                    <button className="text-sm text-blue-600 hover:text-blue-800" onClick={handleAddVar}>
                      + 添加变量
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-500 px-1">
                      <span>变量名</span>
                      <span>变量值</span>
                      <span className="w-8"></span>
                    </div>
                    {envVars.map((envVar, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          type="text"
                          className="input text-sm"
                          value={envVar.key}
                          onChange={(e) => handleVarChange(index, 'key', e.target.value)}
                          placeholder="key"
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          value={envVar.value}
                          onChange={(e) => handleVarChange(index, 'value', e.target.value)}
                          placeholder="value"
                        />
                        <button
                          className="w-8 h-9 text-red-500 hover:bg-red-50 rounded"
                          onClick={() => handleRemoveVar(index)}
                          title="删除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    提示：使用 {'{{变量名}}'} 的方式在请求中引用环境变量
                  </p>
                  <button className="btn btn-primary w-full" onClick={handleSave}>
                    保存环境
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                请选择或创建一个环境
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnvironmentManager;
