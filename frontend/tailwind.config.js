export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0f4ff', 100:'#dce6ff', 200:'#b9ccff', 300:'#8aaaff', 400:'#6088ff', 500:'#3b65f5', 600:'#2347e8', 700:'#1a35c4', 800:'#162ca0', 900:'#0e1e6e', 950:'#090f3d' },
        primary: { 50:'#f0f4ff', 100:'#dce6ff', 200:'#b9ccff', 300:'#8aaaff', 400:'#6088ff', 500:'#3b65f5', 600:'#2347e8', 700:'#1a35c4', 800:'#162ca0', 900:'#0e1e6e', 950:'#090f3d' },
        neutral: { 0:'#ffffff', 50:'#f9fafb', 100:'#f3f4f6', 200:'#e5e7eb', 300:'#d1d5db', 400:'#9ca3af', 500:'#6b7280', 600:'#4b5563', 700:'#374151', 800:'#1f2937', 900:'#111827', 950:'#030712' },
        surface: { 50:'#f9fafb', 100:'#f3f4f6', 200:'#e5e7eb', 300:'#d1d5db', 400:'#9ca3af', 500:'#6b7280', 600:'#4b5563', 700:'#374151', 800:'#1f2937', 900:'#111827', 950:'#030712' },
        success: { 50:'#f0fdf4', 100:'#dcfce7', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' },
        warning: { 50:'#fffbeb', 100:'#fef3c7', 500:'#f59e0b', 600:'#d97706', 700:'#b45309' },
        danger: { 50:'#fff1f2', 100:'#ffe4e6', 500:'#ef4444', 600:'#dc2626', 700:'#b91c1c' },
        info: { 50:'#eff6ff', 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-md': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
        modal: '0 20px 60px -10px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
};
