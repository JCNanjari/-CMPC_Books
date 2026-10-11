import ExcelJS from 'exceljs';

export interface ExportBook {
  title: string;
  price: number;
  stock: number;
  available: boolean;
  author: { name: string };
  publisher: { name: string };
  genres: { name: string }[];
}

const HEADERS = ['Título', 'Autor', 'Editorial', 'Géneros', 'Precio (CLP)', 'Stock', 'Disponibilidad'] as const;
const HEADER_ROW = 4;

const INK = 'FF1C1914';
const FOREST = 'FF16382C';
const CREAM = 'FFF6F1E6';
const MUTED = 'FF5E584E';
const PAPER = 'FFF7F3EA';
const LINE = 'FFE4DCCB';
const OK = 'FF1F6B45';
const DANGER = 'FF8D2F2F';

function when(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

function countLabel(total: number): string {
  return total === 1 ? '1 libro' : `${total} libros`;
}

export async function booksToWorkbook(books: ExportBook[], generatedAt = new Date()): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CMPC Libros';
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet('Inventario', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });
  sheet.pageSetup.printTitlesRow = '4:4';

  sheet.mergeCells(1, 1, 1, HEADERS.length);
  const title = sheet.getCell(1, 1);
  title.value = 'CMPC Libros';
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: FOREST } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, HEADERS.length);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = `Inventario exportado el ${when(generatedAt)} · ${countLabel(books.length)}`;
  subtitle.font = { name: 'Calibri', size: 11, color: { argb: MUTED } };
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 8;

  const header = sheet.getRow(HEADER_ROW);
  header.height = 22;
  HEADERS.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: CREAM } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FOREST } };
    cell.alignment = { vertical: 'middle', horizontal: index >= 4 ? 'center' : 'left' };
  });

  books.forEach((book, index) => {
    const row = sheet.getRow(HEADER_ROW + 1 + index);
    row.height = 20;
    const values: Array<string | number> = [
      book.title,
      book.author.name,
      book.publisher.name,
      book.genres.map((genre) => genre.name).join(' · ') || 'Sin género',
      book.price,
      book.stock,
      book.available ? 'Disponible' : 'Agotado',
    ];
    values.forEach((value, column) => {
      const cell = row.getCell(column + 1);
      cell.value = value;
      cell.font = { name: 'Calibri', size: 11, color: { argb: INK } };
      cell.alignment = { vertical: 'middle', horizontal: column === 4 ? 'right' : column >= 5 ? 'center' : 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: LINE } } };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PAPER } };
      }
    });
    row.getCell(5).numFmt = Number.isInteger(book.price) ? '"$"#,##0' : '"$"#,##0.00';
    const availability = row.getCell(7);
    availability.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: book.available ? OK : DANGER },
    };
  });

  [36, 26, 26, 28, 16, 12, 18].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const lastRow = HEADER_ROW + books.length;
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: Math.max(HEADER_ROW, lastRow), column: HEADERS.length },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
