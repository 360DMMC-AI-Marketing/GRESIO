import Logo from '../Logo';

const FONT_MAP = {
  Inter: 'Inter, system-ui, sans-serif',
  Roboto: 'Roboto, Arial, sans-serif',
  Merriweather: 'Merriweather, Georgia, serif',
  Poppins: 'Poppins, system-ui, sans-serif',
};

const coverStyleFn = {
  standard: (pc, isAdmin) => ({
    wrapper: `px-10 py-8 ${isAdmin ? 'bg-[#2347e8]' : 'bg-[#0F172A]'}`,
    gradient: '',
  }),
  gradient: (pc) => ({
    wrapper: 'px-10 py-8 relative overflow-hidden',
    gradient: `linear-gradient(135deg, ${pc} 0%, ${pc}88 50%, ${pc}44 100%)`,
  }),
  minimal: () => ({
    wrapper: 'px-10 py-8 border-b-2 border-[#f1f5f9] bg-white',
    gradient: '',
  }),
  bold: (pc) => ({
    wrapper: 'px-10 py-12 relative overflow-hidden',
    gradient: `linear-gradient(160deg, ${pc} 0%, #0a0a0a 100%)`,
  }),
};

export default function ReportPreview({ projectName, type, sections, pdfRef, design, cover }) {
  const isAdmin = type === 'admin';
  const visibleSections = sections.filter(s => s.visible);
  const pc = design?.primaryColor || '#2347e8';
  const font = FONT_MAP[design?.font] || FONT_MAP.Inter;
  const cs = coverStyleFn[design?.coverStyle] || coverStyleFn.standard;
  const coverStyle = cs(pc, isAdmin);

  const coverTitle = cover?.title || projectName;
  const coverSubtitle = cover?.subtitle || (isAdmin ? 'Project Closure Report' : 'Project Summary');

  return (
    <div ref={pdfRef} className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ width: '210mm', fontFamily: font }}>
      {/* Cover / Header */}
      <div className={coverStyle.wrapper} style={coverStyle.gradient ? { background: coverStyle.gradient } : undefined}>
        {design?.coverStyle === 'gradient' && (
          <div style={{ position: 'absolute', inset: 0, background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        )}
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Logo variant="textOnly" size="md" inverted />
                <span className="text-white/40 text-sm">|</span>
                <span className="text-white/70 text-sm font-medium">Certified by 360 DMMC</span>
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${design?.coverStyle === 'minimal' ? 'bg-gray-100 text-gray-700' : 'bg-white/20 text-white'}`}>
                {isAdmin ? 'PROJECT CLOSURE REPORT — ADMIN' : 'PROJECT SUMMARY — CLIENT'}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Generated</p>
              <p className="text-white font-medium text-sm">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div className={`px-10 py-6 border-b border-[#f1f5f9] ${design?.coverStyle === 'minimal' ? 'text-center' : ''}`}>
        <div className="flex items-start justify-between">
          <div className={design?.coverStyle === 'minimal' ? 'w-full' : ''}>
            <h2 className="text-2xl font-bold" style={{ color: design?.coverStyle === 'minimal' ? pc : '#0f172a' }}>{coverTitle}</h2>
            <p className="text-sm mt-1" style={{ color: design?.coverStyle === 'minimal' ? '#6b7280' : '#6b7280' }}>{coverSubtitle} — {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="px-10 py-8 space-y-8">
        {visibleSections.map((section, idx) => (
          <section key={section.key || idx}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: pc }}>{section.title}</h3>
            <div className="bg-[#f8fafc] rounded-xl p-5 report-html" style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: section.content || '' }} />
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#f1f5f9] px-10 py-5">
        <div className="flex items-center justify-between text-xs text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <Logo variant="textOnly" size="sm" />
            <span>·</span>
            <span>Certified by <strong>360 DMMC</strong></span>
          </div>
          <span>Generated on {new Date().toLocaleString()}</span>
        </div>
      </div>

      <style>{`
        .report-html p { margin: 6px 0; }
        .report-html ul, .report-html ol { margin: 6px 0; padding-left: 22px; }
        .report-html img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
        .report-html table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
        .report-html td, .report-html th { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        .report-html th { background: #f9fafb; font-weight: 600; }
        .report-html a { color: ${pc}; }
        .report-html blockquote { border-left: 3px solid ${pc}; margin: 8px 0; padding: 4px 12px; color: #6b7280; font-style: italic; }
        .report-html .report-metrics-grid .metric-card { transition: transform 0.15s; }
        .report-html .report-metrics-grid .metric-card:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}