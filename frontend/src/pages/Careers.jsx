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
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-surface-900 mb-4">Join Our Team</h1>
          <p className="text-lg text-surface-500 mb-12">Help us build the future of project management. We're looking for passionate people.</p>
          <div className="space-y-4">
            {openings.map((job, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 flex items-center justify-between hover:shadow-md transition-all">
                <div>
                  <h3 className="font-semibold text-surface-900">{job.title}</h3>
                  <p className="text-sm text-surface-400">{job.dept} · {job.location}</p>
                </div>
                <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">Apply</button>
              </div>
            ))}
          </div>
          <p className="text-sm text-surface-400 mt-8 text-center">Don't see a role? Send your resume to <a href="mailto:careers@360dmmc.com" className="text-primary-600 hover:text-primary-700">careers@360dmmc.com</a></p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
