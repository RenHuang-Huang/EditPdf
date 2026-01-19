/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2563EB', // Blue-600
                secondary: '#3B82F6', // Blue-500
                cta: '#F97316', // Orange-500
                background: '#F8FAFC', // Slate-50
                text: '#1E293B', // Slate-800
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
