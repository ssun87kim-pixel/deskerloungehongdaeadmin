import { useState, useRef } from 'react';
import { Plus, Download, FileArchive, X, Image } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Navigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/helpers';
import { exportToExcel } from '../../services/exportExcel';
import { mockDailySales } from '../../utils/mockData';
import type { Expense } from '../../types';
import JSZip from 'jszip';

const paymentMethods = ['쿠팡', '카드(온라인)', '카드(오프라인)', '입금', '네이버'];
const categories: Expense['category'][] = ['운영비', 'F&B'];

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    const val = `2026-${String(m).padStart(2, '0')}`;
    options.push({ value: val, label: `2026년 ${m}월` });
  }
  return options;
}

const monthOptions = getMonthOptions();

interface ReceiptStore {
  [expenseId: string]: { url: string; blob: Blob; fileName: string };
}

export default function ExpensePage() {
  const { user } = useAuth();
  const { expenses, addExpense } = useData();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [receiptStore, setReceiptStore] = useState<ReceiptStore>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [formDate, setFormDate] = useState('');
  const [formCategory, setFormCategory] = useState<Expense['category']>('운영비');
  const [formItemName, setFormItemName] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formSupply, setFormSupply] = useState('');
  const [formTax, setFormTax] = useState('');
  const [formMethod, setFormMethod] = useState(paymentMethods[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formIsCancel, setFormIsCancel] = useState(false);
  const [formRelatedId, setFormRelatedId] = useState('');
  const [formReceiptFile, setFormReceiptFile] = useState<File | null>(null);
  const [formReceiptPreview, setFormReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (user?.role === 'staff') {
    return <Navigate to="/" replace />;
  }

  const filtered = expenses
    .filter(e => e.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const opTotal = filtered.filter(e => e.category === '운영비').reduce((s, e) => s + e.totalAmount, 0);
  const fbTotal = filtered.filter(e => e.category === 'F&B').reduce((s, e) => s + e.totalAmount, 0);
  const grandTotal = opTotal + fbTotal;

  const supplySum = filtered.reduce((s, e) => s + e.supplyAmount, 0);
  const taxSum = filtered.reduce((s, e) => s + e.tax, 0);
  const totalSum = filtered.reduce((s, e) => s + e.totalAmount, 0);

  const computedTotal = (Number(formSupply) || 0) + (Number(formTax) || 0);

  const resetForm = () => {
    setFormDate('');
    setFormCategory('운영비');
    setFormItemName('');
    setFormPurpose('');
    setFormVendor('');
    setFormSupply('');
    setFormTax('');
    setFormMethod(paymentMethods[0]);
    setFormNotes('');
    setFormIsCancel(false);
    setFormRelatedId('');
    setFormReceiptFile(null);
    setFormReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormReceiptFile(file);
    const url = URL.createObjectURL(file);
    setFormReceiptPreview(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supply = Number(formSupply) || 0;
    const tax = Number(formTax) || 0;
    const total = supply + tax;

    const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    let receiptUrl: string | null = null;
    if (formReceiptFile) {
      const blob = formReceiptFile;
      const url = formReceiptPreview || URL.createObjectURL(blob);
      receiptUrl = url;
      setReceiptStore(prev => ({
        ...prev,
        [tempId]: { url, blob, fileName: formReceiptFile.name },
      }));
    }

    addExpense({
      date: formDate,
      category: formCategory,
      itemName: formItemName,
      purpose: formPurpose,
      vendor: formVendor,
      supplyAmount: supply,
      tax,
      totalAmount: total,
      paymentMethod: formMethod,
      notes: formNotes,
      receiptImageUrl: receiptUrl,
      isPartialCancel: formIsCancel,
      relatedExpenseId: formIsCancel ? formRelatedId || null : null,
    });

    resetForm();
    setShowForm(false);
  };

  const handleExcel = () => {
    const monthNum = parseInt(selectedMonth.split('-')[1], 10);
    const rows = filtered.map((e, i) => [
      i + 1,
      e.date,
      e.category,
      e.itemName,
      e.purpose,
      e.vendor,
      e.supplyAmount,
      e.tax,
      e.totalAmount,
      e.paymentMethod,
      e.notes,
    ]);
    rows.push([
      '', '', '', '', '', '합계',
      supplySum, taxSum, totalSum, '', '',
    ]);

    const salesByMonth: Record<string, { naver: number; store: number }> = {};
    for (const s of mockDailySales) {
      const m = s.date.substring(0, 7);
      if (!salesByMonth[m]) salesByMonth[m] = { naver: 0, store: 0 };
      salesByMonth[m].naver += Math.round(s.totalRevenue * 0.7);
      salesByMonth[m].store += Math.round(s.totalRevenue * 0.3);
    }

    const salesRows: (string | number)[][] = [];
    const sortedMonths = Object.keys(salesByMonth).sort();
    for (const m of sortedMonths) {
      const mNum = parseInt(m.split('-')[1], 10);
      const d = salesByMonth[m];
      salesRows.push([`${mNum}월`, d.naver, d.store, d.naver + d.store]);
    }

    exportToExcel({
      filename: `26년${monthNum}월 운영 지출 내역.xlsx`,
      sheets: [
        {
          name: `26. ${monthNum}월`,
          headers: ['번호', '구매일자', '대분류', '품명', '용도', '업체명', '공급가액', '부가세', '합계', '결제수단', '비고'],
          rows,
          columnWidths: [6, 12, 8, 20, 20, 14, 12, 12, 12, 14, 20],
          numberFormatColumns: [
            { col: 6, format: '#,##0' },
            { col: 7, format: '#,##0' },
            { col: 8, format: '#,##0' },
          ],
        },
        {
          name: '매출 종합',
          headers: ['월', '네이버 매출', '매장 매출', '총합'],
          rows: salesRows,
          columnWidths: [8, 14, 14, 14],
          numberFormatColumns: [
            { col: 1, format: '#,##0' },
            { col: 2, format: '#,##0' },
            { col: 3, format: '#,##0' },
          ],
        },
      ],
    });
  };

  const handleZipDownload = async () => {
    const withReceipt = filtered.filter(e => e.receiptImageUrl);
    if (withReceipt.length === 0) {
      alert('영수증이 첨부된 지출 내역이 없습니다.');
      return;
    }

    const zip = new JSZip();
    for (let i = 0; i < withReceipt.length; i++) {
      const e = withReceipt[i];
      const idx = filtered.indexOf(e) + 1;
      const dateStr = e.date.replace(/-/g, '').substring(2);
      try {
        const resp = await fetch(e.receiptImageUrl!);
        const blob = await resp.blob();
        const stored = Object.values(receiptStore).find(r => r.url === e.receiptImageUrl);
        const ext = stored ? stored.fileName.split('.').pop() : 'jpg';
        const filename = `${idx}_${dateStr}_${e.itemName}.${ext}`;
        zip.file(filename, blob);
      } catch {
        // skip files that can't be fetched
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const monthNum = parseInt(selectedMonth.split('-')[1], 10);
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `26년${monthNum}월_영수증.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = 'px-3 py-2.5 border border-[#D9D9D9] rounded-lg text-[14px] outline-none focus:border-[#336DFF] transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#282828]">지출 관리</h1>
          <p className="text-[14px] text-[#969696] mt-1">월별 운영 지출 내역을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleZipDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors">
            <FileArchive size={16} /> 영수증 ZIP
          </button>
          <button onClick={handleExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors">
            <Download size={16} /> Excel 다운로드
          </button>
          <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#282828] text-white rounded-lg text-[14px] font-medium hover:bg-[#3C3C3C] transition-colors">
            <Plus size={16} /> 지출 등록
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className={inputClass + ' min-w-[160px]'}>
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '운영비 소계', value: opTotal },
          { label: 'F&B 소계', value: fbTotal },
          { label: '총액', value: grandTotal },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] p-4 text-center">
            <p className="text-[13px] text-[#969696] font-medium">{s.label}</p>
            <p className="text-[20px] font-bold text-[#282828] mt-1">{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] p-5 space-y-4">
          <h3 className="text-[16px] font-bold text-[#282828]">지출 등록</h3>

          <div className="flex items-center gap-4 p-4 bg-[#F5F5F5] rounded-lg border border-dashed border-[#B3B3B3]">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[14px] text-[#282828] font-bold">1. 영수증 첨부</label>
              <p className="text-[12px] text-[#969696]">영수증 사진을 먼저 선택하세요. 나중에 AI가 자동으로 내용을 읽어줍니다.</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptChange} className={inputClass + ' text-[13px] mt-1'} />
            </div>
            {formReceiptPreview && (
              <img src={formReceiptPreview} alt="영수증 미리보기" className="h-[80px] w-[80px] object-cover rounded-lg border border-[#D9D9D9] cursor-pointer shadow-sm"
                onClick={() => setPreviewImage(formReceiptPreview)} />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">구매일자 *</label>
              <input type="date" required value={formDate} onChange={e => setFormDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">대분류 *</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value as Expense['category'])} className={inputClass}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">품명 *</label>
              <input type="text" required value={formItemName} onChange={e => setFormItemName(e.target.value)} placeholder="품명" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">용도</label>
              <input type="text" value={formPurpose} onChange={e => setFormPurpose(e.target.value)} placeholder="용도" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">업체명</label>
              <input type="text" value={formVendor} onChange={e => setFormVendor(e.target.value)} placeholder="업체명" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">공급가액 *</label>
              <input type="number" required value={formSupply} onChange={e => setFormSupply(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">부가세</label>
              <input type="number" value={formTax} onChange={e => setFormTax(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">합계 (자동)</label>
              <div className={inputClass + ' bg-[#F5F5F5] flex items-center'}>
                {formatCurrency(computedTotal)}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">결제수단 *</label>
              <select value={formMethod} onChange={e => setFormMethod(e.target.value)} className={inputClass}>
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] text-[#515151] font-medium">비고</label>
              <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="비고" className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[14px] text-[#515151] cursor-pointer">
              <input type="checkbox" checked={formIsCancel} onChange={e => setFormIsCancel(e.target.checked)}
                className="w-4 h-4 rounded border-[#D9D9D9]" />
              부분 취소
            </label>
            {formIsCancel && (
              <select value={formRelatedId} onChange={e => setFormRelatedId(e.target.value)}
                className={inputClass + ' min-w-[240px]'}>
                <option value="">원 지출 선택</option>
                {filtered.filter(e => !e.isPartialCancel).map(e => (
                  <option key={e.id} value={e.id}>{e.date} - {e.itemName} ({formatCurrency(e.totalAmount)})</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 bg-[#282828] text-white rounded-lg text-[14px] font-medium hover:bg-[#3C3C3C] transition-colors">저장</button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-5 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors">취소</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F5F5]">
                {['번호', '구매일자', '대분류', '품명', '용도', '업체', '공급가액', '부가세', '합계', '결제수단', '비고', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-medium text-[13px] text-[#515151] ${
                    i >= 6 && i <= 8 ? 'text-right' : 'text-left'
                  } ${i === 11 ? 'w-10' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {filtered.map((e, idx) => (
                <tr key={e.id}
                  className={`hover:bg-[#EBEBEB] transition-colors ${
                    idx % 2 === 1 ? 'bg-[#F5F5F5]' : ''
                  } ${e.isPartialCancel ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                  <td className="px-4 py-3 text-[14px] text-[#282828]">{idx + 1}</td>
                  <td className="px-4 py-3 text-[14px] text-[#282828]">{e.date}</td>
                  <td className="px-4 py-3 text-[14px]">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${
                      e.category === '운영비' ? 'bg-[#F5F5F5] text-[#515151]' : 'bg-amber-50 text-amber-700'
                    }`}>{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#282828] font-medium">{e.itemName}</td>
                  <td className="px-4 py-3 text-[14px] text-[#515151]">{e.purpose}</td>
                  <td className="px-4 py-3 text-[14px] text-[#515151]">{e.vendor}</td>
                  <td className={`px-4 py-3 text-[14px] text-right font-medium ${e.supplyAmount < 0 ? 'text-red-600' : 'text-[#282828]'}`}>
                    {new Intl.NumberFormat('ko-KR').format(e.supplyAmount)}
                  </td>
                  <td className={`px-4 py-3 text-[14px] text-right ${e.tax < 0 ? 'text-red-600' : 'text-[#515151]'}`}>
                    {new Intl.NumberFormat('ko-KR').format(e.tax)}
                  </td>
                  <td className={`px-4 py-3 text-[14px] text-right font-bold ${e.totalAmount < 0 ? 'text-red-600' : 'text-[#282828]'}`}>
                    {new Intl.NumberFormat('ko-KR').format(e.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#515151]">{e.paymentMethod}</td>
                  <td className="px-4 py-3 text-[14px] text-[#969696]">{e.notes}</td>
                  <td className="px-4 py-3 text-center">
                    {e.receiptImageUrl && (
                      <button onClick={() => setPreviewImage(e.receiptImageUrl)}
                        className="text-[#969696] hover:text-[#282828] transition-colors">
                        <Image size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[#F5F5F5] border-t-2 border-[#D9D9D9]">
                  <td colSpan={6} className="px-4 py-3 text-[14px] font-bold text-[#282828] text-right">합계</td>
                  <td className="px-4 py-3 text-[14px] text-right font-bold text-[#282828]">
                    {new Intl.NumberFormat('ko-KR').format(supplySum)}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-right font-bold text-[#282828]">
                    {new Intl.NumberFormat('ko-KR').format(taxSum)}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-right font-bold text-[#282828]">
                    {new Intl.NumberFormat('ko-KR').format(totalSum)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[15px] text-[#969696]">해당 월의 지출 내역이 없습니다.</div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setPreviewImage(null)}>
          <div className="relative bg-white rounded-lg p-2 max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-[#282828] text-white rounded-full flex items-center justify-center hover:bg-[#3C3C3C] transition-colors">
              <X size={16} />
            </button>
            <img src={previewImage} alt="영수증" className="max-w-[80vw] max-h-[80vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
