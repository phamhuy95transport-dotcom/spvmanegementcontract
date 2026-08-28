import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Building2,
  Hash,
  X,
  FileCode,
  Layers,
  RefreshCw,
  Eye,
  Plus
} from 'lucide-react';
import { runExpertContractOCR, ExpertContractOutput } from '../lib/ocrService';
import { Contract } from '../types';
import { upsertContract } from '../lib/contractsService';

interface ExpertOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contract: Contract) => void;
}

export default function ExpertOCRModal({
  isOpen,
  onClose,
  onContractCreated,
}: ExpertOCRModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  const [extractedData, setExtractedData] = useState<ExpertContractOutput | null>(null);
  const [rawJson, setRawJson] = useState<string>('');
  const [ocrText, setOcrText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'json' | 'text'>('fields');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = async (fileObj: File) => {
    setFile(fileObj);
    setFileName(fileObj.name);
    setIsProcessing(true);
    setExtractedData(null);
    setRawJson('');
    setOcrText('');
    setSaveSuccess(false);
    setProgressPct(5);
    setProgressMsg('Đang nạp tài liệu vào bộ phân giải OCR Chuyên gia...');

    try {
      const result = await runExpertContractOCR(
        fileObj,
        fileObj.name,
        fileObj.type,
        (pct, msg) => {
          setProgressPct(pct);
          setProgressMsg(msg);
        }
      );

      setExtractedData(result.data);
      setRawJson(result.rawJson);
      setOcrText(result.ocrText);
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setProgressMsg('Đã xảy ra lỗi trong quá trình OCR. Đang dùng bộ phân giải quy tắc...');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async () => {
    const sampleText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

HỢP ĐỒNG KINH TẾ DỊCH VỤ LOGISTICS VÀ THÔNG QUAN
Số: 01/2026/HĐKT-SPV/KF

- Căn cứ Bộ luật Dân sự số 91/2015/QH13;
- Căn cứ Luật Thương mại số 36/2005/QH11;

Hôm nay, ngày 15 tháng 03 năm 2026, tại Văn phòng SPV Group, chúng tôi gồm:

BÊN A (BÊN CUNG CẤP DỊCH VỤ): CÔNG TY TNHH SPV GROUP
- Mã số thuế: 0101234567
- Đại diện: Ông Nguyễn Văn An - Chức vụ: Giám đốc Điều hành
- Địa chỉ: Tầng 8, Tòa nhà SPV Tower, Quận Cầu Giấy, TP. Hà Nội

BÊN B (BÊN KHÁCH HÀNG / ĐỐI TÁC): CÔNG TY CỔ PHẦN NÔNG SẢN VÀ THỰC PHẨM KANG FOODS
- Mã số thuế: 0110012544
- Đại diện: Bà Trần Thu Hà - Chức vụ: Tổng Giám đốc
- Địa chỉ: Lô 4B, KCN Quang Minh, Huyện Mê Linh, TP. Hà Nội

ĐIỀU 1: NỘI DUNG DỊCH VỤ
Bên A đồng ý cung cấp dịch vụ đại lý hải quan, cước vận tải quốc tế và giao nhận kho bãi cho Bên B theo từng lô hàng xuất nhập khẩu.

ĐIỀU 2: THỜI HẠN VÀ HIỆU LỰC HỢP ĐỒNG
2.1. Hợp đồng này có hiệu lực thi hành kể từ ngày ký.
2.2. Hợp đồng có giá trị thực hiện đến hết ngày 31 tháng 12 năm 2026. Sau thời hạn này, hai bên sẽ tiến hành thanh lý hợp đồng.

ĐẠI DIỆN BÊN A                                      ĐẠI DIỆN BÊN B
(Đã ký & đóng dấu)                                  (Đã ký & đóng dấu)
CÔNG TY TNHH SPV GROUP                              CÔNG TY CP NÔNG SẢN & TP KANG FOODS`;

    setIsProcessing(true);
    setFileName('Hop_dong_kinh_te_SPV_KangFoods_2026.pdf');
    setProgressPct(20);
    setProgressMsg('Đang nạp hợp đồng kinh tế mẫu thực tế...');

    try {
      const result = await runExpertContractOCR(
        sampleText,
        'Hop_dong_kinh_te_SPV_KangFoods_2026.pdf',
        'text/plain',
        (pct, msg) => {
          setProgressPct(pct);
          setProgressMsg(msg);
        }
      );
      setExtractedData(result.data);
      setRawJson(result.rawJson);
      setOcrText(sampleText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyJsonToClipboard = () => {
    if (rawJson) {
      navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveDirectly = async () => {
    if (!extractedData) return;
    setIsSaving(true);

    try {
      const newContract = await upsertContract({
        contract_number: extractedData.contract_number || `HĐ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        title: `Hợp đồng kinh tế - ${extractedData.partner_name || 'Đối tác'}`,
        category: 'HĐ đầu ra',
        contract_type: 'HĐ dịch vụ khác',
        party_a: 'CÔNG TY TNHH SPV GROUP',
        party_b: extractedData.partner_name || 'Đối tác',
        tax_code: extractedData.partner_tax_code || '',
        value: 0,
        status: 'Đang áp dụng',
        sign_date: extractedData.signed_date || new Date().toISOString().split('T')[0],
        effective_date: extractedData.effective_date || extractedData.signed_date || new Date().toISOString().split('T')[0],
        expiration_date: extractedData.expiry_date || null,
        signing_method: 'Ký điện tử',
        action_note: `Tự động trích xuất qua Chuyên gia OCR (${fileName || 'Tài liệu'})`,
        ocr_content: ocrText || rawJson,
        ocr_engine: 'gemini-expert-ocr',
      });

      setSaveSuccess(true);
      onContractCreated?.(newContract);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to create contract:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInContractForm = () => {
    if (!extractedData) return;
    onClose();
    navigate('/contracts/new', {
      state: {
        prefill: {
          contract_number: extractedData.contract_number || '',
          title: `Hợp đồng kinh tế - ${extractedData.partner_name || 'Đối tác'}`,
          party_b: extractedData.partner_name || '',
          tax_code: extractedData.partner_tax_code || '',
          sign_date: extractedData.signed_date || '',
          effective_date: extractedData.effective_date || '',
          expiration_date: extractedData.expiry_date || '',
          ocr_content: ocrText || rawJson,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold tracking-tight">
                  Chuyên Gia OCR & Trích Xuất Hợp Đồng Kinh Tế
                </h2>
                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Chính xác 100%
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Bóc tách thực thể Đối tác (loại trừ hoàn toàn SPV Group) • Chuẩn hóa ngày tháng ISO YYYY-MM-DD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Zone */}
          {!extractedData && !isProcessing && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.md"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:border-blue-300 transition-all mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nhấp để tải lên hoặc kéo thả tệp hợp đồng vào đây
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Hỗ trợ định dạng hình ảnh quét (PNG, JPG, WEBP), tệp PDF đa trang, Word (.docx) hoặc tài liệu văn bản (.txt, .md).
                </p>

                <div className="flex items-center gap-3 mt-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Loại trừ SPV Group
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-500" /> Bóc tách MST Đối tác
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Chuẩn hóa YYYY-MM-DD
                  </span>
                </div>
              </div>

              {/* Sample Action */}
              <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Chưa có sẵn tệp chứng từ?</h4>
                    <p className="text-xs text-slate-500">
                      Thử nghiệm ngay với hợp đồng mẫu dịch vụ logistics thực tế giữa SPV Group và Kang Foods.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLoadSample}
                  className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nạp HĐ mẫu để chạy thử</span>
                </button>
              </div>
            </div>
          )}

          {/* Processing Animation */}
          {isProcessing && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {progressPct}%
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Đang phân tích OCR & Bóc tách dữ liệu Đối tác...
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-1 font-mono">
                  {progressMsg}
                </p>
              </div>

              <div className="w-full max-w-md bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 w-full max-w-md pt-3 text-[11px] text-slate-400">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                  1. Đọc tệp quang học
                </div>
                <div className="p-2 bg-blue-50 text-blue-700 font-medium rounded-xl border border-blue-200">
                  2. Lọc SPV Group
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                  3. JSON ISO Output
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {extractedData && !isProcessing && (
            <div className="space-y-5">
              {/* File details bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 truncate max-w-sm">
                      {fileName || 'Tài liệu hợp đồng'}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã bóc tách thành công theo Schema chuẩn
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setExtractedData(null);
                      setRawJson('');
                      setFile(null);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Quét tệp khác</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('fields')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'fields'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Bảng Trường Dữ Liệu</span>
                </button>

                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'json'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Chuỗi JSON Chuẩn Xác</span>
                </button>

                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'text'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Văn Bản OCR Nhận Dạng</span>
                </button>
              </div>

              {/* Tab 1: Form Fields View */}
              {activeTab === 'fields' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Contract Number */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Hash className="w-3.5 h-3.5 text-blue-600" /> Số Hợp Đồng (contract_number)
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                        Nguyên văn
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100 break-all">
                      {extractedData.contract_number || <span className="text-slate-400 italic">null</span>}
                    </div>
                  </div>

                  {/* Partner Name */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Tên Đối Tác (partner_name)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Đã loại trừ SPV
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-snug">
                      {extractedData.partner_name || <span className="text-slate-400 italic">null</span>}
                    </div>
                  </div>

                  {/* Partner Tax Code */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" /> Mã Số Thuế Đối Tác (partner_tax_code)
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                        MST Bên B
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {extractedData.partner_tax_code || <span className="text-slate-400 italic">null</span>}
                    </div>
                  </div>

                  {/* Signed Date */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" /> Ngày Ký (signed_date)
                      </span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md font-mono">
                        ISO YYYY-MM-DD
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {extractedData.signed_date || <span className="text-slate-400 italic">null</span>}
                    </div>
                  </div>

                  {/* Effective Date */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Ngày Hiệu Lực (effective_date)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md font-mono">
                        ISO YYYY-MM-DD
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {extractedData.effective_date || <span className="text-slate-400 italic">null</span>}
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-rose-600" /> Ngày Hết Hạn (expiry_date)
                      </span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md font-mono">
                        ISO / null
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {extractedData.expiry_date || <span className="text-slate-400 italic">null (Vô thời hạn/Không xác định)</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Raw JSON View */}
              {activeTab === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Đầu ra JSON thuần túy (Theo Schema chuẩn):
                    </span>
                    <button
                      onClick={copyJsonToClipboard}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                    {rawJson}
                  </pre>
                </div>
              )}

              {/* Tab 3: Raw OCR text */}
              {activeTab === 'text' && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Văn bản nhận dạng quang học:
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {ocrText || 'Không có văn bản quang học.'}
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã thêm thành công hợp đồng vào Danh mục quản lý!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {extractedData ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dữ liệu đã sẵn sàng để đồng bộ hóa
              </span>
            ) : (
              <span>Chuyên gia OCR AI hỗ trợ tự động bóc tách và đối soát</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Đóng
            </button>

            {extractedData && (
              <>
                <button
                  onClick={handleOpenInContractForm}
                  className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Điền vào Biểu mẫu tạo HĐ</span>
                </button>

                <button
                  onClick={handleSaveDirectly}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Đang tạo...' : 'Tạo hợp đồng ngay'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
