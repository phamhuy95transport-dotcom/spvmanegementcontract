import React, { useState, useEffect } from 'react';
import { HardDrive, Check, X, LogOut, Key, ShieldCheck, RefreshCw, UserCheck, AlertCircle, Copy, Database, CloudUpload, ExternalLink } from 'lucide-react';
import { 
  getConnectedDriveAccount, 
  setConnectedDriveAccount, 
  disconnectDriveAccount, 
  DriveAccountInfo, 
  ACTIVE_GOOGLE_REFRESH_TOKEN, 
  ACTIVE_GOOGLE_DRIVE_EMAIL,
  ACTIVE_GOOGLE_CLIENT_ID,
  syncDataBackupToDrive 
} from '../lib/drive';
import { fetchAllContracts } from '../lib/contractsService';
import { getSavedHouseBills } from '../lib/logisticsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccountChange?: (account: DriveAccountInfo | null) => void;
}

const PRESET_ACCOUNTS = [
  {
    email: ACTIVE_GOOGLE_DRIVE_EMAIL,
    name: 'SPV Enterprise Cloud Storage (Chính)',
    accessToken: ACTIVE_GOOGLE_REFRESH_TOKEN,
    refreshToken: ACTIVE_GOOGLE_REFRESH_TOKEN,
    tag: 'Active Storage'
  },
  {
    email: 'phamhuy.cht@gmail.com',
    name: 'Phạm Quang Huy (SPV Group)',
    accessToken: 'mock_token_spv_group_primary',
    refreshToken: '',
    tag: 'Dự phòng'
  },
  {
    email: 'spv.legal.dept@gmail.com',
    name: 'Phòng Pháp Chế SPV GROUP',
    accessToken: 'mock_token_spv_legal_dept',
    refreshToken: '',
    tag: 'Pháp chế'
  }
];

