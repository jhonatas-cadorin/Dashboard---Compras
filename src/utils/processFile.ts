/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { PurchaseRecord, DashboardData, AppMode } from '../types';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function normalizeString(val: any): string {
  return String(val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-/.\s]/g, "")
    .trim();
}

function parseMonthAndYear(key: string): { monthIndex: number; year: number } | null {
  if (!key) return null;
  let normKey = key.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Check for Excel Serial Dates
  const num = Number(normKey);
  if (!isNaN(num) && num >= 44000 && num <= 49000 && Number.isInteger(num)) {
    const dateObj = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return { monthIndex: dateObj.getUTCMonth(), year: dateObj.getUTCFullYear() };
    }
  }

  // 2. Check for standard Date parsing if it looks like a full Date string
  if (normKey.includes(' gmt') || normKey.includes(' utc')) {
    const parsedDate = new Date(key);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      if (year >= 2020 && year <= 2035) {
        return { monthIndex: parsedDate.getMonth(), year };
      }
    }
  }

  // 3. Try to parse purely numeric dates with separators (e.g. 01/25, 01/01/25, 2025-01-01)
  const cleanKey = normKey.replace(/[-.\s]/g, '/');
  const parts = cleanKey.split('/').filter(p => p.length > 0);
  const allNumeric = parts.length > 0 && parts.every(p => /^\d+$/.test(p));

  if (allNumeric) {
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);
      
      if (p1 >= 2020 && p1 <= 2035) {
        if (p2 >= 1 && p2 <= 12) {
          return { monthIndex: p2 - 1, year: p1 };
        }
      }
      
      if (p3 < 100) p3 += 2000;
      if (p3 >= 2020 && p3 <= 2035) {
        let month = -1;
        if (p1 > 12 && p2 >= 1 && p2 <= 12) {
          month = p2;
        } else if (p2 > 12 && p1 >= 1 && p1 <= 12) {
          month = p1;
        } else if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 12) {
          month = p2;
        }
        if (month >= 1 && month <= 12) {
          return { monthIndex: month - 1, year: p3 };
        }
      }
    } else if (parts.length === 2) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      
      if (p1 >= 2020 && p1 <= 2035 && p2 >= 1 && p2 <= 12) {
        return { monthIndex: p2 - 1, year: p1 };
      }
      if (p2 >= 2020 && p2 <= 2035 && p1 >= 1 && p1 <= 12) {
        return { monthIndex: p1 - 1, year: p2 };
      }
      
      let yr1 = p1;
      let yr2 = p2;
      if (yr1 < 100) yr1 += 2000;
      if (yr2 < 100) yr2 += 2000;
      
      if (yr2 >= 2020 && yr2 <= 2035 && p1 >= 1 && p1 <= 12) {
        return { monthIndex: p1 - 1, year: yr2 };
      } else if (yr1 >= 2020 && yr1 <= 2035 && p2 >= 1 && p2 <= 12) {
        return { monthIndex: p2 - 1, year: yr1 };
      }
    }
  }

  // 4. Text-based month names detection
  const monthTerms = [
    { index: 11, names: ['dezembro', 'dez', 'december', 'dec', 'mes_12', 'm12'] },
    { index: 10, names: ['novembro', 'nov', 'november', 'mes_11', 'm11'] },
    { index: 9, names: ['outubro', 'out', 'october', 'oct', 'mes_10', 'm10'] },
    { index: 8, names: ['setembro', 'set', 'september', 'sep', 'mes_9', 'm9'] },
    { index: 7, names: ['agosto', 'ago', 'august', 'aug', 'mes_8', 'm8'] },
    { index: 6, names: ['julho', 'jul', 'july', 'jul', 'mes_7', 'm7'] },
    { index: 5, names: ['junho', 'jun', 'june', 'mes_6', 'm6'] },
    { index: 4, names: ['maio', 'mai', 'may', 'mes_5', 'm5'] },
    { index: 3, names: ['abril', 'abr', 'april', 'apr', 'mes_4', 'm4'] },
    { index: 2, names: ['marco', 'mar', 'march', 'mes_3', 'm3'] },
    { index: 1, names: ['fevereiro', 'fev', 'february', 'feb', 'mes_2', 'm2'] },
    { index: 0, names: ['janeiro', 'jan', 'january', 'mes_1', 'm1'] }
  ];

  let foundMonthIndex = -1;
  for (const term of monthTerms) {
    for (const name of term.names) {
      const hasExactWord = normKey === name || 
                           normKey.startsWith(name + '_') || 
                           normKey.startsWith(name + '/') || 
                           normKey.startsWith(name + ' ') || 
                           normKey.startsWith(name + '-') || 
                           normKey.endsWith('_' + name) || 
                           normKey.endsWith('/' + name) || 
                           normKey.endsWith('-' + name) || 
                           normKey.includes('_' + name + '_') || 
                           normKey.includes('/' + name + '/') ||
                           normKey.includes('-' + name + '-') ||
                           (normKey.includes(name) && !normKey.includes('media') && !normKey.includes('meta'));
      
      if (hasExactWord) {
        foundMonthIndex = term.index;
        break;
      }
    }
    if (foundMonthIndex !== -1) break;
  }

  if (foundMonthIndex === -1) return null;

  const matchYear4 = normKey.match(/(?:^|[^0-9])(202[4-9]|203[0-5])(?:$|[^0-9])/);
  if (matchYear4) {
    return { monthIndex: foundMonthIndex, year: parseInt(matchYear4[1], 10) };
  }

  const matchYear2 = normKey.match(/(?:^|[^0-9])(2[4-9]|3[0-5])(?:$|[^0-9])/);
  if (matchYear2) {
    return { monthIndex: foundMonthIndex, year: 2000 + parseInt(matchYear2[1], 10) };
  }

  return { monthIndex: foundMonthIndex, year: null as any };
}

const parseBrazilianNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).trim();
  // Remove currency symbols
  s = s.replace(/R\$\s?/, '');
  
  if (s.includes(',') && s.includes('.')) {
    // Thousands as dot, decimals as comma
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // Only comma as decimal
    s = s.replace(',', '.');
  }
  // Remove any non-numeric characters except the dot and minus sign
  const cleaned = s.replace(/[^\d.\-]/g, '');
  return parseFloat(cleaned) || 0;
};

async function processInventoryFile(file: File, sheetData: any[][]): Promise<DashboardData> {
  const inventoryRecords: any[] = [];
  
  let colIdx: any = {
    abc: -1,
    cod: -1,
    desc: -1,
    filial: -1,
    grupo: -1,
    saldo: -1,
    media: -1,
    cobertura: -1,
    criterio: -1,
    sugestao: -1,
    total_mov: -1,
    saldo_inicial: -1,
    un: -1,
    fab: -1,
    custo: -1,
    preco: -1,
    lead_time: -1,
    months: []
  };

  // Header detection
  let headerRowIdx = -1;
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  for (let r = 0; r < Math.min(sheetData.length, 50); r++) {
    const rawRow = sheetData[r];
    if (!rawRow || !Array.isArray(rawRow)) continue;

    const rowStr = rawRow.map(v => v === null ? '' : String(v).trim().toLowerCase());
    
    // Check for mandatory columns: Code and Description
    const hasCod = rowStr.some(c => 
      (c === 'cod' || c === 'cód' || c === 'código' || c === 'codigo' || 
      c.includes('material') || c.includes('sku') || c === 'id' || c.includes('item') || c.includes('nº do item') || c === 'part number') && !c.includes('desc')
    );
    const hasDesc = rowStr.some(c => 
      (c === 'desc' || c === 'descr' || c.includes('descrição') || 
      c.includes('descricao') || c === 'item' || c === 'produto' || c === 'nome' || c.includes('descrição do item')) && !c.match(/^cod|^cód/)
    );
    
    if (hasCod && hasDesc) {
      headerRowIdx = r;
      rowStr.forEach((cell, idx) => {
        const c = cell.toLowerCase().trim();
        if (c === 'abc' || c.includes('curva') || c.includes('classe')) colIdx.abc = idx;
        if ((c === 'cod' || c === 'cód' || c.includes('código') || c.includes('codigo') || c.includes('material') || c.includes('item') || c.includes('nº do item') || c.includes('n/ do item') || c.includes('n/ item') || c === 'part number' || c.includes('número do item')) && !c.includes('desc')) colIdx.cod = idx;
        if (c === 'desc' || c.includes('descrição') || c.includes('descricao') || c.includes('descr') || c === 'item' || c.includes('descrição do item') || c === 'produto' || c === 'nome') {
           if (colIdx.desc === -1 || c.includes('descrição do item') || c.includes('desc') || c.includes('item')) colIdx.desc = idx;
        }
        if (c.includes('filial') || c.includes('unidade') || c.includes('depósito') || c.includes('deposito') || c === 'loja') {
          if (colIdx.filial === -1 || c.includes('nome')) colIdx.filial = idx;
        }
        if (c === 'grupo de itens' || c === 'grupo de item' || c.includes('grupo') || c.includes('família') || c.includes('familia') || c.includes('setor') || c.includes('categoria')) {
          if (colIdx.grupo === -1 || c === 'grupo de itens' || c === 'grupo de item') colIdx.grupo = idx;
        }
        if (c.includes('saldo') || c.includes('estoque') || c.includes('est.') || c.includes('quantidade') || c === 'qtd') {
          // Prioritize specific "físico" stock over general saldo/estoque
          if (colIdx.saldo === -1 || c.includes('fisico') || c.includes('físico')) colIdx.saldo = idx;
        }
        if (c.includes('média') || c.includes('media') || c.includes('méd') || c.includes('venda media')) colIdx.media = idx;
        if (c.includes('cobertura') || c.includes('cob.')) colIdx.cobertura = idx;
        if (c.includes('critério') || c.includes('criterio') || c.includes('crit.') || c === 'situação' || c === 'situacao' || c === 'status') colIdx.criterio = idx;
        if (c.includes('sugestão') || c.includes('sugestao') || c.includes('sug.') || c.includes('reposição')) colIdx.sugestao = idx;
        if (c.includes('total mov') || c.includes('movimento') || c.includes('total vendas') || c.includes('movimento anual')) colIdx.total_mov = idx;
        if (c.includes('saldo anterior') || c.includes('estoque inicial') || c.includes('est. inicial') || c.includes('ant.')) colIdx.saldo_inicial = idx;
        if (c.includes('unidade de medida') || c === 'un' || c === 'um' || c.includes('unid')) colIdx.un = idx;
        if (c === 'nome do fabricante' || c === 'fabricante' || c === 'marca' || (colIdx.fab === -1 && (c.includes('fabricante') || c.includes('fornecedor') || c.includes('marca') || c === 'fab'))) colIdx.fab = idx;
        if (c.includes('custo') || c === 'vlr custo' || c === 'unit cost') colIdx.custo = idx;
        if (c.includes('preço') || c.includes('preco') || c === 'vlr unit' || c === 'unit price' || c === 'vlr venda') colIdx.preco = idx;
        if (c.includes('lead time') || c.includes('leadtime') || c.includes('prazo') || c.includes('entrega')) colIdx.lead_time = idx;

        // Monthly detection using new robust parseMonthAndYear
        const parsed = parseMonthAndYear(c);
        if (parsed) {
          colIdx.months.push({ 
            name: c, 
            idx, 
            monthIdx: parsed.monthIndex, 
            year: parsed.year 
          });
        } else {
          const monthMatch = monthNames.findIndex(m => c === m || c.startsWith(m + '_') || c.startsWith(m + '/'));
          if (monthMatch !== -1) {
            colIdx.months.push({ name: c, idx, monthIdx: monthMatch, year: null });
          }
        }
      });
      // Sort months by calendar order if found out of order
      colIdx.months.sort((a: any, b: any) => a.monthIdx - b.monthIdx);
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Não foi possível identificar as colunas obrigatórias (Código e Descrição). Certifique-se de que a planilha possui os cabeçalhos corretos.');
  }

  // Fallback for monthly columns if not explicitly found by name
  if (colIdx.months.length === 0 && colIdx.saldo >= 0) {
    const hRow = sheetData[headerRowIdx];
    for (let c = colIdx.saldo + 1; c < hRow.length && colIdx.months.length < 12; c++) {
      colIdx.months.push({ name: `M${colIdx.months.length + 1}`, idx: c, monthIdx: colIdx.months.length, year: null });
    }
  }

  const globalDetectedYearsSet = new Set<number>();
  colIdx.months.forEach((m: any) => {
    if (m.year) {
      globalDetectedYearsSet.add(m.year);
    }
  });

  const availableYears = globalDetectedYearsSet.size > 0 
    ? Array.from(globalDetectedYearsSet).sort() 
    : [2025];

  // Data parsing
  const normalizeCrit = (s: string, saldo: number, totalMov: number, coverage: number) => {
    const norm = s.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, '_');
    
    // User requested hierarchy: Ruptura, Excesso, Sem Giro
    if (totalMov === 0) return 'SEM_MOVIMENTO'; // Sem Movimento (12 meses)
    if (saldo <= 0 && totalMov > 0) return 'URGENTE'; // Ruptura
    if (saldo > totalMov) return 'ESTOQUE_ALTO'; // Excesso (Transferível)
    
    // Secondary statuses
    if (totalMov > 0 && coverage <= 1.0) return 'COMPRAR_JA'; // Crítico/Reposição
    if (totalMov > 0 && coverage <= 2.0) return 'COMPRAR_BREVE'; // Preventivo
    if (norm.includes('OK') || norm.includes('NORMAL') || (totalMov > 0 && coverage > 2.0)) return 'OK'; // Saudável
    
    return norm || 'OK';
  };

  for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
    const rawRow = sheetData[r];
    if (!rawRow || rawRow.length === 0) continue;

    const cod = String(rawRow[colIdx.cod] || '').trim();
    if (!cod || cod.toLowerCase() === 'total' || cod.toLowerCase().includes('subtotal')) continue;

    // Parse meses and mesesByYear
    const meses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const mesesByYear: Record<number, number[]> = {};
    availableYears.forEach(yr => {
      mesesByYear[yr] = Array(12).fill(0);
    });

    colIdx.months.forEach((m: any) => {
      const val = parseBrazilianNumber(rawRow[m.idx]);
      if (m.year) {
        if (!mesesByYear[m.year]) {
          mesesByYear[m.year] = Array(12).fill(0);
        }
        mesesByYear[m.year][m.monthIdx] = val;
      } else {
        const defaultYear = availableYears[0] || 2025;
        if (!mesesByYear[defaultYear]) {
          mesesByYear[defaultYear] = Array(12).fill(0);
        }
        mesesByYear[defaultYear][m.monthIdx] = val;
      }
    });

    for (let i = 0; i < 12; i++) {
      let sum = 0;
      Object.keys(mesesByYear).forEach(yrStr => {
        const yr = parseInt(yrStr, 10);
        sum += mesesByYear[yr][i] || 0;
      });
      meses[i] = sum;
    }

    const total_mov = colIdx.total_mov >= 0 ? parseBrazilianNumber(rawRow[colIdx.total_mov]) : meses.reduce((a: number, v: number) => a + v, 0);
    const media = colIdx.media >= 0 ? parseBrazilianNumber(rawRow[colIdx.media]) : total_mov / 12;
    const saldo = parseBrazilianNumber(rawRow[colIdx.saldo]);
    const coverage = media > 0 ? saldo / media : (saldo > 0 ? 99 : 0);
    
    // Quarterly trends
    const t1 = meses.slice(0, 3).reduce((a, b) => a + b, 0);
    const t2 = meses.slice(3, 6).reduce((a, b) => a + b, 0);
    const t3 = meses.slice(6, 9).reduce((a, b) => a + b, 0);
    const t4 = meses.slice(9, 12).reduce((a, b) => a + b, 0);

    const custo = colIdx.custo >= 0 ? parseBrazilianNumber(rawRow[colIdx.custo]) : 0;
    const preco = colIdx.preco >= 0 ? parseBrazilianNumber(rawRow[colIdx.preco]) : 0;
    
    // User requested financial logic
    const valor_ruptura = (saldo <= 0 && total_mov > 0) ? (total_mov / 12) * (preco || custo || 0) : 0;
    const isExcesso = saldo > total_mov && total_mov >= 0;
    const isSemGiro = total_mov === 0 && saldo > 0;
    const capital_parado = (isExcesso || isSemGiro) ? saldo * (custo || preco || 0) : 0;
    const saldoTransferivel = Math.max(0, saldo - total_mov);

    const record = {
      cod,
      desc: String(rawRow[colIdx.desc] || '').trim(),
      curva: String(rawRow[colIdx.abc] || '').trim().toUpperCase().slice(0, 1),
      filial: String(rawRow[colIdx.filial] || 'GERAL').trim().toUpperCase(),
      grupo: String(rawRow[colIdx.grupo] || 'OUTROS').trim().toUpperCase(),
      saldo,
      media,
      custo,
      preco,
      valor_ruptura: Math.max(0, valor_ruptura),
      capital_parado: Math.max(0, capital_parado),
      saldoTransferivel,
      lead_time: colIdx.lead_time >= 0 ? parseBrazilianNumber(rawRow[colIdx.lead_time]) : 30, // Default 30 days
      cobertura: colIdx.cobertura >= 0 ? parseBrazilianNumber(rawRow[colIdx.cobertura]) : coverage,
      criterio: normalizeCrit(String(rawRow[colIdx.criterio] || ''), saldo, total_mov, coverage),
      sugestao: colIdx.sugestao >= 0 ? parseBrazilianNumber(rawRow[colIdx.sugestao]) : Math.max(0, (media * 2) - saldo),
      saldo_inicial: colIdx.saldo_inicial >= 0 ? parseBrazilianNumber(rawRow[colIdx.saldo_inicial]) : null,
      total_mov,
      un: colIdx.un >= 0 ? String(rawRow[colIdx.un] || 'UN').trim() : 'UN',
      fab: colIdx.fab >= 0 ? String(rawRow[colIdx.fab] || 'N/I').trim() : 'N/I',
      meses,
      t1, t2, t3, t4,
      mesesByYear,
      _normCod: normalizeString(cod),
      _normDesc: normalizeString(String(rawRow[colIdx.desc] || '')),
      _normGrupo: normalizeString(String(rawRow[colIdx.grupo] || 'OUTROS')),
      _normFab: normalizeString(colIdx.fab >= 0 ? String(rawRow[colIdx.fab] || 'N/I') : 'N/I')
    };

    inventoryRecords.push(record);
  }

  // ABC calculation based on total_mov
  const sortedByMov = [...inventoryRecords].sort((a, b) => b.total_mov - a.total_mov);
  const globalTotalMov = sortedByMov.reduce((acc, r) => acc + r.total_mov, 0);
  let cumulativeMov = 0;

  sortedByMov.forEach(r => {
    if (r.curva) return; // Keep existing if present
    cumulativeMov += r.total_mov;
    const pct = (cumulativeMov / globalTotalMov) * 100;
    if (pct <= 80) r.curva = 'A';
    else if (pct <= 95) r.curva = 'B';
    else r.curva = 'C';
  });

  // Final fallback for items with 0 movement
  inventoryRecords.forEach(r => {
    if (!r.curva) r.curva = 'C';
  });

  const filiais = [...new Set(inventoryRecords.map(r => r.filial))].sort();
  const groups = [...new Set(inventoryRecords.map(r => r.grupo))].sort();
  const fabs = [...new Set(inventoryRecords.map(r => r.fab))].sort();
  
  return {
    mode: 'missing_items',
    filename: file.name,
    rowCount: inventoryRecords.length,
    filiais,
    groups,
    fabs,
    availableYears,
    inventoryRecords
  };
}

