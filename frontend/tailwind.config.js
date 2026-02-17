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
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background colors
        bg: {
          primary: '#0a0a0a',    // Main page background (gray-900)
          card: '#111111',       // Card backgrounds (gray-800)
          hover: '#1e1e1e',      // Hover states (gray-700)
          input: '#1e1e1e',      // Input backgrounds (gray-700)
        },
        // Border colors
        border: {
          primary: '#1e1e1e',    // Main borders (gray-700)
          secondary: '#2e2e2e',  // Secondary borders (gray-600)
        },
        // Text colors
        text: {
          primary: '#ffffff',    // Primary text (white)
          secondary: '#d1d5db',  // Secondary text (gray-300)
          muted: '#9ca3af',      // Muted text (gray-400)
          disabled: '#6b7280',   // Disabled text (gray-500)
        },
        // Button colors
        btn: {
          primary: '#4b5563',    // Primary buttons (gray-600)
          'primary-hover': '#6b7280', // Primary button hover (gray-500)
          secondary: '#374151',  // Secondary buttons (gray-700)
          'secondary-hover': '#4b5563', // Secondary button hover (gray-600)
        },
        // Accent colors (keep for special elements)
        accent: {
          purple: '#7c3aed',
          'purple-dark': '#6d28d9',
        },
        // Status colors (green/red kept as-is for YES/NO)
        success: '#10b981',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}
