import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const posts = [
  { title: 'Introducing GRESIO 1.5 — Calendar, Smarter Notifications & More', date: 'June 15, 2026', excerpt: 'The latest update brings a full-featured Calendar view, improved notification filtering, and performance improvements across the board.' },
  { title: 'How to Run Effective Sprints with GRESIO', date: 'June 1, 2026', excerpt: 'Learn how to plan, execute, and review sprints using GRESIO\'s built-in sprint management tools and burndown charts.' },
  { title: '5 Project Types, One Platform: Why Methodology Matters', date: 'May 20, 2026', excerpt: 'Software, Design, Business, Content, Research — each project type has unique needs. Here\'s how GRESIO adapts to yours.' },
  { title: 'Automating QA: Test Cases That Generate Themselves', date: 'May 5, 2026', excerpt: 'GRESIO can auto-generate test cases from completed sprint tasks. Here\'s how to set it up and save your QA team hours.' },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-secondary), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-12 mb-10">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Blog</h1>
            <p className="text-lg text-[var(--text-tertiary)]">Product updates, tips, and insights from the GRESIO team.</p>
          </div>
          <div className="space-y-8">
            {posts.map((post, i) => (
              <article key={i} className="card-premium glow-card p-6">
                <p className="text-xs text-[var(--text-muted)] mb-1">{post.date}</p>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{post.title}</h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-3">{post.excerpt}</p>
                <Link to="/blog" className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors">Read more →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
