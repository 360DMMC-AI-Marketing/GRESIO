import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PdfGenerator({ pdfRef, projectName, onDone }) {
  const [generating, setGenerating] = useState(false);

  const generatePdf = async () => {
    if (!pdfRef?.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${projectName || 'report'}-custom.pdf`);
      if (onDone) onDone();
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button onClick={generatePdf} disabled={generating}
      className="px-4 py-2 text-xs font-semibold bg-[#2347e8] text-white rounded-lg hover:bg-[#1d3dcc] transition-colors border-none cursor-pointer disabled:opacity-50 flex items-center gap-2">
      {generating ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generating...
        </>
      ) : 'Download PDF'}
    </button>
  );
}
