import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { 
  fetchContractById, 
  upsertContract, 
  evaluateContractStatus, 
  CONTRACT_CATEGORIES, 
  DEFAULT_CONTRACT_TYPES, 
  SIGNING_METHODS 
} from '../lib/contractsService';
import { 
  uploadFileToDrive, 
  getAllDriveFolders, 
  DriveFolder, 
  getSelectedDriveFolder, 
  setSelectedDriveFolder, 
  getConnectedDriveAccount, 
  DriveAccountInfo,
  ACTIVE_GOOGLE_CLIENT_ID
} from '../lib/drive';
import { compressContractFile, CompressionResult } from '../lib/fileCompression';
import { processContractFileOCR, fileToBase64, isSPVEntity } from '../lib/ocrService';
import GoogleDriveFolderModal from '../components/GoogleDriveFolderModal';
import GoogleDriveAccountModal from '../components/GoogleDriveAccountModal';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  File as FileIcon, 
  HardDrive, 
  Loader2, 
  Folder, 
  Sparkles, 
  CheckCircle2, 
  ScanText, 
  FileCode, 
  FolderPlus, 
  UserCheck, 
  Settings,
  Building2,
  FileSignature,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { Contract, ContractCategory, ContractType, SigningMethod } from '../types';

export default function ContractForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Contract>>(() => {
    const prefill = (location.state as any)?.prefill;
    return {
      category: 'HĐ đầu ra',
      contract_type: 'HĐ đại lý hải quan',
      contract_number: prefill?.contract_number || '',
      title: prefill?.title || '',
      party_a: 'CÔNG TY TNHH SPV GROUP', // default
      party_b: prefill?.party_b || '',
      tax_code: prefill?.tax_code || '',
      signing_method: 'Ký điện tử',
      value: 0,
      sign_date: prefill?.sign_date || '',
      effective_date: prefill?.effective_date || '',
      expiration_date: prefill?.expiration_date || '',
      ocr_content: prefill?.ocr_content || '',
    };
  });

  const [customContractType, setCustomContractType] = useState('');
  const [isAddingNewType, setIsAddingNewType] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<CompressionResult | null>(null);
  const [targetDriveFolder, setTargetDriveFolder] = useState<DriveFolder>(() => getSelectedDriveFolder());
  const [driveAccount, setDriveAccount] = useState<DriveAccountInfo | null>(() => getConnectedDriveAccount());
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // OCR AI states
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);

  useEffect(() => {
    getAllDriveFolders().then(folders => {
      setDriveFolders(folders);
      const current = getSelectedDriveFolder();
      const matched = folders.find(f => f.id === current.id) || current;
      setTargetDriveFolder(matched);
    });

    if (isEdit && id) {
      loadContract(id);
    }
  }, [id, isEdit]);

  const loadContract = async (contractId: string) => {
    const existing = await fetchContractById(contractId);
    if (existing) {
      setFormData({
        id: existing.id,
        category: existing.category || 'HĐ đầu ra',
        contract_type: existing.contract_type || 'HĐ đại lý hải quan',
        contract_number: existing.contract_number || '',
        title: existing.title || '',
        party_a: existing.party_a || 'CÔNG TY TNHH SPV GROUP',
        party_b: existing.party_b || '',
        tax_code: existing.tax_code || '',
        signing_method: existing.signing_method || 'Ký điện tử',
        value: existing.value || 0,
        sign_date: existing.sign_date || '',
        effective_date: existing.effective_date || '',
        expiration_date: existing.expiration_date || '',
        manual_status: existing.manual_status || null,
        file_id: existing.file_id || null,
        ocr_content: existing.ocr_content || '',
      });

      if (!DEFAULT_CONTRACT_TYPES.includes(existing.contract_type)) {
        setIsAddingNewType(true);
        setCustomContractType(existing.contract_type);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'value' ? Number(value) : value }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsOcrProcessing(true);
      setOcrSuccess(false);
      setOcrProgressMsg('Bắt đầu đọc tệp đính kèm...');

      // 1. Prepare intact original file (No Ghostscript compression)
      try {
        const prep = await compressContractFile(selectedFile);
        setFile(prep.file);
        setFileInfo(prep);
      } catch (err) {
        console.warn("File prep notice:", err);
      }

      // 2. OCR & AI Data Extraction into Form Fields
      try {
        const extracted = await processContractFileOCR(selectedFile, (pct, msg) => {
          setOcrProgressMsg(`[${pct}%] ${msg}`);
        });

        if (extracted) {
          // Extract tax code if present in OCR text (excluding SPV tax code)
          let extractedTaxCode = extracted.party_b_tax || '';
          if (!extractedTaxCode) {
            const taxMatches = extracted.ocr_content?.matchAll(/(?:Mã số thuế|MST|Tax Code)\s*[:.-]?\s*([0-9]{10}(?:-[0-9]{3})?)/gi);
            if (taxMatches) {
              for (const tm of taxMatches) {
                if (tm[1] !== '0101234567') {
                  extractedTaxCode = tm[1];
                  break;
                }
              }
            }
          }

          let partnerName = extracted.party_b;
          if (isSPVEntity(partnerName)) {
            partnerName = '';
          }

          setFormData(prev => ({
            ...prev,
            contract_number: extracted.contract_number || prev.contract_number,
            title: extracted.title || prev.title,
            party_a: 'CÔNG TY TNHH SPV GROUP',
            party_b: partnerName || prev.party_b,
            tax_code: extractedTaxCode || prev.tax_code,
            value: extracted.value || prev.value,
            sign_date: extracted.sign_date || prev.sign_date,
            effective_date: extracted.effective_date || prev.effective_date,
            expiration_date: extracted.expiration_date || prev.expiration_date,
            ocr_content: extracted.ocr_content || prev.ocr_content,
          }));
          setOcrSuccess(true);
        }
      } catch (ocrErr) {
        console.error("OCR Extraction Error:", ocrErr);
      } finally {
        setIsOcrProcessing(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let file_id = formData.file_id;
      let file_url = formData.file_url;
      let file_name = formData.file_name;
      let file_type = formData.file_type;

      if (file) {
        try {
          file_url = await fileToBase64(file);
          file_name = file.name;
          file_type = file.type || 'application/pdf';
        } catch (e) {
          console.warn("Error converting file to base64:", e);
        }

        const driveResult = await uploadFileToDrive(file, file.name, file.type || 'application/pdf', undefined, targetDriveFolder);
        file_id = driveResult.id;
      }

      const finalContractType = isAddingNewType && customContractType.trim() 
        ? customContractType.trim() 
        : (formData.contract_type || 'HĐ đại lý hải quan');

      // Auto-generate contract title cleanly
      const autoTitle = formData.title?.trim() 
        || `${finalContractType} - ${formData.party_b || formData.contract_number || 'SPV'}`;

      await upsertContract({
        ...formData,
        contract_type: finalContractType,
        title: autoTitle,
        file_id: file_id || null,
        file_url: file_url || null,
        file_name: file_name || null,
        file_type: file_type || null,
      });

      navigate('/contracts');
    } catch (err) {
      console.error("Error saving contract:", err);
    } finally {
      setLoading(false);
    }
  };

  // Preview auto-calculated status
  const currentCalculatedStatus = evaluateContractStatus(formData);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/contracts" className="p-2 rounded-xl hover:bg-gray-200/60 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isEdit ? 'Chỉnh sửa Hợp đồng' : 'Thêm Hợp Đồng Mới'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Nhập đầy đủ thông tin pháp lý theo định dạng cột chuẩn. Trạng thái hiệu lực sẽ được tự động tính toán.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-6 space-y-6">

          {/* OCR AI Live Alert Notification */}
          {ocrSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    Trích xuất dữ liệu Baidu Unlimited-OCR thành công!
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-mono rounded font-semibold">Unlimited-OCR</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    AI đã phân tích văn bản và tự động điền: <b>Mã HĐ</b> ({formData.contract_number}), <b>Tên HĐ</b>, <b>Bên B</b> ({formData.party_b}), <b>Mã số thuế</b> ({formData.tax_code || 'Chưa nhận diện'}), <b>Giá trị</b>, và <b>Thời hạn hiệu lực</b>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOcrText(!showOcrText)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 shadow-2xs transition-colors flex items-center gap-1"
              >
                <ScanText className="w-3.5 h-3.5" />
                <span>{showOcrText ? 'Ẩn văn bản OCR' : 'Xem văn bản OCR'}</span>
              </button>
            </div>
          )}

          {/* Raw OCR Text Box Toggle */}
          {showOcrText && (
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-2 border border-slate-800 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" />
                  Văn bản trích xuất thô (OCR Content)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{formData.ocr_content?.length || 0} ký tự</span>
              </div>
              <textarea
                name="ocr_content"
                value={formData.ocr_content || ''}
                onChange={handleChange}
                rows={6}
                className="w-full bg-slate-950 text-slate-300 font-mono text-xs p-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                placeholder="Nội dung văn bản hợp đồng đọc được qua OCR..."
              />
            </div>
          )}

          {/* SECTION 1: Phân Loại & Loại Hợp Đồng */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Phân loại & Thuộc tính Hợp đồng</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phân loại HĐ */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Phân loại Hợp đồng <span className="text-rose-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category || 'HĐ đầu ra'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-2xs"
                >
                  {CONTRACT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Loại HĐ */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Loại Hợp đồng <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewType(!isAddingNewType)}
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    {isAddingNewType ? 'Chọn từ danh mục mẫu' : '+ Nhập loại hợp đồng khác'}
                  </button>
                </div>

                {!isAddingNewType ? (
                  <select
                    name="contract_type"
                    value={formData.contract_type || 'HĐ đại lý hải quan'}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-2xs"
                  >
                    {DEFAULT_CONTRACT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: HĐ thuê kho bãi lạnh, HĐ dịch vụ kế toán..."
                    value={customContractType}
                    onChange={(e) => setCustomContractType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-400 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Thông Tin Pháp Lý & Đối Tác */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Số Hợp Đồng <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="contract_number" 
                required
                placeholder="VD: HD-2026-081"
                value={formData.contract_number} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-blue-700" 
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Khách Hàng / Nhà Cung Cấp <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="party_b" 
                required
                placeholder="Tên đầy đủ của doanh nghiệp khách hàng hoặc nhà cung cấp"
                value={formData.party_b} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold" 
              />
            </div>
          </div>

          {/* Đối tác & Mã số thuế & Hình thức ký */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Mã Số Thuế <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="tax_code" 
                required
                placeholder="VD: 0110012544"
                value={formData.tax_code || ''} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-semibold" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Hình Thức Ký <span className="text-rose-500">*</span>
              </label>
              <select 
                name="signing_method" 
                value={formData.signing_method || 'Ký điện tử'} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
              >
                {SIGNING_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 3: Thời Hạn & Trạng Thái Tự Động */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Thời hạn hiệu lực & Đánh giá trạng thái tự động</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Trạng thái tự động:</span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  currentCalculatedStatus === 'Đang áp dụng' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  currentCalculatedStatus === 'Hết hạn' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                  currentCalculatedStatus === 'Tạm dừng' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                  'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {currentCalculatedStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Ngày Ký
                </label>
                <input 
                  type="date" 
                  name="sign_date" 
                  value={formData.sign_date || ''} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Hiệu Lực HĐ (Ngày Bắt Đầu) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="effective_date" 
                  required
                  value={formData.effective_date || ''} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-medium" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Ngày Hết Hạn <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="expiration_date" 
                  required
                  value={formData.expiration_date || ''} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-medium" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Google Drive Storage & Unlimited-OCR File Upload */}
          <div className="space-y-3">
            {/* Drive Storage Destination Card */}
            <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-blue-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/80 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30 backdrop-blur-xs">
                    <HardDrive className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-blue-200">Nơi lưu trữ Google Drive tự động (OAuth2)</h4>
                    <p className="text-[11px] text-gray-300 flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tài khoản: <b className="text-white">{driveAccount?.email || 'giupnhau@spv.biz.vn'}</b></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-blue-100 rounded-lg text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-1.5 border border-white/10"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Cấu hình Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-300" />
                    <span>Quản lý & Chọn Thư Mục / Thư Mục Con</span>
                  </button>
                </div>
              </div>

              {/* Active Folder Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <Folder className="w-4 h-4 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-blue-200">Đường dẫn Google Drive:</span>
                      <span className="text-xs font-bold text-amber-300 font-mono bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/30 truncate">
                        {targetDriveFolder.path || targetDriveFolder.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Đổi thư mục...
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload Drop Area */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Tải file tài liệu đính kèm để trích xuất OCR AI (PDF, Ảnh, Word, Markdown, Text)</span>
                <span className="text-blue-600 font-semibold flex items-center gap-1 text-[10px]">
                  <HardDrive className="w-3 h-3" /> Lưu nguyên bản 100% vào Google Drive
                </span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-200 border-dashed hover:border-blue-500 bg-gray-50/40 hover:bg-blue-50/20 rounded-xl transition-all">
                <div className="space-y-2 text-center">
                  <Upload className="mx-auto h-10 w-10 text-blue-500" />
                  <div className="flex text-xs text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Chọn tệp Unlimited-OCR</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.md" />
                    </label>
                    <p className="pl-3 self-center text-gray-500 font-medium">hoặc kéo thả tập tin hợp đồng vào đây</p>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Sử dụng công nghệ <b>Baidu Unlimited-OCR (Hugging Face)</b>. Hỗ trợ tài liệu đa trang <b>PDF, PNG, JPG, Word (.docx), Markdown (.md), Text (.txt)</b>.
                  </p>

                  {isOcrProcessing && (
                    <div className="mt-3 flex items-center justify-center text-xs font-bold text-blue-800 bg-blue-100/80 py-2.5 px-4 rounded-xl border border-blue-200 inline-flex gap-2 shadow-2xs">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      <span>{ocrProgressMsg || 'Đang phân tích OCR AI và điền ô dữ liệu...'}</span>
                    </div>
                  )}

                  {!isOcrProcessing && fileInfo && (
                    <div className="mt-3 flex flex-col items-center justify-center text-xs font-semibold text-emerald-800 bg-emerald-50 py-2.5 px-4 rounded-xl border border-emerald-200 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold">{fileInfo.file.name}</span>
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-md uppercase tracking-wider font-mono">
                          {fileInfo.engine}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-emerald-700">
                        {fileInfo.message}
                      </p>
                    </div>
                  )}

                  {!isOcrProcessing && !fileInfo && file && (
                    <div className="mt-3 flex items-center justify-center text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200 inline-flex gap-2 shadow-2xs">
                      <FileIcon className="w-4 h-4 text-emerald-600" />
                      <span>Tệp đã chọn: <b>{file.name}</b></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={() => navigate('/contracts')}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            disabled={loading || isOcrProcessing}
            className="inline-flex justify-center items-center px-5 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            {loading ? 'Đang lưu...' : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Lưu Hợp Đồng
              </>
            )}
          </button>
        </div>
      </form>

      {/* Google Drive Folder Selector Modal */}
      <GoogleDriveFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        fileName={file?.name}
        onSelectFolder={async (selectedFolder) => {
          setTargetDriveFolder(selectedFolder);
          setSelectedDriveFolder(selectedFolder);
          const updated = await getAllDriveFolders();
          setDriveFolders(updated);
          setIsFolderModalOpen(false);
        }}
      />

      {/* Google Drive Account Manager Modal */}
      <GoogleDriveAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountChange={(updatedAcc) => {
          setDriveAccount(updatedAcc);
        }}
      />
    </div>
  );
}
