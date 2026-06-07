import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

function Settings() {
  const { settings, loadSettings, updateSetting, clearAllData, setActiveModule } = useAppStore();
  
  const [username, setUsername] = useState('');
  const [theme, setTheme] = useState('light');
  const [timeoutValue, setTimeoutValue] = useState('30000');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setUsername(settings.username || '用户');
      setTheme(settings.theme || 'light');
      setTimeoutValue(settings.timeout || '30000');
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSetting('username', username);
    await updateSetting('theme', theme);
    await updateSetting('timeout', timeoutValue);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const clearData = async () => {
    if (!window.confirm('确定要清除所有本地数据吗？此操作不可恢复！')) return;
    if (!window.confirm('再次确认：清除所有数据？项目、接口、环境变量、评论、评审等所有数据都将被删除！')) return;
    
    const result = await clearAllData();
    if (result.success) {
      alert('所有数据已清除');
      setActiveModule('projects');
    } else {
      alert('清除失败: ' + result.error);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">👤 个人信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
              />
              <p className="text-xs text-gray-500 mt-1">用于评论和评审中的显示名称</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🎨 外观设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">主题</label>
              <div className="flex gap-3">
                {[
                  { value: 'light', label: '浅色', icon: '☀️' },
                  { value: 'dark', label: '深色', icon: '🌙' },
                  { value: 'system', label: '跟随系统', icon: '💻' },
                ].map((t) => (
                  <button
                    key={t.value}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === t.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setTheme(t.value)}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <div className="text-sm font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ 请求设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">请求超时时间</label>
              <select
                className="select"
                value={timeoutValue}
                onChange={(e) => setTimeoutValue(e.target.value)}
              >
                <option value="10000">10 秒</option>
                <option value="30000">30 秒</option>
                <option value="60000">60 秒</option>
                <option value="120000">120 秒</option>
                <option value="300000">300 秒</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">请求超过此时间将自动断开</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ℹ️ 关于</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>应用名称</span>
              <span className="font-medium">API Manager Desktop</span>
            </div>
            <div className="flex justify-between">
              <span>版本号</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>技术栈</span>
              <span className="font-medium">Electron + React + SQLite</span>
            </div>
          </div>
        </div>

        <div className="card p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ 危险操作</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                清除所有本地数据，包括项目、接口、环境变量、请求历史等。
              </p>
              <button className="btn btn-danger" onClick={clearData}>
                清除所有数据
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary px-6" onClick={handleSave}>
            {saved ? '✓ 已保存' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
