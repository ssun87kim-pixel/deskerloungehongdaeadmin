const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
const SECTION_GAP_MM = 4;

const CANVAS_OPTIONS = {
  scale: 1.5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
};


async function captureElement(
  html2canvas: typeof import('html2canvas')['default'],
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  return html2canvas(element, CANVAS_OPTIONS);
}

function addCanvasToPages(
  pdf: InstanceType<typeof import('jspdf')['jsPDF']>,
  canvas: HTMLCanvasElement,
  yOffsetMm: number,
  forceNewPage: boolean,
): number {
  const pxPerMm = (canvas.width / CONTENT_WIDTH_MM);
  const imageHeightMm = canvas.height / pxPerMm;
  const contentHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2;

  let currentY = yOffsetMm;

  if (forceNewPage && currentY > MARGIN_MM) {
    pdf.addPage();
    currentY = MARGIN_MM;
  }

  if (currentY + imageHeightMm <= MARGIN_MM + contentHeightMm) {
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, imageHeightMm);
    return currentY + imageHeightMm + SECTION_GAP_MM;
  }

  const sliceHeightPx = contentHeightMm * pxPerMm;
  let srcY = 0;

  while (srcY < canvas.height) {
    if (currentY > MARGIN_MM) {
      pdf.addPage();
      currentY = MARGIN_MM;
    }

    const remainingPx = canvas.height - srcY;
    const availableContentMm = MARGIN_MM + contentHeightMm - currentY;
    const availablePx = availableContentMm * pxPerMm;
    const drawHeightPx = Math.min(remainingPx, availablePx, sliceHeightPx);
    const drawHeightMm = drawHeightPx / pxPerMm;

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = drawHeightPx;
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, srcY, canvas.width, drawHeightPx, 0, 0, canvas.width, drawHeightPx);
    }

    const sliceData = sliceCanvas.toDataURL('image/png');
    pdf.addImage(sliceData, 'PNG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, drawHeightMm);

    srcY += drawHeightPx;
    currentY = MARGIN_MM + drawHeightMm;
  }

  return currentY + SECTION_GAP_MM;
}

export async function exportToPdf(elementId: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const root = document.getElementById(elementId);
  if (!root) {
    throw new Error(`Element not found: #${elementId}`);
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sections = root.querySelectorAll<HTMLElement>('[data-pdf-section]');

  if (sections.length === 0) {
    const canvas = await captureElement(html2canvas, root);
    addCanvasToPages(pdf, canvas, MARGIN_MM, false);
  } else {
    let yOffset = MARGIN_MM;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const forceNewPage = section.hasAttribute('data-pdf-newpage');
      const canvas = await captureElement(html2canvas, section);
      yOffset = addCanvasToPages(pdf, canvas, yOffset, forceNewPage);
    }
  }

  const pdfBlob = pdf.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
