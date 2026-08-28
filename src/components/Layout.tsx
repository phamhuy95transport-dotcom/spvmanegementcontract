import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Settings, HardDrive, Database, Search, Sparkles, FileSignature } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GoogleDriveAccountModal from './GoogleDriveAccountModal';
import { getConnectedDriveAccount } from '../lib/drive';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveAccount, setDriveAccount] = useState(getConnectedDriveAccount());

  interface NavItem {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { name: 'Bảng điều khiển', path: '/', icon: LayoutDashboard },
    { name: 'Danh sách hợp đồng', path: '/contracts', icon: FileText },
    { name: 'Thêm hợp đồng mới', path: '/contracts/new', icon: PlusCircle },
    { name: 'Soạn hợp đồng thông minh', path: '/smart-editor', icon: FileSignature },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F4F7FA] font-sans text-[#2D3748] overflow-hidden">
      {/* Sidebar - Geometric Balance Dark Theme */}
      <aside className="w-64 bg-[#1A202C] text-white flex flex-col shrink-0 border-r border-gray-800">
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-gray-800 flex flex-col">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-white leading-tight">
              CÔNG TY TNHH <span className="text-blue-400">SPV GROUP</span>
            </span>
          </Link>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            Quản lý hợp đồng
          </p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          <div className="px-6 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Chính
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-6 py-3 text-sm font-medium transition-colors border-l-4",
                  isActive
                    ? "bg-blue-600/90 text-white border-blue-400"
                    : item.highlight
                    ? "text-blue-300 hover:bg-gray-800/80 hover:text-white border-transparent font-semibold"
                    : "text-gray-400 hover:bg-gray-800/80 hover:text-white border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5 mr-3 shrink-0", isActive ? "text-white" : item.highlight ? "text-amber-400" : "text-gray-400")} />
                <span>{item.name}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </Link>
            );
          })}

          <div className="px-6 py-3 mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Tích hợp Hệ thống
          </div>
          <button 
            onClick={() => setIsDriveModalOpen(true)}
            className="w-full text-left flex items-center px-6 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors group"
          >
            <HardDrive className="w-4 h-4 mr-3 text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="truncate pr-1">
              <span className="block font-medium">Google Drive API</span>
              <span className="block text-[10px] text-gray-400 truncate">{driveAccount?.email || 'Chưa kết nối'}</span>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          </button>
          
          <div className="flex items-center px-6 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
            <Database className="w-4 h-4 mr-3 text-emerald-400" />
            <span>Supabase Database</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
        </nav>

        {/* User profile / System Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between gap-3 text-xs text-gray-400 bg-[#141923]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-400/30">
              AD
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">Admin SPV</p>
              <p className="text-[10px] text-gray-400 truncate max-w-[110px]">{driveAccount?.email || 'spv-group@system'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsDriveModalOpen(true)}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors" 
            title="Cài đặt Google Drive & Tài khoản"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 bg-[#F4F7FA] border border-gray-200 px-3.5 py-2 rounded-lg w-80 md:w-96 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm hợp đồng, mã số, đối tác..."
              className="bg-transparent outline-none text-xs md:text-sm w-full text-slate-800 placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate('/contracts');
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="hidden sm:flex px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 text-[10px] font-bold rounded uppercase tracking-wider items-center gap-1.5 transition-colors"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>Drive: {driveAccount?.email ? driveAccount.email.split('@')[0] : 'Chưa kết nối'}</span>
            </button>

            <Link
              to="/smart-editor"
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Soạn Hợp Đồng Thông Minh</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#F4F7FA]">
          <Outlet />
        </main>
      </div>

      {/* Google Drive Account Manager Modal */}
      <GoogleDriveAccountModal 
        isOpen={isDriveModalOpen} 
        onClose={() => setIsDriveModalOpen(false)} 
        onAccountChange={(acc) => setDriveAccount(acc)}
      />
    </div>
  );
}


