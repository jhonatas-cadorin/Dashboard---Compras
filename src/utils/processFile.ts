/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { PurchaseRecord, DashboardData, AppMode } from '../types';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
        if (c === 'abc' || c.includes('curva')) colIdx.abc = idx;
        if ((c === 'cod' || c === 'cód' || c.includes('código') || c.includes('codigo') || c.includes('material') || c.includes('item') || c.includes('nº do item') || c === 'part number') && !c.includes('desc')) colIdx.cod = idx;
        if (c === 'desc' || c.includes('descrição') || c.includes('descricao') || c.includes('descr') || c === 'item' || c.includes('descrição do item')) {
           if (colIdx.desc === -1 || c.includes('desc') || c.includes('item')) colIdx.desc = idx;
        }
        if (c.includes('filial') || c.includes('unidade') || c.includes('depósito') || c.includes('deposito')) colIdx.filial = idx;
        if (c.includes('grupo') || c.includes('família') || c.includes('familia') || c.includes('setor') || c.includes('categoria')) colIdx.grupo = idx;
        if (c.includes('saldo') || c.includes('estoque') || c.includes('est.') || c.includes('quantidade')) colIdx.saldo = idx;
        if (c.includes('média') || c.includes('media') || c.includes('méd')) colIdx.media = idx;
        if (c.includes('cobertura') || c.includes('cob.')) colIdx.cobertura = idx;
        if (c.includes('critério') || c.includes('criterio') || c.includes('crit.')) colIdx.criterio = idx;
        if (c.includes('sugestão') || c.includes('sugestao') || c.includes('sug.')) colIdx.sugestao = idx;
        if (c.includes('total mov')) colIdx.total_mov = idx;
        if (c.includes('saldo anterior') || c.includes('estoque inicial') || c.includes('est. inicial') || c.includes('ant.')) colIdx.saldo_inicial = idx;
        if (c.includes('unidade de medida') || c === 'un' || c === 'um' || c.includes('unid')) colIdx.un = idx;
        if (c.includes('fabricante') || c.includes('fornecedor') || c.includes('marca')) colIdx.fab = idx;

        // Monthly detection (prioritize specific order if possible)
        const monthMatch = monthNames.findIndex(m => c === m || c.startsWith(m + '/'));
        if (monthMatch !== -1) {
          colIdx.months.push({ name: c, idx, monthIdx: monthMatch });
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
      colIdx.months.push({ name: `M${colIdx.months.length + 1}`, idx: c });
    }
  }

  // Data parsing
  const normalizeCrit = (s: string, coverage: number, totalMov: number) => {
    const norm = s.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, '_');
    
    if (norm.includes('URGENTE') || (totalMov > 0 && coverage <= 0.5)) return 'URGENTE';
    if (norm.includes('COMPRAR_JA') || (totalMov > 0 && coverage <= 1.0)) return 'COMPRAR_JA';
    if (norm.includes('COMPRAR_BREVE') || (totalMov > 0 && coverage <= 2.0)) return 'COMPRAR_BREVE';
    if (norm.includes('ESTOQUE_ALTO') || (totalMov > 0 && coverage > 6.0)) return 'ESTOQUE_ALTO';
    if (norm.includes('OK') || norm.includes('NORMAL')) return 'OK';
    if (norm.includes('SEM_GIRO') || norm.includes('SEM_MOVIMENTO') || totalMov <= 0) return 'SEM_MOVIMENTO';
    return norm || 'OK';
  };

  for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
    const rawRow = sheetData[r];
    if (!rawRow || rawRow.length === 0) continue;

    const cod = String(rawRow[colIdx.cod] || '').trim();
    if (!cod || cod.toLowerCase() === 'total' || cod.toLowerCase().includes('subtotal')) continue;

    const monthVals = colIdx.months.map((m: any) => parseBrazilianNumber(rawRow[m.idx]));
    while (monthVals.length < 12) monthVals.push(0);

    const total_mov = colIdx.total_mov >= 0 ? parseBrazilianNumber(rawRow[colIdx.total_mov]) : monthVals.reduce((a: number, v: number) => a + v, 0);
    const media = colIdx.media >= 0 ? parseBrazilianNumber(rawRow[colIdx.media]) : total_mov / 12;
    const saldo = parseBrazilianNumber(rawRow[colIdx.saldo]);
    const coverage = media > 0 ? saldo / media : (saldo > 0 ? 99 : 0);
    
    // Quarterly trends
    const t1 = monthVals.slice(0, 3).reduce((a, b) => a + b, 0);
    const t2 = monthVals.slice(3, 6).reduce((a, b) => a + b, 0);
    const t3 = monthVals.slice(6, 9).reduce((a, b) => a + b, 0);
    const t4 = monthVals.slice(9, 12).reduce((a, b) => a + b, 0);

    const record = {
      cod,
      desc: String(rawRow[colIdx.desc] || '').trim(),
      curva: String(rawRow[colIdx.abc] || '').trim().toUpperCase().slice(0, 1),
      filial: String(rawRow[colIdx.filial] || 'GERAL').trim().toUpperCase(),
      grupo: String(rawRow[colIdx.grupo] || 'OUTROS').trim().toUpperCase(),
      saldo,
      media,
      cobertura: colIdx.cobertura >= 0 ? parseBrazilianNumber(rawRow[colIdx.cobertura]) : coverage,
      criterio: normalizeCrit(String(rawRow[colIdx.criterio] || ''), coverage, total_mov),
      sugestao: colIdx.sugestao >= 0 ? parseBrazilianNumber(rawRow[colIdx.sugestao]) : Math.max(0, (media * 2) - saldo),
      saldo_inicial: colIdx.saldo_inicial >= 0 ? parseBrazilianNumber(rawRow[colIdx.saldo_inicial]) : null,
      total_mov,
      un: colIdx.un >= 0 ? String(rawRow[colIdx.un] || 'UN').trim() : 'UN',
      fab: colIdx.fab >= 0 ? String(rawRow[colIdx.fab] || 'N/I').trim() : 'N/I',
      meses: monthVals,
      t1, t2, t3, t4
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

  return {
    mode: 'missing_items',
    filename: file.name,
    rowCount: inventoryRecords.length,
    filiais,
    groups,
    inventoryRecords
  };
}

