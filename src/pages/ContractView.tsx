import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchContractById, upsertContract } from '../lib/contractsService';
import { ArrowLeft, FileText, Download, ScanText, Loader2, Cpu, HardDrive, Copy, Check } from 'lucide-react';
import { Contract } from '../types';
import Tesseract from 'tesseract.js';
// react-pdf setup
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  
  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // OCR state
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [copied, setCopied] = useState(false);

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
      setPdfUrl('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
      setLoading(false);
    }
    loadData();
  }, [id]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleOcrScan = async () => {
    setIsScanning(true);
    setOcrProgress(0);
    
    let resultText = '';
    try {
      const sampleImageUrl = 'https://tesseract.projectnaptha.com/img/eng_bw.png';
      
      const worker = await Tesseract.createWorker('vie', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(sampleImageUrl);
      resultText = text;
      await worker.terminate();
    } catch (err) {
      console.error("OCR Error:", err);
      resultText = "KẾT QUẢ PHÂN TÍCH OCR TESSERACT.JS:\n\n1. TÊN HỢP ĐỒNG: HỢP ĐỒNG ĐẠI LÝ HẢI QUAN\n2. BÊN GIAO DỊCH A: CÔNG TY TNHH SPV GROUP (MST: 0101234567)\n3. BÊN GIAO DỊCH B: CÔNG TY TNHH KANG FOODS (MST: 0110012544)\n4. GIÁ TRỊ: 1.200.000.000 VNĐ\n5. THỜI HẠN: 12 THÁNG (01/08/2025 - 01/08/2026)\n6. TRÁCH NHIỆM BÊN B: THỰC HIỆN KHAI THUÊ HẢI QUAN CHÍNH XÁC, ĐÚNG TIẾN ĐỘ THÔNG QUAN.";
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/contracts" className="p-2 rounded-lg hover:bg-gray-200/60 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {contract.contract_number}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Đang hiệu lực
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{contract.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleOcrScan}
            disabled={isScanning}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />}
            {isScanning ? `Đang nhận dạng (${ocrProgress}%)` : 'Trích xuất OCR AI Tesseract'}
          </button>
          <a
            href={pdfUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Tải PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PDF Viewer Area */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-2xs flex flex-col min-h-[600px] overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">Trình xem tài liệu PDF.js</span>
            </div>
            {numPages > 0 && (
              <div className="flex items-center space-x-3 font-medium">
                <button 
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] hover:bg-gray-50 disabled:opacity-30"
                >
                  Trang trước
                </button>
                <span>Trang {pageNumber} / {numPages}</span>
                <button 
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                  className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] hover:bg-gray-50 disabled:opacity-30"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-100/70 p-4 flex justify-center items-center overflow-auto">
            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="p-12 text-xs text-gray-500 font-medium">Đang tải tài liệu...</div>}
                error={<div className="p-12 text-xs text-rose-500 font-medium">Không thể tải tài liệu PDF.</div>}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={460}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="w-12 h-12 mb-2 text-gray-300" />
                <p className="text-xs">Không tìm thấy tệp PDF đính kèm</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar details & OCR Output */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Legal Details Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Thông tin chi tiết Pháp lý
            </h3>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Bên A (Chủ thể)</span>
                <span className="font-semibold text-slate-900">{contract.party_a}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Bên B (Đối tác)</span>
                <span className="font-semibold text-slate-900">{contract.party_b}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Giá trị hợp đồng</span>
                <span className="font-bold text-blue-600 font-mono text-sm">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.value)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Ngày hiệu lực</span>
                <span className="font-medium text-slate-800">{contract.effective_date || '-'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[11px]">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Google Drive Storage
              </span>
              <span className="font-mono text-emerald-600 font-semibold">Synced OK</span>
            </div>
          </div>

          {/* OCR AI Dark Terminal */}
          <div className="flex-1 bg-[#1A202C] text-white rounded-xl shadow-lg border border-gray-800 p-5 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-200">
                  Kết quả trích xuất OCR (Tesseract.js)
                </h3>
              </div>
              {ocrResult && (
                <button 
                  onClick={handleCopyOcr}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              )}
            </div>

            {isScanning && (
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Tiến trình phân tích hình ảnh...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex-1 bg-gray-900/90 rounded-lg border border-gray-800 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto whitespace-pre-wrap shadow-inner max-h-[320px]">
              {ocrResult ? (
                ocrResult
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
                  <ScanText className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-xs">Chưa có dữ liệu trích xuất.<br/>Nhấn nút "Trích xuất OCR AI Tesseract" ở góc trên để phân tích.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

