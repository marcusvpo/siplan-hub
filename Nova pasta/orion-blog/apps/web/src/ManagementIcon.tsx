type IconName = 'publicacoes' | 'acompanhamento' | 'sugestoes' | 'version' | 'plus' | 'logout' | 'edit' | 'delete' | 'refresh';

const paths: Record<IconName, string> = {
  publicacoes: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9ZM14 3v6h6M8 13h8M8 17h5',
  acompanhamento: 'M4 3v17h17M8 15v-4M13 15V7M18 15v-6',
  sugestoes: 'M21 15a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM7 8h10M7 12h6',
  version: 'm12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  plus: 'M12 5v14M5 12h14',
  logout: 'M9 4H5v16h4M10 12h11m-4-4 4 4-4 4',
  edit: 'm16 3 5 5-12 12-6 1 1-6ZM13 6l5 5',
  delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2l1 4M4 12l1 4a8 8 0 0 0 13 2',
};

export function ManagementIcon({ name }: { name: IconName }) {
  return <svg className="management-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
