import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Printer,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  HardDrive,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Eye,
  Layers,
  Sparkles,
  FileCode,
  File,
  ShieldCheck
} from 'lucide-react';
import { Contract } from '../types';
import { ACTIVE_GOOGLE_DRIVE_EMAIL } from '../lib/drive';
import mammoth from 'mammoth';

interface ContractDocumentViewerProps {
  contract: Contract;
  onRunOCR?: () => void;
}

export default function ContractDocumentViewer({ contract, onRunOCR }: ContractDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'original' | 'gdrive' | 'digital' | 'ocr'>('original');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);

  const fileUrl = contract.file_url;
  const fileName = contract.file_name || `${contract.contract_number}.pdf`;
  const fileType = contract.file_type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

  // Compute Google Drive links
  const driveFileId = contract.file_id || (fileUrl && fileUrl.includes('/file/d/') ? fileUrl.split('/file/d/')[1]?.split('/')[0] : null);
  const driveDirectLink = driveFileId && !driveFileId.startsWith('mock-') && !driveFileId.startsWith('drive_')
    ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`
    : (fileUrl?.startsWith('http') ? fileUrl : `https://drive.google.com/drive/u/0/my-drive`);
  const drivePreviewLink = driveFileId && !driveFileId.startsWith('mock-') && !driveFileId.startsWith('drive_')
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null;

  const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf') || (fileUrl && fileUrl.startsWith('data:application/pdf'));
  const isImage = fileType.startsWith('image/') || (fileUrl && fileUrl.startsWith('data:image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
  const isDocx = fileType.includes('word') || fileType.includes('document') || fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
  const isText = fileType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md');
  const hasUploadedFile = !!fileUrl && fileUrl.length > 50;

  // Set default view mode based on file availability
  useEffect(() => {
    if (hasUploadedFile) {
      setViewMode('original');
    } else if (drivePreviewLink) {
      setViewMode('gdrive');
    } else {
      setViewMode('digital');
    }
  }, [contract.id, hasUploadedFile, drivePreviewLink]);

  // Parse docx if uploaded
  useEffect(() => {
    if (isDocx && fileUrl && fileUrl.startsWith('data:')) {
      setDocxLoading(true);
      try {
        const base64Data = fileUrl.split(',')[1];
        if (base64Data) {
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
            .then((result) => {
              setDocxHtml(result.value);
            })
            .catch((err) => {
              console.warn('Docx parse error:', err);
              setDocxHtml(null);
            })
            .finally(() => {
              setDocxLoading(false);
            });
        }
      } catch (e) {
        console.warn('Error converting docx:', e);
        setDocxLoading(false);
      }
    }
  }, [fileUrl, isDocx]);

  const handleDownloadOriginal = () => {
    if (!fileUrl) {
      // Fallback: download digital summary as text
      const content = `HỢP ĐỒNG: ${contract.title}\nSố: ${contract.contract_number}\nBên A: ${contract.party_a}\nBên B: ${contract.party_b}\nMST: ${contract.tax_code}\nHiệu lực: ${contract.effective_date || '-'} đến ${contract.expiration_date || '-'}\n\n${contract.ocr_content || ''}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contract_number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (isImage && fileUrl) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>${fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${fileUrl}" style="max-width:100%;" onload="window.print();window.close();"/></body></html>`);
        win.document.close();
      }
    } else {
      window.print();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'min-h-[640px]'
      }`}
    >
      {/* Top Main Toolbar */}
      <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'original'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tệp Gốc Đã Upload</span>
            {hasUploadedFile && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setViewMode('gdrive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'gdrive'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setViewMode('digital')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'digital'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bản Số Hóa Pháp Lý</span>
          </button>

          {contract.ocr_content && (
            <button
              onClick={() => setViewMode('ocr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'ocr'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Văn Bản OCR</span>
            </button>
          )}
        </div>

        {/* Right: Document Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'original' && (isImage || isPdf) && (
            <div className="flex items-center bg-slate-800 rounded-xl px-1.5 py-1 border border-slate-700/60 text-slate-300 text-xs gap-1">
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 25, 50))}
                className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono px-1 font-semibold text-[11px] min-w-[40px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 25, 250))}
                className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {isImage && (
                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors ml-1 border-l border-slate-700 pl-1.5"
                  title="Xoay 90 độ"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Download Original File Button */}
          <button
            onClick={handleDownloadOriginal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Tải tệp gốc về máy"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Tải về</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-colors"
            title="In tài liệu"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Open Google Drive in new tab */}
          {driveDirectLink && (
            <a
              href={driveDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl text-xs border border-slate-700 transition-colors flex items-center"
              title="Mở trên Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-colors"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Sub-header File Metadata Banner */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">
            {fileName}
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-slate-200/70 text-slate-700 font-mono rounded-md shrink-0">
            {isPdf ? 'PDF Document' : isImage ? 'Hình ảnh scan' : isDocx ? 'Microsoft Word' : 'Văn bản'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span className="flex items-center gap-1 text-slate-500">
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Lưu trữ:</span>
            <span className="font-medium text-slate-700 font-mono">{ACTIVE_GOOGLE_DRIVE_EMAIL}</span>
          </span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đã xác thực
          </span>
        </div>
      </div>

      {/* Document Viewer Body */}
      <div className="flex-1 bg-slate-100/90 p-4 flex flex-col items-center justify-center overflow-auto min-h-[520px]">
        {/* TAB 1: ORIGINAL UPLOADED FILE VIEW */}
        {viewMode === 'original' && (
          <div className="w-full h-full flex-1 flex flex-col items-center justify-center">
            {hasUploadedFile ? (
              <>
                {/* 1.1 PDF Viewer */}
                {isPdf && (
                  <div 
                    className="w-full h-full min-h-[580px] bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col transition-all"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    <object
                      data={`${fileUrl}#toolbar=1&navpanes=1&statusbar=1&view=FitH`}
                      type="application/pdf"
                      className="w-full flex-1 min-h-[580px] border-0"
                    >
                      <iframe
                        src={`${fileUrl}#toolbar=1&navpanes=1`}
                        title={fileName}
                        className="w-full flex-1 min-h-[580px] border-0"
                      />
                    </object>
                  </div>
                )}

                {/* 1.2 Image Viewer */}
                {isImage && (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                    <div 
                      className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 transition-transform duration-200"
                      style={{
                        transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center'
                      }}
                    >
                      <img
                        src={fileUrl!}
                        alt={fileName}
                        className="max-h-[650px] max-w-full object-contain rounded-lg shadow-2xs select-none"
                      />
                    </div>
                  </div>
                )}

                {/* 1.3 DOCX Viewer */}
                {isDocx && (
                  <div className="w-full max-w-3xl bg-white p-8 md:p-12 rounded-2xl shadow-md border border-slate-200 overflow-y-auto max-h-[650px]">
                    {docxLoading ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        Đang nạp và định dạng tài liệu Microsoft Word...
                      </div>
                    ) : docxHtml ? (
                      <div
                        className="prose prose-slate max-w-none text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: docxHtml }}
                      />
                    ) : (
                      <div className="text-center space-y-4 py-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                          <FileText className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{fileName}</h3>
                        <p className="text-xs text-slate-500">Tệp tài liệu Microsoft Word đã được lưu trữ an toàn.</p>
                        <button
                          onClick={handleDownloadOriginal}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải tệp Word về máy</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 1.4 Plain Text Viewer */}
                {isText && (
                  <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-md border border-slate-200 font-mono text-xs text-slate-800 max-h-[650px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {fileUrl}
                  </div>
                )}
              </>
            ) : (
              /* If no direct base64 file attached yet, show Google Drive direct card or digital presentation */
              <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <HardDrive className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {contract.file_name || contract.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tệp chứng từ đã được liên kết và đồng bộ hóa với tài khoản Google Drive <span className="font-semibold text-slate-700">{ACTIVE_GOOGLE_DRIVE_EMAIL}</span>.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  {driveDirectLink && (
                    <a
                      href={driveDirectLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Mở xem trên Google Drive</span>
                    </a>
                  )}

                  <button
                    onClick={() => setViewMode('digital')}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Xem Bản Số Hóa Pháp Lý</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GOOGLE DRIVE PREVIEW */}
        {viewMode === 'gdrive' && (
          <div className="w-full h-full min-h-[580px] flex flex-col items-center justify-center">
            {drivePreviewLink ? (
              <div className="w-full h-full min-h-[580px] bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
                <iframe
                  src={drivePreviewLink}
                  title="Google Drive Document Preview"
                  className="w-full flex-1 min-h-[580px] border-0"
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                  <HardDrive className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Google Drive Cloud Storage
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tài khoản: <span className="font-semibold text-slate-700">{ACTIVE_GOOGLE_DRIVE_EMAIL}</span>
                    <br />Mã tệp Google Drive: <span className="font-mono text-blue-600 font-bold">{contract.file_id || 'SPV-DRIVE-FILE'}</span>
                  </p>
                </div>

                <div className="pt-2">
                  <a
                    href={driveDirectLink || 'https://drive.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở trực tiếp trên Google Drive</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIGITAL LEGAL CONTRACT FORM */}
        {viewMode === 'digital' && (
          <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-200 text-slate-800 space-y-6 animate-in fade-in">
            {/* National Header */}
            <div className="text-center border-b pb-5 border-slate-200 space-y-1">
              <p className="font-bold uppercase text-slate-800 tracking-wider text-xs">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="font-bold text-xs text-slate-600 border-b border-slate-800 inline-block pb-0.5">
                Độc lập - Tự do - Hạnh phúc
              </p>
              <h2 className="text-lg font-black text-slate-900 mt-4 uppercase tracking-tight">
                {contract.title}
              </h2>
              <p className="font-mono text-xs text-blue-700 font-bold">
                Số: {contract.contract_number}
              </p>
            </div>

            {/* Parties Info Table */}
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 uppercase text-[11px] text-blue-800">
                  BÊN A (BÊN CUNG CẤP DỊCH VỤ):
                </div>
                <div className="font-bold text-slate-900">{contract.party_a || 'CÔNG TY TNHH SPV GROUP'}</div>
                <div className="text-slate-600">Mã số thuế: <span className="font-mono font-bold text-slate-800">0101234567</span></div>
                <div className="text-slate-600">Đại diện: <span className="font-medium text-slate-800">Ông Nguyễn Văn An</span> • Chức vụ: <span className="font-medium text-slate-800">Giám đốc</span></div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 uppercase text-[11px] text-indigo-800">
                  BÊN B (KHÁCH HÀNG / ĐỐI TÁC):
                </div>
                <div className="font-bold text-slate-900">{contract.party_b}</div>
                <div className="text-slate-600">Mã số thuế: <span className="font-mono font-bold text-slate-800">{contract.tax_code || 'Chưa cung cấp'}</span></div>
                <div className="text-slate-600">Phân loại: <span className="font-medium text-slate-800">{contract.category}</span> • Loại hợp đồng: <span className="font-medium text-slate-800">{contract.contract_type}</span></div>
              </div>

              {/* Terms & Dates */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ngày Ký</span>
                  <span className="font-mono font-bold text-slate-800">{contract.sign_date || '-'}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hiệu Lực Từ</span>
                  <span className="font-mono font-bold text-emerald-700">{contract.effective_date || '-'}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ngày Hết Hạn</span>
                  <span className="font-mono font-bold text-rose-700">{contract.expiration_date || 'Vô thời hạn'}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hình Thức Ký</span>
                  <span className="font-semibold text-slate-800">{contract.signing_method || 'Ký điện tử'}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs uppercase">ĐẠI DIỆN BÊN A</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
                  <div className="pt-8">
                    <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-lg font-mono text-[10px] font-bold">
                      ✓ Đã ký điện tử SPV Group
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs uppercase">ĐẠI DIỆN BÊN B</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
                  <div className="pt-8">
                    <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg font-mono text-[10px] font-bold">
                      ✓ {contract.party_b}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OCR RAW CONTENT VIEW */}
        {viewMode === 'ocr' && contract.ocr_content && (
          <div className="w-full max-w-3xl bg-slate-900 text-emerald-400 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 font-mono text-xs overflow-y-auto max-h-[650px] leading-relaxed whitespace-pre-wrap">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-[11px] mb-4">
              <span>Toàn văn nhận dạng quang học OCR</span>
              <span>Động cơ: {contract.ocr_engine || 'Chuyên gia OCR AI'}</span>
            </div>
            {contract.ocr_content}
          </div>
        )}
      </div>
    </div>
  );
}
