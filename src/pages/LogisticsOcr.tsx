import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HouseBillOfLading,
  LogisticsCargoItem,
  LogisticsFilterState,
} from '../types/logistics';
import {
  getSavedHouseBills,
  saveHouseBills,
  SAMPLE_LOGISTICS_BILLS,
  processLogisticsFileOCR,
  exportHouseBillsToExcel,
  exportHouseBillsToCsv,
  exportHouseBillsToJson,
  validateHouseBill,
} from '../lib/logisticsService';
import HouseBillModal from '../components/HouseBillModal';
import {
  Ship,
  Upload,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
  Box,
  Scale,
  Eye,
  EyeOff,
  FileJson,
  ExternalLink,
  Table,
} from 'lucide-react';

export default function LogisticsOcr() {
  const [bills, setBills] = useState<HouseBillOfLading[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProgressMsg, setOcrProgressMsg] = useState('');
  const [ocrEngine, setOcrEngine] = useState('baidu/Unlimited-OCR (Hugging Face)');
  const [copied, setCopied] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<HouseBillOfLading | null>(null);

  // Filter State
  const [filters, setFilters] = useState<LogisticsFilterState>({
    searchQuery: '',
    cargoType: 'ALL',
    portLoading: 'ALL',
    portDestination: 'ALL',
    dateFrom: '',
    dateTo: '',
    hasErrorsOnly: false,
  });

  // Column Visibility State for the 24 master columns
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    stt: true,
    document_no: true,
    document_year: false,
    document_function: false,
    shipper: true,
    consignee: true,
    notify_party_1: false,
    notify_party_2: false,
    port_transhipment_code: false,
    port_destination_code: true,
    port_loading_code: true,
    port_unloading_code: true,
    place_of_delivery: true,
    cargo_type: true,
    hbl_number: true,
    hbl_date: true,
    mbl_number: true,
    mbl_date: false,
    departure_date: true,
    package_quantity: true,
    package_type: true,
    total_gross_weight: true,
    gross_weight_unit: true,
    remark: false,
  });

  const [showColMenu, setShowColMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = getSavedHouseBills();
    setBills(saved);
    // Expand first row by default
    if (saved.length > 0) {
      setExpandedRows({ [saved[0].id]: true });
    }
    setLoading(false);
  }, []);

  const handleUpdateBills = (newBills: HouseBillOfLading[]) => {
    setBills(newBills);
    saveHouseBills(newBills);
  };

  // Upload file OCR handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsProcessingOcr(true);
    setOcrProgress(0);
    setOcrProgressMsg('Khởi động Baidu Unlimited-OCR...');

    try {
      const extracted = await processLogisticsFileOCR(file, (pct, msg) => {
        setOcrProgress(pct);
        setOcrProgressMsg(msg);
      });

      if (extracted && extracted.length > 0) {
        // Renumber STT sequentially
        const merged = [...bills, ...extracted].map((b, idx) => ({
          ...b,
          stt: idx + 1,
        }));
        handleUpdateBills(merged);

        // Auto expand newly added bills
        const newExpanded = { ...expandedRows };
        extracted.forEach((b) => {
          newExpanded[b.id] = true;
        });
        setExpandedRows(newExpanded);
      }
    } catch (err) {
      console.error('Error processing logistics file:', err);
    } finally {
      setIsProcessingOcr(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Reset to Sample Data
  const handleLoadSampleData = () => {
    const sample = SAMPLE_LOGISTICS_BILLS.map((b, idx) => validateHouseBill({ ...b, stt: idx + 1 }));
    handleUpdateBills(sample);
    const exp: Record<string, boolean> = {};
    sample.forEach((b) => {
      exp[b.id] = true;
    });
    setExpandedRows(exp);
  };

  // Clear all data
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách vận đơn gom hàng hiện tại?')) {
      handleUpdateBills([]);
      setExpandedRows({});
    }
  };

  // Row operations
  const handleDeleteRow = (id: string) => {
    const updated = bills.filter((b) => b.id !== id).map((b, idx) => ({ ...b, stt: idx + 1 }));
    handleUpdateBills(updated);
  };

  const handleDuplicateRow = (bill: HouseBillOfLading) => {
    const newBill: HouseBillOfLading = {
      ...bill,
      id: `hbl-${Date.now()}`,
      stt: bills.length + 1,
      hbl_number: `${bill.hbl_number}-COPY`,
      items: bill.items.map((it, i) => ({
        ...it,
        id: `item-${Date.now()}-${i}`,
      })),
    };
    const validated = validateHouseBill(newBill);
    const updated = [...bills, validated];
    handleUpdateBills(updated);
    setExpandedRows((prev) => ({ ...prev, [newBill.id]: true }));
  };

  const handleSaveModal = (savedBill: HouseBillOfLading) => {
    let updated: HouseBillOfLading[];
    if (editingBill) {
      updated = bills.map((b) => (b.id === savedBill.id ? savedBill : b));
    } else {
      updated = [...bills, { ...savedBill, stt: bills.length + 1 }];
    }
    handleUpdateBills(updated);
    setEditingBill(null);
    setIsModalOpen(false);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyTableTsv = () => {
    if (bills.length === 0) return;
    const lines: string[] = [];
    lines.push([
      'STT', 'Số hồ sơ', 'Shipper', 'Consignee', 'Cảng xếp', 'Cảng dỡ', 'Địa điểm giao', 'Loại hàng',
      'Số HBL', 'Ngày HBL', 'Số MBL', 'Ngày khởi hành', 'Số kiện', 'Loại kiện', 'Tổng trọng lượng', 'ĐVT'
    ].join('\t'));

    filteredBills.forEach((b) => {
      lines.push([
        b.stt, b.document_no, b.shipper.replace(/\n/g, ' '), b.consignee.replace(/\n/g, ' '),
        b.port_loading_code, b.port_unloading_code, b.place_of_delivery, b.cargo_type,
        b.hbl_number, b.hbl_date, b.mbl_number, b.departure_date, b.package_quantity,
        b.package_type, b.total_gross_weight, b.gross_weight_unit
      ].join('\t'));
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered dataset
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Search query across all text fields
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesMain =
          b.hbl_number.toLowerCase().includes(q) ||
          b.mbl_number.toLowerCase().includes(q) ||
          b.shipper.toLowerCase().includes(q) ||
          b.consignee.toLowerCase().includes(q) ||
          b.port_loading_code.toLowerCase().includes(q) ||
          b.port_destination_code.toLowerCase().includes(q) ||
          b.place_of_delivery.toLowerCase().includes(q) ||
          (b.remark && b.remark.toLowerCase().includes(q));

        const matchesItems = b.items.some(
          (it) =>
            (it.container_number && it.container_number.toLowerCase().includes(q)) ||
            (it.seal_number && it.seal_number.toLowerCase().includes(q)) ||
            (it.hs_code && it.hs_code.toLowerCase().includes(q)) ||
            it.goods_description.toLowerCase().includes(q)
        );

        if (!matchesMain && !matchesItems) return false;
      }

      // Cargo type filter
      if (filters.cargoType !== 'ALL' && b.cargo_type !== filters.cargoType) {
        return false;
      }

      // Port loading filter
      if (filters.portLoading !== 'ALL' && b.port_loading_code !== filters.portLoading) {
        return false;
      }

      // Port destination filter
      if (filters.portDestination !== 'ALL' && b.port_destination_code !== filters.portDestination) {
        return false;
      }

      // Has errors filter
      if (filters.hasErrorsOnly && (!b.validation_errors || b.validation_errors.length === 0)) {
        return false;
      }

      return true;
    });
  }, [bills, filters]);

  // Port lists for filters
  const uniquePortsLoading = useMemo(() => {
    return Array.from(new Set(bills.map((b) => b.port_loading_code).filter(Boolean)));
  }, [bills]);

  const uniquePortsDest = useMemo(() => {
    return Array.from(new Set(bills.map((b) => b.port_destination_code).filter(Boolean)));
  }, [bills]);

  // Aggregated KPIs
  const stats = useMemo(() => {
    const totalHbl = filteredBills.length;
    let totalWeightKgm = 0;
    let totalPkgs = 0;
    let totalCbm = 0;
    let containerSet = new Set<string>();
    let invalidCount = 0;

    filteredBills.forEach((b) => {
      const weightKgm = b.gross_weight_unit === 'TNE' ? b.total_gross_weight * 1000 : b.total_gross_weight;
      totalWeightKgm += weightKgm || 0;
      totalPkgs += b.package_quantity || 0;
      if (b.validation_errors && b.validation_errors.length > 0) {
        invalidCount += 1;
      }
      b.items.forEach((it) => {
        totalCbm += it.dimension_cbm || 0;
        if (it.container_number && it.container_number.trim()) {
          containerSet.add(it.container_number.trim().toUpperCase());
        }
      });
    });

    return {
      totalHbl,
      totalWeightKgm,
      totalPkgs,
      totalCbm,
      totalContainers: containerSet.size,
      invalidCount,
    };
  }, [filteredBills]);

  const columnLabels: Record<string, string> = {
    stt: 'STT (*) No',
    document_no: 'Số hồ sơ',
    document_year: 'Năm ĐK hồ sơ',
    document_function: 'Chức năng',
    shipper: 'Người gửi hàng* Shipper',
    consignee: 'Người nhận hàng* Consignee',
    notify_party_1: 'Người thông báo 1',
    notify_party_2: 'Người thông báo 2',
    port_transhipment_code: 'Cảng chuyển tải',
    port_destination_code: 'Cảng đích',
    port_loading_code: 'Cảng xếp (POL)',
    port_unloading_code: 'Cảng dỡ (POD)',
    place_of_delivery: 'Địa điểm giao hàng*',
    cargo_type: 'Loại hàng*',
    hbl_number: 'Số vận đơn (HBL)*',
    hbl_date: 'Ngày HBL*',
    mbl_number: 'Số MBL*',
    mbl_date: 'Ngày MBL*',
    departure_date: 'Ngày khởi hành*',
    package_quantity: 'Tổng số kiện*',
    package_type: 'Loại kiện*',
    total_gross_weight: 'Tổng trọng lượng*',
    gross_weight_unit: 'ĐVT*',
    remark: 'Ghi chú',
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase tracking-wider font-mono">
              e-Manifest / VNACCS
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Baidu Unlimited-OCR
            </span>
            <a
              href="https://huggingface.co/baidu/Unlimited-OCR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-0.5"
            >
              Hugging Face Model <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            DANH SÁCH VẬN ĐƠN GOM HÀNG (List of House bill of lading)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tải lên tài liệu vận tải/manifest để phân tích, tự động nhận dạng 24 cột dữ liệu pháp lý và trích xuất chi tiết Container.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingOcr}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-blue-200" />}
            <span>{isProcessingOcr ? `Đang quét Unlimited-OCR (${ocrProgress}%)` : 'Tải lên tài liệu OCR'}</span>
          </button>

          <button
            onClick={() => {
              setEditingBill(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Thêm Vận đơn HBL</span>
          </button>

          <button
            onClick={() => exportHouseBillsToExcel(filteredBills)}
            disabled={filteredBills.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Kết xuất file Excel (.xlsx) chuẩn Hải quan theo mẫu đính kèm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => exportHouseBillsToCsv(filteredBills)}
            disabled={filteredBills.length === 0}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Xuất file CSV chuẩn 24 cột Hải quan"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => exportHouseBillsToJson(filteredBills)}
            disabled={filteredBills.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Xuất tệp JSON phục vụ nộp e-Manifest Hải quan"
          >
            <FileJson className="w-4 h-4 text-amber-400" />
            <span>JSON e-Manifest</span>
          </button>

          <button
            onClick={handleCopyTableTsv}
            disabled={filteredBills.length === 0}
            className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            title="Sao chép bảng để dán trực tiếp vào Excel"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>

          <button
            onClick={handleLoadSampleData}
            className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            title="Nạp lại bộ dữ liệu mẫu House Bill tiêu chuẩn"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Mẫu chuẩn</span>
          </button>

          {bills.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 border border-gray-200 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl text-xs transition-colors"
              title="Xóa trắng danh sách"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* OCR Live Progress notification */}
      {isProcessingOcr && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="font-bold text-blue-300">Đang xử lý Baidu Unlimited-OCR (R-SWA Multi-Page Attention)...</span>
            </div>
            <span className="font-mono text-amber-400 font-bold">{ocrProgress}%</span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono truncate">{ocrProgressMsg}</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* KPI Metric Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Tổng số HBL</span>
            <Ship className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{stats.totalHbl}</p>
          <p className="text-[10px] text-gray-400">Vận đơn gom hàng</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Tổng Trọng Lượng</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700">
            {stats.totalWeightKgm.toLocaleString('vi-VN')} <span className="text-xs font-semibold">KGM</span>
          </p>
          <p className="text-[10px] text-gray-400">{(stats.totalWeightKgm / 1000).toFixed(2)} Tấn (TNE)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Tổng Số Kiện</span>
            <Box className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">
            {stats.totalPkgs.toLocaleString('vi-VN')}
          </p>
          <p className="text-[10px] text-gray-400">Carton / Pallet / Package</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Số Lượng Cont</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{stats.totalContainers}</p>
          <p className="text-[10px] text-gray-400">Container nguyên chì</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Thể Tích (CBM)</span>
            <Table className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">
            {stats.totalCbm.toFixed(1)} <span className="text-xs font-semibold">m³</span>
          </p>
          <p className="text-[10px] text-gray-400">Dung tích hàng hóa</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Kiểm Tra Quy Chuẩn</span>
            {stats.invalidCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p className={`text-xl font-bold font-mono ${stats.invalidCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.invalidCount === 0 ? '100% OK' : `${stats.invalidCount} Lỗi`}
          </p>
          <p className="text-[10px] text-gray-400">
            {stats.invalidCount === 0 ? 'Sẵn sàng nộp Hải quan' : 'Cần kiểm tra lại ô dữ liệu'}
          </p>
        </div>
      </div>

      {/* Filter & Toolbar Area */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Tìm theo Số HBL, Số MBL, Người gửi (Shipper), Người nhận (Consignee), Số Container, Seal, Hàng hóa..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-slate-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Quick Cargo Type Filter */}
          <select
            value={filters.cargoType}
            onChange={(e) => setFilters({ ...filters, cargoType: e.target.value })}
            className="w-full md:w-44 px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả loại hàng</option>
            <option value="FCL">Hàng FCL</option>
            <option value="LCL">Hàng LCL</option>
            <option value="CFS">Hàng kho CFS</option>
            <option value="FCL/FCL">FCL/FCL</option>
            <option value="LCL/LCL">LCL/LCL</option>
          </select>

          {/* Port Loading Filter */}
          <select
            value={filters.portLoading}
            onChange={(e) => setFilters({ ...filters, portLoading: e.target.value })}
            className="w-full md:w-44 px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả cảng xếp (POL)</option>
            {uniquePortsLoading.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Port Destination Filter */}
          <select
            value={filters.portDestination}
            onChange={(e) => setFilters({ ...filters, portDestination: e.target.value })}
            className="w-full md:w-44 px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả cảng đích (POD)</option>
            {uniquePortsDest.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Column Visibility Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Cột hiển thị</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showColMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-30 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs font-bold text-slate-800">
                  <span>Tùy chỉnh 24 cột dữ liệu</span>
                  <button
                    onClick={() => {
                      const allTrue = Object.keys(visibleColumns).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                      setVisibleColumns(allTrue);
                    }}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Hiện tất cả
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {Object.entries(columnLabels).map(([colKey, label]) => (
                    <label key={colKey} className="flex items-center gap-2 text-xs text-gray-700 hover:bg-gray-50 p-1.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey] ?? true}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            [colKey]: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setShowColMenu(false)}
                  className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors text-center block"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Tags */}
        {(filters.searchQuery || filters.cargoType !== 'ALL' || filters.portLoading !== 'ALL' || filters.portDestination !== 'ALL') && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>Đang lọc:</span>
            {filters.searchQuery && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono text-[11px]">
                Từ khóa: "{filters.searchQuery}"
              </span>
            )}
            {filters.cargoType !== 'ALL' && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold text-[11px]">
                Loại: {filters.cargoType}
              </span>
            )}
            {filters.portLoading !== 'ALL' && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-semibold text-[11px]">
                POL: {filters.portLoading}
              </span>
            )}
            {filters.portDestination !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[11px]">
                POD: {filters.portDestination}
              </span>
            )}
            <button
              onClick={() =>
                setFilters({
                  searchQuery: '',
                  cargoType: 'ALL',
                  portLoading: 'ALL',
                  portDestination: 'ALL',
                  dateFrom: '',
                  dateTo: '',
                  hasErrorsOnly: false,
                })
              }
              className="text-xs text-rose-600 hover:underline ml-auto font-semibold"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Table: DANH SÁCH VẬN ĐƠN GOM HÀNG */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Headers */}
            <thead>
              <tr className="bg-[#1A202C] text-white border-b border-gray-800">
                <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                {visibleColumns.stt && <th className="py-3 px-3 font-bold whitespace-nowrap">STT (*)</th>}
                {visibleColumns.document_no && <th className="py-3 px-3 font-bold whitespace-nowrap">Số hồ sơ</th>}
                {visibleColumns.document_year && <th className="py-3 px-3 font-bold whitespace-nowrap">Năm ĐK</th>}
                {visibleColumns.document_function && <th className="py-3 px-3 font-bold whitespace-nowrap">Chức năng</th>}
                {visibleColumns.hbl_number && <th className="py-3 px-3 font-bold whitespace-nowrap text-blue-300">Số vận đơn (HBL)*</th>}
                {visibleColumns.hbl_date && <th className="py-3 px-3 font-bold whitespace-nowrap">Ngày HBL*</th>}
                {visibleColumns.mbl_number && <th className="py-3 px-3 font-bold whitespace-nowrap">Số MBL*</th>}
                {visibleColumns.mbl_date && <th className="py-3 px-3 font-bold whitespace-nowrap">Ngày MBL*</th>}
                {visibleColumns.shipper && <th className="py-3 px-3 font-bold min-w-[200px]">Người gửi hàng* Shipper</th>}
                {visibleColumns.consignee && <th className="py-3 px-3 font-bold min-w-[200px]">Người nhận hàng* Consignee</th>}
                {visibleColumns.notify_party_1 && <th className="py-3 px-3 font-bold min-w-[180px]">Người thông báo 1</th>}
                {visibleColumns.notify_party_2 && <th className="py-3 px-3 font-bold min-w-[180px]">Người thông báo 2</th>}
                {visibleColumns.port_loading_code && <th className="py-3 px-3 font-bold whitespace-nowrap">Cảng xếp (POL)</th>}
                {visibleColumns.port_unloading_code && <th className="py-3 px-3 font-bold whitespace-nowrap">Cảng dỡ (POD)</th>}
                {visibleColumns.port_transhipment_code && <th className="py-3 px-3 font-bold whitespace-nowrap">Cảng quá cảnh</th>}
                {visibleColumns.port_destination_code && <th className="py-3 px-3 font-bold whitespace-nowrap">Cảng đích</th>}
                {visibleColumns.place_of_delivery && <th className="py-3 px-3 font-bold whitespace-nowrap">Địa điểm giao*</th>}
                {visibleColumns.cargo_type && <th className="py-3 px-3 font-bold whitespace-nowrap">Loại hàng*</th>}
                {visibleColumns.departure_date && <th className="py-3 px-3 font-bold whitespace-nowrap">Ngày khởi hành*</th>}
                {visibleColumns.package_quantity && <th className="py-3 px-3 font-bold whitespace-nowrap text-right">Tổng số kiện*</th>}
                {visibleColumns.package_type && <th className="py-3 px-3 font-bold whitespace-nowrap">Loại kiện*</th>}
                {visibleColumns.total_gross_weight && <th className="py-3 px-3 font-bold whitespace-nowrap text-right text-emerald-300">Tổng GW*</th>}
                {visibleColumns.gross_weight_unit && <th className="py-3 px-3 font-bold whitespace-nowrap">ĐVT*</th>}
                {visibleColumns.remark && <th className="py-3 px-3 font-bold min-w-[150px]">Ghi chú</th>}
                <th className="py-3 px-4 font-bold text-center w-28">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={26} className="py-16 text-center text-gray-500 space-y-3">
                    <Ship className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm font-semibold text-gray-700">Chưa có vận đơn gom hàng nào phù hợp</p>
                    <p className="text-xs text-gray-400">
                      Hãy bấm <b>"Tải lên tài liệu OCR"</b> hoặc <b>"Mẫu chuẩn"</b> để nạp danh sách vận đơn e-Manifest.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const isExpanded = !!expandedRows[bill.id];
                  const hasErrors = bill.validation_errors && bill.validation_errors.length > 0;

                  return (
                    <React.Fragment key={bill.id}>
                      {/* Master House Bill Row */}
                      <tr
                        className={`hover:bg-blue-50/40 transition-colors ${
                          hasErrors ? 'bg-rose-50/30' : isExpanded ? 'bg-gray-50/60' : 'bg-white'
                        }`}
                      >
                        {/* Expand Trigger Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleRow(bill.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                            title={isExpanded ? 'Thu gọn chi tiết container' : 'Xem chi tiết container & hàng hóa'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>

                        {visibleColumns.stt && (
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 text-center">
                            {bill.stt}
                          </td>
                        )}

                        {visibleColumns.document_no && (
                          <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {bill.document_no}
                          </td>
                        )}

                        {visibleColumns.document_year && (
                          <td className="py-3 px-3 font-mono text-gray-500 text-center">
                            {bill.document_year}
                          </td>
                        )}

                        {visibleColumns.document_function && (
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-mono font-semibold">
                              {bill.document_function}
                            </span>
                          </td>
                        )}

                        {visibleColumns.hbl_number && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {bill.hbl_number}
                              </span>
                              {hasErrors && (
                                <span
                                  className="text-rose-500 cursor-pointer"
                                  title={`Cảnh báo: ${bill.validation_errors?.join('; ')}`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.hbl_date && (
                          <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {bill.hbl_date}
                          </td>
                        )}

                        {visibleColumns.mbl_number && (
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {bill.mbl_number}
                          </td>
                        )}

                        {visibleColumns.mbl_date && (
                          <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {bill.mbl_date}
                          </td>
                        )}

                        {visibleColumns.shipper && (
                          <td className="py-3 px-3 text-slate-700">
                            <div className="line-clamp-2 text-[11px] leading-tight font-medium" title={bill.shipper}>
                              {bill.shipper}
                            </div>
                          </td>
                        )}

                        {visibleColumns.consignee && (
                          <td className="py-3 px-3 text-slate-700">
                            <div className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-900" title={bill.consignee}>
                              {bill.consignee}
                            </div>
                          </td>
                        )}

                        {visibleColumns.notify_party_1 && (
                          <td className="py-3 px-3 text-gray-500">
                            <div className="line-clamp-1 text-[11px]" title={bill.notify_party_1}>
                              {bill.notify_party_1 || '—'}
                            </div>
                          </td>
                        )}

                        {visibleColumns.notify_party_2 && (
                          <td className="py-3 px-3 text-gray-500">
                            <div className="line-clamp-1 text-[11px]" title={bill.notify_party_2}>
                              {bill.notify_party_2 || '—'}
                            </div>
                          </td>
                        )}

                        {visibleColumns.port_loading_code && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-purple-700">
                            {bill.port_loading_code}
                          </td>
                        )}

                        {visibleColumns.port_unloading_code && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-indigo-700">
                            {bill.port_unloading_code}
                          </td>
                        )}

                        {visibleColumns.port_transhipment_code && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-gray-600">
                            {bill.port_transhipment_code || '—'}
                          </td>
                        )}

                        {visibleColumns.port_destination_code && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-blue-700">
                            {bill.port_destination_code}
                          </td>
                        )}

                        {visibleColumns.place_of_delivery && (
                          <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-800">
                            {bill.place_of_delivery}
                          </td>
                        )}

                        {visibleColumns.cargo_type && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                bill.cargo_type === 'CFS'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : bill.cargo_type === 'LCL'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {bill.cargo_type}
                            </span>
                          </td>
                        )}

                        {visibleColumns.departure_date && (
                          <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {bill.departure_date}
                          </td>
                        )}

                        {visibleColumns.package_quantity && (
                          <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">
                            {bill.package_quantity.toLocaleString('vi-VN')}
                          </td>
                        )}

                        {visibleColumns.package_type && (
                          <td className="py-3 px-3 font-mono text-gray-700 text-center">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-semibold">
                              {bill.package_type}
                            </span>
                          </td>
                        )}

                        {visibleColumns.total_gross_weight && (
                          <td className="py-3 px-3 font-mono font-bold text-right text-emerald-700 whitespace-nowrap">
                            {bill.total_gross_weight.toLocaleString('vi-VN')}
                          </td>
                        )}

                        {visibleColumns.gross_weight_unit && (
                          <td className="py-3 px-3 font-mono text-gray-600 font-semibold text-center">
                            {bill.gross_weight_unit}
                          </td>
                        )}

                        {visibleColumns.remark && (
                          <td className="py-3 px-3 text-gray-500">
                            <div className="line-clamp-1 text-[11px]" title={bill.remark}>
                              {bill.remark || '—'}
                            </div>
                          </td>
                        )}

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingBill(bill);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Chỉnh sửa thông tin vận đơn"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateRow(bill)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Nhân bản vận đơn này"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(bill.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Xóa vận đơn này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-Table Accordion: Container & Cargo Items */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-200">
                          <td colSpan={26} className="p-4 border-t border-b border-slate-800">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-amber-400" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                                    Chi tiết Container & Hàng hóa thuộc HBL: {bill.hbl_number}
                                  </span>
                                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                                    {bill.items.length} dòng hàng
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                  <span>
                                    Địa điểm giao: <b className="text-white">{bill.place_of_delivery}</b> • Mã cảng dỡ: <b className="text-white">{bill.port_unloading_code}</b>
                                  </span>
                                  <button
                                    onClick={() => exportHouseBillsToExcel([bill], `DANH_SACH_HBL_${bill.hbl_number || bill.stt}.xlsx`)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                                    title="Xuất riêng vận đơn này ra file Excel (.xlsx) chuẩn mẫu"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Xuất HBL này (.xlsx)</span>
                                  </button>
                                </div>
                              </div>

                              {/* Container Sub-Table matching attached template */}
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-900 text-gray-300 border-b border-slate-800 text-[11px]">
                                      <th className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
                                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mã hàng (HS code if avail)</th>
                                      <th className="py-2.5 px-3 font-semibold min-w-[320px]">Mô tả hàng hóa* (Description of Goods)</th>
                                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Tổng trọng lượng* (GW)</th>
                                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Kích thước/thể tích * (CBM)</th>
                                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-blue-400">Số hiệu cont (Cont. number)</th>
                                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-emerald-400">Số seal cont (Seal number)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/80 font-mono">
                                    {bill.items.map((item, iIdx) => (
                                      <tr key={item.id || iIdx} className="hover:bg-slate-900/60 transition-colors">
                                        <td className="py-2.5 px-3 text-center text-gray-500 font-sans">
                                          {iIdx + 1}
                                        </td>
                                        <td className="py-2.5 px-3 text-amber-300 font-bold whitespace-nowrap">
                                          {item.hs_code || '—'}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-200 font-sans text-xs">
                                          {item.goods_description}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-emerald-300 font-bold whitespace-nowrap">
                                          {item.gross_weight.toLocaleString('vi-VN')} {bill.gross_weight_unit}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-purple-300 whitespace-nowrap">
                                          {item.dimension_cbm ? `${item.dimension_cbm.toFixed(2)} m³` : '—'}
                                        </td>
                                        <td className="py-2.5 px-3 text-blue-400 font-bold whitespace-nowrap uppercase">
                                          {item.container_number || 'LCL / KHO CFS'}
                                        </td>
                                        <td className="py-2.5 px-3 text-emerald-400 font-bold whitespace-nowrap uppercase">
                                          {item.seal_number || '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Summary Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
          <div className="flex items-center gap-4">
            <span>
              Hiển thị <b>{filteredBills.length}</b> / <b>{bills.length}</b> vận đơn gom hàng
            </span>
            <span className="hidden sm:inline-block text-gray-300">•</span>
            <span className="hidden sm:inline-block">
              Tổng kiện: <b className="text-slate-800">{stats.totalPkgs.toLocaleString('vi-VN')}</b>
            </span>
            <span className="hidden sm:inline-block text-gray-300">•</span>
            <span className="hidden sm:inline-block">
              Tổng GW: <b className="text-emerald-700">{stats.totalWeightKgm.toLocaleString('vi-VN')} KGM</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Động cơ OCR:</span>
            <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[10px] font-bold">
              {ocrEngine}
            </span>
          </div>
        </div>
      </div>

      {/* House Bill Add / Edit Modal */}
      <HouseBillModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        onSave={handleSaveModal}
        initialBill={editingBill}
        totalBillsCount={bills.length}
      />
    </div>
  );
}
