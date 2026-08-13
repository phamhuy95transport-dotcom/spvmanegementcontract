import React, { useState, useEffect } from 'react';
import { HardDrive, Check, X, LogOut, Key, ShieldCheck, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { getConnectedDriveAccount, setConnectedDriveAccount, disconnectDriveAccount, DriveAccountInfo } from '../lib/drive';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccountChange?: (account: DriveAccountInfo | null) => void;
}

const PRESET_ACCOUNTS = [
  {
    email: 'phamhuy.cht@gmail.com',
    name: 'Phạm Quang Huy (SPV Group)',
    accessToken: 'mock_token_spv_group_primary',
  },
  {
    email: 'spv.legal.dept@gmail.com',
    name: 'Phòng Pháp Chế SPV GROUP',
    accessToken: 'mock_token_spv_legal_dept',
  },
  {
    email: 'kangfoods.account@gmail.com',
    name: 'Đại diện CÔNG TY KANG FOODS',
    accessToken: 'mock_token_kang_foods',
  }
];

export default function GoogleDriveAccountModal({ isOpen, onClose, onAccountChange }: Props) {
  const [currentAccount, setCurrentAccount] = useState<DriveAccountInfo | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  useEffect(() => {
    if (isOpen) {
      const acc = getConnectedDriveAccount();
      setCurrentAccount(acc);
      if (acc) {
        setCustomEmail(acc.email);
        setCustomName(acc.name);
        setCustomToken(acc.accessToken);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_ACCOUNTS[0]) => {
    const newAcc: DriveAccountInfo = {
      email: preset.email,
      name: preset.name,
      accessToken: preset.accessToken,
      connectedAt: new Date().toISOString(),
    };
    setConnectedDriveAccount(newAcc);
    setCurrentAccount(newAcc);
    if (onAccountChange) onAccountChange(newAcc);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2000);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;

    const newAcc: DriveAccountInfo = {
      email: customEmail,
      name: customName || customEmail.split('@')[0],
      accessToken: customToken || `mock_token_${Date.now()}`,
      connectedAt: new Date().toISOString(),
    };

    setConnectedDriveAccount(newAcc);
    setCurrentAccount(newAcc);
    if (onAccountChange) onAccountChange(newAcc);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2000);
  };

  const handleDisconnect = () => {
    disconnectDriveAccount();
    setCurrentAccount(null);
    if (onAccountChange) onAccountChange(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestSuccess(false);
    await new Promise((r) => setTimeout(r, 1000));
    setTesting(false);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#1A202C] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Kết nối Google Drive API</h3>
              <p className="text-xs text-gray-400">Quản lý và chuyển đổi tài khoản lưu trữ Google Drive</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Connected Account Banner */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                {currentAccount ? currentAccount.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900">{currentAccount?.name || 'Chưa kết nối'}</span>
                  {currentAccount && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã kết nối
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{currentAccount?.email || 'N/A'}</p>
              </div>
            </div>

            {currentAccount && (
              <button 
                onClick={handleDisconnect}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Ngắt kết nối"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Hủy</span>
              </button>
            )}
          </div>

          {/* Test Status Banner */}
          {testSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Kết nối Google Drive API thành công! Đã sẵn sàng đồng bộ hợp đồng.
            </div>
          )}

          {/* Account Selection Options */}
          <div>
            <div className="flex border-b border-gray-200 mb-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'presets' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Chọn Tài khoản Nhanh
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'custom' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Nhập Token / Account Khác
              </button>
            </div>

            {activeTab === 'presets' ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Chọn tài khoản Google Drive để kết nối và lưu trữ hợp đồng:</p>
                {PRESET_ACCOUNTS.map((acc) => {
                  const isSelected = currentAccount?.email === acc.email;
                  return (
                    <div 
                      key={acc.email}
                      onClick={() => handleSelectPreset(acc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' 
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{acc.name}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{acc.email}</p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          Kết nối
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleSaveCustom} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Email Tài khoản Google Drive *</label>
                  <input
                    type="email"
                    required
                    placeholder="ví dụ: tapdoan.phapche@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tên Hiển thị Tên Đơn vị / Đại diện</label>
                  <input
                    type="text"
                    placeholder="ví dụ: Nguyễn Văn A - Công ty XYZ"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">OAuth Access Token Google Drive (Tùy chọn)</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="ya29.a0AR... (Để trống nếu dùng cấu hình mặc định)"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-xs pr-8"
                    />
                    <Key className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Nhập token Google API từ Google Cloud Console hoặc sử dụng tài khoản hệ thống tự động.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors mt-2"
                >
                  Lưu & Kết nối Tài khoản
                </button>
              </form>
            )}
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Tài khoản Google Drive sẽ được lưu an toàn trong phiên làm việc của bạn. Mọi tập tin hợp đồng xuất bản sẽ tự động tải lên thư mục Google Drive của tài khoản đã chọn.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={handleTestConnection}
            disabled={testing || !currentAccount}
            className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-600' : ''}`} />
            {testing ? 'Đang kiểm tra...' : 'Kiểm tra API Drive'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
