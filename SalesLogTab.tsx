@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,650;1,400;1,650&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Outfit", sans-serif;
  --font-serif: "Playfair Display", Georgia, serif;
  --font-mono: "JetBrains Mono", monospace;
  
  --color-brand-cream: #F5F3FB;
  --color-brand-surface: #FFFFFF;
  --color-brand-dark: #16142E;
}

body {
  font-family: var(--font-sans);
  background-color: #F5F3FB !important;
  color: #2D2A3A !important;
}

.font-display {
  font-family: var(--font-display);
}

.font-mono {
  font-family: var(--font-mono);
}

.font-serif {
  font-family: var(--font-serif);
}

/* --- Sophisticated Lavender Bloom Theme Overrides --- */

/* Background overrides */
.bg-brand-cream {
  background-color: #F5F3FB !important;
}

.bg-brand-surface {
  background-color: #FFFFFF !important;
  border-color: #E6E1F5 !important;
  box-shadow: 0 10px 30px -5px rgba(22, 20, 46, 0.04), 0 4px 12px -2px rgba(111, 82, 231, 0.03) !important;
}

.bg-white {
  background-color: #FFFFFF !important;
}

.bg-neutral-50, .bg-neutral-50\/70, .bg-neutral-50\/50, .bg-neutral-50\/55 {
  background-color: #F8F6FE !important;
}

.bg-indigo-50\/40 {
  background-color: rgba(111, 82, 231, 0.05) !important;
}

.bg-blue-50\/50 {
  background-color: rgba(111, 82, 231, 0.04) !important;
}

.bg-blue-50 {
  background-color: rgba(111, 82, 231, 0.06) !important;
  color: #6F52E7 !important;
}

.text-blue-700 {
  color: #6F52E7 !important;
}

.text-blue-600 {
  color: #7E63FF !important;
}

.border-blue-100 {
  border-color: rgba(111, 82, 231, 0.15) !important;
}

.bg-indigo-50\/30 {
  background-color: rgba(111, 82, 231, 0.04) !important;
}

.bg-amber-50\/20 {
  background-color: rgba(201, 123, 42, 0.04) !important;
}

.bg-emerald-50\/20 {
  background-color: rgba(74, 140, 63, 0.04) !important;
}

.bg-indigo-50\/20 {
  background-color: rgba(111, 82, 231, 0.03) !important;
}

/* Border overrides */
.border-neutral-200, .border-neutral-300, .border-neutral-100, .border-amber-200\/50, .border-emerald-200\/50, .border-indigo-200\/50 {
  border-color: #E6E1F5 !important;
}

/* Text color overrides */
.text-neutral-950, .text-neutral-900, .text-neutral-850, .text-neutral-800, .text-neutral-700 {
  color: #1F1B3D !important;
}

.text-neutral-500, .text-neutral-400 {
  color: #6B6687 !important;
}

.text-neutral-600 {
  color: #4D476B !important;
}

/* Input & Select Box styling */
input, select, textarea {
  background-color: #FFFFFF !important;
  border-color: #D3CDE8 !important;
  color: #16142E !important;
}

input:focus, select:focus, textarea:focus {
  border-color: #6F52E7 !important;
  box-shadow: 0 0 0 1px rgba(111, 82, 231, 0.15) !important;
}

/* Buttons style refinement */
.btn-primary, button[type="submit"] {
  background-color: #16142E !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
  border-radius: 9999px !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.btn-primary:hover, button[type="submit"]:hover {
  background-color: #6F52E7 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(111, 82, 231, 0.4) !important;
}

.bg-neutral-900 {
  background-color: #16142E !important;
  color: #FFFFFF !important;
}

.hover\:bg-neutral-800:hover {
  background-color: #6F52E7 !important;
}

/* Low stock alert cards styling */
.bg-orange-50 {
  background-color: #FFF6EE !important;
  border-color: #FFAE66 !important;
  color: #CF5900 !important;
}

.bg-emerald-50 {
  background-color: #EBF8EC !important;
  border-color: #8BCD93 !important;
  color: #187222 !important;
}

/* Stock warning badges */
.bg-amber-50, .bg-amber-50\/50, .text-amber-800, .text-amber-700 {
  background-color: #FFF6EE !important;
  color: #CF5900 !important;
  border-color: rgba(207, 89, 0, 0.15) !important;
}

.bg-emerald-50, .text-emerald-800, .text-emerald-700 {
  background-color: #EBF8EC !important;
  color: #187222 !important;
  border-color: rgba(24, 114, 34, 0.15) !important;
}

.bg-indigo-50, .text-indigo-800, .text-indigo-700 {
  background-color: #F1EDFE !important;
  color: #5C3AD6 !important;
  border-color: rgba(92, 58, 214, 0.15) !important;
}

/* Navigator menu */
nav.fixed {
  background-color: #16142E !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(12px);
}

nav.fixed button {
  color: #A3A0B8 !important;
}

nav.fixed button.text-emerald-700 {
  color: #E0CEFA !important;
}

nav.fixed button:hover {
  color: #FFFFFF !important;
}

/* Header style override */
header {
  background-color: #16142E !important;
  color: #FFFFFF !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

header button {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background-color: rgba(255, 255, 255, 0.04) !important;
  color: #FFFFFF !important;
}

header button:hover {
  border-color: rgba(255, 255, 255, 0.2) !important;
  background-color: rgba(255, 255, 255, 0.08) !important;
}

/* Table elements */
tr:hover {
  background-color: #F5F3FB !important;
}

th {
  background-color: #F5F3FB !important;
  color: #6B6687 !important;
  border-bottom: 1px solid #E6E1F5 !important;
}

/* Recharts grid lines & labels */
.recharts-cartesian-grid line {
  stroke: #E6E1F5 !important;
}

.recharts-text {
  fill: #6B6687 !important;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #F5F3FB;
}
::-webkit-scrollbar-thumb {
  background: rgba(111, 82, 231, 0.15);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(111, 82, 231, 0.3);
}


