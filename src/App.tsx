import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProjectSpace from './components/ProjectSpace';
import ApiDirectory from './components/ApiDirectory';
import RequestDebugger from './components/RequestDebugger';
import SampleData from './components/SampleData';
import ChangeLog from './components/ChangeLog';
import ReviewPanel from './components/ReviewPanel';
import Settings from './components/Settings';
import { useAppStore } from './store/useAppStore';

type ModuleType = 'projects' | 'directory' | 'debugger' | 'sample' | 'changelog' | 'review' | 'settings';

function App() {
  const { loadProjects, loadSettings, currentProjectId, activeModule, setActiveModule } = useAppStore();

  useEffect(() => {
    loadProjects();
    loadSettings();
  }, []);

  const handleModuleChange = (module: ModuleType) => {
    setActiveModule(module);
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'projects':
        return <ProjectSpace />;
      case 'directory':
        return <ApiDirectory />;
      case 'debugger':
        return <RequestDebugger />;
      case 'sample':
        return <SampleData />;
      case 'changelog':
        return <ChangeLog />;
      case 'review':
        return <ReviewPanel />;
      case 'settings':
        return <Settings />;
      default:
        return <ProjectSpace />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeModule={activeModule as ModuleType} onModuleChange={handleModuleChange} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {activeModule === 'projects' && '项目空间'}
            {activeModule === 'directory' && '接口目录'}
            {activeModule === 'debugger' && '请求调试'}
            {activeModule === 'sample' && '示例数据'}
            {activeModule === 'changelog' && '变更记录'}
            {activeModule === 'review' && '评审面板'}
            {activeModule === 'settings' && '个人设置'}
          </h1>
          {currentProjectId && activeModule !== 'projects' && activeModule !== 'settings' && (
            <span className="ml-4 text-sm text-gray-500">
              当前项目: {useAppStore.getState().projects.find(p => p.id === currentProjectId)?.name}
            </span>
          )}
        </header>
        <div className="flex-1 overflow-hidden">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}

export default App;
