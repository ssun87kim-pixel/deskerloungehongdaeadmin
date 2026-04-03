import * as XLSX from 'xlsx';

interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  columnWidths?: number[];
  numberFormatColumns?: { col: number; format: string }[];
}

export interface ExcelExportConfig {
  filename: string;
  sheets: ExcelSheet[];
}

export function safeSheetName(name: string): string {
  return name.replace(/[\\/*?\[\]:]/g, '').slice(0, 31);
}

export function applyNumberFormat(
  ws: XLSX.WorkSheet,
  col: number,
  startRow: number,
  endRow: number,
  fmt: string,
): void {
  for (let r = startRow; r <= endRow; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: col });
    const cell = ws[addr];
    if (cell && typeof cell.v === 'number') {
      cell.z = fmt;
    }
  }
}

export function exportToExcel(config: ExcelExportConfig): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of config.sheets) {
    const sheetName = safeSheetName(sheet.name);
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    if (sheet.columnWidths) {
      ws['!cols'] = sheet.columnWidths.map((wch) => ({ wch }));
    }

    if (sheet.numberFormatColumns) {
      const rowCount = sheet.rows.length;
      for (const { col, format } of sheet.numberFormatColumns) {
        applyNumberFormat(ws, col, 1, rowCount, format);
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, config.filename);
}
