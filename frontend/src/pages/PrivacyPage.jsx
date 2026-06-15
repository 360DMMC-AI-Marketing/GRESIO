import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const SECTIONS = [
  {
    title: 'Information We Collect',
    content: 'When you use GRESIO, we collect information you provide directly: your name, email address, profile picture, and company details when you register. We also collect project data you create including tasks, sprints, test cases, work logs, and team member information. Usage data such as login times, feature interactions, and page views are collected to improve the platform experience.',
  },
  {
    title: 'How We Use Your Information',
    content: 'We use your information to operate and maintain your GRESIO workspace, provide technical support, send important notifications about your account (sprint updates, task assignments, deadline reminders), improve and develop new features, and ensure platform security. We never sell your personal data to third parties.',
  },
  {
    title: 'Data Storage & Security',
    content: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Your data is stored on secure cloud servers with redundant backups. Enterprise plan customers can opt for on-premise deployment for complete data control. We implement strict access controls and regular security audits to protect your information.',
  },
  {
    title: 'Third-Party Integrations',
    content: 'GRESIO integrates with third-party services you choose to connect: GitHub, Microsoft 365 / Azure AD, Microsoft Teams, Outlook, ClickUp, and Figma. When you connect these services, we access only the data necessary for the integration to function (e.g., commit data from GitHub, user directory from Azure AD). You can disconnect any integration at any time from your Admin panel.',
  },
  {
    title: 'Data Retention',
    content: 'We retain your data for as long as your account is active. If you delete your account, your data is permanently erased within 30 days. Archived projects are retained for reference but can be permanently deleted upon request. Work logs and activity data are anonymized after 12 months for analytics purposes.',
  },
  {
    title: 'Your Rights',
    content: 'You have the right to access, correct, or delete your personal data at any time through your Profile settings. You can export your data as a CSV file. You can opt out of email notifications in your preferences. For complete account deletion, contact your workspace admin or reach out to our support team.',
  },
  {
    title: 'Cookies',
    content: 'GRESIO uses essential cookies for authentication and session management. These are required for the platform to function. We also use analytics cookies to understand usage patterns and improve the product — these are optional and can be disabled. We do not use tracking cookies for advertising purposes.',
  },
  {
    title: 'Changes to This Policy',
    content: 'We may update this privacy policy from time to time. Material changes will be communicated via email and in-app notification. Continued use of GRESIO after changes constitutes acceptance of the updated policy.',
  },
  {
    title: 'Contact Us',
    content: 'If you have questions about this privacy policy or how your data is handled, please contact us at Consult@360DMMC.com or visit our Contact page.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-surface-900 mb-4">Privacy Policy</h1>
          <p className="text-surface-500 mb-2">Last updated: June 2026</p>
          <p className="text-sm text-surface-500 mb-10">This Privacy Policy explains how GRESIO ("we", "our", "us") collects, uses, and protects your information when you use our project management platform.</p>

          <div className="space-y-8">
            {SECTIONS.map((s, i) => (
              <div key={i}>
                <h2 className="text-lg font-semibold text-surface-900 mb-2">{s.title}</h2>
                <p className="text-sm text-surface-600 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-surface-200">
            <p className="text-sm text-surface-500">
              Still have questions?{' '}
              <Link to="/contact" className="text-primary-600 hover:text-primary-700 font-medium">Contact our support team</Link>
              {' '}or email{' '}
              <a href="mailto:Consult@360DMMC.com" className="text-primary-600 hover:text-primary-700 font-medium">Consult@360DMMC.com</a>.
            </p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
