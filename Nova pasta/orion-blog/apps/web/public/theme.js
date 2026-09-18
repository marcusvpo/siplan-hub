// Executado antes do primeiro desenho, sem script inline na política de produção.
try {
  const savedTheme = localStorage.getItem('orion-theme');
  document.documentElement.dataset.theme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch (_) { /* Preferência opcional. */ }