export async function processFile(file: File, mode: AppMode): Promise<DashboardData> {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array', cellDates: true, raw: false });
  
  let inventorySheet: any[][] | null = null;
  let transactionSheet: any[][] | null = null;
  let activeSheetName = '';

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
    const textContent = raw.slice(0, 20).flat().map(v => String(v || '').toLowerCase());
    
    const hasInventoryKeywords = textContent.some(t => 
      t.includes('código') || t.includes('codigo') || t === 'cod' || t === 'cód' || 
      t.includes('descrição') || t.includes('descricao') || t.includes('cobertura') || t.includes('sugestão') ||
      t.includes('nº do item') || t.includes('descrição do item')
    );

    const hasTransactionKeywords = textContent.some(t => 
      t.includes('tp doc') || t.includes('parceiro') || t.includes('nº doc') || 
      t.includes('valor liq') || t.includes('vlr liq') || t.includes('nota fiscal')
    );

    if (hasInventoryKeywords && !inventorySheet) {
      inventorySheet = raw;
      if (mode === 'missing_items') activeSheetName = name;
    }
    if (hasTransactionKeywords && !transactionSheet) {
      transactionSheet = raw;
      if (mode !== 'missing_items') activeSheetName = name;
    }
  }

  // Fallback
  if (!inventorySheet && !transactionSheet) {
    const firstSheet = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
    transactionSheet = firstSheet; // Default to transaction if unknown
  }

  const result: DashboardData = {
    filename: file.name,
    rowCount: 0,
    filiais: [],
    groups: [],
    mode: mode
  };

  if (transactionSheet) {
    const transactionData = await processTransactionData(file, transactionSheet, mode);
    Object.assign(result, transactionData);
  }

  if (inventorySheet) {
    const inventoryData = await processInventoryFile(file, inventorySheet);
    result.inventoryRecords = inventoryData.inventoryRecords;
    result.availableYears = inventoryData.availableYears;
    result.fabs = [...new Set([...(result.fabs || []), ...(inventoryData.fabs || [])])].sort();
    result.groups = [...new Set([...(result.groups || []), ...(inventoryData.groups || [])])].sort();
    result.filiais = [...new Set([...(result.filiais || []), ...(inventoryData.filiais || [])])].sort();
  }

  result.rowCount = (result.records?.length || 0) + (result.inventoryRecords?.length || 0);
  return result;
}

