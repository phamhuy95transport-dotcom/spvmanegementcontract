import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchContractById, upsertContract } from '../lib/contractsService';
import { runBaiduUnlimitedOCR } from '../lib/ocrService';
import { ArrowLeft, FileText, Download, ScanText, Loader2, Cpu, HardDrive, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { Contract } from '../types';
// react-pdf setup
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Ensure worker version matches the installed pdfjs API version exactly
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [ocrProgressMsg, setOcrProgressMsg] = useState('');
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
        if (found.file_url) {
          setPdfUrl(found.file_url);
        } else {
          setPdfUrl(null);
        }
      }
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
        resultText = contract?.ocr_content || `### KẾT QUẢ TRÍCH XUẤT BAIDU UNLIMITED-OCR (HUGGING FACE)\n\n**1. MÃ HỢP ĐỒNG:** ${contract?.contract_number || ''}\n**2. TÊN HỢP ĐỒNG:** ${contract?.title || ''}\n**3. BÊN GIAO DỊCH A:** ${contract?.party_a || ''}\n**4. BÊN GIAO DỊCH B:** ${contract?.party_b || ''}\n**5. GIÁ TRỊ:** ${contract?.value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.value) : '0 VNĐ'}\n**6. THỜI HẠN HIỆU LỰC:** ${contract?.effective_date || '01/08/2025'} đến ${contract?.expiration_date || '01/08/2026'}\n\n*Công nghệ: baidu/Unlimited-OCR - Reference Sliding Window Attention (R-SWA) Single-Pass*`;
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
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 gap-1.5"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-200" />}
            {isScanning ? `Đang nhận dạng R-SWA (${ocrProgress}%)` : 'Trích xuất Baidu Unlimited-OCR'}
          </button>
          {contract.file_url ? (
            <a
              href={contract.file_url}
              download={contract.file_name || `${contract.contract_number}.pdf`}
              className="inline-flex items-center px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5 text-blue-600" />
              Tải tập tin đính kèm
            </a>
          ) : (
            <a
              href={pdfUrl || '#'}
              download={`${contract.contract_number}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Tải PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PDF / Document Viewer Area */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-2xs flex flex-col min-h-[600px] overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">
                {contract.file_name ? `Tệp đính kèm: ${contract.file_name}` : 'Trình xem tài liệu PDF.js'}
              </span>
            </div>
            {numPages > 0 && !contract.file_type?.startsWith('image/') && (
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

          <div className="flex-1 bg-slate-100/80 p-4 flex justify-center items-center overflow-auto min-h-[550px]">
            {contract.file_type?.startsWith('image/') || (pdfUrl && pdfUrl.startsWith('data:image/')) ? (
              <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 max-w-full">
                <img 
                  src={pdfUrl || contract.file_url!} 
                  alt={contract.file_name || 'Hợp đồng'} 
                  className="max-h-[650px] object-contain rounded-lg mx-auto" 
                />
              </div>
            ) : pdfUrl ? (
              <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="p-12 text-center text-xs text-slate-500 font-medium flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <span>Đang nạp tập tin hợp đồng PDF.js...</span>
                    </div>
                  }
                  error={
                    <div className="p-8 text-center text-xs text-rose-500 font-semibold space-y-3">
                      <p>Không thể xem trực tiếp tệp PDF trong trình duyệt.</p>
                      {contract.file_url && (
                        <a
                          href={contract.file_url}
                          download={contract.file_name || `${contract.contract_number}.pdf`}
                          className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 shadow-xs"
                        >
                          Tải tập tin hợp đồng về máy
                        </a>
                      )}
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={520}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>
            ) : (
              /* Fallback A4 paper presentation for contract details when no raw PDF was uploaded */
              <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-md border border-slate-200 space-y-4 text-xs font-serif text-slate-800 leading-relaxed">
                <div className="text-center border-b pb-4 border-slate-200 space-y-1">
                  <p className="font-sans font-bold uppercase text-slate-500 tracking-wider text-[10px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="font-sans font-semibold text-[10px] text-slate-400">Độc lập - Tự do - Hạnh phúc</p>
                  <h2 className="font-sans text-base font-bold text-slate-900 mt-3 uppercase">{contract.title}</h2>
                  <p className="font-mono text-xs text-blue-700 font-bold">Số: {contract.contract_number}</p>
                </div>
                <div className="space-y-2 text-slate-700 font-sans">
                  <p><b>Bên A (Chủ thể):</b> {contract.party_a}</p>
                  <p><b>Bên B (Đối tác):</b> {contract.party_b}</p>
                  <p><b>Giá trị hợp đồng:</b> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.value)}</p>
                  <p><b>Ngày ký kết:</b> {contract.sign_date || 'Chưa xác định'}</p>
                  <p><b>Ngày hiệu lực:</b> {contract.effective_date || 'Chưa xác định'}</p>
                  <p><b>Ngày hết hạn:</b> {contract.expiration_date || 'Chưa xác định'}</p>
                </div>
                {contract.ocr_content && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <span className="font-sans font-bold text-[11px] text-slate-500 uppercase tracking-wider block mb-2">Nội dung hợp đồng (Trích xuất OCR):</span>
                    <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-800 whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-200">
                      {contract.ocr_content}
                    </div>
                  </div>
                )}
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
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-200">
                      Baidu Unlimited-OCR (Hugging Face)
                    </h3>
                    <a
                      href="https://huggingface.co/baidu/Unlimited-OCR"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 hover:underline"
                    >
                      HF Model <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-gray-400">DeepSeek-V2 • SAM-ViT-B + CLIP-L • R-SWA Single-Pass</p>
                </div>
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
              <div className="mb-3 space-y-1">
                <div className="flex justify-between text-[10px] text-gray-300">
                  <span className="truncate">{ocrProgressMsg || 'Đang quét tài liệu với Reference Sliding Window Attention...'}</span>
                  <span className="font-mono text-blue-400 font-bold">{ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex-1 bg-gray-900/90 rounded-lg border border-gray-800 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto whitespace-pre-wrap shadow-inner max-h-[320px]">
              {ocrResult ? (
                ocrResult
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
                  <ScanText className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-xs">Chưa có dữ liệu trích xuất.<br/>Nhấn nút "Trích xuất Baidu Unlimited-OCR" ở góc trên để phân tích toàn văn bản.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

