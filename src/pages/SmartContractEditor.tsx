import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Save, HardDrive, Printer, Sparkles, Check, 
  ArrowLeft, Building2, User, CreditCard, Calendar, FileCheck, 
  HelpCircle, RefreshCw, Share2, Search, Zap, CheckCircle2,
  Plus, ChevronDown, ToggleLeft, ToggleRight, Download, Upload, X, Eye, FileSpreadsheet,
  Trash2, RotateCcw, FolderKanban, Edit3, FileUp, Wand2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { 
  Document, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, BorderStyle, Packer 
} from 'docx';
import { upsertContract } from '../lib/contractsService';
import { uploadFileToDrive, getConnectedDriveAccount, DriveFolder } from '../lib/drive';
import { lookupTaxCode } from '../lib/taxCodeService';
import GoogleDriveFolderModal from '../components/GoogleDriveFolderModal';

interface CustomArticleItem {
  number: string;
  title: string;
  content: string;
}

interface DynamicVariableItem {
  key: string;
  label: string;
  defaultValue: string;
}

interface ContractTemplateItem {
  id: string;
  name: string;
  category: string;
  title: string;
  codePrefix: string;
  legalBases: string[];
  article1Scope: string;
  isCustom?: boolean;
  customArticles?: CustomArticleItem[];
  dynamicVariables?: DynamicVariableItem[];
}

// SANITIZE & CLEANUP TEXT UTILITIES (Tự động lọc & sửa ký tự lỗi trong mẫu và bản thể hiện)
export function cleanContractText(str: string): string {
  if (!str) return '';
  return str
    // Standardize line endings (\r\n -> \n)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove BOM (\uFEFF), replacement char (\uFFFD), zero-width spaces (\u200B, \u200C, \u200D), soft hyphens (\u00AD)
    .replace(/[\uFEFF\uFFFD\u200B\u200C\u200D\u00AD]/g, '')
    // Remove unprintable control chars (\x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Convert non-standard unicode spaces (non-breaking space \u00A0, etc.) to standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Replace HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    // Clean spaces before punctuation: " word ," -> " word,", " word ." -> " word."
    .replace(/ +([,.!?:;])/g, '$1')
    // Ensure single space after punctuation if directly followed by letter/digit
    .replace(/([,.!?;])([a-zA-RàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđA-Z0-9])/g, '$1 $2')
    // Clean spaces inside brackets
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // Clean variable placeholder syntax: "{ variable_key }" -> "{variable_key}"
    .replace(/\{\s*([a-zA-Z0-9_-]+)\s*\}/g, '{$1}')
    // Collapse consecutive horizontal spaces
    .replace(/[ \t]{2,}/g, ' ')
    // Limit consecutive empty lines
    .replace(/\n{3,}/g, '\n\n')
    // Trim line ends
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

function autoSanitizeTemplate(tmpl: ContractTemplateItem): ContractTemplateItem {
  return {
    ...tmpl,
    name: cleanContractText(tmpl.name),
    category: cleanContractText(tmpl.category),
    title: cleanContractText(tmpl.title),
    codePrefix: cleanContractText(tmpl.codePrefix),
    article1Scope: cleanContractText(tmpl.article1Scope || ''),
    legalBases: tmpl.legalBases ? tmpl.legalBases.map(b => cleanContractText(b)) : [],
    customArticles: tmpl.customArticles ? tmpl.customArticles.map(art => ({
      ...art,
      number: cleanContractText(art.number),
      title: cleanContractText(art.title),
      content: cleanContractText(art.content),
    })) : [],
    dynamicVariables: tmpl.dynamicVariables ? tmpl.dynamicVariables.map(v => ({
      ...v,
      label: cleanContractText(v.label),
      defaultValue: cleanContractText(v.defaultValue),
    })) : [],
  };
}

export function getTemplateArticles(tmpl: ContractTemplateItem): CustomArticleItem[] {
  if (tmpl.customArticles && tmpl.customArticles.length > 0) {
    return tmpl.customArticles.map(art => ({
      number: cleanContractText(art.number),
      title: cleanContractText(art.title),
      content: cleanContractText(art.content),
    }));
  }
  return [
    {
      number: 'Điều 1',
      title: 'PHẠM VI DỊCH VỤ VÀ ỦY QUYỀN',
      content: `${tmpl.article1Scope || 'Bên B chỉ định và ủy quyền cho Bên A thực hiện dịch vụ làm thủ tục hải quan, giao nhận và vận chuyển hàng hóa cho Bên B.'}\n- Khối lượng/Số lượng: Căn cứ theo nhu cầu thực tế của Bên B và thông báo bằng văn bản/Email/Zalo theo từng lô hàng.\n- Phương thức vận tải/thực hiện: {phuong_thuc_van_tai}.\n- Địa điểm giao nhận & Thời gian: Thực hiện theo chỉ định của Bên B cho từng lô hàng cụ thể.`
    },
    {
      number: 'Điều 2',
      title: 'GIÁ CẢ, PHÍ DỊCH VỤ VÀ THỜI HẠN THANH TOÁN',
      content: `1. Giá dịch vụ và chi phí:\n- Phí dịch vụ: Theo báo giá/thỏa thuận từng thời điểm bằng văn bản/Email/Zalo/điện thoại và thể hiện trên Hóa đơn GTGT của Bên A;\n- Chi phí thu/chi hộ: (Nâng hạ, phí cảng, phí LCC, phí kiểm tra chuyên ngành...): Căn cứ theo hóa đơn/chứng từ hợp lệ do bên thứ ba phát hành;\n- Cước vận chuyển: Theo thỏa thuận bằng văn bản/Email/Zalo/điện thoại và thể hiện trên Hóa đơn GTGT của Bên A;\n- Chi phí phát sinh bất khả kháng hoặc ngoài dự kiến: Bên A sẽ thông báo cho Bên B trước khi thực hiện.\n\n2. Thời hạn thanh toán:\n- Đối với Thuế, Lệ phí Hải quan, Chi phí chi hộ: Bên B có trách nhiệm chuyển tiền trước cho Bên A nộp/thanh toán, hoặc thanh toán lại ngay cho Bên A trong vòng {han_chi_ho} kể từ khi Bên A gửi thông báo/chứng từ;\n- Đối với Phí dịch vụ và cước vận chuyển: Bên B thanh toán cho Bên A trong vòng {han_phi_dich_vu} kể từ ngày thông quan/giao hàng thành công.\n\n3. Lãi chậm thanh toán: {lai_cham_thanh_toan}\n\n4. Phương thức thanh toán: Chuyển khoản vào tài khoản ngân hàng của Bên A.`
    },
    {
      number: 'Điều 3',
      title: 'QUYỀN HẠN VÀ TRÁCH NHIỆM CỦA BÊN A',
      content: `1. Thực hiện các công việc trong phạm vi ủy quyền của Bên B đúng quy định pháp luật.\n2. Bảo mật toàn bộ thông tin kinh doanh, chứng từ do Bên B cung cấp;\n3. Giới hạn trách nhiệm của Bên A:\n- Bên A chỉ chịu trách nhiệm đối với các sai sót trực tiếp do lỗi cố ý của Nhân viên Bên A trong quá trình xử lý tác nghiệp.\n- Tổng trách nhiệm bồi thường thiệt hại tối đa của Bên A (nếu có) không vượt quá tổng phí dịch vụ thu được từ lô hàng xảy ra sự cố.\n- Bên A hoàn toàn miễn trừ trách nhiệm đối với các tổn thất xuất phát từ việc Bên B cung cấp chứng từ/thông tin sai lệch hoặc chậm trễ.\n4. Quyền tạm dừng dịch vụ: Bên A có quyền tạm dừng dịch vụ nếu Bên B chưa hoàn thành nghĩa vụ thanh toán quá hạn.`
    },
    {
      number: 'Điều 4',
      title: 'QUYỀN HẠN VÀ TRÁCH NHIỆM CỦA BÊN B',
      content: `1. Cung cấp đầy đủ, chính xác, trung thực và kịp thời toàn bộ hồ sơ, chứng từ liên quan trước khi làm dịch vụ.\n2. Chịu trách nhiệm hoàn toàn trước Pháp luật về tính hợp pháp và chính xác của toàn bộ bộ chứng từ cung cấp cho Bên A.\n3. Thanh toán đầy đủ, đúng hạn Phí dịch vụ và các khoản chi hộ cho Bên A theo quy định tại Điều 2.`
    },
    {
      number: 'Điều 5',
      title: 'ĐIỀU KHOẢN CHUNG',
      content: `1. Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản trong Hợp đồng này. Mọi sửa đổi, bổ sung phải được lập thành Phụ lục hợp đồng bằng văn bản.\n2. Trường hợp phát sinh tranh chấp, hai Bên ưu tiên thương lượng. Nếu không giải quyết được trong 30 ngày, tranh chấp sẽ được giải quyết tại {toa_an_giai_quyet}.\n3. Hợp đồng này có hiệu lực 01 (một) năm kể từ ngày ký và tự động gia hạn nếu hai bên không có ý kiến phản đối.\n4. Hợp đồng được lập thành 02 (hai) bản gốc có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản.`
    }
  ];
}

function autoSanitizeFormData(data: any): any {
  const result = { ...data };
  Object.keys(result).forEach((key) => {
    if (typeof result[key] === 'string') {
      result[key] = cleanContractText(result[key]);
    }
  });
  return result;
}

async function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) || '';
      resolve(cleanContractText(raw));
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, 'UTF-8');
  });
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Convert Word DOCX to Markdown format using mammoth
    const result = await (mammoth as any).convertToMarkdown({ arrayBuffer });
    if (result && result.value && result.value.trim().length > 10) {
      return result.value.trim();
    }
  } catch (e) {
    console.warn('Mammoth markdown conversion error, falling back to XML extraction:', e);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder('utf-8');
    const rawString = textDecoder.decode(arrayBuffer);
    const paragraphs: string[] = [];
    const pMatches = rawString.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g);
    if (pMatches && pMatches.length > 0) {
      for (const pXml of pMatches) {
        const wtMatches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (wtMatches) {
          const pText = wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
          const trimmed = pText.trim();
          if (trimmed) {
            if (/^(Điều|Chương|Mục)\s+(\d+|[IVXLCDM]+)/i.test(trimmed)) {
              paragraphs.push(`### **${trimmed}**`);
            } else if (/^HỢP ĐỒNG/i.test(trimmed)) {
              paragraphs.push(`# **${trimmed}**`);
            } else {
              paragraphs.push(trimmed);
            }
          }
        }
      }
      if (paragraphs.length > 0) return paragraphs.join('\n\n');
    }
    const wtMatches = rawString.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (wtMatches && wtMatches.length > 0) {
      return wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    }
    return rawString.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  } catch (e) {
    return extractTextFromTxt(file);
  }
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    return await extractTextFromTxt(file);
  } catch (e) {
    return '';
  }
}

