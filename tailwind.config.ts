import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        vazirmatn: ['Vazirmatn', 'system-ui', '-apple-system', 'sans-serif'],
      },

      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },

      /**
       * Typography plugin customization
       * Optimized for Persian (RTL) editorial content
       */
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            direction: 'rtl',
            textAlign: 'right',
            fontFamily: theme('fontFamily.vazirmatn').join(','),
            lineHeight: '1.9',

            p: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },

            h1: {
              fontWeight: '700',
              lineHeight: '1.4',
            },
            h2: {
              fontWeight: '700',
              lineHeight: '1.45',
            },
            h3: {
              fontWeight: '600',
              lineHeight: '1.5',
            },

            ul: {
              paddingRight: '1.5rem',
              paddingLeft: '0',
            },
            ol: {
              paddingRight: '1.5rem',
              paddingLeft: '0',
            },

            blockquote: {
              borderRightWidth: '4px',
              borderLeftWidth: '0',
              paddingRight: '1rem',
              fontStyle: 'normal',
            },

            strong: {
              fontWeight: '600',
            },

            a: {
              color: theme('colors.blue.600'),
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          },
        },

        /**
         * Dark mode typography
         */
        invert: {
          css: {
            color: theme('colors.gray.200'),

            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.white') },
            h3: { color: theme('colors.white') },

            a: {
              color: theme('colors.blue.400'),
            },

            blockquote: {
              borderRightColor: theme('colors.gray.600'),
              color: theme('colors.gray.300'),
            },
          },
        },
      }),
    },
  },

  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
