import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="border-t border-surface-200 bg-white py-16 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="mb-3">
              <Link to="/" className="text-3xl font-bold text-surface-900 tracking-tight">GRESIO</Link>
            </div>
            <p className="text-base text-surface-400 leading-relaxed">The internal operating system for modern software teams.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/features" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Pricing</Link></li>
              <li><Link to="/how-it-works" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">How It Works</Link></li>
              <li><Link to="/onboarding-guide" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Docs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="https://360dmmc.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">About</a></li>
              <li><a href="https://360dmmc.com/blog" target="_blank" rel="noopener noreferrer" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Blog</a></li>
              <li><a href="https://360dmmc.com/careers" target="_blank" rel="noopener noreferrer" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Careers</a></li>
              <li><Link to="/contact" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-4">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/how-it-works" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Help Center</Link></li>
              <li><Link to="/" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Status</Link></li>
              <li><Link to="/privacy" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Privacy</Link></li>
              <li><Link to="/pricing" className="text-sm text-surface-400 hover:text-surface-900 transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-surface-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-400">&copy; {new Date().getFullYear()} GRESIO. All rights reserved.</p>
          <div className="flex items-center gap-5 text-sm">
            <a href="mailto:Consult@360DMMC.com" className="text-surface-500 hover:text-primary-600 font-medium transition-colors">Consult@360DMMC.com</a>
            <span className="w-px h-4 bg-surface-200"></span>
            <a href="https://360dmmc.com/" target="_blank" rel="noopener noreferrer" className="text-surface-500 hover:text-primary-600 font-semibold transition-colors">Powered by 360 DMMC</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
