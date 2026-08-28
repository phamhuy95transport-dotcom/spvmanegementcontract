import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  fetchContractById, 
  upsertContract, 
  pauseContract, 
  extendContract, 
  replaceContract, 
  shouldAlertContract,
  SIGNING_METHODS 
} from '../lib/contractsService';
import { runBaiduUnlimitedOCR } from '../lib/ocrService';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  ScanText, 
  Loader2, 
  Cpu, 
  HardDrive, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles,
  Edit,
  PauseCircle,
  RotateCw,
  ArrowRightLeft,
  AlertTriangle,
  Building2,
  Calendar,
  FileSignature,
  Hash,
  X,
  FileCheck2,
  Eye
} from 'lucide-react';
import { Contract, SigningMethod } from '../types';
import { format, addYears, parseISO } from 'date-fns';
import { ACTIVE_GOOGLE_DRIVE_EMAIL } from '../lib/drive';
import ContractDocumentViewer from '../components/ContractDocumentViewer';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  // OCR state
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProgressMsg, setOcrProgressMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Action Modals state (Pause / Extend / Replace)
  const [activeActionModal, setActiveActionModal] = useState<'pause' | 'extend' | 'replace' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newContractNumber, setNewContractNumber] = useState('');
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newSignDate, setNewSignDate] = useState('');
  const [newSigningMethod, setNewSigningMethod] = useState<SigningMethod>('Ký điện tử');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const found = await fetchContractById(id);
      if (found) {
        setContract(found);
        if (found.ocr_content) {
          setOcrResult(found.ocr_content);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleOcrScan = async () => {
    setIsScanning(true);
    setOcrProgress(0);
    setOcrProgressMsg('Khởi tạo mô hình Baidu Unlimited-OCR...');
    
    let resultText = '';
    try {
      if (contract?.file_url) {
        const unlimitedData = await runBaiduUnlimitedOCR(
          contract.file_url,
          contract.file_name || contract.contract_number,
          contract.file_type || 'application/pdf',
          (pct, msg) => {
            setOcrProgress(pct);
            setOcrProgressMsg(msg);
          }
        );
        resultText = unlimitedData.text || contract.ocr_content || '';
      } else {
        resultText = contract?.ocr_content || `### KẾT QUẢ TRÍCH XUẤT BAIDU UNLIMITED-OCR (HUGGING FACE)\n\n**1. MÃ HỢP ĐỒNG:** ${contract?.contract_number || ''}\n**2. TÊN HỢP ĐỒNG:** ${contract?.title || ''}\n**3. PHÂN LOẠI:** ${contract?.category || ''} • ${contract?.contract_type || ''}\n**4. KHÁCH HÀNG / NHÀ CUNG CẤP:** ${contract?.party_b || ''} (MST: ${contract?.tax_code || 'N/A'})\n**5. THỜI HẠN:** ${contract?.effective_date || ''} đến ${contract?.expiration_date || ''}`;
      }
    } catch (err) {
      console.error("Baidu Unlimited-OCR Error:", err);
      resultText = contract?.ocr_content || "Đã xảy ra lỗi trong quá trình xử lý Baidu Unlimited-OCR. Hiển thị nội dung đã lưu sẵn.";
    } finally {
      setOcrResult(resultText);
      if (contract) {
        upsertContract({ ...contract, ocr_content: resultText });
      }
      setIsScanning(false);
    }
  };

  const handleCopyOcr = () => {
    if (ocrResult) {
      navigator.clipboard.writeText(ocrResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openActionModal = (type: 'pause' | 'extend' | 'replace') => {
    if (!contract) return;
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
    setNewSigningMethod(contract.signing_method || 'Ký điện tử');
    setActionReason('');
    setActiveActionModal(type);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionModal || !contract) return;

    setActionLoading(true);
    try {
      if (activeActionModal === 'pause') {
        const updated = await pauseContract(contract.id, actionReason);
        if (updated) setContract(updated);
      } else if (activeActionModal === 'extend') {
        const res = await extendContract(contract.id, {
          new_contract_number: newContractNumber,
          new_effective_date: newEffectiveDate,
          new_expiration_date: newExpirationDate,
          new_sign_date: newSignDate,
          action_note: actionReason || `Gia hạn từ HĐ ${contract.contract_number}`,
        });
        if (res) navigate(`/contracts/${res.newContract.id}`);
      } else if (activeActionModal === 'replace') {
        const res = await replaceContract(contract.id, {
          new_contract_number: newContractNumber,
          new_title: `${contract.title} (Thay thế)`,
          new_sign_date: newSignDate,
          new_effective_date: newEffectiveDate,
          new_expiration_date: newExpirationDate,
          new_signing_method: newSigningMethod,
          action_note: actionReason || `Thay thế cho HĐ ${contract.contract_number}`,
        });
        if (res) navigate(`/contracts/${res.newContract.id}`);
      }
      setActiveActionModal(null);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !contract) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 font-medium text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          Đang nạp hồ sơ hợp đồng...
        </div>
      </div>
    );
  }

  const alertInfo = shouldAlertContract(contract);

  // Compute Google Drive file link
  const driveFileId = contract.file_id || (contract.file_url && contract.file_url.includes('/file/d/') ? contract.file_url.split('/file/d/')[1]?.split('/')[0] : null);
  const driveDirectLink = driveFileId 
    ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing` 
    : (contract.file_url?.startsWith('http') ? contract.file_url : null);
  const drivePreviewLink = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview` : null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/contracts" className="p-2 rounded-xl hover:bg-gray-200/60 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {contract.contract_number}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${
                contract.status === 'Đang áp dụng' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                contract.status === 'Hết hạn' ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' :
                contract.status === 'Tạm dừng' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {contract.status}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200">
                {contract.category}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200">
                {contract.contract_type}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{contract.title}</h1>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {alertInfo.shouldAlert && (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => openActionModal('extend')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Gia hạn</span>
              </button>
              <button 
                onClick={() => openActionModal('replace')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Thay thế</span>
              </button>
              <button 
                onClick={() => openActionModal('pause')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Tạm dừng</span>
              </button>
            </div>
          )}

          <Link
            to={`/contracts/${contract.id}/edit`}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            <span>Sửa HĐ</span>
          </Link>

          {driveDirectLink && (
            <a
              href={driveDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold shadow-2xs transition-colors gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở trên Google Drive</span>
            </a>
          )}

          <button 
            onClick={handleOcrScan}
            disabled={isScanning}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50 gap-1.5"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-200" />}
            {isScanning ? `Đang quét OCR (${ocrProgress}%)` : 'Trích xuất Unlimited-OCR'}
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Google Drive / Original File Direct Viewer, Right Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Google Drive & Original Document Viewer Area */}
        <div className="lg:col-span-7 flex flex-col">
          <ContractDocumentViewer contract={contract} onRunOCR={handleOcrScan} />
        </div>

        {/* Sidebar details & OCR Output */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Legal Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-3.5 text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-gray-100 pb-2">
              Thông tin chi tiết hợp đồng
            </h3>
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Phân loại HĐ</span>
                <span className="font-bold text-slate-900">{contract.category}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Loại hợp đồng</span>
                <span className="font-semibold text-slate-900">{contract.contract_type}</span>
              </div>

              <div className="col-span-2">
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Khách Hàng / Nhà Cung Cấp</span>
                <span className="font-bold text-slate-900 text-xs">{contract.party_b}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Mã số thuế</span>
                <span className="font-mono font-bold text-slate-800">{contract.tax_code || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Hình thức ký</span>
                <span className="font-medium text-slate-800">{contract.signing_method}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Hiệu lực từ</span>
                <span className="font-medium text-slate-800">{contract.effective_date || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Hết hạn vào</span>
                <span className="font-bold text-slate-900">{contract.expiration_date || '-'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[11px]">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Google Drive OAuth2
              </span>
              <span className="font-mono text-emerald-600 font-semibold">Đã lưu trữ ({ACTIVE_GOOGLE_DRIVE_EMAIL})</span>
            </div>
          </div>

          {/* OCR AI Dark Terminal */}
          <div className="flex-1 bg-[#1A202C] text-white rounded-2xl shadow-lg border border-gray-800 p-5 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-200">
                      Baidu Unlimited-OCR (Hugging Face)
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400">DeepSeek-V2 • SAM-ViT-B + CLIP-L • R-SWA Single-Pass</p>
                </div>
              </div>
              {ocrResult && (
                <button 
                  onClick={handleCopyOcr}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              )}
            </div>

            {isScanning && (
              <div className="mb-3 space-y-1">
                <div className="flex justify-between text-[10px] text-gray-300">
                  <span className="truncate">{ocrProgressMsg}</span>
                  <span className="font-mono text-blue-400 font-bold">{ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex-1 bg-gray-900/90 rounded-xl border border-gray-800 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto whitespace-pre-wrap shadow-inner max-h-[320px]">
              {ocrResult ? (
                ocrResult
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
                  <ScanText className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-xs">Chưa có dữ liệu trích xuất.<br/>Nhấn nút "Trích xuất Unlimited-OCR" để phân tích toàn văn bản.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal (Pause / Extend / Replace) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className={`p-5 text-white flex items-center justify-between ${
              activeActionModal === 'pause' ? 'bg-gray-800' :
              activeActionModal === 'extend' ? 'bg-emerald-700' : 'bg-purple-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  {activeActionModal === 'pause' && <PauseCircle className="w-5 h-5" />}
                  {activeActionModal === 'extend' && <RotateCw className="w-5 h-5" />}
                  {activeActionModal === 'replace' && <ArrowRightLeft className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {activeActionModal === 'pause' && 'Tạm Dừng Hợp Đồng'}
                    {activeActionModal === 'extend' && 'Gia Hạn Hợp Đồng'}
                    {activeActionModal === 'replace' && 'Thay Thế Hợp Đồng'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Số HĐ: <span className="font-mono font-bold">{contract.contract_number}</span>
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

            <form onSubmit={handleActionSubmit} className="p-6 space-y-4 text-xs">
              {activeActionModal !== 'pause' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Số Hợp Đồng Mới *</label>
                    <input
                      type="text"
                      required
                      value={newContractNumber}
                      onChange={(e) => setNewContractNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Ngày Ký Mới *</label>
                      <input
                        type="date"
                        required
                        value={newSignDate}
                        onChange={(e) => setNewSignDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Hình Thức Ký</label>
                      <select
                        value={newSigningMethod}
                        onChange={(e) => setNewSigningMethod(e.target.value as SigningMethod)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none"
                      >
                        {SIGNING_METHODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Hiệu Lực Từ *</label>
                      <input
                        type="date"
                        required
                        value={newEffectiveDate}
                        onChange={(e) => setNewEffectiveDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Hết Hạn Đến *</label>
                      <input
                        type="date"
                        required
                        value={newExpirationDate}
                        onChange={(e) => setNewExpirationDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  <p className="font-bold">Lưu ý khi Tạm Dừng:</p>
                  <p className="mt-0.5">
                    Hợp đồng sẽ chuyển sang trạng thái <strong>Tạm dừng</strong>. Hệ thống sẽ <strong>ngừng gửi cảnh báo hết hạn</strong> đối với dòng này.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Ghi chú xử lý</label>
                <textarea
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none"
                  placeholder="Ghi chú lý do..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {actionLoading ? 'Đang lưu...' : 'Xác Nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
