import type { DbClient } from '../lib/prisma.js';

/** `2025-04-12` → `BPD-20250412-` */
export function prefixBukti(tanggalIso: string): string {
  return `BPD-${tanggalIso.replaceAll('-', '')}-`;
}

/**
 * Nomor Bukti Penerimaan Dana berikutnya untuk tanggal transaksi: urutan terbesar + 1,
 * minimal tiga digit (`BPD-20250412-001`). Keunikan dijaga indeks UNIQUE; pemanggil
 * mengulang bila dua penyimpanan bersamaan mendapat nomor yang sama.
 */
export async function nomorBuktiBerikut(db: DbClient, tanggalIso: string): Promise<string> {
  const prefix = prefixBukti(tanggalIso);
  const ada = await db.transaksi.findMany({ where: { nomorBukti: { startsWith: prefix } }, select: { nomorBukti: true } });
  const terbesar = ada.reduce((m, r) => Math.max(m, Number(r.nomorBukti!.slice(prefix.length)) || 0), 0);
  return prefix + String(terbesar + 1).padStart(3, '0');
}