async function processTransactionData(file: File, sheetData: any[][], mode: AppMode): Promise<Partial<DashboardData>> {
  const records: PurchaseRecord[] = [];
  let curFilial = 'GERAL';
  let curParceiro = 'NÃO INFORMADO';
  let curGrupo = 'OUTROS';

  let colIdx = {
    date: 0,
    type: 3,
    nf: 4,
    code: 8,
    desc: 11,
    un: 16,
    qty: 18,
    total: 19,
    grupo: -1,
    parceiro: -1,
    filial: -1,
    fab: -1
  };

  for (const rawRow of sheetData) {
    const rowStr = rawRow.map(v => v === null ? '' : String(v).trim().toLowerCase());
    if ((rowStr.includes('data') || rowStr.some(s => s.includes('vencimento') || s.includes('lançamento'))) && 
        (rowStr.includes('tp doc') || rowStr.includes('tipo') || rowStr.some(s => s.includes('parceiro') || s.includes('cliente') || s.includes('fornecedor') || s.includes('nº doc/nf')))) {
      rowStr.forEach((cell, idx) => {
        const c = cell.toLowerCase().trim();
        if (c.includes('data') || c.includes('lançamento')) colIdx.date = idx;
        if (c.includes('tp doc') || c.includes('tipo')) colIdx.type = idx;
        if (c === 'nº doc/nf' || c === 'n° doc/nf' || c === 'nº doc' || c === 'n° doc' || c.includes('nº doc') || c.includes('n° doc') || c.includes('doc/nf') || c.includes('nota fiscal') || c === 'nf') colIdx.nf = idx;
        if (c === 'grupo de itens' || c === 'grupo de item' || c.includes('grupo de item') || c.includes('família') || c.includes('familia') || c.includes('setor') || c.includes('categoria')) {
          if (colIdx.grupo === -1 || c.includes('grupo de item')) colIdx.grupo = idx;
        }
        if (c.includes('parceiro') || c.includes('fornecedor') || c.includes('cliente') || c === 'nome' || c.includes('razão social')) colIdx.parceiro = idx;
        if (c.includes('filial') || c.includes('unidade') || c.includes('u.n') || c.includes('depósito')) {
          if (colIdx.filial === -1 || c.includes('nome')) colIdx.filial = idx;
        }
        if (c.includes('fabricante') || c.includes('fornecedor') || c.includes('marca') || c === 'fab') colIdx.fab = idx;
        if (c === 'cod item' || c === 'código item' || c === 'codigo item' || c === 'cód. item' || c === 'cod. item' || c === 'cod_item' || c.match(/^c[oó]d\.?\s*item$/i) || c.includes('n/ do item') || c.includes('n/ item')) {
          colIdx.code = idx;
        } else if (colIdx.code === 8 && (c.includes('cod') || c.includes('cód') || c === 'código' || c === 'codigo' || c === 'material' || c === 'sku')) {
          colIdx.code = idx;
        } else if (c === 'item' && colIdx.code === 8) {
          colIdx.code = idx;
        }

        if (c.includes('descrição do item') || c.includes('descrição') || c.includes('descricao') || c === 'descr' || c === 'desc' || c.includes('item desc')) colIdx.desc = idx;
        else if (c === 'item' && colIdx.desc === 11) colIdx.desc = idx;
        if (c.includes('un')) colIdx.un = idx;
        if (c.includes('quantidade') || c.includes('qtde') || c === 'qtd') colIdx.qty = idx;
        if (c.includes('total') || c.includes('valor liq') || c.includes('vlr liq') || c.includes('líquido') || c.includes('liquido')) colIdx.total = idx;
      });
      break; 
    }
  }

  for (const rawRow of sheetData) {
    if (!rawRow || rawRow.length === 0) continue;
    const rowStr = rawRow.map(v => v === null ? '' : String(v).trim());
    const line = rowStr.join(' ');
    
    // Header detection for Filial/Parceiro/Grupo (for spreadsheets that group data)
    if (/filial\s*:/i.test(line)) {
      for (const v of rowStr) {
        if (/filial\s*:/i.test(v)) {
          const nome = v.replace(/filial\s*:\s*/i, '').trim().toUpperCase();
          if (nome) curFilial = nome;
          break;
        }
      }
      continue;
    }
    if (/parceiro\s+de\s+neg/i.test(line)) {
      for (const v of rowStr) {
        if (/parceiro\s+de\s+neg/i.test(v)) {
          const nome = v.replace(/parceiro\s+de\s+negocios\s*:\s*/i, '').replace(/parceiro\s+de\s+negócios\s*:\s*/i, '').trim().toUpperCase();
          if (nome) curParceiro = nome;
          break;
        }
      }
      continue;
    }
    if (/grupo\s+de\s+item\s*:/i.test(line) || /familia\s*:/i.test(line) || /família\s*:/i.test(line)) {
      for (const v of rowStr) {
        if (/grupo\s+de\s+item\s*:/i.test(v) || /familia\s*:/i.test(v) || /família\s*:/i.test(v)) {
          const nome = v.replace(/.*[:]/, '').trim().toUpperCase();
          if (nome) curGrupo = nome;
          break;
        }
      }
      continue;
    }

    const rawDate = rawRow[colIdx.date];
    let mes: number | null = null;
    let ano: number = new Date().getFullYear();
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      mes = rawDate.getUTCMonth() + 1;
      ano = rawDate.getUTCFullYear();
    } else if (typeof rawDate === 'string' && rawDate.trim() !== '') {
      const s = rawDate.trim();
      const matchBr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
      if (matchBr) {
        mes = parseInt(matchBr[2], 10);
        let a = parseInt(matchBr[3], 10);
        if (a < 100) a += 2000;
        ano = a;
      }
    } else if (typeof rawDate === 'number' && rawDate > 1000) {
      const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      mes = d.getUTCMonth() + 1;
      ano = d.getUTCFullYear();
    }

    if (!mes || mes < 1 || mes > 12) continue;
    const nfVal = String(rawRow[colIdx.nf] ?? '').trim();
    const tipo = String(rawRow[colIdx.type] || '').toUpperCase();
    if (nfVal.length === 0 && !tipo.includes('NF')) continue;

    const total = parseBrazilianNumber(rawRow[colIdx.total]);
    if (total === 0) continue;

    // Use column-based Filial/Parceiro if detected
    const itemFilial = colIdx.filial >= 0 ? String(rawRow[colIdx.filial] || '').trim().toUpperCase() : curFilial;
    const itemParceiro = colIdx.parceiro >= 0 ? String(rawRow[colIdx.parceiro] || '').trim().toUpperCase() : curParceiro;

    const codItemVal = String(rawRow[colIdx.code] ?? '').trim();
    const itemDescVal = String(rawRow[colIdx.desc] ?? '').trim();

    // Rule: item starting with or containing ACE, MED, ALI belongs to Jhonatas Cadorin
    const codUpper = codItemVal.toUpperCase();
    const descUpper = itemDescVal.toUpperCase();
    const isJhonatas = ['ACE', 'MED', 'ALI'].some(prefix => 
      codUpper.startsWith(prefix) || 
      codUpper.includes('-' + prefix) || 
      codUpper.includes(' ' + prefix) || 
      descUpper.startsWith(prefix) || 
      descUpper.includes(' ' + prefix)
    );
    const comprador = isJhonatas ? 'Jhonatas Cadorin' : 'Outros';

    records.push({
      mes, ano,
      filial: itemFilial || curFilial,
      parceiro: itemParceiro || curParceiro,
      grupo: colIdx.grupo >= 0 ? (String(rawRow[colIdx.grupo] || '').trim().toUpperCase() || curGrupo) : curGrupo,
      fab: colIdx.fab >= 0 ? String(rawRow[colIdx.fab] || '').trim().toUpperCase() : 'N/I',
      nf: nfVal,
      codItem: codItemVal,
      itemDesc: itemDescVal,
      un: String(rawRow[colIdx.un] ?? '').trim(),
      qtde: Math.round(parseBrazilianNumber(rawRow[colIdx.qty])),
      total: Math.round(total * 100) / 100,
      comprador
    });
  }

  if (records.length === 0) return {};

  const totalGeral = records.reduce((acc, r) => acc + r.total, 0);
  const filiais = [...new Set(records.map(r => r.filial))].sort();
  const partners = [...new Set(records.map(r => r.parceiro))].sort();
  const groups = [...new Set(records.map(r => r.grupo || 'OUTROS'))].sort();
  const numNFs = [...new Set(records.map(r => `${r.nf}|${r.parceiro}`))].length;
  const numItens = [...new Set(records.map(r => r.codItem))].length;
  const globalMonthly = MONTH_NAMES.map((name, i) => ({
    name,
    value: Math.round(records.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0) * 100) / 100
  }));

  const filialTotals: Record<string, number> = {};
  filiais.forEach(f => {
    filialTotals[f] = Math.round(records.filter(r => r.filial === f).reduce((acc, r) => acc + r.total, 0) * 100) / 100;
  });

  const partnerAgg: Record<string, number> = {};
  records.forEach(r => { partnerAgg[r.parceiro] = (partnerAgg[r.parceiro] || 0) + r.total; });
  const topPartners = Object.entries(partnerAgg).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, value]) => ({ name: name.trim(), value: Math.round(value * 100) / 100 }));
  const latestMonth = Math.max(...records.map(r => r.mes));
  const compradores = [...new Set(records.map(r => r.comprador || 'Outros'))].sort();

  return {
    records,
    kpis: { totalGeral, numParceiros: partners.length, numNFs, numItens },
    latestMonth,
    filiais,
    partners,
    groups,
    compradores,
    globalMonthly,
    filialTotals,
    topPartners
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatFullCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

