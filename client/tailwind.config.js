/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#25D366',
          teal: '#128C7E',
          darkTeal: '#075E54',
          chatBg: '#EFEAE2',
          chatBgDark: '#0B141A',
          bubbleIncoming: '#FFFFFF',
          bubbleOutgoing: '#D9FDD3',
          bubbleOutgoingDark: '#005C4B',
          bubbleIncomingDark: '#202C33',
        },
        gulf: {
          gold: '#D4AF37',
          amber: '#F59E0B',
          sand: '#F7F3E9',
          crimson: '#9E1B32', // Bahrain red
          dark: '#0F172A',
        },
        benefit: {
          red: '#E31B23',
          dark: '#1C1C1E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'Cairo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
