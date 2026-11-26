export interface AgronomicRow {
  culture: string;
  region: string;
  period: string;
  productivity: number;
  ph: number;
}

export const AGRONOMIC_ROWS: readonly AgronomicRow[] = [
  { culture: 'Citros', region: 'Centro', period: '2022', productivity: 31, ph: 5.4 },
  { culture: 'Citros', region: 'Centro', period: '2023', productivity: 35, ph: 5.7 },
  { culture: 'Citros', region: 'Centro', period: '2024', productivity: 38, ph: 5.9 },
  { culture: 'Milho', region: 'Norte', period: '2022', productivity: 22, ph: 5.2 },
  { culture: 'Milho', region: 'Norte', period: '2023', productivity: 27, ph: 5.5 },
  { culture: 'Milho', region: 'Norte', period: '2024', productivity: 29, ph: 5.8 },
  { culture: 'Café', region: 'Sul', period: '2022', productivity: 19, ph: 5.1 },
  { culture: 'Café', region: 'Sul', period: '2023', productivity: 24, ph: 5.4 },
  { culture: 'Café', region: 'Sul', period: '2024', productivity: 26, ph: 5.6 },
];

export function filterAgronomicRows(rows: readonly AgronomicRow[], culture: string): AgronomicRow[] {
  return rows.filter((row) => culture === 'Todas' || row.culture === culture);
}

export function rowsToCsv(rows: readonly AgronomicRow[]): string {
  const header = 'Cultura,Região,Período,Produtividade (sc/ha),pH';
  return [header, ...rows.map((row) => `${row.culture},${row.region},${row.period},${row.productivity},${row.ph}`)].join('\n');
}
