@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #0f172a;
    color: #f1f5f9;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #1e293b;
  }

  ::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
}

@layer components {
  .sidebar-item {
    @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer;
  }

  .sidebar-item-active {
    @apply bg-amber-500/20 text-amber-400 border border-amber-500/30;
  }

  .sidebar-item-inactive {
    @apply text-steel-400 hover:bg-steel-800 hover:text-steel-100;
  }

  .card {
    @apply bg-steel-800 border border-steel-700 rounded-xl p-6;
  }

  .card-dark {
    @apply bg-steel-900 border border-steel-700 rounded-xl p-6;
  }

  .metric-card {
    @apply bg-steel-800 border border-steel-700 rounded-xl p-5 hover:border-steel-600 transition-colors;
  }

  .btn-primary {
    @apply bg-amber-500 hover:bg-amber-400 text-petroleum-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-secondary {
    @apply bg-steel-700 hover:bg-steel-600 text-steel-100 font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2;
  }

  .btn-ghost {
    @apply text-steel-400 hover:text-steel-100 hover:bg-steel-800 font-medium px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2;
  }

  .btn-danger {
    @apply bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2;
  }

  .input {
    @apply bg-steel-900 border border-steel-700 text-steel-100 placeholder-steel-500 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200;
  }

  .select {
    @apply bg-steel-900 border border-steel-700 text-steel-100 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200;
  }

  .label {
    @apply text-steel-300 text-sm font-medium mb-1.5 block;
  }

  .table-header {
    @apply text-xs font-semibold text-steel-400 uppercase tracking-wider px-4 py-3 text-left;
  }

  .table-cell {
    @apply px-4 py-3 text-sm text-steel-200;
  }

  .table-row {
    @apply border-b border-steel-700/50 hover:bg-steel-700/30 transition-colors;
  }

  .badge {
    @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold;
  }

  .badge-success {
    @apply bg-emerald-500/20 text-emerald-400 border border-emerald-500/30;
  }

  .badge-warning {
    @apply bg-amber-500/20 text-amber-400 border border-amber-500/30;
  }

  .badge-danger {
    @apply bg-red-500/20 text-red-400 border border-red-500/30;
  }

  .badge-info {
    @apply bg-blue-500/20 text-blue-400 border border-blue-500/30;
  }

  .badge-neutral {
    @apply bg-steel-600/50 text-steel-300 border border-steel-600;
  }

  .badge-active {
    @apply bg-petroleum-600/40 text-petroleum-200 border border-petroleum-500/30;
  }

  .section-title {
    @apply text-xl font-bold text-steel-50 mb-1;
  }

  .section-subtitle {
    @apply text-sm text-steel-400;
  }

  .progress-bar {
    @apply h-1.5 bg-steel-700 rounded-full overflow-hidden;
  }

  .progress-fill {
    @apply h-full bg-amber-500 rounded-full transition-all duration-500;
  }

  .modal-overlay {
    @apply fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4;
  }

  .modal {
    @apply bg-steel-800 border border-steel-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto;
  }

  .modal-lg {
    @apply bg-steel-800 border border-steel-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto;
  }

  .modal-header {
    @apply flex items-center justify-between p-6 border-b border-steel-700;
  }

  .modal-body {
    @apply p-6;
  }

  .modal-footer {
    @apply flex items-center justify-end gap-3 p-6 border-t border-steel-700;
  }
}

@layer utilities {
  .text-gradient {
    background: linear-gradient(135deg, #fbbf24, #f97316);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glow-amber {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
  }
}
