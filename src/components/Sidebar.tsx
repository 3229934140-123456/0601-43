import { useAppStore } from '../store/useAppStore';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const menuItems = [
  { id: 'projects', label: '项目空间', icon: '📁' },
  { id: 'directory', label: '接口目录', icon: '📋' },
  { id: 'debugger', label: '请求调试', icon: '🚀' },
  { id: 'sample', label: '示例数据', icon: '📊' },
  { id: 'changelog', label: '变更记录', icon: '📝' },
  { id: 'review', label: '评审面板', icon: '✅' },
  { id: 'settings', label: '个人设置', icon: '⚙️' },
];

function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const { currentProjectId, projects } = useAppStore();
  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-gray-800">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          API Manager
        </span>
      </div>

      <div className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeModule === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-800">
        {currentProject ? (
          <div className="text-sm">
            <div className="text-gray-400 text-xs mb-1">当前项目</div>
            <div className="text-white font-medium truncate">{currentProject.name}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">未选择项目</div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
