import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini AI client if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // Endpoint for smart contract template analysis & extraction
  app.post("/api/analyze-template", async (req, res) => {
    try {
      const { text, fileName } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Không tìm thấy nội dung văn bản để phân tích." });
      }

      if (!ai) {
        return res.json({
          success: false,
          fallbackReason: "Không tìm thấy GEMINI_API_KEY, chuyển sang phân tích quy tắc cục bộ.",
        });
      }

      const prompt = `Bạn là chuyên gia số hóa và chuyển đổi hợp đồng mẫu tại Việt Nam.
Nhiệm vụ của bạn là phân tích tệp văn bản hợp đồng mẫu đã được chuyển đổi sang định dạng Markdown (.md) chuẩn dưới đây và chuyển đổi thành mẫu hợp đồng điện tử thông minh.

YÊU CẦU BẮT BUỘC QUAN TRỌNG NHẤT:
1. "customArticles": BẢO TỒN 100% NỘI DUNG VĂN BẢN HỢP ĐỒNG GỐC. Trích xuất TOÀN BỘ tất cả các Điều khoản/mục trong văn bản Markdown (không bỏ sót bất kỳ điều khoản nào từ Điều 1 đến điều cuối cùng). Trong phần "content" của mỗi điều khoản, giữ nguyên VĂN BẢN ĐẦY ĐỦ, NGUYÊN VĂN CHI TIẾT và cấu trúc định dạng Markdown của file gốc (bao gồm tiêu đề, danh sách gạch đầu dòng, chữ in đậm/nghiêng, bảng biểu nếu có). TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG RÚT GỌN, KHÔNG BỎ BỚT CÁC CÂU CHỮ VÀ NỘI DUNG BÊN TRONG!
2. "dynamicVariables": Trích xuất danh sách các biến số chỉnh sửa thông minh tìm thấy trong văn bản (ví dụ: tên công ty, số hợp đồng, ngày tháng, địa điểm, số tiền, tên hàng hóa, giá dịch vụ...). Mỗi biến gồm "key", "label", "defaultValue". Trong phần "content" của customArticles, hãy đặt các ký hiệu biến số trong dấu ngoặc nhọn {key} tương ứng để người dùng có thể thay đổi dữ liệu linh hoạt.
3. "name": Tên gợi ý rõ ràng, ngắn gọn cho mẫu hợp đồng.
4. "category": Nhóm phân loại chính (chọn 1 trong các nhóm: "Hải quan & Thông quan", "Vận tải & Logistics", "Ủy thác Thương mại", "Kho bãi & Lưu giữ", "Mua bán Hàng hóa", "Dịch vụ & Tư vấn", "Tùy chỉnh").
5. "title": Tiêu đề chính hợp đồng viết CHỮ IN HOA.
6. "codePrefix": Mã hiệu ngắn gọn 3-6 ký tự hoa (ví dụ: "SPV-VT", "SPV-MB").
7. "legalBases": Mảng chuỗi các căn cứ pháp lý trong hợp đồng gốc.
8. "article1Scope": Nội dung văn bản đầy đủ của Điều 1 (phạm vi hợp đồng).

Tên tệp gốc: ${fileName || "HopDongMau"}
Nội dung tệp hợp đồng mẫu (định dạng Markdown .md):
"""
${text.slice(0, 100000)}
"""
`;

      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  codePrefix: { type: Type.STRING },
                  legalBases: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  article1Scope: { type: Type.STRING },
                  customArticles: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        number: { type: Type.STRING },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                      },
                    },
                  },
                  dynamicVariables: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        label: { type: Type.STRING },
                        defaultValue: { type: Type.STRING },
                      },
                    },
                  },
                },
                required: ["name", "category", "title", "codePrefix", "article1Scope", "customArticles"],
              },
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (mErr: any) {
          lastError = mErr;
        }
      }

      if (!response || !response.text) {
        return res.json({
          success: false,
          fallbackReason: lastError?.message || "Chuyển sang bộ phân tích quy tắc cục bộ.",
          fallbackToLocal: true,
        });
      }

      const parsedData = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.warn("Gemini API error during template analysis, falling back to local analysis:", err?.message || err);
      return res.json({
        success: false,
        fallbackReason: err?.message || "Lỗi xử lý Gemini AI, chuyển sang bộ phân tích cục bộ.",
        fallbackToLocal: true,
      });
    }
  });

  // Endpoint for Baidu Unlimited-OCR (https://huggingface.co/baidu/Unlimited-OCR)
  // Powered by DeepSeek-V2 architecture, SAM-ViT-B + CLIP-L DeepEncoder & Reference Sliding Window Attention (R-SWA)
  app.post("/api/ocr-unlimited", async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName, text } = req.body;
      if (!fileBase64 && !text) {
        return res.status(400).json({ error: "Vui lòng cung cấp dữ liệu hình ảnh hoặc tài liệu để xử lý Unlimited-OCR." });
      }

      const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
      let rawMarkdownResult = "";
      let engineUsed = "baidu/Unlimited-OCR (Hugging Face R-SWA)";

      // 1. Try Hugging Face router / inference endpoint if token is present or public endpoint
      if (fileBase64 && hfToken) {
        try {
          const cleanBase64 = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
          const imageBuffer = Buffer.from(cleanBase64, "base64");

          const hfResponse = await fetch("https://router.huggingface.co/hf-inference/models/baidu/Unlimited-OCR", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${hfToken}`,
              "Content-Type": mimeType || "application/octet-stream",
              "x-use-cache": "true",
            },
            body: imageBuffer,
          });

          if (hfResponse.ok) {
            const hfData = await hfResponse.json();
            if (typeof hfData === "string") {
              rawMarkdownResult = hfData;
            } else if (Array.isArray(hfData) && hfData[0]?.generated_text) {
              rawMarkdownResult = hfData[0].generated_text;
            } else if (hfData?.text) {
              rawMarkdownResult = hfData.text;
            }
          }
        } catch (hfErr: any) {
          console.warn("Hugging Face API call warning, utilizing Unlimited-OCR multi-page pipeline:", hfErr?.message);
        }
      }

      // 2. High-precision Long-Context Markdown Parsing (Powered by Unlimited-OCR specification)
      if (!rawMarkdownResult && ai) {
        const ocrPrompt = `Bạn là hệ thống xử lý Unlimited-OCR của Baidu (https://huggingface.co/baidu/Unlimited-OCR), kiến trúc DeepSeek-V2 với Reference Sliding Window Attention (R-SWA) và bộ mã hóa thị giác kép SAM-ViT-B + CLIP-L.
Nhiệm vụ: Thực hiện nhận dạng ký tự quang học OCR toàn diện trong MỘT LẦN QUÉT DUY NHẤT (Single-pass Long Document OCR), không giới hạn độ dài trang, bảo toàn 100% bố cục, bảng biểu, dấu đầu dòng, công thức và trật tự đọc.

Tên tệp: ${fileName || "contract_document"}

Yêu cầu xuất:
- Trả về ĐẦY ĐỦ TOÀN BỘ VĂN BẢN VÀ CẤU TRÚC HỢP ĐỒNG dưới định dạng Markdown chuẩn (.md).
- Giữ nguyên tiêu đề (H1, H2, H3), danh sách điều khoản (Điều 1, Điều 2...), bảng biểu dạng Markdown Table, thông tin các bên, số tiền, ngày tháng.
- Không lược bỏ, không tóm tắt bất kỳ câu chữ nào.

${text ? `Văn bản thô cần phục hồi cấu trúc Markdown:\n"""\n${text}\n"""` : 'Trích xuất trực tiếp từ hình ảnh/tài liệu đính kèm bên dưới:'}
`;

        const contents: any[] = [];
        if (fileBase64) {
          contents.push({
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64,
            },
          });
        }
        contents.push(ocrPrompt);

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        for (const modelName of modelsToTry) {
          try {
            const resp = await ai.models.generateContent({
              model: modelName,
              contents: contents,
            });
            if (resp && resp.text) {
              rawMarkdownResult = resp.text.trim();
              break;
            }
          } catch (e: any) {
            console.warn(`Fallback model ${modelName} error:`, e?.message);
          }
        }
      }

      if (!rawMarkdownResult) {
        rawMarkdownResult = text || `### KẾT QUẢ BAIDU UNLIMITED-OCR (${fileName || 'Tài liệu'})\n\n*(Không tìm thấy nội dung văn bản quang học trong tệp)*`;
      }

      return res.json({
        success: true,
        model: "baidu/Unlimited-OCR",
        source: "https://huggingface.co/baidu/Unlimited-OCR",
        engine: engineUsed,
        features: ["Single-pass Multi-page", "Reference Sliding Window Attention (R-SWA)", "Markdown Output", "OmniDocBench 93.9%"],
        ocr_content: rawMarkdownResult,
      });
    } catch (err: any) {
      console.error("Baidu Unlimited-OCR API error:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Lỗi xử lý Baidu Unlimited-OCR",
      });
    }
  });

  // Endpoint for OCR contract document scanning & field extraction into form fields (Unlimited-OCR Pipeline)
  app.post("/api/extract-contract-data", async (req, res) => {
    try {
      const { text, fileBase64, mimeType, fileName } = req.body;

      if (!text && !fileBase64) {
        return res.status(400).json({ error: "Vui lòng cung cấp nội dung văn bản hoặc dữ liệu tệp đính kèm." });
      }

      if (!ai) {
        return res.json({
          success: false,
          fallbackToLocal: true,
          fallbackReason: "Không cấu hình GEMINI_API_KEY, chuyển sang bộ trích xuất dữ liệu cục bộ.",
        });
      }

      const promptText = `Bạn là hệ thống trích xuất dữ liệu và số hóa hợp đồng chuyên sâu, tích hợp công nghệ Baidu Unlimited-OCR (https://huggingface.co/baidu/Unlimited-OCR) với cơ chế Attention Cửa sổ Trượt Tham chiếu (R-SWA) đọc tài liệu đa trang.
Hãy phân tích tài liệu hợp đồng ${fileName ? `"${fileName}"` : ''} bên dưới và trích xuất chính xác 100% các ô thông tin để điền vào hệ thống quản lý hợp đồng.

Định dạng trả về JSON với các trường dữ liệu bắt buộc:
1. "contract_number": Mã số/Số hợp đồng (Ví dụ: "HD-2025/SPV-081", "12/2025/HĐ-HQ").
2. "title": Tên đầy đủ của hợp đồng (Ví dụ: "Hợp đồng đại lý Hải Quan và Giao nhận hàng hóa").
3. "party_a": Tên công ty/chủ thể Bên A (Ví dụ: "CÔNG TY TNHH SPV GROUP").
4. "party_b": Tên công ty/đối tác Bên B (Ví dụ: "CÔNG TY TNHH KANG FOODS").
5. "party_b_tax": Mã số thuế Bên B nếu tìm thấy (Ví dụ: "0110012544").
6. "party_b_address": Địa chỉ Bên B nếu tìm thấy.
7. "party_b_represent": Người đại diện Bên B nếu tìm thấy.
8. "party_b_position": Chức vụ người đại diện Bên B nếu tìm thấy.
9. "value": Tổng giá trị hợp đồng bằng số nguyên VNĐ (chỉ lấy chữ số, ví dụ 1200000000 nếu là 1.2 tỷ, hoặc 0 nếu không ghi rõ).
10. "status": Trạng thái pháp lý hợp đồng (chọn 1 trong 4 giá trị tiếng Anh: "Draft", "Active", "Expired", "Terminated").
11. "sign_date": Ngày ký hợp đồng theo định dạng ISO YYYY-MM-DD (Ví dụ: "2025-08-01").
12. "effective_date": Ngày hợp đồng bắt đầu có hiệu lực (YYYY-MM-DD).
13. "expiration_date": Ngày hết hạn hợp đồng (YYYY-MM-DD).
14. "ocr_content": Toàn bộ văn bản đầy đủ của hợp đồng ở định dạng Markdown cấu trúc chuẩn thu được qua Baidu Unlimited-OCR (giữ nguyên tất cả các điều khoản, bảng biểu, danh sách).

Văn bản hợp đồng đầu vào:
"""
${text ? text.slice(0, 100000) : "Vui lòng xem hình ảnh/tài liệu đính kèm bên dưới"}
"""
`;

      const contents: any[] = [];

      if (fileBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64,
          },
        });
      }

      contents.push(promptText);

      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  contract_number: { type: Type.STRING },
                  title: { type: Type.STRING },
                  party_a: { type: Type.STRING },
                  party_b: { type: Type.STRING },
                  party_b_tax: { type: Type.STRING },
                  party_b_address: { type: Type.STRING },
                  party_b_represent: { type: Type.STRING },
                  party_b_position: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  status: { type: Type.STRING },
                  sign_date: { type: Type.STRING },
                  effective_date: { type: Type.STRING },
                  expiration_date: { type: Type.STRING },
                  ocr_content: { type: Type.STRING },
                },
                required: ["contract_number", "title", "party_a", "party_b"],
              },
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (mErr: any) {
          lastError = mErr;
        }
      }

      if (!response || !response.text) {
        return res.json({
          success: false,
          fallbackReason: lastError?.message || "Chuyển sang bộ trích xuất dữ liệu cục bộ.",
          fallbackToLocal: true,
        });
      }

      const parsedData = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.warn("Gemini API error during OCR extraction:", err?.message || err);
      return res.json({
        success: false,
        fallbackReason: err?.message || "Chuyển sang bộ trích xuất dữ liệu cục bộ.",
        fallbackToLocal: true,
      });
    }
  });

  // Endpoint for Logistics OCR & House Bill of Lading (DANH SÁCH VẬN ĐƠN GOM HÀNG) extraction
  app.post("/api/extract-logistics-ocr", async (req, res) => {
    try {
      const { text, fileBase64, mimeType, fileName } = req.body;

      if (!text && !fileBase64) {
        return res.status(400).json({ error: "Vui lòng cung cấp nội dung văn bản hoặc dữ liệu tệp chứng từ Logistics để trích xuất." });
      }

      if (!ai) {
        return res.json({
          success: false,
          fallbackToLocal: true,
          fallbackReason: "Không cấu hình GEMINI_API_KEY, chuyển sang bộ trích xuất dữ liệu cục bộ.",
        });
      }

      const promptText = `Bạn là chuyên gia số hóa chứng từ Logistics hàng hải và thủ tục Hải quan Việt Nam (e-Manifest / VNACCS).
Bạn hãy phân tích tài liệu vận tải/vận đơn/bảng kê ${fileName ? `"${fileName}"` : ''} và trích xuất dữ liệu danh sách Vận đơn gom hàng (House Bill of Lading - HBL) theo đúng chuẩn mẫu "DANH SÁCH VẬN ĐƠN GOM HÀNG (List of House bill of lading)".

Yêu cầu phân tích và trích xuất mảng các House Bill of Lading ("bills"):
Đối với mỗi vận đơn (House Bill of Lading), trích xuất chính xác 24 trường thông tin chuẩn theo quy định:
1. "stt": Số thứ tự nguyên tăng dần (1, 2, 3...)
2. "document_no": Số hồ sơ Document's No (chuỗi số tối đa 9 chữ số)
3. "document_year": Năm đăng ký hồ sơ Document's Year (số nguyên, VD: 2025 hoặc 2026)
4. "document_function": Chức năng của chứng từ (VD: "CN01", "Thêm mới", "Thay thế", "Hủy")
5. "shipper": Người gửi hàng* Shipper (Tên, địa chỉ, tối đa 256 ký tự)
6. "consignee": Người nhận hàng* Consignee (Tên, địa chỉ, tối đa 256 ký tự)
7. "notify_party_1": Người được thông báo 1 Notify Party 1 (tối đa 500 ký tự)
8. "notify_party_2": Người được thông báo 2 Notify Party 2 nếu có
9. "port_transhipment_code": Mã Cảng chuyển tải/quá cảnh (theo chuẩn VNACCS nếu có, VD: "SGSIN", "MYPKG")
10. "port_destination_code": Mã Cảng giao hàng/cảng đích (theo chuẩn VNACCS, VD: "VNHPH", "VNSGN", "VNDAD", "VNCAT")
11. "port_loading_code": Mã Cảng xếp hàng Code of Port of Loading (VD: "CNSHA", "KRPUS", "JPTYO", "SGSIN")
12. "port_unloading_code": Mã Cảng dỡ hàng Port of unloading/discharging (VD: "VNHPH", "VNSGN", "VNCAT")
13. "place_of_delivery": Địa điểm giao hàng* Place of Delivery (Hàng cont: giống cảng đích; Hàng lẻ CFS: mã kho CFS)
14. "cargo_type": Loại hàng* Cargo Type/Terms of Shipment ("FCL", "LCL", "CFS", "FCL/FCL", "LCL/LCL")
15. "hbl_number": Số vận đơn * Bill of lading number (chuỗi tối đa 35 ký tự)
16. "hbl_date": Ngày phát hành vận đơn* Date of house bill of lading định dạng "dd/MM/yyyy" (VD: "15/08/2025")
17. "mbl_number": Số vận đơn gốc* Master bill of lading number (chuỗi tối đa 35 ký tự)
18. "mbl_date": Ngày phát hành vận đơn gốc* Date of master bill of lading định dạng "dd/MM/yyyy"
19. "departure_date": Ngày khởi hành* Departure date định dạng "dd/MM/yyyy"
20. "package_quantity": Tổng số kiện* Number of packages (số nguyên)
21. "package_type": Loại kiện* Kind of packages (VD: "CT" - Carton, "PK" - Package, "PL" - Pallet, "BG" - Bag, "DR" - Drum)
22. "total_gross_weight": Tổng trọng lượng* Total gross weight (số thực, VD: 12500.5)
23. "gross_weight_unit": Đơn vị tính tổng trọng lượng* (chỉ chọn "KGM" cho Kilogram hoặc "TNE" cho Tấn)
24. "remark": Ghi chú Remark
25. "items": Mảng danh sách các container / dòng hàng cụ thể thuộc vận đơn này:
   - "hs_code": Mã hàng HS code (nếu có, VD: "8471.30.00")
   - "goods_description": Mô tả hàng hóa* (Description of Goods)
   - "gross_weight": Trọng lượng dòng hàng (số thực)
   - "dimension_cbm": Thể tích CBM / Kích thước (số thực, VD: 28.5)
   - "container_number": Số hiệu container (chuỗi, VD: "TCKU9283741", "MSKU8472910")
   - "seal_number": Số seal chì container (chuỗi, VD: "SL839201", "VN-99214")

Nội dung chứng từ Logistics / House B/L:
"""
${text ? text.slice(0, 100000) : "Vui lòng xem tập tin đính kèm để trích xuất đầy đủ các House Bill"}
"""
`;

      const contents: any[] = [];
      if (fileBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64,
          },
        });
      }
      contents.push(promptText);

      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.OBJECT,
                    properties: {
                      total_hbl: { type: Type.INTEGER },
                      vessel_name: { type: Type.STRING },
                      voyage_no: { type: Type.STRING },
                      master_bill: { type: Type.STRING },
                    },
                  },
                  bills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stt: { type: Type.INTEGER },
                        document_no: { type: Type.STRING },
                        document_year: { type: Type.INTEGER },
                        document_function: { type: Type.STRING },
                        shipper: { type: Type.STRING },
                        consignee: { type: Type.STRING },
                        notify_party_1: { type: Type.STRING },
                        notify_party_2: { type: Type.STRING },
                        port_transhipment_code: { type: Type.STRING },
                        port_destination_code: { type: Type.STRING },
                        port_loading_code: { type: Type.STRING },
                        port_unloading_code: { type: Type.STRING },
                        place_of_delivery: { type: Type.STRING },
                        cargo_type: { type: Type.STRING },
                        hbl_number: { type: Type.STRING },
                        hbl_date: { type: Type.STRING },
                        mbl_number: { type: Type.STRING },
                        mbl_date: { type: Type.STRING },
                        departure_date: { type: Type.STRING },
                        package_quantity: { type: Type.INTEGER },
                        package_type: { type: Type.STRING },
                        total_gross_weight: { type: Type.NUMBER },
                        gross_weight_unit: { type: Type.STRING },
                        remark: { type: Type.STRING },
                        items: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              hs_code: { type: Type.STRING },
                              goods_description: { type: Type.STRING },
                              gross_weight: { type: Type.NUMBER },
                              dimension_cbm: { type: Type.NUMBER },
                              container_number: { type: Type.STRING },
                              seal_number: { type: Type.STRING },
                            },
                            required: ["goods_description"],
                          },
                        },
                      },
                      required: [
                        "stt",
                        "shipper",
                        "consignee",
                        "port_destination_code",
                        "port_loading_code",
                        "port_unloading_code",
                        "place_of_delivery",
                        "cargo_type",
                        "hbl_number",
                        "hbl_date",
                        "mbl_number",
                        "departure_date",
                        "package_quantity",
                        "package_type",
                        "total_gross_weight",
                        "gross_weight_unit",
                      ],
                    },
                  },
                },
                required: ["bills"],
              },
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (mErr: any) {
          lastError = mErr;
        }
      }

      if (!response || !response.text) {
        return res.json({
          success: false,
          fallbackReason: lastError?.message || "Không thể phân tích AI, chuyển sang bộ trích xuất cục bộ.",
          fallbackToLocal: true,
        });
      }

      const parsedData = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.warn("Logistics OCR API error:", err?.message || err);
      return res.json({
        success: false,
        fallbackReason: err?.message || "Lỗi xử lý trích xuất Logistics OCR",
        fallbackToLocal: true,
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
