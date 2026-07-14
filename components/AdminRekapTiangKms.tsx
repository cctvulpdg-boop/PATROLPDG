import React, { useState, useMemo, useEffect } from 'react';
import { Download, SlidersHorizontal, Layers, Hash } from 'lucide-react';
import { ReportData, ULPData } from '../types';

interface AdminRekapTiangKmsProps {
  reports: ReportData[];
  masterData: Record<string, ULPData>;
}

export const AdminRekapTiangKms: React.FC<AdminRekapTiangKmsProps> = ({ reports, masterData }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUlp, setFilterUlp] = useState<string>('');
  const [filterPenyulang, setFilterPenyulang] = useState<string>('');

  // Reset penyulang filter if ULP filter changes and the current selected penyulang is not in the new ULP's list
  useEffect(() => {
    if (filterUlp) {
      const allowedPenyulang = masterData[filterUlp]?.penyulang || [];
      if (!allowedPenyulang.includes(filterPenyulang)) {
        setFilterPenyulang('');
      }
    } else {
      setFilterPenyulang('');
    }
  }, [filterUlp, masterData]);

  // List of penyulang available based on selected ULP
  const availablePenyulangList = useMemo(() => {
    if (filterUlp) {
      return masterData[filterUlp]?.penyulang || [];
    }
    // If no ULP is selected, gather all penyulang from all ULPs
    const all: string[] = [];
    Object.values(masterData).forEach((ulpData: ULPData) => {
      ulpData.penyulang.forEach(p => {
        if (!all.includes(p)) all.push(p);
      });
    });
    return all.sort();
  }, [filterUlp, masterData]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Date filter
      const reportDate = new Date(report.timestamp).toISOString().split('T')[0];
      const startMatch = !startDate || reportDate >= startDate;
      const endMatch = !endDate || reportDate <= endDate;

      // ULP filter
      const ulpMatch = !filterUlp || report.ulp === filterUlp;

      // Penyulang filter
      const penyulangMatch = !filterPenyulang || report.penyulang === filterPenyulang;

      return startMatch && endMatch && ulpMatch && penyulangMatch;
    });
  }, [reports, startDate, endDate, filterUlp, filterPenyulang]);

  // Totals calculations
  const totalTiang = useMemo(() => {
    return filteredReports.reduce((sum, r) => {
      const val = parseFloat(r.jumlahTiang || '0');
      return isNaN(val) ? sum : sum + val;
    }, 0);
  }, [filteredReports]);

  const totalKms = useMemo(() => {
    return filteredReports.reduce((sum, r) => {
      const val = parseFloat(r.jumlahKms || '0');
      return isNaN(val) ? sum : sum + val;
    }, 0);
  }, [filteredReports]);

  // Average span (Tiang per KMS)
  const averageTiangPerKms = useMemo(() => {
    if (totalKms === 0) return 0;
    return parseFloat((totalTiang / totalKms).toFixed(2));
  }, [totalTiang, totalKms]);

  const handleExportExcel = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) return alert("Library ExcelJS tidak tersedia.");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Tiang dan KMS');

      const columns = [
        { header: 'No.', key: 'no', width: 8 },
        { header: 'Tanggal Patrol', key: 'tanggal', width: 15 },
        { header: 'Bulan', key: 'bulan', width: 12 },
        { header: 'No. Penugasan', key: 'noPenugasan', width: 22 },
        { header: 'Unit Layanan (ULP)', key: 'ulp', width: 25 },
        { header: 'Nama Penyulang', key: 'penyulang', width: 20 },
        { header: 'Keypoint', key: 'keypoint', width: 20 },
        { header: 'Titik Start', key: 'start', width: 25 },
        { header: 'Titik Finish', key: 'finish', width: 25 },
        { header: 'Jumlah Tiang', key: 'tiang', width: 15 },
        { header: 'Jumlah KMS', key: 'kms', width: 15 }
      ];

      // Set column keys and widths
      columns.forEach((col, idx) => {
        const column = worksheet.getColumn(idx + 1);
        column.key = col.key;
        column.width = col.width;
      });

      // Title A1: REKAP PATROL TIANG DAN KMS
      worksheet.mergeCells('A1:K1');
      const title1 = worksheet.getCell('A1');
      title1.value = 'REKAP PATROL TIANG DAN KMS YANDAL';
      title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      title1.alignment = { horizontal: 'center', vertical: 'middle' };

      // Subtitle A2: UP3 PADANG
      worksheet.mergeCells('A2:K2');
      const title2 = worksheet.getCell('A2');
      title2.value = 'UP3 PADANG';
      title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
      title2.alignment = { horizontal: 'center', vertical: 'middle' };

      // Row 3: Filter Info
      worksheet.mergeCells('A3:K3');
      const title3 = worksheet.getCell('A3');
      const startText = startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const endText = endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const filterUlpText = filterUlp ? filterUlp.toUpperCase() : 'SEMUA ULP';
      const filterPenyulangText = filterPenyulang ? filterPenyulang.toUpperCase() : 'SEMUA PENYULANG';
      
      let subtitleText = '';
      if (startText && endText) {
        subtitleText = `PERIODE: ${startText.toUpperCase()} S.D. ${endText.toUpperCase()} | ULP: ${filterUlpText} | PENYULANG: ${filterPenyulangText}`;
      } else if (startText) {
        subtitleText = `PERIODE: SEJAK ${startText.toUpperCase()} | ULP: ${filterUlpText} | PENYULANG: ${filterPenyulangText}`;
      } else if (endText) {
        subtitleText = `PERIODE: SAMPAI ${endText.toUpperCase()} | ULP: ${filterUlpText} | PENYULANG: ${filterPenyulangText}`;
      } else {
        subtitleText = `PERIODE: SEMUA PERIODE | ULP: ${filterUlpText} | PENYULANG: ${filterPenyulangText}`;
      }
      title3.value = subtitleText;
      title3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
      title3.alignment = { horizontal: 'center', vertical: 'middle' };

      // Spacing Row 4
      worksheet.getRow(4).height = 10;

      // Table Headers Row 5
      const headerRow = worksheet.getRow(5);
      headerRow.values = columns.map(c => c.header);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } }; // cyan-700
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Write Data Rows
      filteredReports.forEach((report, idx) => {
        const rowIndex = idx + 6;
        const currentRow = worksheet.getRow(rowIndex);
        currentRow.values = [
          idx + 1,
          new Date(report.timestamp).toLocaleDateString('id-ID'),
          report.bulan,
          report.noPenugasan,
          report.ulp,
          report.penyulang,
          report.keypoint,
          report.titikStart,
          report.titikFinish,
          report.jumlahTiang ? parseFloat(report.jumlahTiang) : 0,
          report.jumlahKms ? parseFloat(report.jumlahKms) : 0
        ];

        // Alignments
        currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
        currentRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

        currentRow.height = 20;
      });

      // Total Summary Row
      const totalRowIndex = filteredReports.length + 6;
      const totalRow = worksheet.getRow(totalRowIndex);
      totalRow.mergeCells(`A${totalRowIndex}:I${totalRowIndex}`);
      totalRow.getCell(1).value = 'TOTAL';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
      
      totalRow.getCell(10).value = totalTiang;
      totalRow.getCell(10).font = { bold: true };
      
      totalRow.getCell(11).value = totalKms;
      totalRow.getCell(11).font = { bold: true };

      totalRow.height = 24;

      // Styling total row background
      for (let c = 1; c <= 11; c++) {
        totalRow.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' } // slate-200
        };
      }

      // Border and general format
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 5) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });

      // Write and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileDate = new Date().toISOString().split('T')[0];
      a.download = `Rekap_Tiang_KMS_Patrol_${fileDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor Excel:", err);
      alert("Terjadi kesalahan saat mengekspor data ke Excel.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary to-cyan-900 p-6 rounded-[2rem] shadow-lg shadow-cyan-100 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
            <Hash className="w-24 h-24" />
          </div>
          <p className="text-cyan-200 text-[10px] font-black uppercase tracking-widest">Total Tiang Dipatrol</p>
          <p className="text-4xl font-black mt-2 tracking-tight">{totalTiang}</p>
          <p className="text-[9px] text-cyan-300 mt-2 font-semibold">Total tiang dari {filteredReports.length} laporan patroli</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 text-slate-100 transform group-hover:scale-110 transition-transform duration-500">
            <Layers className="w-24 h-24" />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total KMS Dipatrol</p>
          <p className="text-4xl font-black mt-2 text-slate-800 tracking-tight">{totalKms.toLocaleString('id-ID')}</p>
          <p className="text-[9px] text-slate-400 mt-2 font-semibold">Total kilometer jaringan terpantau</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 text-slate-100 transform group-hover:scale-110 transition-transform duration-500">
            <SlidersHorizontal className="w-24 h-24" />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Rasio Tiang / KMS</p>
          <p className="text-4xl font-black mt-2 text-slate-800 tracking-tight">{averageTiangPerKms}</p>
          <p className="text-[9px] text-slate-400 mt-2 font-semibold">Rata-rata tiang tiap 1 Kilometer jaringan</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Rekap Tiang dan KMS</h2>
            <p className="text-slate-500 text-xs font-semibold mt-0.5 uppercase tracking-wide">Monitoring volume tiang listrik & jangkauan KMS yang dipatroli</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold border border-green-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
              Total: {filteredReports.length} Laporan
            </div>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter ULP</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
              value={filterUlp}
              onChange={(e) => setFilterUlp(e.target.value)}
            >
              <option value="">Semua ULP</option>
              {Object.keys(masterData).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Penyulang</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
              value={filterPenyulang}
              onChange={(e) => setFilterPenyulang(e.target.value)}
            >
              <option value="">Semua Penyulang</option>
              {availablePenyulangList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setFilterUlp(''); setFilterPenyulang(''); }}
              className="w-full py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md text-sm transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold w-12 text-center">No.</th>
                <th className="px-4 py-3 font-bold w-32">Tanggal</th>
                <th className="px-4 py-3 font-bold">No. Penugasan</th>
                <th className="px-4 py-3 font-bold">ULP</th>
                <th className="px-4 py-3 font-bold">Penyulang</th>
                <th className="px-4 py-3 font-bold">Keypoint</th>
                <th className="px-4 py-3 font-bold text-right w-32">Jumlah Tiang</th>
                <th className="px-4 py-3 font-bold text-right w-32">Jumlah KMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((report, idx) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div>{new Date(report.timestamp).toLocaleDateString('id-ID')}</div>
                      <div className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleTimeString('id-ID')} WIB</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-xs">
                      {report.noPenugasan}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase border border-slate-200">
                        {report.ulp.replace('ULP ', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-xs uppercase">
                      {report.penyulang}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium text-xs">
                      {report.keypoint}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {report.jumlahTiang || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {report.jumlahKms || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    Tidak ada data laporan patroli yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              )}
              {filteredReports.length > 0 && (
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td colSpan={6} className="px-4 py-3 text-right text-slate-800 uppercase tracking-wider text-xs font-black">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-black text-sm">
                    {totalTiang}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-black text-sm">
                    {totalKms.toLocaleString('id-ID')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
