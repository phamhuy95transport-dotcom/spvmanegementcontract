export interface FilePreparationResult {
  file: File;
  originalSize: number;
  engine: 'Original File (Direct Google Drive)';
  message: string;
}

/**
 * Prepares the contract file preserving 100% original uncompressed data integrity
 * (No Ghostscript slicing or damaging transformations, ensuring full compatibility with Google Drive & PDF viewers)
 */
export async function prepareContractFile(file: File): Promise<FilePreparationResult> {
  const originalSize = file.size;
  const sizeMB = (originalSize / (1024 * 1024)).toFixed(2);

  return {
    file,
    originalSize,
    engine: 'Original File (Direct Google Drive)',
    message: `Tệp gốc hoàn chỉnh (${sizeMB} MB), không nén Ghostscript, đảm bảo xem trực tiếp trên Google Drive.`,
  };
}

// Backward compatibility alias
export const compressContractFile = prepareContractFile;
export type CompressionResult = FilePreparationResult;

