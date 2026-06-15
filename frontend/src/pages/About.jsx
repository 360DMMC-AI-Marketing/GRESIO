import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-surface-900 mb-4">About GRESIO</h1>
          <p className="text-lg text-surface-500 mb-8">Built by 360 DMMC — a consulting and technology company dedicated to helping teams deliver better projects.</p>
          <div className="prose prose-sm max-w-none text-surface-600 space-y-6">
            <p>GRESIO is an internal operating system designed for modern teams. It unifies project management, sprint planning, task tracking, QA testing, and team collaboration into a single platform — eliminating the need to juggle between Jira, Trello, Asana, and separate test case tools.</p>
            <p>We believe that project management should adapt to how your team works, not the other way around. That's why GRESIO supports 5 project types (Software, Design, Business, Content, Research), each with its own lifecycle phases and auto-transition rules.</p>
            <p>From discovery to delivery, GRESIO automates the boring parts — status updates, phase transitions, test case generation — so your team can focus on what matters: building great products.</p>
            <h3 className="text-lg font-semibold text-surface-900 mt-8">Our Mission</h3>
            <p>To give every team a single source of truth for their projects — with smart automation, real-time visibility, and zero configuration overhead.</p>
            <h3 className="text-lg font-semibold text-surface-900 mt-8">Contact Us</h3>
            <p>Email: <a href="mailto:Consult@360DMMC.com" className="text-primary-600 hover:text-primary-700">Consult@360DMMC.com</a></p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
