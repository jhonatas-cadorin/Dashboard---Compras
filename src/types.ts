/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PurchaseRecord {
  mes: number;
  filial: string;
  parceiro: string;
  nf: string;
  codItem: string;
  itemDesc: string;
  un: string;
  qtde: number;
  total: number;
}

export interface DashboardData {
  records: PurchaseRecord[];
  kpis: {
    totalGeral: number;
    numParceiros: number;
    numNFs: number;
    numItens: number;
  };
  filiais: string[];
  partners: string[];
  globalMonthly: { name: string; value: number }[];
  filialTotals: Record<string, number>;
  filialMonthly: Record<string, { name: string; value: number }[]>;
  topPartners: { name: string; value: number }[];
  filename: string;
  rowCount: number;
}
