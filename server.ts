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
