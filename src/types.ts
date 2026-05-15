/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppMode = 'purchases' | 'sales' | 'missing_items';

export interface PurchaseRecord {
  mes: number;
  ano: number;
  filial: string;
  parceiro: string;
  grupo?: string;
  fab?: string;
  nf: string;
  codItem: string;
  itemDesc: string;
  un: string;
  qtde: number;
  total: number;
}

export interface InventoryRecord {
  cod: string;
  desc: string;
  grupo: string;
  fab: string;
  filial: string;
  un: string;
  saldo: number;
  meses: number[];
  total_mov: number;
  media: number;
  cobertura: number;
  meses_com_mov: number;
  mov3: number;
  curva: string;
  criterio: string;
  sugestao: number;
  custo: number;
  preco: number;
  valor_ruptura: number;
  capital_parado: number;
  saldoTransferivel: number;
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}

export interface DashboardData {
  mode: AppMode;
  filename: string;
  rowCount: number;
  filiais: string[];
  
  // For Purchases/Sales
  records?: PurchaseRecord[];
  kpis?: {
    totalGeral: number;
    numParceiros: number;
    numNFs: number;
    numItens: number;
    deltaTotal?: number;
    deltaPartners?: number;
    deltaNFs?: number;
  };
  latestMonth?: number;
  partners?: string[];
  globalMonthly?: { name: string; value: number }[];
  filialTotals?: Record<string, number>;
  filialMonthly?: Record<string, { name: string; value: number }[]>;
  topPartners?: { name: string; value: number }[];

  // For Missing Items
  inventoryRecords?: InventoryRecord[];
  groups?: string[];
  fabs?: string[];
}