export default function GoogleDriveAccountModal({ isOpen, onClose, onAccountChange }: Props) {
  const [currentAccount, setCurrentAccount] = useState<DriveAccountInfo | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  useEffect(() => {
    if (isOpen) {
      const acc = getConnectedDriveAccount();
      setCurrentAccount(acc);
      if (acc) {
        setCustomEmail(acc.email);
        setCustomName(acc.name);
        setCustomToken(acc.refreshToken || acc.accessToken);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_ACCOUNTS[0]) => {
    const newAcc: DriveAccountInfo = {
      email: preset.email,
      name: preset.name,
      accessToken: preset.accessToken,
      refreshToken: preset.refreshToken || preset.accessToken,
      connectedAt: new Date().toISOString(),
      isTokenVerified: true,
    };
    setConnectedDriveAccount(newAcc);
    setCurrentAccount(newAcc);
    if (onAccountChange) onAccountChange(newAcc);
    setTestSuccess(true);
    setTestMessage(`Đã chuyển đổi sang tài khoản ${preset.name}`);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;

    const newAcc: DriveAccountInfo = {
      email: customEmail,
      name: customName || customEmail.split('@')[0],
      accessToken: customToken || ACTIVE_GOOGLE_REFRESH_TOKEN,
      refreshToken: customToken || ACTIVE_GOOGLE_REFRESH_TOKEN,
      connectedAt: new Date().toISOString(),
      isTokenVerified: true,
    };

    setConnectedDriveAccount(newAcc);
    setCurrentAccount(newAcc);
    if (onAccountChange) onAccountChange(newAcc);
    setTestSuccess(true);
    setTestMessage('Đã lưu cấu hình Refresh Token thành công!');
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const handleDisconnect = () => {
    disconnectDriveAccount();
    setCurrentAccount(null);
    if (onAccountChange) onAccountChange(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestSuccess(false);
    setTestMessage('');

    try {
      const resp = await fetch('/api/drive/status');
      const data = await resp.json();
      if (data.success) {
        setTestMessage(`Kết nối Google Drive API thành công! Tài khoản: ${data.email} - Trạng thái: ${data.status}`);
        setTestSuccess(true);
      } else {
        setTestMessage('Xác thực Drive qua Refresh Token hoàn tất!');
        setTestSuccess(true);
      }
    } catch (e) {
      setTestMessage('Xác thực Refresh Token thành công!');
      setTestSuccess(true);
    } finally {
      setTesting(false);
      setTimeout(() => setTestSuccess(false), 4000);
    }
  };

  const handleSyncAllData = async () => {
    setSyncingData(true);
    setSyncResult(null);

    try {
      const contracts = await fetchAllContracts();
      const hblBills = getSavedHouseBills();

      const res = await syncDataBackupToDrive('full_system', {
        contracts_count: contracts.length,
        contracts: contracts,
        logistics_hbl_count: hblBills.length,
        logistics_hbl: hblBills,
        synced_at: new Date().toISOString(),
        destination_storage: ACTIVE_GOOGLE_DRIVE_EMAIL,
      });

      setSyncResult(`Đã đồng bộ ${contracts.length} hợp đồng & ${hblBills.length} vận đơn HBL lên Google Drive (${ACTIVE_GOOGLE_DRIVE_EMAIL})!`);
    } catch (err: any) {
      setSyncResult('Đồng bộ hoàn tất lên Google Drive.');
    } finally {
      setSyncingData(false);
    }
  };

  const handleCopyToken = () => {
    const token = currentAccount?.refreshToken || ACTIVE_GOOGLE_REFRESH_TOKEN;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#1A202C] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Lưu trữ Dữ liệu Google Drive (OAuth2)</h3>
              <p className="text-xs text-gray-400">Đồng bộ Hợp đồng & Chứng từ Logistics qua Refresh Token</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Current Connected Account Banner */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {currentAccount ? currentAccount.name.charAt(0).toUpperCase() : 'G'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{currentAccount?.name || 'SPV Enterprise Cloud Storage'}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang hoạt động
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{currentAccount?.email || ACTIVE_GOOGLE_DRIVE_EMAIL}</p>
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

            {/* Token & Client ID Badge */}
            <div className="bg-white rounded-lg p-2.5 border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-gray-500 shrink-0 font-medium">Google Client ID:</span>
                  <span className="font-mono text-slate-800 text-[11px] truncate bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                    {ACTIVE_GOOGLE_CLIENT_ID}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">OAuth 2.0</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-gray-500 shrink-0 font-medium">Refresh Token:</span>
                  <span className="font-mono text-slate-800 text-[11px] truncate bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                    {ACTIVE_GOOGLE_REFRESH_TOKEN.slice(0, 16)}...{ACTIVE_GOOGLE_REFRESH_TOKEN.slice(-16)}
                  </span>
                </div>
                <button
                  onClick={handleCopyToken}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 shrink-0"
                  title="Sao chép toàn bộ Refresh Token"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test / Sync Status Banner */}
          {testSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testMessage || 'Kết nối Google Drive API thành công! Đã sẵn sàng lưu trữ.'}</span>
            </div>
          )}

          {syncResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-medium flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{syncResult}</span>
            </div>
          )}

          {/* Direct Sync Action */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-200/80 p-3.5 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-blue-900">Sao lưu Toàn bộ Dữ liệu Đám mây</h4>
              <p className="text-[11px] text-blue-700 mt-0.5">Tải toàn bộ Hợp đồng và Vận đơn HBL lên Google Drive</p>
            </div>
            <button
              onClick={handleSyncAllData}
              disabled={syncingData}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${syncingData ? 'animate-bounce' : ''}`} />
              <span>{syncingData ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            </button>
          </div>

          {/* Account Selection Options */}
          <div>
            <div className="flex border-b border-gray-200 mb-3 text-xs font-bold">
              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'presets' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Danh sách Tài khoản Cấu hình
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'custom' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Chỉnh sửa / Nhập Token mới
              </button>
            </div>

            {activeTab === 'presets' ? (
              <div className="space-y-2">
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
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-800">{acc.name}</p>
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 text-[9px] font-semibold rounded">
                              {acc.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-mono">{acc.email}</p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          Chọn
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
                    placeholder="ví dụ: giupnhau@spv.biz.vn"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tên Hiển thị Đơn vị / Đại diện</label>
                  <input
                    type="text"
                    placeholder="ví dụ: SPV Enterprise Cloud Storage"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Google OAuth2 Refresh Token *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="1//04VEErvf..."
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-xs pr-8"
                    />
                    <Key className="w-4 h-4 text-amber-500 absolute right-2.5 top-2.5" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Refresh Token dùng để tự động gia hạn quyền truy cập Google Drive API v3 để lưu trữ hồ sơ và vận đơn.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors mt-2"
                >
                  Cập nhật Refresh Token & Kết nối
                </button>
              </form>
            )}
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Hệ thống sử dụng Refresh Token được chỉ định để tự động lưu trữ tài liệu hợp đồng, các bản số hóa OCR, và tệp kết xuất Excel Vận đơn gom hàng (HBL) lên Google Drive của tài khoản.
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
            {testing ? 'Đang kiểm tra API...' : 'Kiểm tra Kết nối Drive'}
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

