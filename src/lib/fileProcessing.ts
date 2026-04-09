/**
 * Shared File Processing Utilities
 * Centralized file extraction and accepted types used by Osha, Pixel, and other agents.
 */

/**
 * Accepted file MIME types for chat-based file attachments
 */
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

/**
 * Extract text content (or base64 for images/PDFs) from a File object.
 * Supports plain text, CSV, JSON, Markdown, images, PDF, DOCX, and XLSX.
 *
 * @param file - The File to process
 * @param maxPages - Optional max pages hint (currently unused, reserved for PDF page limits)
 * @returns Extracted text, image flag, and optional base64 data
 */
export async function extractTextFromFile(
  file: File,
  maxPages?: number,
): Promise<{ text: string; isImage: boolean; base64?: string }> {
  const type = file.type;

  // Plain text formats
  if (['text/plain', 'text/markdown', 'text/csv', 'application/json'].includes(type)) {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
    return { text: text.slice(0, 60000), isImage: false };
  }

  // Images — return base64
  if (type.startsWith('image/')) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return { text: '', isImage: true, base64 };
  }

  // PDF — return base64
  if (type === 'application/pdf') {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file.'));
      reader.readAsDataURL(file);
    });
    return { text: '', isImage: false, base64 };
  }

  // DOCX — extract text via fflate
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const { unzipSync, strFromU8 } = await import('fflate');
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const unzipped = unzipSync(uint8);
      const documentXml = unzipped['word/document.xml'];
      if (!documentXml) throw new Error('Invalid DOCX');
      const xmlStr = strFromU8(documentXml);
      const text = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return { text: text.slice(0, 60000), isImage: false };
    } catch {
      throw new Error('Could not read DOCX file. Try copying the text and pasting it directly.');
    }
  }

  // XLSX — extract cell values via fflate
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    try {
      const { unzipSync, strFromU8 } = await import('fflate');
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const unzipped = unzipSync(uint8);

      const sharedStrings: string[] = [];
      const sharedStringsXml = unzipped['xl/sharedStrings.xml'];
      if (sharedStringsXml) {
        const xmlStr = strFromU8(sharedStringsXml);
        const matches: string[] = xmlStr.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
        matches.forEach((m) => sharedStrings.push(m.replace(/<[^>]+>/g, '')));
      }

      const sheet1Xml = unzipped['xl/worksheets/sheet1.xml'];
      if (!sheet1Xml) throw new Error('No sheet found');
      const sheetStr = strFromU8(sheet1Xml);
      const cellMatches: string[] = sheetStr.match(/<c [^>]*>.*?<\/c>/gs) || [];
      const rows: string[] = [];
      cellMatches.forEach((cell) => {
        const tAttr = cell.match(/t="s"/);
        const vMatch = cell.match(/<v>(\d+)<\/v>/);
        if (tAttr && vMatch) {
          rows.push(sharedStrings[parseInt(vMatch[1])] || '');
        } else if (vMatch) {
          rows.push(vMatch[1]);
        }
      });
      return { text: rows.join('\t').slice(0, 60000), isImage: false };
    } catch {
      throw new Error('Could not read XLSX. Try exporting as CSV first.');
    }
  }

  throw new Error(`File type "${type}" is not supported.`);
}
