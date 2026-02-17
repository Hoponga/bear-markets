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
          primary: '#111827',    // Main page background (matches navbar)
          card: '#1f2937',       // Card backgrounds (gray-800)
          hover: '#374151',      // Hover states (gray-700)
          input: '#1f2937',      // Input backgrounds (gray-800)
        },
        // Border colors
        border: {
          primary: '#374151',    // Main borders (gray-700)
          secondary: '#4b5563',  // Secondary borders (gray-600)
        },
        // Text colors
        text: {
          primary: '#d1d5db',    // Primary text (muted gray-300)
          secondary: '#9ca3af',  // Secondary text (gray-400)
          muted: '#6b7280',      // Muted text (gray-500)
          disabled: '#4b5563',   // Disabled text (gray-600)
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
