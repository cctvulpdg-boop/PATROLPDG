import React, { useState, useMemo } from 'react';
import { Download, SlidersHorizontal, Milestone, Compass, FileText, BarChart3, HelpCircle } from 'lucide-react';
import { ReportData, ULPName } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AdminRekapTiangKmsProps {
  reports: ReportData[];
}

export const AdminRekapTiangKms: React.FC<AdminRekapTiangKmsProps> = ({ reports }) => {
  // Filter States
  const [filterUlp, setFilterUlp] = useState<string>('');
  const [filterPenyulang, setFilterPenyulang] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get all unique penyulangs from reports dynamically (filtered by ULP if selected)
  const uniquePenyulangs = useMemo(() => {
    const names = new Set<string>();
    reports.forEach(r => {
      if (filterUlp && r.ulp !== filterUlp) return;
      if (r.penyulang && r.penyulang.trim() !== '') {
        names.add(r.penyulang.trim().toUpperCase());
      }
    });
    return Array.from(names).sort();
  }, [reports, filterUlp]);

  // 1. Process and Filter Reports
  const filteredReports = useMemo(() => {
    // Deduplicate reports by ID (latest first) to avoid duplicate data points
    const uniqueMap = new Map<string, ReportData>();
    [...reports]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(r => uniqueMap.set(r.id, r));

    return Array.from(uniqueMap.values()).filter(r => {
      // ULP Filter
      if (filterUlp && r.ulp !== filterUlp) return false;

      // Penyulang Filter
      if (filterPenyulang && (!r.penyulang || r.penyulang.trim().toUpperCase() !== filterPenyulang.trim().toUpperCase())) return false;

      // Date Filters
      const rDate = r.timestamp ? r.timestamp.split('T')[0] : '';
      if (startDate && rDate < startDate) return false;
      if (endDate && rDate > endDate) return false;

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports, filterUlp, filterPenyulang, startDate, endDate]);

  // 2. Metrics Calculation
  const metrics = useMemo(() => {
    let totalTiang = 0;
    let totalKms = 0;
    let reportsWithKms = 0;
    let reportsWithTiang = 0;

    filteredReports.forEach(r => {
      if (r.jumlahTiang !== undefined && r.jumlahTiang !== null && String(r.jumlahTiang).trim() !== '') {
        totalTiang += Number(r.jumlahTiang);
        reportsWithTiang++;
      }
      if (r.jumlahKms !== undefined && r.jumlahKms !== null && String(r.jumlahKms).trim() !== '') {
        totalKms += Number(r.jumlahKms);
        reportsWithKms++;
      }
    });

    return {
      totalTiang,
      totalKms: parseFloat(totalKms.toFixed(2)),
      totalLaporan: filteredReports.length,
      avgTiang: reportsWithTiang > 0 ? parseFloat((totalTiang / reportsWithTiang).toFixed(1)) : 0,
      avgKms: reportsWithKms > 0 ? parseFloat((totalKms / reportsWithKms).toFixed(2)) : 0
    };
  }, [filteredReports]);

  // 3. Penyulang Breakdown for Charting
  const chartData = useMemo(() => {
    const breakdown: Record<string, { penyulang: string; tiang: number; kms: number; count: number }> = {};

    filteredReports.forEach(r => {
      const penyulangName = r.penyulang || 'LAINNYA';
      const tiangVal = r.jumlahTiang !== undefined && r.jumlahTiang !== null ? Number(r.jumlahTiang) : 0;
      const kmsVal = r.jumlahKms !== undefined && r.jumlahKms !== null ? Number(r.jumlahKms) : 0;

      if (!breakdown[penyulangName]) {
        breakdown[penyulangName] = {
          penyulang: penyulangName,
          tiang: 0,
          kms: 0,
          count: 0
        };
      }
      breakdown[penyulangName].tiang += tiangVal;
      breakdown[penyulangName].kms += kmsVal;
      breakdown[penyulangName].count += 1;
    });

    return Object.values(breakdown)
      .map(item => ({
        ...item,
        kms: parseFloat(item.kms.toFixed(2))
      }))
      .sort((a, b) => b.tiang - a.tiang) // Sort descending by poles
      .slice(0, 10); // Top 10 Feeders
  }, [filteredReports]);

  // 4. Excel Exporter
  const handleExportExcel = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) return alert("Library ExcelJS tidak tersedia.");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Tiang dan KMS');

      const columns = [
        { header: 'No', key: 'no', width: 8 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'No. Penugasan', key: 'noPenugasan', width: 22 },
        { header: 'Unit Kerja (ULP)', key: 'ulp', width: 25 },
        { header: 'Penyulang', key: 'penyulang', width: 20 },
        { header: 'Keypoint', key: 'keypoint', width: 25 },
        { header: 'Petugas 1', key: 'petugas1', width: 22 },
        { header: 'Petugas 2', key: 'petugas2', width: 22 },
        { header: 'Jumlah Tiang (Poles)', key: 'tiang', width: 18 },
        { header: 'Jumlah KMS (Distance)', key: 'kms', width: 18 }
      ];

      columns.forEach((col, idx) => {
        const column = worksheet.getColumn(idx + 1);
        column.key = col.key;
        column.width = col.width;
      });

      // Title Block
      worksheet.mergeCells('A1:J1');
      const title1 = worksheet.getCell('A1');
      title1.value = 'REKAPITULASI REALISASI TIANG DAN KMS PATROL';
      title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      title1.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A2:J2');
      const title2 = worksheet.getCell('A2');
      title2.value = 'UP3 BUKITTINGGI';
      title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
      title2.alignment = { horizontal: 'center', vertical: 'middle' };

      // Filter Status subtitle
      worksheet.mergeCells('A3:J3');
      const title3 = worksheet.getCell('A3');
      const startText = startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const endText = endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const filterUlpText = filterUlp ? filterUlp.toUpperCase() : 'SEMUA ULP';
      const penyulangText = filterPenyulang ? filterPenyulang.toUpperCase() : 'SEMUA PENYULANG';
      
      let subtitleText = `ULP: ${filterUlpText} | PENYULANG: ${penyulangText}`;
      if (startText || endText) {
        subtitleText += ` | PERIODE: ${startText || '-'} s.d. ${endText || '-'}`;
      }
      title3.value = subtitleText;
      title3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
      title3.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 10; // spacing

      // Table Header Row 5
      const headerRow = worksheet.getRow(5);
      headerRow.values = columns.map(c => c.header);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      // Populate Data rows
      filteredReports.forEach((item, idx) => {
        const rowIndex = idx + 6;
        const currentRow = worksheet.getRow(rowIndex);
        currentRow.values = [
          idx + 1,
          item.timestamp ? new Date(item.timestamp).toLocaleDateString('id-ID') : '',
          item.noPenugasan || '',
          item.ulp || '',
          item.penyulang || '',
          item.keypoint || '',
          item.petugas1 || '',
          item.petugas2 || '',
          item.jumlahTiang !== undefined && item.jumlahTiang !== null ? Number(item.jumlahTiang) : 0,
          item.jumlahKms !== undefined && item.jumlahKms !== null ? Number(item.jumlahKms) : 0
        ];

        // Alignments
        currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
        currentRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
        currentRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

        currentRow.height = 20;
      });

      // Borders
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

      // Add Total Row at bottom
      const totalRowIndex = filteredReports.length + 6;
      const totalRow = worksheet.getRow(totalRowIndex);
      totalRow.getCell(1).value = 'TOTAL';
      worksheet.mergeCells(`A${totalRowIndex}:H${totalRowIndex}`);
      totalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
      totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Sum values
      totalRow.getCell(9).value = metrics.totalTiang;
      totalRow.getCell(9).font = { bold: true };
      totalRow.getCell(10).value = metrics.totalKms;
      totalRow.getCell(10).font = { bold: true };

      // Format totals cells
      for (let c = 1; c <= 10; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // light indigo
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'double' },
          right: { style: 'thin' }
        };
      }
      totalRow.height = 24;

      // Write File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Tiang_dan_KMS_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor Excel Tiang & KMS:", err);
      alert("Terjadi kesalahan saat mengekspor data.");
    }
  };

  const handleResetFilters = () => {
    setFilterUlp('');
    setFilterPenyulang('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16" id="rekap-tiang-kms-container">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Milestone className="w-6 h-6 text-indigo-600" />
            Rekap Tiang dan KMS Patrol
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Analisis data volume fisik hasil patroli tiang dan kilometer sirkuit (KMS)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-indigo-100 active:scale-95"
            id="btn-export-excel-tiang-kms"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Filter Data Analitik</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* ULP Filter */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Unit (ULP)</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none bg-white transition-all"
              value={filterUlp}
              onChange={(e) => {
                setFilterUlp(e.target.value);
                setFilterPenyulang('');
              }}
              id="filter-ulp"
            >
              <option value="">-- Semua ULP --</option>
              {Object.values(ULPName).map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          {/* Penyulang Filter */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Penyulang</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none bg-white transition-all"
              value={filterPenyulang}
              onChange={(e) => setFilterPenyulang(e.target.value)}
              id="filter-penyulang"
            >
              <option value="">-- Semua Penyulang --</option>
              {uniquePenyulangs.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Mulai</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              id="filter-start-date"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Akhir</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              id="filter-end-date"
            />
          </div>
        </div>

        {(filterUlp || filterPenyulang || startDate || endDate) && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
              id="btn-reset-filters"
            >
              ✕ Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tiang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-colors">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <Milestone className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tiang</span>
            <span className="text-xl font-black text-slate-800">{metrics.totalTiang.toLocaleString('id-ID')}</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Poles Terpatrol</span>
          </div>
        </div>

        {/* Total KMS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Jarak</span>
            <span className="text-xl font-black text-slate-800">{metrics.totalKms.toLocaleString('id-ID')} KMS</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Kilometer Sirkuit</span>
          </div>
        </div>

        {/* Total Laporan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-cyan-200 transition-colors">
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Laporan</span>
            <span className="text-xl font-black text-slate-800">{metrics.totalLaporan}</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Berkas Laporan</span>
          </div>
        </div>

        {/* Avg Tiang per Laporan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-violet-200 transition-colors">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Rata-rata Tiang</span>
            <span className="text-xl font-black text-slate-800">{metrics.avgTiang}</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Poles per Laporan</span>
          </div>
        </div>

        {/* Avg KMS per Laporan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-colors">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Rata-rata KMS</span>
            <span className="text-xl font-black text-slate-800">{metrics.avgKms} KMS</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Jarak per Laporan</span>
          </div>
        </div>
      </div>

      {/* 4. Chart Visualization */}
      {chartData.length > 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Grafik 10 Penyulang Terbanyak (Tiang & KMS)</h3>
          </div>
          <div className="h-80 w-full" id="chart-rekap-tiang-kms">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="penyulang" 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  stroke="#4f46e5"
                  tick={{ fontSize: 10, fontWeight: 'bold' }}
                  label={{ value: 'Jumlah Tiang', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fontWeight: 'black', fill: '#4f46e5' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  tick={{ fontSize: 10, fontWeight: 'bold' }}
                  label={{ value: 'Panjang KMS', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10, fontWeight: 'black', fill: '#10b981' } }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                  labelClassName="font-black text-slate-800 text-xs uppercase tracking-wider mb-1"
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                <Bar yAxisId="left" dataKey="tiang" name="Jumlah Tiang (Poles)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="kms" name="Jumlah KMS (Jarak)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* 5. Detailed Reports List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Daftar Rincian Laporan Hasil Filter</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Menampilkan {filteredReports.length} data laporan patroli</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 min-w-[900px]">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-black w-14 text-center">No</th>
                <th className="px-5 py-4 font-black w-32">Tanggal</th>
                <th className="px-5 py-4 font-black w-40">No. Penugasan</th>
                <th className="px-5 py-4 font-black">Unit Kerja (ULP)</th>
                <th className="px-5 py-4 font-black">Penyulang</th>
                <th className="px-5 py-4 font-black">Keypoint</th>
                <th className="px-5 py-4 font-black text-right w-36">Jumlah Tiang</th>
                <th className="px-5 py-4 font-black text-right w-36">Jumlah KMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((report, idx) => {
                  const hasTiang = report.jumlahTiang !== undefined && report.jumlahTiang !== null && String(report.jumlahTiang).trim() !== '';
                  const hasKms = report.jumlahKms !== undefined && report.jumlahKms !== null && String(report.jumlahKms).trim() !== '';

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {report.timestamp ? new Date(report.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-xs text-slate-700">{report.noPenugasan || '-'}</td>
                      <td className="px-5 py-4 font-bold text-slate-700">{report.ulp}</td>
                      <td className="px-5 py-4 font-semibold text-indigo-600">{report.penyulang || '-'}</td>
                      <td className="px-5 py-4 text-slate-500 font-bold text-xs">{report.keypoint || '-'}</td>
                      <td className="px-5 py-4 text-right font-black">
                        {hasTiang ? (
                          <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs">
                            {report.jumlahTiang}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-black">
                        {hasKms ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs">
                            {report.jumlahKms}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/20">
                    Tidak ada laporan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredReports.length > 0 && (
              <tfoot className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                <tr>
                  <td colSpan={6} className="px-5 py-4 text-center text-xs uppercase tracking-widest text-slate-500">TOTAL SELURUHNYA</td>
                  <td className="px-5 py-4 text-right text-indigo-700 text-sm">
                    <span className="bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl">
                      {metrics.totalTiang}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-emerald-700 text-sm">
                    <span className="bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl">
                      {metrics.totalKms} KMS
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
