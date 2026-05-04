/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { PurchaseRecord, DashboardData } from './types';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function processFile(file: File): Promise<DashboardData> {
  const ab = await file.arrayBuffer();
  // Use raw: false and dateNF to get visual strings from Excel
  const wb = XLSX.read(ab, { type: 'array', cellDates: true, raw: false, dateNF: 'yyyy-mm-dd' });
  
  let sheetData: any[][] | null = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
    if (raw.filter(r => r && r.some(c => c !== null)).length > 5) {
      sheetData = raw;
      break;
    }
  }

  if (!sheetData) throw new Error('Nenhuma aba com dados válida encontrada.');

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
    return parseFloat(s.replace(/[^\d.\-]/g, '')) || 0;
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
        if (cell.includes('quantidade')) colIdx.qty = idx;
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
    
    // Improved Date Parsing
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      mes = rawDate.getUTCMonth() + 1;
    } else if (typeof rawDate === 'string') {
      const matchIso = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const matchBr = rawDate.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
      
      if (matchIso) {
        mes = parseInt(matchIso[2], 10);
      } else if (matchBr) {
        mes = parseInt(matchBr[2], 10);
      }
    } else if (typeof rawDate === 'number' && rawDate > 30000) {
      const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      mes = d.getUTCMonth() + 1;
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

  return {
    records,
    kpis: {
      totalGeral: Math.round(totalGeral * 100) / 100,
      numParceiros: partners.length,
      numNFs,
      numItens
    },
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

