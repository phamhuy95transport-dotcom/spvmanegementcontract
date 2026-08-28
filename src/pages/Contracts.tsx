import React, { useEffect, useState, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchAllContracts, 
  deleteContract, 
  pauseContract, 
  extendContract, 
  replaceContract,
  shouldAlertContract,
  CONTRACT_CATEGORIES,
  DEFAULT_CONTRACT_TYPES,
  SIGNING_METHODS 
} from '../lib/contractsService';
import { syncDataBackupToDrive, ACTIVE_GOOGLE_DRIVE_EMAIL } from '../lib/drive';
import { Contract, ContractCategory, ContractType, SigningMethod, ContractStatus } from '../types';
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  FileSearch, 
  AlertTriangle, 
  CheckCircle2, 
  CloudUpload, 
  PauseCircle, 
  RotateCw, 
  ArrowRightLeft, 
  Filter, 
  Calendar, 
  Building2, 
  Hash, 
  FileSignature, 
  Clock, 
  Check, 
  X, 
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Download
} from 'lucide-react';
import { format, addYears, addMonths, parseISO, isAfter, isBefore } from 'date-fns';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [signingMethodFilter, setSigningMethodFilter] = useState<string>('all');
  const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);

  // Modals state
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'pause' | 'extend' | 'replace';
    contract: Contract;
  } | null>(null);

  // Form states for Action Modals
  const [actionReason, setActionReason] = useState('');
  const [newContractNumber, setNewContractNumber] = useState('');
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newSignDate, setNewSignDate] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [newSigningMethod, setNewSigningMethod] = useState<SigningMethod>('Ký điện tử');
  const [actionLoading, setActionLoading] = useState(false);

  // Highlight state when jumping to contract
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  // Sync state
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const data = await fetchAllContracts();
      setContracts(data);
    } catch (err) {
      console.error("Error fetching contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToDrive = async () => {
    setSyncingDrive(true);
    setSyncNotice(null);
    try {
      await syncDataBackupToDrive('contracts', contracts);
      setSyncNotice(`Đã sao lưu ${contracts.length} hợp đồng lên Google Drive (${ACTIVE_GOOGLE_DRIVE_EMAIL})!`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (e) {
      setSyncNotice('Đã lưu trữ dữ liệu lên Google Drive.');
      setTimeout(() => setSyncNotice(null), 4000);
    } finally {
      setSyncingDrive(false);
    }
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContract(contractToDelete.id);
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
    } catch (err) {
      console.error("Failed to delete contract:", err);
    } finally {
      setIsDeleting(false);
      setContractToDelete(null);
    }
  };

  // Open Action Modal with intelligent default values
  const openActionModal = (contract: Contract, type: 'pause' | 'extend' | 'replace') => {
    const todayStr = new Date().toISOString().split('T')[0];
    let defaultEffDate = todayStr;
    let defaultExpDate = '';

    if (contract.expiration_date) {
      try {
        const exp = parseISO(contract.expiration_date);
        const nextStart = new Date(exp.getTime() + 24 * 60 * 60 * 1000);
        defaultEffDate = format(nextStart, 'yyyy-MM-dd');
        defaultExpDate = format(addYears(nextStart, 1), 'yyyy-MM-dd');
      } catch {
        defaultExpDate = format(addYears(new Date(), 1), 'yyyy-MM-dd');
      }
    } else {
      defaultExpDate = format(addYears(new Date(), 1), 'yyyy-MM-dd');
    }

    const suggestedNum = type === 'extend' 
      ? `${contract.contract_number}-GH1`
      : `${contract.contract_number}-R${new Date().getFullYear()}`;

    setNewContractNumber(suggestedNum);
    setNewEffectiveDate(defaultEffDate);
    setNewExpirationDate(defaultExpDate);
    setNewSignDate(todayStr);
    setNewValue(contract.value || 0);
    setNewSigningMethod(contract.signing_method || 'Ký điện tử');
    setActionReason('');
    setActiveActionModal({ type, contract });
  };

  // Submit Action (Pause / Extend / Replace)
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionModal) return;

    setActionLoading(true);
    const { type, contract } = activeActionModal;

    try {
      if (type === 'pause') {
        const updated = await pauseContract(contract.id, actionReason);
        if (updated) {
          setContracts(prev => prev.map(c => c.id === contract.id ? updated : c));
          setSyncNotice(`Đã tạm dừng hợp đồng ${contract.contract_number}. Không còn cảnh báo.`);
        }
      } else if (type === 'extend') {
        const res = await extendContract(contract.id, {
          new_contract_number: newContractNumber,
          new_effective_date: newEffectiveDate,
          new_expiration_date: newExpirationDate,
          new_sign_date: newSignDate,
          new_value: newValue,
          action_note: actionReason || `Gia hạn từ hợp đồng ${contract.contract_number}`,
        });
        if (res) {
          await fetchContracts();
          setSyncNotice(`Đã gia hạn thành công! Tạo mới HĐ ${res.newContract.contract_number} và cập nhật HĐ cũ.`);
          // Scroll and highlight new contract
          setTimeout(() => jumpToContract(res.newContract.id), 300);
        }
      } else if (type === 'replace') {
        const res = await replaceContract(contract.id, {
          new_contract_number: newContractNumber,
          new_title: `${contract.title} (Thay thế)`,
          new_sign_date: newSignDate,
          new_effective_date: newEffectiveDate,
          new_expiration_date: newExpirationDate,
          new_value: newValue,
          new_signing_method: newSigningMethod,
          action_note: actionReason || `Thay thế cho hợp đồng ${contract.contract_number}`,
        });
        if (res) {
          await fetchContracts();
          setSyncNotice(`Đã tạo hợp đồng thay thế ${res.newContract.contract_number}!`);
          setTimeout(() => jumpToContract(res.newContract.id), 300);
        }
      }

      setTimeout(() => setSyncNotice(null), 5000);
      setActiveActionModal(null);
    } catch (err) {
      console.error("Action submit failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Jump and highlight contract row
  const jumpToContract = (targetId: string) => {
    setHighlightedId(targetId);
    const elem = rowRefs.current[targetId];
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedId(null);
    }, 4500);
  };

  // Filter logic
  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party_b.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tax_code && c.tax_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesType = typeFilter === 'all' || c.contract_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSigningMethod = signingMethodFilter === 'all' || c.signing_method === signingMethodFilter;
    
    const alertInfo = shouldAlertContract(c);
    const matchesAlertOnly = !onlyAlertsFilter || alertInfo.shouldAlert;

    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesSigningMethod && matchesAlertOnly;
  });

  // Calculate contracts requiring alert
  const alertContracts = contracts.filter(c => shouldAlertContract(c).shouldAlert);

  // Status Badge Component
  const renderStatusBadge = (contract: Contract) => {
    const alertInfo = shouldAlertContract(contract);
    const status = contract.status;

    if (status === 'Tạm dừng') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-md border border-gray-300">
          <PauseCircle className="w-3 h-3 text-gray-500" />
          <span>Tạm dừng</span>
        </span>
      );
    }

    if (status === 'Đã gia hạn') {
      return (
        <div className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200">
            <RotateCw className="w-2.5 h-2.5" />
            <span>Đã gia hạn</span>
          </span>
          {contract.superseded_by_id && contract.superseded_by_number && (
            <button
              onClick={() => jumpToContract(contract.superseded_by_id!)}
              className="text-[10px] font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
              title="Nhảy đến hợp đồng gia hạn mới"
            >
              <span>HĐ mới: {contract.superseded_by_number}</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      );
    }

    if (status === 'Đã thay thế') {
      return (
        <div className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-200">
            <ArrowRightLeft className="w-2.5 h-2.5" />
            <span>Đã thay thế</span>
          </span>
          {contract.superseded_by_id && contract.superseded_by_number && (
            <button
              onClick={() => jumpToContract(contract.superseded_by_id!)}
              className="text-[10px] font-mono font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-0.5"
              title="Nhảy đến hợp đồng thay thế mới"
            >
              <span>HĐ mới: {contract.superseded_by_number}</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      );
    }

    if (status === 'Chưa có hiệu lực') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-md border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Chưa có hiệu lực</span>
        </span>
      );
    }

    if (status === 'Hết hạn' || alertInfo.type === 'expired') {
      return (
        <div className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md border border-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Hết hạn</span>
          </span>
          {alertInfo.daysDiff < 0 && (
            <span className="text-[10px] text-rose-600 font-medium">
              Quá {Math.abs(alertInfo.daysDiff)} ngày
            </span>
          )}
        </div>
      );
    }

    // Đang áp dụng
    if (alertInfo.type === 'expiring_soon') {
      return (
        <div className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Sắp hết hạn ({alertInfo.daysDiff} ngày)</span>
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-200">
        <Check className="w-3 h-3 text-emerald-600" />
        <span>Đang áp dụng</span>
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Danh mục Quản lý Hợp đồng</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {contracts.length} hợp đồng
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hệ thống theo dõi phân loại HĐ đầu vào/đầu ra, đánh giá hiệu lực tự động, cảnh báo hết hạn và quy trình Gia hạn/Thay thế/Tạm dừng.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSyncToDrive}
            disabled={syncingDrive || contracts.length === 0}
            className="inline-flex items-center justify-center px-3.5 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-semibold shadow-2xs disabled:opacity-50"
            title="Sao lưu toàn bộ danh mục hợp đồng lên Google Drive"
          >
            <CloudUpload className={`w-3.5 h-3.5 mr-1.5 text-blue-600 ${syncingDrive ? 'animate-bounce' : ''}`} />
            {syncingDrive ? 'Đang sao lưu...' : 'Sao lưu Google Drive'}
          </button>

          <Link 
            to="/contracts/new" 
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-xs font-bold shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Thêm hợp đồng mới</span>
          </Link>
        </div>
      </div>

      {/* Sync / Notification Banner */}
      {syncNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Expiration Alert Banner */}
      {alertContracts.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500 text-white rounded-xl shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Cảnh báo: Có {alertContracts.length} Hợp đồng hết hạn hoặc sắp hết hiệu lực!
                </h3>
                <span className="px-2 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                  Cần xử lý
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                Vui lòng chọn <strong>Gia hạn</strong> (kéo dài thời gian), <strong>Thay thế</strong> (ký số HĐ mới), hoặc <strong>Tạm dừng</strong> (ngừng theo dõi cảnh báo) để đồng bộ trạng thái pháp lý.
              </p>
            </div>
          </div>

          <button
            onClick={() => setOnlyAlertsFilter(prev => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              onlyAlertsFilter
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{onlyAlertsFilter ? 'Xem toàn bộ hợp đồng' : 'Xem các HĐ cần xử lý ngay'}</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo Số HĐ, Đối tác, Tên HĐ, Mã số thuế..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">📂 Tất cả Phân loại (Đầu vào/ra)</option>
              <option value="HĐ đầu vào">📥 HĐ đầu vào</option>
              <option value="HĐ đầu ra">📤 HĐ đầu ra</option>
            </select>
          </div>

          {/* Contract Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">📋 Tất cả Loại Hợp đồng</option>
              {DEFAULT_CONTRACT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">⚖️ Tất cả Trạng thái</option>
              <option value="Đang áp dụng">✅ Đang áp dụng</option>
              <option value="Chưa có hiệu lực">⏳ Chưa có hiệu lực</option>
              <option value="Hết hạn">⚠️ Hết hạn</option>
              <option value="Tạm dừng">⏸️ Tạm dừng</option>
              <option value="Đã gia hạn">🔄 Đã gia hạn</option>
              <option value="Đã thay thế">🔀 Đã thay thế</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Lọc nhanh:</span>
            
            <button
              onClick={() => { setCategoryFilter('all'); setTypeFilter('all'); setStatusFilter('all'); setOnlyAlertsFilter(false); setSearchTerm(''); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                categoryFilter === 'all' && typeFilter === 'all' && statusFilter === 'all' && !onlyAlertsFilter
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả ({contracts.length})
            </button>

            <button
              onClick={() => setCategoryFilter('HĐ đầu ra')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                categoryFilter === 'HĐ đầu ra' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              HĐ đầu ra ({contracts.filter(c => c.category === 'HĐ đầu ra').length})
            </button>

            <button
              onClick={() => setCategoryFilter('HĐ đầu vào')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                categoryFilter === 'HĐ đầu vào' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              HĐ đầu vào ({contracts.filter(c => c.category === 'HĐ đầu vào').length})
            </button>

            <button
              onClick={() => setStatusFilter('Hết hạn')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                statusFilter === 'Hết hạn' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Hết hạn ({contracts.filter(c => c.status === 'Hết hạn').length})
            </button>

            <button
              onClick={() => setStatusFilter('Tạm dừng')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                statusFilter === 'Tạm dừng' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tạm dừng ({contracts.filter(c => c.status === 'Tạm dừng').length})
            </button>
          </div>

          <div className="font-medium text-gray-500">
            Hiển thị <span className="font-bold text-slate-900">{filteredContracts.length}</span> / {contracts.length} hợp đồng
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#1E293B] text-slate-100 text-[11px] font-bold uppercase tracking-wider select-none">
              <tr>
                <th className="px-3.5 py-3.5 text-center w-12">STT</th>
                <th className="px-4 py-3.5">Phân Loại HĐ</th>
                <th className="px-4 py-3.5">Loại Hợp Đồng</th>
                <th className="px-4 py-3.5">Số Hợp Đồng</th>
                <th className="px-3.5 py-3.5">Ngày Ký</th>
                <th className="px-3.5 py-3.5">Hiệu Lực HĐ</th>
                <th className="px-3.5 py-3.5">Ngày Hết Hạn</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                <th className="px-4 py-3.5">Khách Hàng / NCC</th>
                <th className="px-3.5 py-3.5">Mã Số Thuế</th>
                <th className="px-3.5 py-3.5">Hình Thức Ký</th>
                <th className="px-4 py-3.5 text-right">Tùy Chọn / Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải cơ sở dữ liệu hợp đồng...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <FileSearch className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="font-semibold text-slate-800">Không tìm thấy hợp đồng nào phù hợp bộ lọc</p>
                      <p className="text-xs text-gray-400">Vui lòng thử tìm kiếm khác hoặc bấm xóa bộ lọc.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const alertInfo = shouldAlertContract(contract);
                  const isHighlighted = highlightedId === contract.id;

                  return (
                    <tr 
                      key={contract.id} 
                      ref={el => rowRefs.current[contract.id] = el}
                      className={`transition-all ${
                        isHighlighted 
                          ? 'bg-amber-100 ring-2 ring-amber-500 font-medium' 
                          : alertInfo.shouldAlert 
                            ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                            : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {/* 1. STT */}
                      <td className="px-3.5 py-3.5 text-center font-mono text-gray-500 font-semibold text-[11px]">
                        {index + 1}
                      </td>

                      {/* 2. Phân loại hợp đồng */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          contract.category === 'HĐ đầu ra' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {contract.category}
                        </span>
                      </td>

                      {/* 3. Loại Hợp đồng */}
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <span className="text-xs">{contract.contract_type}</span>
                      </td>

                      {/* 4. Số hợp đồng */}
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                        <Link 
                          to={`/contracts/${contract.id}`} 
                          className="hover:underline flex items-center gap-1 group"
                          title="Xem chi tiết hợp đồng"
                        >
                          <span>{contract.contract_number}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>

                      {/* 5. Ngày ký */}
                      <td className="px-3.5 py-3.5 text-gray-600 font-mono text-[11px]">
                        {formatDate(contract.sign_date)}
                      </td>

                      {/* 6. Hiệu lực HĐ */}
                      <td className="px-3.5 py-3.5 text-gray-800 font-mono text-[11px] font-medium">
                        {formatDate(contract.effective_date)}
                      </td>

                      {/* 7. Ngày hết hạn */}
                      <td className={`px-3.5 py-3.5 font-mono text-[11px] font-semibold ${
                        alertInfo.type === 'expired' ? 'text-rose-600 font-bold' : 'text-slate-700'
                      }`}>
                        {formatDate(contract.expiration_date)}
                      </td>

                      {/* 8. Trạng thái */}
                      <td className="px-4 py-3.5">
                        {renderStatusBadge(contract)}
                      </td>

                      {/* 9. Khách Hàng/Nhà cung cấp */}
                      <td className="px-4 py-3.5 max-w-[200px] truncate" title={contract.party_b}>
                        <span className="font-semibold text-slate-900">{contract.party_b || '-'}</span>
                      </td>

                      {/* 10. Mã số thuế */}
                      <td className="px-3.5 py-3.5 font-mono text-gray-600 text-[11px]">
                        {contract.tax_code ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {contract.tax_code}
                          </span>
                        ) : '-'}
                      </td>

                      {/* 11. Hình thức ký */}
                      <td className="px-3.5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          contract.signing_method === 'Ký điện tử'
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          <FileSignature className="w-3 h-3" />
                          <span>{contract.signing_method}</span>
                        </span>
                      </td>

                      {/* 12. Tùy Chọn & Thao Tác */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Alert Action Menu if expired / expiring */}
                          {alertInfo.shouldAlert && (
                            <div className="flex items-center gap-1 mr-1">
                              <button
                                onClick={() => openActionModal(contract, 'extend')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-colors"
                                title="Gia hạn hợp đồng (Tạo HĐ mới kế thừa & chuyển trạng thái HĐ cũ)"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Gia hạn</span>
                              </button>

                              <button
                                onClick={() => openActionModal(contract, 'replace')}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-colors"
                                title="Thay thế hợp đồng mới"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Thay thế</span>
                              </button>

                              <button
                                onClick={() => openActionModal(contract, 'pause')}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-colors"
                                title="Tạm dừng hợp đồng (Không cảnh báo nữa)"
                              >
                                <PauseCircle className="w-3 h-3" />
                                <span>Tạm dừng</span>
                              </button>
                            </div>
                          )}

                          {/* Detail / OCR button */}
                          <Link 
                            to={`/contracts/${contract.id}`} 
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem chi tiết & Trích xuất OCR"
                          >
                            <FileSearch className="w-4 h-4" />
                          </Link>

                          {/* Edit button */}
                          <Link 
                            to={`/contracts/${contract.id}/edit`} 
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Delete button */}
                          <button 
                            onClick={() => setContractToDelete(contract)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa hợp đồng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal (Pause / Extend / Replace) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              activeActionModal.type === 'pause' ? 'bg-gray-800' :
              activeActionModal.type === 'extend' ? 'bg-emerald-700' : 'bg-purple-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  {activeActionModal.type === 'pause' && <PauseCircle className="w-5 h-5" />}
                  {activeActionModal.type === 'extend' && <RotateCw className="w-5 h-5" />}
                  {activeActionModal.type === 'replace' && <ArrowRightLeft className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {activeActionModal.type === 'pause' && 'Tạm Dừng Hợp Đồng (Ngừng Cảnh Báo)'}
                    {activeActionModal.type === 'extend' && 'Gia Hạn Hợp Đồng Mới'}
                    {activeActionModal.type === 'replace' && 'Thay Thế Bằng Hợp Đồng Mới'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Số HĐ hiện tại: <span className="font-mono font-bold">{activeActionModal.contract.contract_number}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveActionModal(null)} 
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleActionSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-500">Đối tác:</span>
                  <span className="font-bold text-slate-900">{activeActionModal.contract.party_b}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500 font-mono text-[11px]">
                  <span>Phân loại: {activeActionModal.contract.category}</span>
                  <span>MST: {activeActionModal.contract.tax_code}</span>
                </div>
              </div>

              {/* Specific inputs for Extend and Replace */}
              {activeActionModal.type !== 'pause' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Số Hợp Đồng Mới *
                    </label>
                    <input
                      type="text"
                      required
                      value={newContractNumber}
                      onChange={(e) => setNewContractNumber(e.target.value)}
                      placeholder="ví dụ: HD-2026-081-GH1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Ngày Ký Mới *
                      </label>
                      <input
                        type="date"
                        required
                        value={newSignDate}
                        onChange={(e) => setNewSignDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Hình Thức Ký
                      </label>
                      <select
                        value={newSigningMethod}
                        onChange={(e) => setNewSigningMethod(e.target.value as SigningMethod)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      >
                        {SIGNING_METHODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Hiệu Lực Từ Ngày *
                      </label>
                      <input
                        type="date"
                        required
                        value={newEffectiveDate}
                        onChange={(e) => setNewEffectiveDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Hết Hạn Đến Ngày *
                      </label>
                      <input
                        type="date"
                        required
                        value={newExpirationDate}
                        onChange={(e) => setNewExpirationDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  <p className="font-bold">Lưu ý khi Tạm Dừng:</p>
                  <p className="mt-0.5">
                    Hợp đồng này sẽ chuyển sang trạng thái <strong>Tạm dừng</strong>. Hệ thống sẽ <strong>ngừng gửi cảnh báo hết hạn</strong> đối với dòng này.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Lý do / Ghi chú xử lý
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    activeActionModal.type === 'pause' 
                      ? 'ví dụ: Dự án tạm dừng thi công, đối tác hoãn thực hiện...' 
                      : 'ví dụ: Gia hạn thêm 12 tháng theo phụ lục số 01...'
                  }
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                    activeActionModal.type === 'pause' ? 'bg-gray-800 hover:bg-gray-900' :
                    activeActionModal.type === 'extend' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {actionLoading ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {activeActionModal.type === 'pause' && 'Xác Nhận Tạm Dừng'}
                        {activeActionModal.type === 'extend' && 'Tạo Hợp Đồng Gia Hạn'}
                        {activeActionModal.type === 'replace' && 'Tạo Hợp Đồng Thay Thế'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Xác Nhận Xóa Hợp Đồng</h3>
                <p className="text-xs text-gray-500">Hành động này sẽ xóa vĩnh viễn hợp đồng khỏi hệ thống</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">{contractToDelete.title}</p>
              <div className="flex items-center justify-between text-gray-600 font-mono text-[11px] pt-1 border-t border-red-100/60">
                <span>Số HĐ: {contractToDelete.contract_number}</span>
                <span>Đối tác: {contractToDelete.party_b}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa hợp đồng này không? Dữ liệu đã xóa sẽ không thể phục hồi.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setContractToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteContract}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