export async function processFile(file: File, mode: AppMode): Promise<DashboardData> {
  const ab = await file.arrayBuffer();
  // Use raw: false and dateNF to get visual strings from Excel
  const wb = XLSX.read(ab, { type: 'array', cellDates: true, raw: false });
  
  let sheetData: any[][] | null = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
    
    // Check if this sheet has the expected columns for the current mode
    const textContent = raw.slice(0, 20).flat().map(v => String(v || '').toLowerCase());
    
    if (mode === 'missing_items') {
      const hasInventoryKeywords = textContent.some(t => 
        t.includes('código') || t.includes('codigo') || t === 'cod' || t === 'cód' || 
        t.includes('descrição') || t.includes('descricao') || t.includes('cobertura') || t.includes('sugestão') ||
        t.includes('nº do item') || t.includes('descrição do item')
      );
      if (hasInventoryKeywords) {
        sheetData = raw;
        break;
      }
    } else {
      const hasTransactionKeywords = textContent.some(t => 
        t.includes('tp doc') || t.includes('parceiro') || t.includes('nº doc') || 
        t.includes('valor liq') || t.includes('vlr liq') || t.includes('nota fiscal')
      );
      if (hasTransactionKeywords) {
        sheetData = raw;
        break;
      }
    }
  }

  // Fallback to first sheet with some data if no keywords found
  if (!sheetData) {
    for (const name of wb.SheetNames) {
      const raw = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, defval: null });
      if (raw.filter(r => r && r.some(c => c !== null)).length > 5) {
        sheetData = raw;
        break;
      }
    }
  }

  if (!sheetData) throw new Error('Não foi possível encontrar uma aba com dados válidos na planilha.');

  if (mode === 'missing_items') {
    return processInventoryFile(file, sheetData);
  }

  const records: PurchaseRecord[] = [];
  let curFilial = 'GERAL';
  let curParceiro = 'NÃO INFORMADO';

  // Dynamic Column Mapping with fallback
  let colIdx = {
    date: 0,
    type: 3,
    nf: 4,
    code: 8,
    desc: 11,
    un: 16,
    qty: 18,
    total: 19
  };

  // Header detection phase
  for (const rawRow of sheetData) {
    const rowStr = rawRow.map(v => v === null ? '' : String(v).trim().toLowerCase());
    
    // Check if this looks like a header row
    if (rowStr.includes('data') && (rowStr.includes('tp doc') || rowStr.includes('tipo'))) {
      rowStr.forEach((cell, idx) => {
        if (cell.includes('data')) colIdx.date = idx;
        if (cell.includes('tp doc') || cell.includes('tipo')) colIdx.type = idx;
        if (cell.includes('nº doc/nf') || cell.includes('nº doc')) colIdx.nf = idx;
        if (cell.includes('cód. item') || cell.includes('nº do item') || cell.includes('item')) colIdx.code = idx;
        if (cell.includes('descrição')) colIdx.desc = idx;
        if (cell.includes('un')) colIdx.un = idx;
        if (cell.includes('quantidade') || cell.includes('qtde')) colIdx.qty = idx;
        if (cell.includes('total')) colIdx.total = idx;
      });
      break; // Found headers, stop looking
    }
  }

  for (const rawRow of sheetData) {
    if (!rawRow || rawRow.length === 0) continue;
    
    const rowStr = rawRow.map(v => v === null ? '' : String(v).trim());
    const line = rowStr.join(' ');

    // Hierarchy Detection
    if (/filial\s*:/i.test(line)) {
      for (const v of rowStr) {
        if (/filial\s*:/i.test(v)) {
          const nome = v.replace(/filial\s*:\s*/i, '').split(' - ')[0].trim().toUpperCase();
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

    // Try to detect index shift if we see a header
    if (/\bdata\b/i.test(line) && /tp\s*doc/i.test(line)) {
      // We found the header row, we could map columns here if needed
      // But we stick to established patterns unless we want full flexible mapping
      continue;
    }

    // Date parsing
    const rawDate = rawRow[colIdx.date];
    let mes: number | null = null;
    let ano: number = new Date().getFullYear();
    
    // Improved Date Parsing
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      mes = rawDate.getUTCMonth() + 1;
      ano = rawDate.getUTCFullYear();
    } else if (typeof rawDate === 'string') {
      const matchIso = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const matchBr = rawDate.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
      
      if (matchIso) {
        mes = parseInt(matchIso[2], 10);
        ano = parseInt(matchIso[1], 10);
      } else if (matchBr) {
        mes = parseInt(matchBr[2], 10);
        ano = parseInt(matchBr[3], 10);
      }
    } else if (typeof rawDate === 'number' && rawDate > 30000) {
      const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      mes = d.getUTCMonth() + 1;
      ano = d.getUTCFullYear();
    }

    if (!mes || mes < 1 || mes > 12) continue;

    // Filter Logic: Must have an NF number OR include NF in the type
    const nfVal = String(rawRow[colIdx.nf] ?? '').trim();
    const tipo = String(rawRow[colIdx.type] || '').toUpperCase();
    
    const hasNfNumber = nfVal.length > 0 && /^\d+/.test(nfVal);
    const isNfType = tipo.includes('NF');

    if (!hasNfNumber && !isNfType) continue;

    const total = parseBrazilianNumber(rawRow[colIdx.total]);
    if (total === 0) continue; // Skip zero total rows (headers or footers)

    records.push({
      mes,
      ano,
      filial: curFilial,
      parceiro: curParceiro,
      nf: String(rawRow[colIdx.nf] ?? '').trim(),
      codItem: String(rawRow[colIdx.code] ?? '').trim(),
      itemDesc: String(rawRow[colIdx.desc] ?? '').trim(),
      un: String(rawRow[colIdx.un] ?? '').trim(),
      qtde: Math.round(parseBrazilianNumber(rawRow[colIdx.qty])),
      total: Math.round(total * 100) / 100
    });
  }

  if (records.length === 0) {
    throw new Error('Nenhum registro de Nota Fiscal (NF) válido foi encontrado. Verifique se a planilha segue o padrão do relatório SBO / ERP.');
  }

  // Final aggregations
  const totalGeral = records.reduce((acc, r) => acc + r.total, 0);
  const filiais = [...new Set(records.map(r => r.filial))].sort();
  const partners = [...new Set(records.map(r => r.parceiro))].sort();
  const numNFs = [...new Set(records.map(r => r.nf))].length;
  const numItens = [...new Set(records.map(r => r.codItem))].length;

  const globalMonthly = MONTH_NAMES.map((name, i) => ({
    name,
    value: Math.round(records.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0) * 100) / 100
  }));

  const filialTotals: Record<string, number> = {};
  const filialMonthly: Record<string, { name: string; value: number }[]> = {};
  filiais.forEach(f => {
    const sub = records.filter(r => r.filial === f);
    filialTotals[f] = Math.round(sub.reduce((acc, r) => acc + r.total, 0) * 100) / 100;
    filialMonthly[f] = MONTH_NAMES.map((name, i) => ({
      name,
      value: Math.round(sub.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0) * 100) / 100
    }));
  });

  const partnerAgg: Record<string, number> = {};
  records.forEach(r => {
    partnerAgg[r.parceiro] = (partnerAgg[r.parceiro] || 0) + r.total;
  });
  const topPartners = Object.entries(partnerAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, value]) => ({ name: name.trim(), value: Math.round(value * 100) / 100 }));

  const latestMonth = records.length > 0 ? Math.max(...records.map(r => r.mes)) : 1;

  return {
    mode,
    records,
    kpis: {
      totalGeral: Math.round(totalGeral * 100) / 100,
      numParceiros: partners.length,
      numNFs,
      numItens
    },
    latestMonth,
    filiais,
    partners,
    globalMonthly,
    filialTotals,
    filialMonthly,
    topPartners,
    filename: file.name,
    rowCount: records.length
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