function analyzeContractTextLocally(rawText: string, fileName: string): ContractTemplateItem {
  const cleanRawText = cleanContractText(rawText);
  const cleanName = cleanContractText(fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
  const titleMatch = cleanRawText.match(/(HỢP ĐỒNG\s+[^\n\r.]+)/i) || cleanRawText.match(/#+\s*(HỢP ĐỒNG\s+[^\n\r.]+)/i);
  const title = titleMatch ? titleMatch[1].toUpperCase().replace(/^#+\s*/, '').trim() : `HỢP ĐỒNG ${cleanName.toUpperCase()}`;
  
  const legalMatches = cleanRawText.match(/Căn cứ\s+[^;.\n]+/gi);
  const legalBases = legalMatches && legalMatches.length > 0 
    ? legalMatches.map(l => cleanContractText(l.replace(/^Căn cứ\s+/i, '').replace(/[*_#]/g, '').trim()))
    : [
        'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
        'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005'
      ];

  const articleRegex = /((?:#+\s*|\*\*|\b)Điều\s+\d+[:.]?\s*[^\n\r*]+(?:\*\*|\b)?)([\s\S]*?)(?=(?:#+\s*|\*\*|\b)Điều\s+\d+|$)/gi;
  const customArticles: CustomArticleItem[] = [];
  let match;
  let scope = 'Thực hiện các dịch vụ và công việc chuyên ngành theo yêu cầu thỏa thuận cụ thể của hai bên.';

  while ((match = articleRegex.exec(cleanRawText)) !== null) {
    const fullHeader = match[1].replace(/[*_#]/g, '').trim();
    const content = cleanContractText(match[2]);
    const headerParts = fullHeader.split(/[:.-]/);
    const num = headerParts[0].trim();
    const artTitle = headerParts[1] ? headerParts[1].trim() : num;
    
    if (num.toLowerCase().includes('điều 1') && content) {
      scope = content;
    }

    customArticles.push({
      number: cleanContractText(num),
      title: cleanContractText(artTitle),
      content: content || 'Nội dung thực hiện theo thỏa thuận chi tiết giữa hai bên.'
    });
  }

  if (customArticles.length === 0 && cleanRawText.trim()) {
    const paragraphs = cleanRawText.split(/\n\s*\n/).filter(p => p.trim());
    paragraphs.forEach((p, idx) => {
      customArticles.push({
        number: `Mục ${idx + 1}`,
        title: `Chi tiết nội dung phần ${idx + 1}`,
        content: cleanContractText(p)
      });
    });
  }

  let category = 'Dịch vụ & Tư vấn';
  if (/hải quan|thông quan|tờ khai/i.test(cleanRawText)) category = 'Hải quan & Thông quan';
  else if (/vận tải|vận chuyển|logistics|freight/i.test(cleanRawText)) category = 'Vận tải & Logistics';
  else if (/ủy thác|xuất nhập khẩu/i.test(cleanRawText)) category = 'Ủy thác Thương mại';
  else if (/kho bãi|lưu kho|cho thuê kho/i.test(cleanRawText)) category = 'Kho bãi & Lưu giữ';
  else if (/mua bán|hàng hóa|vật tư/i.test(cleanRawText)) category = 'Mua bán Hàng hóa';

  const words = cleanName.split(' ').filter(Boolean);
  const prefixCode = 'SPV-' + (words.map(w => w[0]?.toUpperCase()).join('').slice(0, 4) || 'CUSTOM');

  return autoSanitizeTemplate({
    id: `template_${Date.now()}`,
    name: cleanName || 'Mẫu hợp đồng mới tải lên',
    category,
    title,
    codePrefix: prefixCode,
    legalBases,
    article1Scope: scope,
    isCustom: true,
    customArticles: customArticles.length > 0 ? customArticles : [
      { number: 'Nội dung hợp đồng', title: 'Toàn văn tệp hợp đồng', content: cleanRawText }
    ],
    dynamicVariables: [
      { key: 'noi_dung_cong_viec', label: 'Chi tiết nội dung công việc / Mặt hàng', defaultValue: 'Thực hiện theo chỉ định chi tiết của Bên B' },
      { key: 'dia_diem_thuc_hien', label: 'Địa điểm thực hiện / Giao nhận', defaultValue: 'Theo thông báo của Bên B' }
    ]
  });
}

const DEFAULT_TEMPLATES: ContractTemplateItem[] = [
  {
    id: 'customs_agent',
    name: 'Hợp đồng Đại lý Hải quan (Mẫu chuẩn 2025)',
    category: 'Hải quan & Thông quan',
    title: 'HỢP ĐỒNG ĐẠI LÝ HẢI QUAN',
    codePrefix: 'SPV-KF',
    legalBases: [
      'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
      'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005 và các văn bản hướng dẫn thi hành',
      'Luật Hải quan số 54/2014/QH13 ngày 23/06/2014',
      'Thông tư số 12/2015/TT-BTC và Thông tư số 22/2019/TT-BTC của Bộ Tài chính quy định về hoạt động của Đại lý làm thủ tục hải quan',
    ],
    article1Scope: 'Bên B chỉ định và ủy quyền cho Bên A thực hiện dịch vụ Đại lý làm thủ tục hải quan, giao nhận và vận chuyển hàng hóa cho Bên B theo từng lô hàng phát sinh.',
  },
  {
    id: 'international_freight',
    name: 'Hợp đồng Vận chuyển Quốc tế & Forwarding',
    category: 'Vận tải & Logistics',
    title: 'HỢP ĐỒNG DỊCH VỤ VẬN CHUYỂN HÀNG HÓA QUỐC TẾ',
    codePrefix: 'SPV-LOG',
    legalBases: [
      'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
      'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005 và các văn bản hướng dẫn thi hành',
      'Bộ luật Hàng hải Việt Nam số 95/2015/QH13 ngày 25/11/2015',
    ],
    article1Scope: 'Bên B thuê Bên A cung cấp dịch vụ giao nhận, vận chuyển quốc tế (đường biển, đường hàng không, đường bộ) cho các lô hàng xuất nhập khẩu của Bên B.',
  },
  {
    id: 'import_export_entrustment',
    name: 'Hợp đồng Ủy thác Xuất nhập khẩu',
    category: 'Ủy thác Thương mại',
    title: 'HỢP ĐỒNG ỦY THÁC XUẤT NHẬP KHẨU HÀNG HÓA',
    codePrefix: 'SPV-UT',
    legalBases: [
      'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
      'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005',
      'Luật Quản lý ngoại thương số 05/2017/QH14 ngày 12/06/2017',
    ],
    article1Scope: 'Bên B ủy thác cho Bên A đại diện ký kết hợp đồng ngoại thương, mở L/C, làm thủ tục hải quan và nhận/giao hàng hóa theo ủy quyền.',
  },
  {
    id: 'warehouse_logistics',
    name: 'Hợp đồng Cho thuê Kho bãi & Dịch vụ Kho',
    category: 'Kho bãi & Lưu giữ',
    title: 'HỢP ĐỒNG DỊCH VỤ LƯU KHO BÃI VÀ PHÂN PHỐI HÀNG HÓA',
    codePrefix: 'SPV-KHO',
    legalBases: [
      'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
      'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005',
    ],
    article1Scope: 'Bên A cho Bên B thuê diện tích kho bãi và thực hiện các dịch vụ bốc xếp, nâng hạ, kiểm đếm và đóng gói phân phối hàng hóa.',
  },
];

export default function SmartContractEditor() {
  const navigate = useNavigate();

  // Template lists & selector
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('customs_agent');
  const [templates, setTemplates] = useState<ContractTemplateItem[]>(() => {
    try {
      const savedV2 = localStorage.getItem('spv_contract_templates_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedV1 = localStorage.getItem('custom_contract_templates_v1');
      if (savedV1) {
        const customParsed = JSON.parse(savedV1);
        if (Array.isArray(customParsed) && customParsed.length > 0) {
          return [...DEFAULT_TEMPLATES, ...customParsed];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TEMPLATES;
  });

  // Modal states for managing & deleting & editing templates
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ContractTemplateItem | null>(null);

  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [customVariableValues, setCustomVariableValues] = useState<Record<string, string>>({});
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplateItem | null>(null);

  const [editTemplateForm, setEditTemplateForm] = useState<{
    name: string;
    category: string;
    codePrefix: string;
    title: string;
    legalBasesText: string;
    article1Scope: string;
    customArticles: CustomArticleItem[];
  }>({
    name: '',
    category: '',
    codePrefix: '',
    title: '',
    legalBasesText: '',
    article1Scope: '',
    customArticles: [],
  });

  // State for interactive text selection to create fixed edit fields
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const [capturedSelectedText, setCapturedSelectedText] = useState<string>('');
  const [floatingPopoverPos, setFloatingPopoverPos] = useState<{
    top: number;
    left: number;
    text: string;
  } | null>(null);
  const [selectedTextToCreateVar, setSelectedTextToCreateVar] = useState<{
    isOpen: boolean;
    selectedText: string;
    varLabel: string;
  }>({
    isOpen: false,
    selectedText: '',
    varLabel: '',
  });

  // Calculate floating popup position adjacent to text selection
  const handleSelectionMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }
      const text = selection.toString().trim();
      if (text && text.length >= 2 && text.length <= 300) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            let popoverTop = rect.top - 46;
            if (popoverTop < 10) {
              popoverTop = rect.bottom + 8;
            }
            let popoverLeft = rect.left + (rect.width / 2) - 90;
            if (popoverLeft < 10) popoverLeft = 10;
            if (popoverLeft + 190 > window.innerWidth) popoverLeft = window.innerWidth - 200;

            setFloatingPopoverPos({
              top: popoverTop,
              left: popoverLeft,
              text: text,
            });
            setCapturedSelectedText(text);
          }
        } catch (e) {
          console.error('Selection position error:', e);
        }
      } else if (text.length > 300) {
        showToast('Đoạn chữ quá dài. Vui lòng bôi đen cụm từ ngắn hơn (dưới 300 ký tự).');
        setFloatingPopoverPos(null);
      }
    }, 40);
  };

  const handleOpenEditTemplate = (tmpl: ContractTemplateItem) => {
    setTemplateToEdit(tmpl);
    setEditTemplateForm({
      name: tmpl.name,
      category: tmpl.category,
      codePrefix: tmpl.codePrefix,
      title: tmpl.title,
      legalBasesText: tmpl.legalBases ? tmpl.legalBases.join('\n') : '',
      article1Scope: tmpl.article1Scope || '',
      customArticles: getTemplateArticles(tmpl),
    });
    setIsEditTemplateModalOpen(true);
  };

  const handleSaveEditedTemplate = () => {
    if (!templateToEdit) return;
    if (!editTemplateForm.name.trim() || !editTemplateForm.title.trim()) {
      showToast('Vui lòng nhập Tên mẫu hợp đồng và Tiêu đề hợp đồng.');
      return;
    }

    const legalBases = editTemplateForm.legalBasesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const updatedTemplates = templates.map((t) => {
      if (t.id === templateToEdit.id) {
        return autoSanitizeTemplate({
          ...t,
          name: editTemplateForm.name.trim(),
          category: editTemplateForm.category.trim() || 'Mẫu Tùy chỉnh',
          codePrefix: editTemplateForm.codePrefix.trim().toUpperCase() || 'SPV-EDIT',
          title: editTemplateForm.title.trim().toUpperCase(),
          legalBases: legalBases.length > 0 ? legalBases : t.legalBases,
          article1Scope: editTemplateForm.article1Scope.trim(),
          customArticles: editTemplateForm.customArticles,
        });
      }
      return t;
    });

    saveTemplatesToStorage(updatedTemplates);
    setIsEditTemplateModalOpen(false);
    setTemplateToEdit(null);
    showToast(`Đã cập nhật mẫu hợp đồng & toàn bộ điều khoản thành công!`);
  };

  // Check selected text from contract preview to create fixed variable field
  const handleCheckSelectedTextFromPreview = (textOverride?: string) => {
    let text = textOverride;
    if (!text) {
      const selection = window.getSelection();
      text = selection ? selection.toString().trim() : '';
    }
    if (!text && capturedSelectedText) {
      text = capturedSelectedText.trim();
    }

    if (text && text.length >= 2 && text.length <= 300) {
      setCapturedSelectedText(text);
      setSelectedTextToCreateVar({
        isOpen: true,
        selectedText: text,
        varLabel: text.length <= 35 ? text : text.slice(0, 35) + '...',
      });
    } else if (text && text.length > 300) {
      showToast('Đoạn chữ quá dài. Vui lòng bôi đen một từ hoặc cụm từ ngắn hơn (dưới 300 ký tự).');
    } else {
      showToast('Hãy dùng chuột bôi đen một từ hoặc cụm từ cần tạo ô sửa trên hợp đồng.');
    }
  };

  // Confirm and create a fixed variable field for active template
  const handleConfirmCreateFixedVariable = () => {
    if (!selectedTextToCreateVar.selectedText || !selectedTextToCreateVar.varLabel.trim()) {
      showToast('Vui lòng nhập nhãn hiển thị cho ô dữ liệu.');
      return;
    }

    const rawText = selectedTextToCreateVar.selectedText.trim();
    const label = selectedTextToCreateVar.varLabel.trim();
    const varKey = 'var_' + Date.now().toString().slice(-6);

    const currentArticles = getTemplateArticles(activeTemplate);
    let replaced = false;

    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const createFlexRegex = (str: string) => {
      const words = str.trim().split(/\s+/).map(escapeRegex);
      return new RegExp(words.join('\\s+'), 'i');
    };

    // 1. Direct or flexible match in custom articles
    const updatedArticles = currentArticles.map(art => {
      if (!replaced) {
        if (art.content.includes(rawText)) {
          replaced = true;
          return {
            ...art,
            content: art.content.replace(rawText, `{${varKey}}`)
          };
        }
        const flexRegex = createFlexRegex(rawText);
        if (flexRegex.test(art.content)) {
          replaced = true;
          return {
            ...art,
            content: art.content.replace(flexRegex, `{${varKey}}`)
          };
        }
      }
      return art;
    });

    // 2. Direct or flexible match in scope
    let updatedScope = activeTemplate.article1Scope || '';
    if (!replaced) {
      if (updatedScope.includes(rawText)) {
        updatedScope = updatedScope.replace(rawText, `{${varKey}}`);
        replaced = true;
      } else {
        const flexRegex = createFlexRegex(rawText);
        if (flexRegex.test(updatedScope)) {
          updatedScope = updatedScope.replace(flexRegex, `{${varKey}}`);
          replaced = true;
        }
      }
    }

    // 3. Match in evaluated article text
    if (!replaced) {
      for (let i = 0; i < updatedArticles.length; i++) {
        const art = updatedArticles[i];
        const rendered = replaceVariablesInText(art.content);
        const flexRegex = createFlexRegex(rawText);
        if (rendered.includes(rawText) || flexRegex.test(rendered)) {
          if (art.content.includes(rawText)) {
            updatedArticles[i] = { ...art, content: art.content.replace(rawText, `{${varKey}}`) };
          } else if (flexRegex.test(art.content)) {
            updatedArticles[i] = { ...art, content: art.content.replace(flexRegex, `{${varKey}}`) };
          } else {
            updatedArticles[i] = { ...art, content: art.content + `\n- ${label}: {${varKey}}` };
          }
          replaced = true;
          break;
        }
      }
    }

    // 4. Fallback: if not found anywhere, append a clear article entry with the variable
    if (!replaced) {
      updatedArticles.push({
        number: `Điều ${updatedArticles.length + 1}`,
        title: label.toUpperCase(),
        content: `{${varKey}}`
      });
      replaced = true;
    }

    const newVar: DynamicVariableItem = {
      key: varKey,
      label: label,
      defaultValue: rawText,
    };

    const currentVars = activeTemplate.dynamicVariables || [];
    const updatedVars = [...currentVars, newVar];

    const updatedTemplate: ContractTemplateItem = autoSanitizeTemplate({
      ...activeTemplate,
      article1Scope: updatedScope,
      customArticles: updatedArticles,
      dynamicVariables: updatedVars,
    });

    const updatedList = templates.map(t => t.id === activeTemplate.id ? updatedTemplate : t);
    saveTemplatesToStorage(updatedList);

    setCustomVariableValues(prev => ({ ...prev, [varKey]: rawText }));
    setSelectedTextToCreateVar({ isOpen: false, selectedText: '', varLabel: '' });
    setCapturedSelectedText('');
    setFloatingPopoverPos(null);
    setIsSelectionModeActive(false);
    showToast(`Đã cố định ô dữ liệu '${label}' cho mẫu hợp đồng này!`);
  };

  // Delete a fixed variable from active template
  const handleDeleteFixedVariable = (varKey: string) => {
    if (!activeTemplate.dynamicVariables) return;
    const targetVar = activeTemplate.dynamicVariables.find(v => v.key === varKey);
    const updatedVars = activeTemplate.dynamicVariables.filter(v => v.key !== varKey);

    const currentArticles = getTemplateArticles(activeTemplate);
    const updatedArticles = currentArticles.map(art => ({
      ...art,
      content: art.content.replace(new RegExp(`\\{${varKey}\\}`, 'g'), targetVar?.defaultValue || '')
    }));

    const updatedTemplate: ContractTemplateItem = autoSanitizeTemplate({
      ...activeTemplate,
      customArticles: updatedArticles,
      dynamicVariables: updatedVars,
    });

    const updatedList = templates.map(t => t.id === activeTemplate.id ? updatedTemplate : t);
    saveTemplatesToStorage(updatedList);

    const newCustomVals = { ...customVariableValues };
    delete newCustomVals[varKey];
    setCustomVariableValues(newCustomVals);

    showToast('Đã xóa ô dữ liệu cố định.');
  };

  const handleUploadTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'md') {
      showToast('Chỉ chấp nhận tệp mẫu hợp đồng ở định dạng Markdown (.md)!');
      if (e.target) e.target.value = '';
      return;
    }

    setIsUploadingTemplate(true);
    showToast('Đang đọc và phân tích tệp mẫu Markdown (.md)...');

    try {
      const rawText = await extractTextFromTxt(file);

      if (!rawText || rawText.trim().length < 15) {
        showToast('Nội dung tệp .md trống hoặc không đọc được.');
        setIsUploadingTemplate(false);
        return;
      }

      let parsedTemplate: ContractTemplateItem | null = null;
      try {
        const response = await fetch('/api/analyze-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText, fileName: file.name }),
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
          const d = resData.data;
          parsedTemplate = {
            id: `custom_${Date.now()}`,
            name: d.name || file.name.replace(/\.[^/.]+$/, ""),
            category: d.category || 'Mẫu Tùy chỉnh',
            title: (d.title || 'HỢP ĐỒNG DỊCH VỤ').toUpperCase(),
            codePrefix: (d.codePrefix || 'SPV-NEW').toUpperCase(),
            legalBases: d.legalBases && d.legalBases.length > 0 ? d.legalBases : [
              'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015',
              'Luật Thương mại số 36/2005/QH11 ngày 14/06/2005'
            ],
            article1Scope: d.article1Scope || 'Thực hiện các công việc dịch vụ chuyên ngành theo yêu cầu của Bên B.',
            isCustom: true,
            customArticles: d.customArticles || [],
            dynamicVariables: d.dynamicVariables || []
          };
        }
      } catch (err) {
        console.warn("API AI analysis failed, falling back to local analyzer", err);
      }

      if (!parsedTemplate) {
        parsedTemplate = analyzeContractTextLocally(rawText, file.name);
      }

      const updated = [...templates, parsedTemplate];
      saveTemplatesToStorage(updated);

      setSelectedTemplateId(parsedTemplate.id);
      setFormData(prev => ({
        ...prev,
        contract_number: `01/2025/${parsedTemplate.codePrefix}`,
      }));

      if (parsedTemplate.dynamicVariables && parsedTemplate.dynamicVariables.length > 0) {
        const initVals: Record<string, string> = {};
        parsedTemplate.dynamicVariables.forEach(v => {
          initVals[v.key] = v.defaultValue || '';
        });
        setCustomVariableValues(initVals);
      }

      showToast(`Đã tự động tạo mẫu hợp đồng mới: "${parsedTemplate.name}"`);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải tệp mẫu hợp đồng.');
    } finally {
      setIsUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    category: 'Mẫu Tùy chỉnh',
    title: '',
    codePrefix: 'SPV-MOI',
    legalBasesText: 'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015\nLuật Thương mại số 36/2005/QH11 ngày 14/06/2005',
    article1Scope: 'Bên B ủy quyền cho Bên A thực hiện các dịch vụ chuyên ngành theo quy định pháp luật và thỏa thuận cụ thể giữa hai Bên.',
  });

  // Helper to persist updated templates
  const saveTemplatesToStorage = (updatedTemplates: ContractTemplateItem[]) => {
    setTemplates(updatedTemplates);
    try {
      localStorage.setItem('spv_contract_templates_v2', JSON.stringify(updatedTemplates));
    } catch (e) {
      console.error(e);
    }
  };

  // Late Payment Interest Toggle
  const [showLatePaymentInterest, setShowLatePaymentInterest] = useState<boolean>(true);

  // Template Form State initialized matching EXACTLY the attached sample content
  const [formData, setFormData] = useState({
    contract_number: '01/2025/SPV-KF',
    sign_location: 'Văn phòng Công ty TNHH SPV GROUP',
    sign_date_day: '01',
    sign_date_month: '08',
    sign_date_year: '2025',
    effective_years: '01',

    // Party A (Đại lý Hải quan)
    party_a_name: 'CÔNG TY TNHH SPV GROUP',
    party_a_address: '47 Cầu Cáp, Phường An Biên, Thành phố Hải Phòng, Việt Nam',
    party_a_tax: '0202146805',
    party_a_phone: '0922012395',
    party_a_bank: '679999 tại ngân hàng VPBank chi nhánh Hải Phòng',
    party_a_rep: 'Ông Phạm Quang Huy',
    party_a_title: 'Giám đốc',

    // Party B (Chủ hàng)
    party_b_name: 'CÔNG TY TNHH KANG FOODS',
    party_b_address: 'Số nhà 26A, ngõ 2 phố Hoàng Liệt, Phường Hoàng Liệt, TP Hà Nội, Việt Nam',
    party_b_tax: '0110012544',
    party_b_phone: '0931265586',
    party_b_bank: '1029384756 tại Ngân hàng TMCP Quân Đội MBBank',
    party_b_rep: 'Bà Trần Thị Nga',
    party_b_title: 'Giám đốc',

    // Contract terms
    transport_methods: 'Đường biển, đường bộ, đường hàng không, đường sắt',
    payment_terms_disbursement: '03 (ba)', // Hạn trả phí chi hộ
    payment_terms_service_days: '15 đến 30', // Hạn trả phí dịch vụ
    late_payment_interest: '0.05%/ngày',
    contract_value: 1200000000,
    dispute_court: 'Tòa án nhân dân có thẩm quyền tại Thành phố Hải Phòng',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  
  // Tax Code Extraction Loading States
  const [extractingPartyB, setExtractingPartyB] = useState(false);
  const [extractingPartyA, setExtractingPartyA] = useState(false);

  const driveAccount = getConnectedDriveAccount();

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Change active template
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) {
      setFormData(prev => ({
        ...prev,
        contract_number: `01/2025/${tmpl.codePrefix}`,
      }));
      showToast(`Đã chuyển sang mẫu: ${tmpl.name}`);
    }
  };

  // Add new template logic
  const handleAddNewTemplate = () => {
    if (!newTemplateForm.name.trim() || !newTemplateForm.title.trim()) {
      showToast('Vui lòng nhập Tên mẫu hợp đồng và Tiêu đề hợp đồng.');
      return;
    }

    const legalBases = newTemplateForm.legalBasesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const newTmpl: ContractTemplateItem = {
      id: `custom_${Date.now()}`,
      name: newTemplateForm.name.trim(),
      category: newTemplateForm.category.trim() || 'Mẫu Tùy chỉnh',
      title: newTemplateForm.title.trim().toUpperCase(),
      codePrefix: newTemplateForm.codePrefix.trim().toUpperCase() || 'SPV-NEW',
      legalBases: legalBases.length > 0 ? legalBases : ['Bộ luật Dân sự số 91/2015/QH13', 'Luật Thương mại số 36/2005/QH11'],
      article1Scope: newTemplateForm.article1Scope.trim(),
      isCustom: true,
    };

    const updated = [...templates, newTmpl];
    saveTemplatesToStorage(updated);

    setSelectedTemplateId(newTmpl.id);
    setFormData(prev => ({
      ...prev,
      contract_number: `01/2025/${newTmpl.codePrefix}`,
    }));

    setIsAddTemplateOpen(false);
    setNewTemplateForm({
      name: '',
      category: 'Mẫu Tùy chỉnh',
      title: '',
      codePrefix: 'SPV-MOI',
      legalBasesText: 'Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015\nLuật Thương mại số 36/2005/QH11 ngày 14/06/2005',
      article1Scope: 'Bên B ủy quyền cho Bên A thực hiện các dịch vụ chuyên ngành theo quy định pháp luật và thỏa thuận cụ thể giữa hai Bên.',
    });

    showToast(`Đã thêm & tạo form tự động cho mẫu hợp đồng: ${newTmpl.name}`);
  };

  // Delete any template logic
  const handleDeleteTemplate = (templateId: string) => {
    const target = templates.find(t => t.id === templateId);
    if (!target) return;

    if (templates.length <= 1) {
      showToast('Hệ thống cần duy trì ít nhất 01 mẫu hợp đồng.');
      setTemplateToDelete(null);
      return;
    }

    const updated = templates.filter(t => t.id !== templateId);
    saveTemplatesToStorage(updated);

    if (selectedTemplateId === templateId) {
      const newSelected = updated[0];
      setSelectedTemplateId(newSelected.id);
      setFormData(prev => ({
        ...prev,
        contract_number: `01/2025/${newSelected.codePrefix}`,
      }));
    }

    showToast(`Đã xóa mẫu hợp đồng: "${target.name}"`);
    setTemplateToDelete(null);
  };

  // Restore default templates
  const handleRestoreDefaultTemplates = () => {
    setTemplates(DEFAULT_TEMPLATES);
    try {
      localStorage.removeItem('spv_contract_templates_v2');
      localStorage.removeItem('custom_contract_templates_v1');
    } catch (e) {
      console.error(e);
    }
    setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
    setFormData(prev => ({
      ...prev,
      contract_number: `01/2025/${DEFAULT_TEMPLATES[0].codePrefix}`,
    }));
    showToast('Đã khôi phục lại bộ mẫu hợp đồng mặc định ban đầu.');
  };

  // Extract company info from Tax Code for Party B
  const handleExtractTaxCodeB = async () => {
    if (!formData.party_b_tax) {
      showToast('Vui lòng nhập Mã số thuế Bên B trước khi trích xuất.');
      return;
    }
    setExtractingPartyB(true);
    try {
      const result = await lookupTaxCode(formData.party_b_tax);
      if (result && result.name) {
        setFormData((prev) => ({
          ...prev,
          party_b_name: result.name,
          party_b_address: result.address || prev.party_b_address,
          party_b_rep: result.repName || prev.party_b_rep,
          party_b_phone: result.phone || prev.party_b_phone,
        }));
        showToast(`Đã trích xuất thành công: ${result.name}`);
      } else {
        showToast('Không tìm thấy thông tin cho mã số thuế này. Bạn có thể tự điền.');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi truy vấn dữ liệu Mã số thuế.');
    } finally {
      setExtractingPartyB(false);
    }
  };

  // Extract company info from Tax Code for Party A
  const handleExtractTaxCodeA = async () => {
    if (!formData.party_a_tax) {
      showToast('Vui lòng nhập Mã số thuế Bên A trước khi trích xuất.');
      return;
    }
    setExtractingPartyA(true);
    try {
      const result = await lookupTaxCode(formData.party_a_tax);
      if (result && result.name) {
        setFormData((prev) => ({
          ...prev,
          party_a_name: result.name,
          party_a_address: result.address || prev.party_a_address,
          party_a_rep: result.repName || prev.party_a_rep,
          party_a_phone: result.phone || prev.party_a_phone,
        }));
        showToast(`Đã trích xuất thành công: ${result.name}`);
      } else {
        showToast('Không tìm thấy thông tin doanh nghiệp cho mã số thuế này.');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi truy vấn dữ liệu Mã số thuế.');
    } finally {
      setExtractingPartyA(false);
    }
  };

  // Save Contract to Database
  const handleSaveToDb = async () => {
    setIsSaving(true);
    try {
      const contractData = {
        title: `${activeTemplate.title} - ${formData.party_b_name}`,
        contract_number: formData.contract_number,
        party_a: formData.party_a_name,
        party_b: formData.party_b_name,
        status: 'Active' as const,
        value: formData.contract_value,
        sign_date: `${formData.sign_date_year}-${formData.sign_date_month.padStart(2, '0')}-${formData.sign_date_day.padStart(2, '0')}`,
        effective_date: `${formData.sign_date_year}-${formData.sign_date_month.padStart(2, '0')}-${formData.sign_date_day.padStart(2, '0')}`,
        expiration_date: `${Number(formData.sign_date_year) + Number(formData.effective_years)}-${formData.sign_date_month.padStart(2, '0')}-${formData.sign_date_day.padStart(2, '0')}`,
        ocr_content: `${activeTemplate.title}\nBên A: ${formData.party_a_name}\nBên B: ${formData.party_b_name}\nMST B: ${formData.party_b_tax}\nĐịa chỉ B: ${formData.party_b_address}`,
      };

      await upsertContract(contractData);
      showToast(`Đã lưu ${activeTemplate.title} thành công vào hệ thống!`);
    } catch (e) {
      console.error(e);
      showToast('Không thể lưu hợp đồng. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open folder selector modal for Google Drive
  const handleUploadDrive = () => {
    setIsFolderModalOpen(true);
  };

  // Sync to Google Drive with chosen folder
  const handlePerformUploadDrive = async (folder: DriveFolder) => {
    setIsFolderModalOpen(false);
    setIsSyncingDrive(true);
    try {
      const docHtml = document.getElementById('printable-contract-preview')?.innerHTML || '';
      const blob = new Blob([
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${formData.contract_number}</title><style>body{font-family:'Times New Roman',serif;padding:30px;line-height:1.6;}</style></head><body>${docHtml}</body></html>`
      ], { type: 'text/html' });

      const fileName = `HopDong_${activeTemplate.codePrefix}_${formData.contract_number.replace(/\//g, '_')}.html`;
      const result = await uploadFileToDrive(blob, fileName, 'text/html', undefined, folder);

      await upsertContract({
        title: `${activeTemplate.title} - ${formData.party_b_name}`,
        contract_number: formData.contract_number,
        party_a: formData.party_a_name,
        party_b: formData.party_b_name,
        status: 'Active',
        value: formData.contract_value,
        file_id: result.id,
      });

      showToast(`Đã đồng bộ lên Google Drive (${driveAccount?.email || 'Hệ thống'}) vào thư mục [${result.folderName}]: ${result.name}`);
    } catch (e) {
      console.error(e);
      showToast('Lỗi đồng bộ Google Drive.');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // PRINT TO PDF (Direct & Fallback Print Window)
  const handlePrintPdf = () => {
    const previewEl = document.getElementById('printable-contract-preview');
    if (!previewEl) return;

    try {
      window.print();
    } catch (e) {
      console.warn("Direct window.print() failed, opening print window", e);
      const printWin = window.open('', '_blank', 'width=900,height=1000');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <title>${formData.contract_number}</title>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap">
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: 'Noto Serif', 'Times New Roman', serif; font-size: 13pt; line-height: 1.6; color: #000; margin: 0; padding: 15px; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              .italic { font-style: italic; }
              .uppercase { text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              td, th { vertical-align: top; padding: 4px; }
              ul, ol { margin-top: 4px; margin-bottom: 4px; padding-left: 20px; }
            </style>
          </head>
          <body>
            <div>${previewEl.innerHTML}</div>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
          </html>
        `);
        printWin.document.close();
      }
    }
  };

  // Helper to replace dynamic variables in custom contract text
  const replaceVariablesInText = (text: string) => {
    if (!text) return '';
    let result = text;
    result = result.replace(/\{BÊN_A\}|\{BEN_A\}/gi, formData.party_a_name);
    result = result.replace(/\{BÊN_B\}|\{BEN_B\}/gi, formData.party_b_name || 'Bên B');
    result = result.replace(/\{SỐ_HĐ\}|\{SO_HD\}/gi, formData.contract_number);
    result = result.replace(/\{phuong_thuc_van_tai\}/gi, formData.transport_methods || 'Theo chỉ định của Bên B');
    result = result.replace(/\{han_chi_ho\}/gi, `${formData.payment_terms_disbursement || 3} ngày`);
    result = result.replace(/\{han_phi_dich_vu\}/gi, `${formData.payment_terms_service_days || 15} ngày`);
    result = result.replace(/\{lai_cham_thanh_toan\}/gi, showLatePaymentInterest ? (formData.late_payment_interest || '0.05%/ngày') : 'Không áp dụng theo thỏa thuận hai Bên');
    result = result.replace(/\{toa_an_giai_quyet\}/gi, formData.dispute_court || 'Tòa án có thẩm quyền tại HCMC');
    
    if (activeTemplate.dynamicVariables) {
      activeTemplate.dynamicVariables.forEach(v => {
        const val = customVariableValues[v.key] ?? v.defaultValue ?? '';
        const regex = new RegExp(`\\{${v.key}\\}`, 'gi');
        result = result.replace(regex, val);
      });
    }
    return cleanContractText(result);
  };

  // Auto-clean & repair character errors across form data and templates
  const handleAutoCleanAllText = () => {
    // 1. Clean form data
    const cleanedFormData = autoSanitizeFormData(formData);
    setFormData(cleanedFormData);

    // 2. Clean custom variable values
    const cleanedCustomVars: Record<string, string> = {};
    Object.keys(customVariableValues).forEach(k => {
      cleanedCustomVars[k] = cleanContractText(customVariableValues[k]);
    });
    setCustomVariableValues(cleanedCustomVars);

    // 3. Clean current template and update templates list
    const updatedTemplates = templates.map(tmpl => autoSanitizeTemplate(tmpl));
    saveTemplatesToStorage(updatedTemplates);

    showToast('Đã tự động lọc và sửa toàn bộ ký tự lỗi, mã lạ trong hợp đồng!');
  };

  // EXPORT NATIVE WORD DOCUMENT (.DOCX) - Complete 1-to-1 match with preview
  const handleExportWord = async () => {
    try {
      showToast('Đang tạo file Word (.docx) chuẩn khớp 100% với bản xem trước...');

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440, // 2.54cm
                bottom: 1440,
                left: 1134, // ~2cm
                right: 1134,
              },
            },
          },
          children: [
            // Dual Header Table (Company Left, Quốc hiệu Right)
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: formData.party_a_name.toUpperCase(), bold: true, size: 20, font: 'Times New Roman' }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: `Số: ${formData.contract_number}`, italics: true, size: 20, font: 'Times New Roman' }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 20, font: 'Times New Roman' }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: 'Độc lập – Tự do – Hạnh phúc', bold: true, size: 20, font: 'Times New Roman' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: '', spacing: { after: 150 } }),

            // Document Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 150, after: 80 },
              children: [
                new TextRun({ text: activeTemplate.title.toUpperCase(), bold: true, size: 28, font: 'Times New Roman' }),
              ],
            }),

            new Paragraph({ text: '', spacing: { after: 100 } }),

            // Legal Bases (Căn cứ pháp lý) - Căn lề 2 bên, size 12
            ...activeTemplate.legalBases.map(lb => 
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: `- Căn cứ ${lb};`, italics: true, size: 24, font: 'Times New Roman' }),
                ],
              })
            ),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              children: [
                new TextRun({ text: '- Căn cứ vào nhu cầu và khả năng thực tế của hai Bên.', italics: true, size: 24, font: 'Times New Roman' }),
              ],
            }),

            // Date & Opening - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 100, after: 100 },
              children: [
                new TextRun({ text: `Hôm nay, ngày ${formData.sign_date_day} tháng ${formData.sign_date_month} năm ${formData.sign_date_year}, tại ${formData.sign_location}, chúng tôi gồm có:`, size: 24, font: 'Times New Roman' }),
              ],
            }),

            // Party A - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 150, after: 40 },
              children: [
                new TextRun({ text: 'BÊN A (BÊN CUNG CẤP DỊCH VỤ): ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: formData.party_a_name.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Địa chỉ: ${formData.party_a_address}`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Mã số thuế: ${formData.party_a_tax}     Điện thoại: ${formData.party_a_phone}`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Người đại diện: ${formData.party_a_rep}     Chức vụ: ${formData.party_a_title}`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Số tài khoản: ${formData.party_a_bank}`, size: 24, font: 'Times New Roman' })] }),

            new Paragraph({ text: '', spacing: { after: 100 } }),

            // Party B - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: 'BÊN B (KHÁCH HÀNG / CHỦ HÀNG): ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: (formData.party_b_name || '..........................................................').toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Địa chỉ: ${formData.party_b_address || '......................................................................................................'}`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Mã số thuế: ${formData.party_b_tax || '......................'}     Điện thoại: ${formData.party_b_phone || '......................'}`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `- Người đại diện: ${formData.party_b_rep || '......................'}     Chức vụ: ${formData.party_b_title || '......................'}`, size: 24, font: 'Times New Roman' })] }),

            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 150, after: 150 },
              children: [
                new TextRun({ text: 'Sau khi thảo luận, hai Bên thống nhất ký kết hợp đồng với các điều khoản chi tiết như sau:', size: 24, font: 'Times New Roman' }),
              ],
            }),

            // Điều 1 - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 150, after: 60 },
              children: [
                new TextRun({ text: 'Điều 1: PHẠM VI DỊCH VỤ VÀ ỦY QUYỀN', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: activeTemplate.article1Scope, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Khối lượng/Số lượng: Căn cứ theo nhu cầu thực tế của Bên B và thông báo bằng văn bản/Email/Zalo theo từng lô hàng.', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `• Phương thức vận tải/thực hiện: ${formData.transport_methods}.`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Địa điểm giao nhận & Thời gian: Thực hiện theo chỉ định của Bên B cho từng lô hàng cụ thể.', size: 24, font: 'Times New Roman' })] }),

            // Điều 2 - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 180, after: 60 },
              children: [
                new TextRun({ text: 'Điều 2: GIÁ CẢ, PHÍ DỊCH VỤ VÀ THỜI HẠN THANH TOÁN', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '1. Giá dịch vụ và chi phí:', bold: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Phí dịch vụ: Theo báo giá/thỏa thuận từng thời điểm bằng văn bản/Email/Zalo/điện thoại và thể hiện trên Hóa đơn GTGT của Bên A;', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Chi phí thu/chi hộ: (Nâng hạ, phí cảng, phí LCC, phí kiểm tra chuyên ngành...): Căn cứ theo hóa đơn/chứng từ hợp lệ do bên thứ ba phát hành;', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Cước vận chuyển: Theo thỏa thuận bằng văn bản/Email/Zalo/điện thoại và thể hiện trên Hóa đơn GTGT của Bên A;', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Chi phí phát sinh bất khả kháng hoặc ngoài dự kiến: Bên A sẽ thông báo cho Bên B trước khi thực hiện. Bên B có trách nhiệm thanh toán khi có xác nhận.', size: 24, font: 'Times New Roman' })] }),

            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '2. Thời hạn thanh toán:', bold: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [
              new TextRun({ text: '• Đối với Thuế, Lệ phí Hải quan, Chi phí chi hộ: ', bold: true, size: 24, font: 'Times New Roman' }),
              new TextRun({ text: `Bên B có trách nhiệm chuyển tiền trước cho Bên A nộp/thanh toán, hoặc thanh toán lại ngay cho Bên A trong vòng ${formData.payment_terms_disbursement} ngày kể từ khi Bên A gửi thông báo/chứng từ;`, size: 24, font: 'Times New Roman' }),
            ]}),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [
              new TextRun({ text: '• Đối với Phí dịch vụ và cước vận chuyển: ', bold: true, size: 24, font: 'Times New Roman' }),
              new TextRun({ text: `Bên B thanh toán cho Bên A trong vòng ${formData.payment_terms_service_days} ngày kể từ ngày thông quan/giao hàng thành công;`, size: 24, font: 'Times New Roman' }),
            ]}),

            showLatePaymentInterest
              ? new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [
                  new TextRun({ text: '3. Lãi chậm thanh toán: ', bold: true, size: 24, font: 'Times New Roman' }),
                  new TextRun({ text: `Nếu Bên B chậm thanh toán quá thời hạn nêu trên, Bên B phải chịu lãi suất chậm thanh toán bằng ${formData.late_payment_interest} tính trên tổng số tiền chậm thanh toán.`, size: 24, font: 'Times New Roman' }),
                ] })
              : new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [
                  new TextRun({ text: '3. Lãi chậm thanh toán: ', bold: true, size: 24, font: 'Times New Roman' }),
                  new TextRun({ text: 'Không áp dụng theo thỏa thuận hai Bên.', italics: true, size: 24, font: 'Times New Roman' }),
                ] }),

            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: '4. Phương thức thanh toán: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: 'Chuyển khoản vào tài khoản ngân hàng của Bên A:', size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 360 },
              spacing: { before: 20, after: 20 },
              children: [
                new TextRun({ text: '• Tên đơn vị thụ hưởng: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: formData.party_a_name, bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 360 },
              spacing: { before: 20, after: 100 },
              children: [
                new TextRun({ text: '• Số tài khoản: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: formData.party_a_bank, bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),

            // Điều 3 - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 180, after: 60 },
              children: [
                new TextRun({ text: 'Điều 3: QUYỀN HẠN VÀ TRÁCH NHIỆM CỦA BÊN A', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '1. Thực hiện các công việc trong phạm vi ủy quyền của Bên B đúng quy định pháp luật.', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '2. Bảo mật toàn bộ thông tin kinh doanh, chứng từ do Bên B cung cấp;', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '3. Giới hạn trách nhiệm của Bên A:', bold: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Bên A chỉ chịu trách nhiệm đối với các sai sót trực tiếp do lỗi cố ý của Nhân viên Bên A trong quá trình xử lý tác nghiệp.', italics: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Tổng trách nhiệm bồi thường thiệt hại tối đa của Bên A (nếu có) không vượt quá tổng phí dịch vụ thu được từ lô hàng xảy ra sự cố.', italics: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '• Bên A hoàn toàn miễn trừ trách nhiệm đối với các tổn thất xuất phát từ việc Bên B cung cấp chứng từ/thông tin sai lệch hoặc chậm trễ.', italics: true, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '4. Quyền tạm dừng dịch vụ: Bên A có quyền tạm dừng dịch vụ nếu Bên B chưa hoàn thành nghĩa vụ thanh toán các khoản nợ quá hạn.', size: 24, font: 'Times New Roman' })] }),

            // Điều 4 - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 180, after: 60 },
              children: [
                new TextRun({ text: 'Điều 4: QUYỀN HẠN VÀ TRÁCH NHIỆM CỦA BÊN B', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '1. Cung cấp đầy đủ, chính xác, trung thực và kịp thời toàn bộ hồ sơ, chứng từ liên quan trước khi làm dịch vụ.', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '2. Chịu trách nhiệm hoàn toàn trước Pháp luật về tính hợp pháp và chính xác của toàn bộ bộ chứng từ cung cấp cho Bên A.', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '3. Thanh toán đầy đủ, đúng hạn Phí dịch vụ và các khoản chi hộ cho Bên A theo quy định tại Điều 2.', size: 24, font: 'Times New Roman' })] }),

            // Điều 5 - Căn lề 2 bên, size 12
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 180, after: 60 },
              children: [
                new TextRun({ text: 'Điều 5: ĐIỀU KHOẢN CHUNG', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '1. Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản trong Hợp đồng này. Mọi sửa đổi, bổ sung phải được lập thành Phụ lục hợp đồng bằng văn bản.', size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `2. Trường hợp phát sinh tranh chấp, hai Bên ưu tiên thương lượng. Nếu không giải quyết được trong 30 ngày, tranh chấp sẽ được giải quyết tại ${formData.dispute_court}.`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: `3. Hợp đồng này có hiệu lực ${formData.effective_years} (một) năm kể từ ngày ký và tự động gia hạn nếu hai bên không có ý kiến phản đối.`, size: 24, font: 'Times New Roman' })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: '4. Hợp đồng được lập thành 02 (hai) bản gốc có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản.', size: 24, font: 'Times New Roman' })] }),

            new Paragraph({ text: '', spacing: { after: 300 } }),

            // Signature Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐẠI DIỆN BÊN A', bold: true, size: 22, font: 'Times New Roman' })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên và đóng dấu)', italics: true, size: 18, font: 'Times New Roman' })] }),
                        new Paragraph({ text: '', spacing: { after: 600 } }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formData.party_a_rep, bold: true, size: 22, font: 'Times New Roman' })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formData.party_a_title, size: 20, font: 'Times New Roman' })] }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐẠI DIỆN BÊN B', bold: true, size: 22, font: 'Times New Roman' })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên và đóng dấu)', italics: true, size: 18, font: 'Times New Roman' })] }),
                        new Paragraph({ text: '', spacing: { after: 600 } }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formData.party_b_rep || '..........................................', bold: true, size: 22, font: 'Times New Roman' })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formData.party_b_title || '....................', size: 20, font: 'Times New Roman' })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `HopDong_${activeTemplate.codePrefix}_${formData.contract_number.replace(/[\/\\]/g, '_')}.docx`;
      saveAs(blob, fileName);
      showToast(`Đã xuất file Word (.docx) chuẩn khớp 100% bản xem trước!`);
    } catch (err) {
      console.error("Error generating docx:", err);
      showToast("Có lỗi xảy ra khi tạo file Word. Vui lòng thử lại.");
    }
  };


  // AI Optimization presets
  const handleAiOptimize = (type: 'strict' | 'standard' | 'expand') => {
    setAiAnalyzing(true);
    setTimeout(() => {
      if (type === 'strict') {
        setFormData((prev) => ({
          ...prev,
          payment_terms_disbursement: '02 (hai)',
          payment_terms_service_days: '07 đến 15',
          late_payment_interest: '0.1%/ngày',
        }));
        setShowLatePaymentInterest(true);
        showToast('AI: Đã siết chặt điều khoản thanh toán (07 đến 15 ngày, lãi chậm trả 0.1%/ngày).');
      } else if (type === 'expand') {
        setFormData((prev) => ({
          ...prev,
          transport_methods: 'Đường biển, đường bộ, đường hàng không, đường sắt, chuyển phát nhanh quốc tế, logistics liên vận',
        }));
        showToast('AI: Đã mở rộng phương thức vận tải & logistics liên vận.');
      } else {
        setFormData((prev) => ({
          ...prev,
          payment_terms_disbursement: '03 (ba)',
          payment_terms_service_days: '15 đến 30',
          late_payment_interest: '0.05%/ngày',
          transport_methods: 'Đường biển, đường bộ, đường hàng không, đường sắt',
        }));
        setShowLatePaymentInterest(true);
        showToast('AI: Đã khôi phục quy chuẩn mẫu hợp đồng Hải quan 2025.');
      }
      setAiAnalyzing(false);
    }, 600);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#1A202C] text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: Add New Custom Template */}
      {isAddTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Thêm & Tải lên Mẫu Hợp đồng Mới</span>
              </div>
              <button 
                onClick={() => setIsAddTemplateOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tên loại hợp đồng *</label>
                <input
                  type="text"
                  value={newTemplateForm.name}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ví dụ: Hợp đồng Mua bán Hàng hóa Quốc tế"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phân loại / Danh mục</label>
                  <input
                    type="text"
                    value={newTemplateForm.category}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="ví dụ: Mua bán & Thương mại"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mã hiệu hợp đồng</label>
                  <input
                    type="text"
                    value={newTemplateForm.codePrefix}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, codePrefix: e.target.value }))}
                    placeholder="ví dụ: SPV-MBHH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tiêu đề hợp đồng (In hoa) *</label>
                <input
                  type="text"
                  value={newTemplateForm.title}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ví dụ: HỢP ĐỒNG MUA BÁN HÀNG HÓA QUỐC TẾ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Các căn cứ pháp lý (Mỗi dòng 1 căn cứ)</label>
                <textarea
                  rows={3}
                  value={newTemplateForm.legalBasesText}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, legalBasesText: e.target.value }))}
                  placeholder="Bộ luật Dân sự số 91/2015/QH13&#10;Luật Thương mại số 36/2005/QH11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-serif focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Phạm vi ủy quyền / Dịch vụ (Điều 1)</label>
                <textarea
                  rows={2}
                  value={newTemplateForm.article1Scope}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, article1Scope: e.target.value }))}
                  placeholder="Mô tả phạm vi hợp đồng..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddTemplateOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddNewTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Tạo Form & Mẫu mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Controls & Category Selector */}
      <div className="flex flex-col space-y-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/contracts')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Soạn thảo Hợp đồng
              </h1>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AUTO-CLEAN & REPAIR CHARACTERS BUTTON */}
            <button
              type="button"
              onClick={handleAutoCleanAllText}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5"
              title="Tự động loại bỏ ký tự lỗi, mã lạ, khoảng trắng thừa trong mẫu và nội dung hợp đồng"
            >
              <Wand2 className="w-4 h-4 text-slate-950" />
              <span>Sửa ký tự lỗi</span>
            </button>

            {/* WORD EXPORT BUTTON */}
            <button
              onClick={handleExportWord}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-emerald-100" />
              <span>Xuất file Word (.docx)</span>
            </button>

            <button
              onClick={handleSaveToDb}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Hợp đồng'}</span>
            </button>

            <button
              onClick={handleUploadDrive}
              disabled={isSyncingDrive}
              className="px-3.5 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <HardDrive className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span>{isSyncingDrive ? 'Đang đồng bộ...' : 'Lưu Google Drive'}</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-slate-800 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>In PDF / In Hợp đồng</span>
            </button>

          </div>
        </div>

        {/* REQUIREMENT 1: CONTRACT TEMPLATE DROPDOWN & ADD CUSTOM TEMPLATE BUTTON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-3 flex-1">
            <label className="text-xs font-bold text-slate-800 shrink-0 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Chọn Mẫu Hợp đồng:</span>
            </label>
            <div className="relative flex-1 max-w-md">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs font-semibold text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    [{tmpl.category}] {tmpl.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsManageTemplatesOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Xem & quản lý toàn bộ danh sách mẫu hợp đồng"
            >
              <FolderKanban className="w-4 h-4 text-amber-400" />
              <span>Quản lý mẫu</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddTemplateOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm mẫu mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Smart Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-5 overflow-y-auto max-h-[880px]">
          {/* AI Helper Banner */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" /> Trợ lý AI & Trích xuất MST
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">VietQR API Active</span>
            </div>
            <p className="text-[11px] text-gray-300">
              Nhập Mã số thuế doanh nghiệp và bấm nút <strong className="text-amber-300">"Trích xuất MST"</strong> để điền tự động Tên công ty & Địa chỉ trụ sở.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleAiOptimize('strict')}
                disabled={aiAnalyzing}
                className="px-2.5 py-1 bg-blue-600/60 hover:bg-blue-600 text-[10px] font-semibold rounded text-white border border-blue-400/30 transition-colors"
              >
                Siết nợ 15 ngày
              </button>
              <button
                type="button"
                onClick={() => handleAiOptimize('expand')}
                disabled={aiAnalyzing}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-[10px] font-semibold rounded text-gray-200 border border-gray-700 transition-colors"
              >
                Mở rộng Vận tải
              </button>
              <button
                type="button"
                onClick={() => handleAiOptimize('standard')}
                disabled={aiAnalyzing}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-[10px] font-semibold rounded text-emerald-100 border border-emerald-600 transition-colors"
              >
                Chuẩn Mẫu 2025
              </button>
            </div>
          </div>

          {/* Section 1: Hợp đồng & Tiêu đề */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" /> 1. Thông tin Tiêu đề & Số Hợp đồng
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Số Hợp đồng *</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => handleInputChange('contract_number', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Địa điểm ký *</label>
                <input
                  type="text"
                  value={formData.sign_location}
                  onChange={(e) => handleInputChange('sign_location', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Ngày ký hợp đồng</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={formData.sign_date_day}
                    onChange={(e) => handleInputChange('sign_date_day', e.target.value)}
                    className="w-12 text-center px-1 py-1 border border-gray-300 rounded"
                    placeholder="Ngày"
                  />
                  <input
                    type="text"
                    value={formData.sign_date_month}
                    onChange={(e) => handleInputChange('sign_date_month', e.target.value)}
                    className="w-12 text-center px-1 py-1 border border-gray-300 rounded"
                    placeholder="Tháng"
                  />
                  <input
                    type="text"
                    value={formData.sign_date_year}
                    onChange={(e) => handleInputChange('sign_date_year', e.target.value)}
                    className="w-16 text-center px-1 py-1 border border-gray-300 rounded"
                    placeholder="Năm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Giá trị lô hàng/Hợp đồng (VNĐ)</label>
                <input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => handleInputChange('contract_value', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bên A (Đơn vị cung cấp dịch vụ) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" /> 2. Bên A (Bên Cung cấp Dịch vụ)
              </span>
              <button
                type="button"
                onClick={handleExtractTaxCodeA}
                disabled={extractingPartyA}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {extractingPartyA ? 'Đang trích xuất...' : 'Trích xuất MST A'}
              </button>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <label className="block text-gray-600 font-medium mb-0.5">Mã số thuế Bên A *</label>
                  <input
                    type="text"
                    value={formData.party_a_tax}
                    onChange={(e) => handleInputChange('party_a_tax', e.target.value)}
                    placeholder="ví dụ: 0202146805"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <button
                    type="button"
                    onClick={handleExtractTaxCodeA}
                    disabled={extractingPartyA}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lấy dữ liệu</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium">Tên Công ty Bên A</label>
                <input
                  type="text"
                  value={formData.party_a_name}
                  onChange={(e) => handleInputChange('party_a_name', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium">Địa chỉ trụ sở</label>
                <input
                  type="text"
                  value={formData.party_a_address}
                  onChange={(e) => handleInputChange('party_a_address', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 font-medium">Điện thoại</label>
                  <input
                    type="text"
                    value={formData.party_a_phone}
                    onChange={(e) => handleInputChange('party_a_phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Người đại diện</label>
                  <input
                    type="text"
                    value={formData.party_a_rep}
                    onChange={(e) => handleInputChange('party_a_rep', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 font-medium">Chức vụ</label>
                  <input
                    type="text"
                    value={formData.party_a_title}
                    onChange={(e) => handleInputChange('party_a_title', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Tài khoản Ngân hàng thụ hưởng</label>
                  <input
                    type="text"
                    value={formData.party_a_bank}
                    onChange={(e) => handleInputChange('party_a_bank', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bên B (Khách hàng/Chủ hàng) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" /> 3. Bên B (Khách hàng / Chủ hàng)
              </span>
              <button
                type="button"
                onClick={handleExtractTaxCodeB}
                disabled={extractingPartyB}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {extractingPartyB ? 'Đang trích xuất...' : 'Trích xuất MST B'}
              </button>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-blue-900 font-bold text-xs flex items-center gap-1">
                    <span>Mã số thuế Bên B *</span>
                    <span className="text-[10px] text-gray-500 font-normal">(Auto lookup)</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.party_b_tax}
                    onChange={(e) => handleInputChange('party_b_tax', e.target.value)}
                    placeholder="ví dụ: 0110012544"
                    className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleExtractTaxCodeB}
                    disabled={extractingPartyB}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${extractingPartyB ? 'animate-spin' : ''}`} />
                    <span>{extractingPartyB ? 'Đang tìm...' : 'Trích xuất MST'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium">Tên Công ty Bên B *</label>
                <input
                  type="text"
                  value={formData.party_b_name}
                  onChange={(e) => handleInputChange('party_b_name', e.target.value)}
                  placeholder="Nhập tên công ty hoặc trích xuất tự động từ MST"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium">Địa chỉ trụ sở *</label>
                <textarea
                  rows={2}
                  value={formData.party_b_address}
                  onChange={(e) => handleInputChange('party_b_address', e.target.value)}
                  placeholder="Nhập địa chỉ trụ sở"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 font-medium">Điện thoại</label>
                  <input
                    type="text"
                    value={formData.party_b_phone}
                    onChange={(e) => handleInputChange('party_b_phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Người đại diện</label>
                  <input
                    type="text"
                    value={formData.party_b_rep}
                    onChange={(e) => handleInputChange('party_b_rep', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 font-medium">Chức vụ</label>
                  <input
                    type="text"
                    value={formData.party_b_title}
                    onChange={(e) => handleInputChange('party_b_title', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Tài khoản Ngân hàng (nếu có)</label>
                  <input
                    type="text"
                    value={formData.party_b_bank}
                    onChange={(e) => handleInputChange('party_b_bank', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Ô Dữ Liệu Chỉnh Sửa Cố Định (Lựa Chọn Thủ Công Theo Yêu Cầu) */}
          <div className="space-y-3 pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> 4. Ô Dữ Liệu Chỉnh Sửa Cố Định ({activeTemplate.name})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsSelectionModeActive(!isSelectionModeActive);
                  if (!isSelectionModeActive) {
                    showToast('Đã bật chế độ chọn! Dùng chuột bôi đen đoạn chữ trên bản hợp đồng bên phải để cố định ô sửa.');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border ${
                  isSelectionModeActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs animate-pulse'
                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSelectionModeActive ? 'Đang bật chọn' : 'Click chọn chỗ sửa'}</span>
              </button>
            </div>

            {/* Instruction banner */}
            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <span>💡 Cách tạo ô dữ liệu cố định:</span>
              </p>
              <p>
                Bật nút <strong>"Click chọn chỗ sửa"</strong>, sau đó dùng chuột bôi đen đoạn chữ trên bản xem trước hợp đồng bên phải để cố định thành ô sửa dữ liệu cho các lần tiếp theo!
              </p>
            </div>

            {/* List of dynamic fixed variables for this template */}
            {activeTemplate.dynamicVariables && activeTemplate.dynamicVariables.length > 0 ? (
              <div className="space-y-2.5 text-xs pt-1">
                {activeTemplate.dynamicVariables.map((v) => (
                  <div key={v.key} className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-800 font-bold text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>{v.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteFixedVariable(v.key)}
                        title="Xóa ô dữ liệu cố định này"
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customVariableValues[v.key] ?? v.defaultValue ?? ''}
                      onChange={(e) => setCustomVariableValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={v.defaultValue || 'Nhập nội dung...'}
                      className="w-full px-2.5 py-1.5 border border-amber-300 bg-amber-50/20 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 px-2 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs italic">
                Chưa có ô dữ liệu cố định nào cho mẫu này. Click chọn đoạn chữ trên bản xem trước bên phải để tạo!
              </div>
            )}
          </div>
        </div>

        {/* Live Structured Document Preview Panel (REQUIREMENT 2: Font fix & REQUIREMENT 6: Alignments) */}
        <div 
          className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-md p-8 overflow-y-auto max-h-[880px] text-slate-900 leading-relaxed text-[13px] contract-document relative"
        >
          <div 
            id="printable-contract-preview" 
            className="space-y-4 print:p-0 contract-document"
            onMouseUp={handleSelectionMouseUp}
            onKeyUp={handleSelectionMouseUp}
          >
            {/* Dual Header Table */}
            <div className="grid grid-cols-2 border-b border-gray-300 pb-3 text-center font-sans">
              <div className="space-y-0.5">
                <p className="font-bold text-xs uppercase tracking-tight">{formData.party_a_name}</p>
                <p className="text-[11px] font-semibold text-gray-600 italic">Số {formData.contract_number}</p>
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[11px] font-semibold text-gray-700">Độc lập – Tự do – Hạnh Phúc</p>
                <div className="w-20 border-b border-gray-800 mx-auto pt-0.5"></div>
              </div>
            </div>

            {/* REQUIREMENT 6: Document Title - ALWAYS CENTERED */}
            <div className="text-center pt-2 space-y-2">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 text-center font-sans">
                {activeTemplate.title}
              </h2>
            </div>

            {/* REQUIREMENT 6: Legal Basis Section - ALWAYS LEFT ALIGNED */}
            <div className="text-[11.5px] italic text-slate-800 space-y-1 font-serif text-left pt-1 pb-1 px-1">
              {activeTemplate.legalBases.map((base, idx) => (
                <p key={idx}>Căn cứ {base};</p>
              ))}
              <p>Căn cứ vào nhu cầu và khả năng thực tế của hai Bên.</p>
            </div>

            {/* Location & Opening */}
            <div className="pt-2 font-serif text-slate-800">
              <p>
                Hôm nay, ngày {formData.sign_date_day} tháng {formData.sign_date_month} năm {formData.sign_date_year}, tại {formData.sign_location}, chúng tôi gồm có:
              </p>
            </div>

            {/* Party Details */}
            <div className="space-y-3 font-sans text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded border border-gray-200">
                <p className="font-bold text-slate-900">
                  BÊN A (BÊN CUNG CẤP DỊCH VỤ): <span className="uppercase text-blue-700">{formData.party_a_name}</span>
                </p>
                <p><span className="text-gray-500">Địa chỉ:</span> {formData.party_a_address}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-gray-500">Mã số thuế:</span> <span className="font-mono font-semibold">{formData.party_a_tax}</span></p>
                  <p><span className="text-gray-500">Điện thoại:</span> {formData.party_a_phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <p><span className="text-gray-500">Đại diện:</span> <span className="font-bold">{formData.party_a_rep}</span></p>
                  <p><span className="text-gray-500">Chức vụ:</span> {formData.party_a_title}</p>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded border border-gray-200">
                <p className="font-bold text-slate-900">
                  BÊN B (KHÁCH HÀNG / CHỦ HÀNG): <span className="uppercase text-emerald-700">{formData.party_b_name || '..........................................................'}</span>
                </p>
                <p><span className="text-gray-500">Địa chỉ:</span> {formData.party_b_address || '......................................................................................................'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-gray-500">Mã số thuế:</span> <span className="font-mono font-semibold">{formData.party_b_tax || '......................'}</span></p>
                  <p><span className="text-gray-500">Điện thoại:</span> {formData.party_b_phone || '......................'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <p><span className="text-gray-500">Đại diện:</span> <span className="font-bold">{formData.party_b_rep || '......................'}</span></p>
                  <p><span className="text-gray-500">Chức vụ:</span> {formData.party_b_title || '......................'}</p>
                </div>
              </div>

              <p className="font-serif text-slate-800 text-[12px] pt-1">
                Sau khi thảo luận, hai Bên thống nhất ký kết hợp đồng với các điều khoản chi tiết như sau:
              </p>
            </div>

            {/* Complete Articles Rendered dynamically */}
            <div className="space-y-4 pt-1 font-serif text-slate-800 leading-relaxed text-[12.5px]">
              {getTemplateArticles(activeTemplate).map((art, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="font-bold font-sans text-xs uppercase text-slate-900 mb-1">
                    {art.number}: {art.title}
                  </p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {replaceVariablesInText(art.content)}
                  </p>
                </div>
              ))}
            </div>

            {/* Signature Block */}
            <div className="pt-6 grid grid-cols-2 text-center font-sans text-xs gap-4 border-t border-gray-200 mt-6">
              <div className="space-y-12">
                <div>
                  <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN A</p>
                  <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
                </div>
                <div className="pt-8">
                  <p className="font-bold text-slate-900">{formData.party_a_rep}</p>
                  <p className="text-[11px] text-gray-600">{formData.party_a_title}</p>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN B</p>
                  <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
                </div>
                <div className="pt-8">
                  <p className="font-bold text-slate-900">{formData.party_b_rep || '..........................................'}</p>
                  <p className="text-[11px] text-gray-600">{formData.party_b_title || '....................'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Popover Button appearing right next to highlighted text selection */}
          {floatingPopoverPos && (
            <div
              style={{
                position: 'fixed',
                top: `${floatingPopoverPos.top}px`,
                left: `${floatingPopoverPos.left}px`,
                zIndex: 9999,
              }}
              className="animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl shadow-2xl border border-amber-300 font-sans text-xs font-bold select-none cursor-pointer"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCheckSelectedTextFromPreview(floatingPopoverPos.text);
                  setFloatingPopoverPos(null);
                }}
                className="flex items-center gap-1.5 text-white hover:text-amber-100"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
                <span>Tạo ô sửa ngay</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFloatingPopoverPos(null);
                  setCapturedSelectedText('');
                }}
                className="ml-1 p-0.5 text-amber-200 hover:text-white rounded-md hover:bg-amber-600/60 transition-colors"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Folder Selector Modal */}
      <GoogleDriveFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={handlePerformUploadDrive}
        fileName={`HopDong_${activeTemplate.codePrefix}_${formData.contract_number.replace(/\//g, '_')}.html`}
        isSyncing={isSyncingDrive}
      />

      {/* Manage Templates Modal */}
      {isManageTemplatesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                  <FolderKanban className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Quản Lý Danh Sách Mẫu Hợp Đồng</h3>
                  <p className="text-xs text-slate-300">Tổng số mẫu khả dụng: {templates.length} mẫu</p>
                </div>
              </div>
              <button
                onClick={() => setIsManageTemplatesOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Tìm kiếm mẫu hợp đồng..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleRestoreDefaultTemplates}
                  className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Khôi phục danh sách mẫu ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Khôi phục</span>
                </button>

                <label className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors">
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{isUploadingTemplate ? 'Đang đọc...' : 'Tải tệp (.md)'}</span>
                  <input
                    type="file"
                    accept=".md"
                    onChange={handleUploadTemplateFile}
                    disabled={isUploadingTemplate}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsManageTemplatesOpen(false);
                    setIsAddTemplateOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Mẫu thủ công</span>
                </button>
              </div>
            </div>

            {/* Template List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {templates
                .filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.category.toLowerCase().includes(templateSearch.toLowerCase()))
                .map((tmpl) => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tmpl.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] uppercase tracking-wider">
                            {tmpl.category}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[10px]">
                            {tmpl.codePrefix}
                          </span>
                          {tmpl.isCustom ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded text-[10px]">
                              Tùy chỉnh
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-semibold rounded text-[10px]">
                              Hệ thống
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{tmpl.name}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{tmpl.article1Scope}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectTemplate(tmpl.id);
                              setIsManageTemplatesOpen(false);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Chọn mẫu
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsManageTemplatesOpen(false);
                            handleOpenEditTemplate(tmpl);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200/80 flex items-center justify-center transition-colors"
                          title="Sửa mẫu hợp đồng"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTemplateToDelete(tmpl)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200/80 flex items-center justify-center transition-colors"
                          title="Xóa mẫu hợp đồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Template Modal */}
      {isAddTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Thêm Mẫu Hợp Đồng Mới</span>
              </div>
              <button 
                onClick={() => setIsAddTemplateOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart File Upload Option */}
            <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <FileUp className="w-4 h-4 text-amber-600" /> Tự động phân tích từ tệp Markdown (.md):
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Tải tệp hợp đồng mẫu chuẩn định dạng Markdown (.md). AI sẽ tự động phân tích 100% nội dung tệp, trích xuất tất cả các điều khoản và biến số thông minh!
              </p>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg cursor-pointer text-xs transition-colors shadow-xs">
                <Upload className="w-4 h-4" />
                <span>{isUploadingTemplate ? 'Đang phân tích...' : 'Tải tệp mẫu (.md)'}</span>
                <input
                  type="file"
                  accept=".md"
                  onChange={(e) => {
                    setIsAddTemplateOpen(false);
                    handleUploadTemplateFile(e);
                  }}
                  disabled={isUploadingTemplate}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-gray-200 w-full"></div>
              <span className="bg-white px-2 text-[11px] text-gray-400 font-medium absolute uppercase">Hoặc nhập thủ công</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tên mẫu hợp đồng *</label>
                <input
                  type="text"
                  value={newTemplateForm.name}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Mẫu Hợp đồng Đại lý Hải quan SPV"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Phân loại / Nhóm hợp đồng *</label>
                <input
                  type="text"
                  value={newTemplateForm.category}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ví dụ: Hải quan & Thông quan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mã hiệu hợp đồng</label>
                  <input
                    type="text"
                    value={newTemplateForm.codePrefix}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, codePrefix: e.target.value }))}
                    placeholder="SPV-HQ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Tiêu đề hợp đồng</label>
                  <input
                    type="text"
                    value={newTemplateForm.title}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="HỢP ĐỒNG DỊCH VỤ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Các căn cứ pháp lý (Mỗi dòng 1 căn cứ)</label>
                <textarea
                  rows={3}
                  value={newTemplateForm.legalBasesText}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, legalBasesText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-serif focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Phạm vi ủy quyền / Dịch vụ (Điều 1)</label>
                <textarea
                  rows={2}
                  value={newTemplateForm.article1Scope}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, article1Scope: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddTemplateOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddNewTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Thêm thủ công</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal (Cập nhật đầy đủ thông tin mẫu và tất cả các Điều khoản Hợp đồng) */}
      {isEditTemplateModalOpen && templateToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Sửa Mẫu Hợp Đồng & Tất Cả Các Điều Khoản</span>
              </div>
              <button 
                onClick={() => setIsEditTemplateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Tên mẫu hợp đồng *</label>
                  <input
                    type="text"
                    value={editTemplateForm.name}
                    onChange={(e) => setEditTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phân loại / Nhóm hợp đồng *</label>
                  <input
                    type="text"
                    value={editTemplateForm.category}
                    onChange={(e) => setEditTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mã hiệu hợp đồng</label>
                  <input
                    type="text"
                    value={editTemplateForm.codePrefix}
                    onChange={(e) => setEditTemplateForm(prev => ({ ...prev, codePrefix: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Tiêu đề hợp đồng (In hoa)</label>
                  <input
                    type="text"
                    value={editTemplateForm.title}
                    onChange={(e) => setEditTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Các căn cứ pháp lý (Mỗi dòng 1 căn cứ)</label>
                <textarea
                  rows={2}
                  value={editTemplateForm.legalBasesText}
                  onChange={(e) => setEditTemplateForm(prev => ({ ...prev, legalBasesText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-serif focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              {/* KHẮC PHỤC LỖI: Hiển thị đầy đủ tất cả các Điều khoản Hợp đồng (Điều 1, Điều 2, Điều 3, Điều 4, Điều 5...) */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>Toàn bộ các Phần & Điều khoản trong Hợp đồng ({editTemplateForm.customArticles.length} điều)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newArtNumber = `Điều ${editTemplateForm.customArticles.length + 1}`;
                      setEditTemplateForm(prev => ({
                        ...prev,
                        customArticles: [
                          ...prev.customArticles,
                          { number: newArtNumber, title: 'TIÊU ĐỀ ĐIỀU KHOẢN MỚI', content: 'Nội dung điều khoản...' }
                        ]
                      }));
                    }}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm điều khoản mới</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {editTemplateForm.customArticles.map((art, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Số / Thứ tự điều</label>
                          <input
                            type="text"
                            value={art.number}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditTemplateForm(prev => ({
                                ...prev,
                                customArticles: prev.customArticles.map((a, i) => i === idx ? { ...a, number: val } : a)
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div className="col-span-8">
                          <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Tiêu đề điều khoản (In hoa)</label>
                          <input
                            type="text"
                            value={art.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditTemplateForm(prev => ({
                                ...prev,
                                customArticles: prev.customArticles.map((a, i) => i === idx ? { ...a, title: val } : a)
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div className="col-span-1 flex items-end justify-center pb-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTemplateForm(prev => ({
                                ...prev,
                                customArticles: prev.customArticles.filter((_, i) => i !== idx)
                              }));
                            }}
                            title="Xóa điều khoản này"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Nội dung chi tiết điều khoản</label>
                        <textarea
                          rows={3}
                          value={art.content}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTemplateForm(prev => ({
                              ...prev,
                              customArticles: prev.customArticles.map((a, i) => i === idx ? { ...a, content: val } : a)
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-serif leading-relaxed text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditTemplateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu toàn bộ thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Ô Dữ Liệu Cố Định Khi Bôi Đen Text */}
      {selectedTextToCreateVar.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Cố Định Ô Dữ Liệu Chỉnh Sửa</span>
              </div>
              <button 
                onClick={() => setSelectedTextToCreateVar({ isOpen: false, selectedText: '', varLabel: '' })}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Đoạn văn bản đã chọn trên hợp đồng:</label>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-slate-900 font-serif italic text-xs leading-relaxed">
                  "{selectedTextToCreateVar.selectedText}"
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tên nhãn hiển thị ở cột nhập liệu (Ví dụ: Địa điểm hạ bãi, Cước biển...)</label>
                <input
                  type="text"
                  value={selectedTextToCreateVar.varLabel}
                  onChange={(e) => setSelectedTextToCreateVar(prev => ({ ...prev, varLabel: e.target.value }))}
                  placeholder="Nhập tên nhãn hiển thị..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedTextToCreateVar({ isOpen: false, selectedText: '', varLabel: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateFixedVariable}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận & Cố định ô sửa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Xác Nhận Xóa Mẫu Hợp Đồng</h3>
                <p className="text-xs text-gray-500">Hành động này sẽ loại bỏ mẫu khỏi danh sách</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-800">{templateToDelete.name}</p>
              <p className="text-gray-600 font-mono text-[11px]">Mã hiệu: {templateToDelete.codePrefix}</p>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa mẫu hợp đồng này khỏi hệ thống không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTemplate(templateToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
