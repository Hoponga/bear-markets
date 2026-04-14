/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          card:    'var(--bg-card)',
          hover:   'var(--bg-hover)',
          input:   'var(--bg-input)',
        },
        border: {
          primary:   'var(--border-primary)',
          secondary: 'var(--border-secondary)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          disabled:  'var(--text-disabled)',
        },
        btn: {
          primary:            'var(--btn-primary)',
          'primary-hover':    'var(--btn-primary-hover)',
          secondary:          'var(--btn-secondary)',
          'secondary-hover':  'var(--btn-secondary-hover)',
        },
        navbar: {
          bg:      'var(--navbar-bg)',
          link:    'var(--navbar-link)',
          dim:     'var(--navbar-link-dim)',
          border:  'var(--navbar-border)',
        },
        accent: {
          purple:       '#7c3aed',
          'purple-dark':'#6d28d9',
        },
        success: '#10b981',
        error:   '#ef4444',
      },
    },
  },
  plugins: [],
}
