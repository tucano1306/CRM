/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 🎨 Custom Pastel Colors
        pastel: {
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#93c5db',
            DEFAULT: '#a8d5e5',
          },
          beige: {
            50: '#fdfcfb',
            100: '#f9f5f0',
            200: '#f3ebe0',
            300: '#e8dbc8',
            400: '#d9c4a5',
            500: '#c9b18a',
            DEFAULT: '#f5f0e8',
          },
          cream: {
            50: '#fffefa',
            100: '#fefcf5',
            200: '#fdf8eb',
            300: '#faf3dc',
            DEFAULT: '#faf6ef',
          },
          sand: {
            50: '#faf8f5',
            100: '#f5f0e8',
            200: '#ebe3d5',
            300: '#ddd1bd',
            DEFAULT: '#e8dcc8',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        'pastel': '0 4px 20px -2px rgba(147, 197, 219, 0.25)',
        'pastel-lg': '0 10px 40px -5px rgba(147, 197, 219, 0.3)',
        'beige': '0 4px 20px -2px rgba(200, 180, 160, 0.2)',
        'beige-lg': '0 10px 40px -5px rgba(200, 180, 160, 0.25)',
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.5)',
        '3d': '0 1px 2px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03), 0 16px 32px rgba(0,0,0,0.05)',
      },
      backgroundImage: {
        'gradient-pastel': 'linear-gradient(135deg, hsl(200 80% 92%) 0%, hsl(35 50% 93%) 50%, hsl(200 60% 94%) 100%)',
        'gradient-beige': 'linear-gradient(135deg, hsl(35 50% 95%) 0%, hsl(35 40% 90%) 100%)',
        'gradient-blue': 'linear-gradient(135deg, hsl(200 70% 88%) 0%, hsl(200 60% 80%) 100%)',
        'gradient-warm': 'linear-gradient(180deg, hsl(40 30% 97%) 0%, hsl(35 35% 94%) 100%)',
        'gradient-radial-pastel': 'radial-gradient(ellipse at center, hsl(200 70% 95%) 0%, hsl(35 40% 96%) 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "subtle-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          "50%": {
            transform: "scale(1.02)",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          },
        },
        "bounce-once": {
          "0%, 100%": {
            transform: "translateY(0) rotate(0deg)",
          },
          "25%": {
            transform: "translateY(-10px) rotate(-3deg)",
          },
          "50%": {
            transform: "translateY(0) rotate(0deg)",
          },
          "75%": {
            transform: "translateY(-5px) rotate(3deg)",
          },
        },
        "status-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.05)",
          },
        },
        "icon-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "subtle-pulse": "subtle-pulse 3s ease-in-out infinite",
        "bounce-once": "bounce-once 0.8s ease-out",
        "status-pulse": "status-pulse 2s ease-in-out infinite",
        "icon-pulse": "icon-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}