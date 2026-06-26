import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const openings = [
  { title: 'Senior Full-Stack Engineer', dept: 'Engineering', location: 'Remote' },
  { title: 'Product Designer', dept: 'Design', location: 'Remote' },
  { title: 'Customer Success Manager', dept: 'Operations', location: 'Remote' },
  { title: 'QA Engineer', dept: 'Engineering', location: 'Remote' },
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-12 mb-10">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Join Our Team</h1>
            <p className="text-lg text-[var(--text-tertiary)]">Help us build the future of project management. We're looking for passionate people.</p>
          </div>
          <div className="space-y-4">
            {openings.map((job, i) => (
              <div key={i} className="card-premium glow-card p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{job.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{job.dept} · {job.location}</p>
                </div>
                <button className="btn-premium">Apply</button>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-8 text-center">Don't see a role? Send your resume to <a href="mailto:careers@360dmmc.com" className="text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors">careers@360dmmc.com</a></p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
