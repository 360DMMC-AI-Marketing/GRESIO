export default function ReportPreview({ projectName, type, sections, pdfRef }) {
  const isAdmin = type === 'admin';
  const visibleSections = sections.filter(s => s.visible);

  return (
    <div ref={pdfRef} className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ width: '210mm', fontFamily: 'Arial, sans-serif' }}>
      <div className={`px-10 py-8 ${isAdmin ? 'bg-[#2347e8]' : 'bg-[#0F172A]'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-white tracking-tight">CIOS</span>
              <span className="text-white/40 text-sm">|</span>
              <span className="text-white/70 text-sm font-medium">Certified by 360 DMMC</span>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${isAdmin ? 'bg-white/20 text-white' : 'bg-[#2347e8] text-white'}`}>
              {isAdmin ? 'PROJECT CLOSURE REPORT — ADMIN' : 'PROJECT SUMMARY — CLIENT'}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Generated</p>
            <p className="text-white font-medium text-sm">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="px-10 py-6 border-b border-[#f1f5f9]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0f172a]">{projectName}</h2>
            <p className="text-sm text-[#6b7280] mt-1">{isAdmin ? 'Project Closure Report' : 'Project Summary'} — {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="px-10 py-8 space-y-8">
        {visibleSections.map((section, idx) => (
          <section key={section.key || idx}>
            <h3 className="text-sm font-bold text-[#2347e8] uppercase tracking-wider mb-3">{section.title}</h3>
            <div className="bg-[#f8fafc] rounded-xl p-5 report-html" dangerouslySetInnerHTML={{ __html: section.content || '' }} />
          </section>
        ))}
      </div>

      <div className="border-t border-[#f1f5f9] px-10 py-5">
        <div className="flex items-center justify-between text-xs text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4b5563]">CIOS</span>
            <span>·</span>
            <span>Certified by <strong>360 DMMC</strong></span>
          </div>
          <span>Generated on {new Date().toLocaleString()}</span>
        </div>
      </div>

      <style>{`
        .report-html { font-size: 13px; line-height: 1.6; color: #374151; }
        .report-html p { margin: 6px 0; }
        .report-html ul, .report-html ol { margin: 6px 0; padding-left: 22px; }
        .report-html img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
        .report-html table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
        .report-html td, .report-html th { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        .report-html th { background: #f9fafb; font-weight: 600; }
        .report-html a { color: #2347e8; }
        .report-html blockquote { border-left: 3px solid #2347e8; margin: 8px 0; padding: 4px 12px; color: #6b7280; font-style: italic; }
      `}</style>
    </div>
  );
}
