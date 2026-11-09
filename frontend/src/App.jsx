import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const dateText = (value) => value ? new Date(value).toLocaleDateString('id-ID') : '-'

const menus = [
  ['dashboard', 'Dashboard'],
  ['customers', 'Pelanggan'],
  ['kendaraan', 'Kendaraan'],
  ['service', 'Servis'],
  ['transactions', 'Transaksi'],
  ['rfm', 'Analisis RFM'],
]

const definitions = {
  customers: { title: 'Data Pelanggan', endpoint: 'customers', fields: [
    ['name', 'Nama pelanggan', 'text', true], ['phone', 'Nomor telepon', 'text'], ['address', 'Alamat', 'text']
  ], headers: ['Nama', 'Telepon', 'Alamat'], cells: (r) => [r.name, r.phone || '-', r.address || '-'] },
  kendaraan: { title: 'Data Kendaraan', endpoint: 'kendaraan', fields: [
    ['customers_id', 'Pelanggan', 'customer', true], ['plat_nomer', 'Nomor polisi', 'text', true], ['brand', 'Merek', 'text', true], ['tipe', 'Tipe kendaraan', 'text', true], ['year', 'Tahun', 'number']
  ], headers: ['Nomor polisi', 'Merek / tipe', 'Pemilik', 'Tahun'], cells: (r, data) => [r.plat_nomer, r.brand + ' ' + r.tipe, data.customers.find(x => x.id === r.customers_id)?.name || '-', r.year || '-'] },
  service: { title: 'Riwayat Servis', endpoint: 'service', fields: [
    ['customers_id', 'Pelanggan', 'customer', true], ['kendaraan_id', 'Kendaraan', 'vehicle', true], ['service_date', 'Tanggal servis', 'date', true], ['description', 'Deskripsi servis', 'text', true], ['service_cost', 'Biaya servis', 'number', true]
  ], headers: ['Tanggal', 'Pelanggan', 'Kendaraan', 'Deskripsi', 'Biaya'], cells: (r, data) => [dateText(r.service_date), data.customers.find(x => x.id === r.customers_id)?.name || '-', data.kendaraan.find(x => x.id === r.kendaraan_id)?.plat_nomer || '-', r.description, money(r.service_cost)] },
  transactions: { title: 'Data Transaksi', endpoint: 'transactions', fields: [
    ['customers_id', 'Pelanggan', 'customer', true], ['kendaraan_id', 'Kendaraan', 'vehicle', true], ['service_id', 'Servis terkait', 'service'], ['total_amount', 'Total pembayaran', 'number', true], ['transactions_date', 'Tanggal transaksi', 'datetime-local']
  ], headers: ['Tanggal', 'Pelanggan', 'Kendaraan', 'Total'], cells: (r, data) => [dateText(r.transactions_date), data.customers.find(x => x.id === r.customers_id)?.name || '-', data.kendaraan.find(x => x.id === r.kendaraan_id)?.plat_nomer || '-', money(r.total_amount)] },
}

function App() {
  const [active, setActive] = useState('dashboard')
  const [data, setData] = useState({ customers: [], kendaraan: [], service: [], transactions: [] })
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [rfmResult, setRfmResult] = useState(null)
  const [rfmCustomer, setRfmCustomer] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [summary, customers, kendaraan, service, transactions] = await Promise.all([
        fetch(API + '/api/dashboard').then(check),
        fetch(API + '/api/customers').then(check),
        fetch(API + '/api/kendaraan').then(check),
        fetch(API + '/api/service').then(check),
        fetch(API + '/api/transactions').then(check),
      ])
      setStats(summary)
      setData({ customers, kendaraan, service, transactions })
    } catch (e) {
      setError(e.message + '. Pastikan backend dan MySQL sudah aktif.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  const current = definitions[active]
  const customerOptions = data.customers.map(x => ({ value: x.id, label: x.name }))
  const vehicleOptions = data.kendaraan
    .filter(x => !form.customers_id || Number(x.customers_id) === Number(form.customers_id))
    .map(x => ({ value: x.id, label: x.plat_nomer + ' · ' + x.brand }))
  const serviceOptions = data.service
    .filter(x => (!form.customers_id || Number(x.customers_id) === Number(form.customers_id)) &&
      (!form.kendaraan_id || Number(x.kendaraan_id) === Number(form.kendaraan_id)))
    .map(x => ({ value: x.id, label: x.description }))
  const recent = useMemo(() => data.transactions.slice(0, 6), [data.transactions])

  async function check(response) {
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Permintaan gagal')
    return result
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      const payload = { ...form }
      if (payload.year === '') payload.year = null
      if (payload.service_id === '') payload.service_id = null
      const response = await fetch(API + '/api/' + current.endpoint + (editId ? '/' + editId : ''), {
        method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      await check(response)
      setForm({})
      setEditId(null)
      setNotice(editId ? 'Data berhasil diperbarui.' : 'Data berhasil disimpan.')
      await load()
    } catch (e) { setNotice(e.message) }
    finally { setSaving(false) }
  }

  const edit = (resource, row) => {
    if (resource !== active) return
    const values = { ...row }
    if (values.transactions_date) values.transactions_date = String(values.transactions_date).replace(' ', 'T').slice(0, 16)
    if (values.service_date) values.service_date = String(values.service_date).slice(0, 10)
    setForm(values)
    setEditId(row.id)
    setNotice('Mode edit aktif. Ubah data pada formulir lalu simpan.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (resource, id) => {
    if (!window.confirm('Hapus data ini?')) return
    try {
      await check(await fetch(API + '/api/' + resource + '/' + id, { method: 'DELETE' }))
      setNotice('Data berhasil dihapus.')
      await load()
    } catch (e) { setNotice(e.message) }
  }

  const runRfm = async () => {
    if (!rfmCustomer) return
    setRfmResult(null)
    try {
      const response = await fetch(API + '/api/rfm/' + rfmCustomer, { method: 'POST' })
      setRfmResult(await check(response))
    } catch (e) { setRfmResult({ error: e.message }) }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">FT</div><div><strong>Family Teknik</strong><small>Workshop Management</small></div></div>
      <div className="nav-label">MENU UTAMA</div>
      <nav>{menus.map(([key, label]) => <button key={key} className={active === key ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(key); setNotice('') }}><span className="nav-dot" />{label}</button>)}</nav>
      <div className="sidebar-foot"><span className="status-dot" /> Sistem Manajemen Bengkel</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">FAMILY TEKNIK / MANAGEMENT</span><h1>{active === 'dashboard' ? 'Dashboard' : active === 'rfm' ? 'Analisis Pelanggan RFM' : current.title}</h1></div><button className="button secondary" onClick={load}>↻ Perbarui data</button></header>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert">{notice}</div>}
      {loading && <p className="muted">Memuat data...</p>}
      {!loading && active === 'dashboard' && <section>
        <div className="welcome"><div><span className="eyebrow light">RINGKASAN OPERASIONAL</span><h2>Selamat datang di Family Teknik</h2><p>Pantau pelanggan, kendaraan, servis, dan transaksi bengkel dari satu dashboard.</p></div><div className="welcome-icon">FT</div></div>
        <div className="stats-grid">
          <Stat label="Total pelanggan" value={stats.customers || 0} icon="01" />
          <Stat label="Kendaraan terdaftar" value={stats.vehicles || 0} icon="02" />
          <Stat label="Catatan servis" value={stats.services || 0} icon="03" />
          <Stat label="Total transaksi" value={stats.transactions || 0} icon="04" />
        </div>
        <div className="revenue-card"><div><span className="eyebrow light">TOTAL PENDAPATAN TERCATAT</span><h2>{money(stats.revenue)}</h2><p>Akumulasi transaksi dalam database</p></div><div className="revenue-symbol">Rp</div></div>
        <Panel title="Transaksi terbaru" subtitle="Enam transaksi terakhir yang tercatat">
          <TransactionTable rows={recent} data={data} />
        </Panel>
      </section>}
      {!loading && current && <section className="content-grid">
        <Panel title={current.title} subtitle="Kelola dan pantau data bengkel">
          {data[active].length === 0 ? <Empty /> : <div className="table-wrap"><table><thead><tr>{current.headers.map(h => <th key={h}>{h}</th>)}<th>Aksi</th></tr></thead><tbody>{data[active].map(row => <tr key={row.id}>{current.cells(row, data).map((cell, i) => <td key={i}>{cell}</td>)}<td><div className="row-actions"><button className="text-button" onClick={() => edit(current.endpoint, row)}>Edit</button><button className="text-button danger" onClick={() => remove(current.endpoint, row.id)}>Hapus</button></div></td></tr>)}</tbody></table></div>}
        </Panel>
        <Panel title="Tambah data" subtitle="Isi formulir berikut untuk menyimpan data baru">
          <form className="form" onSubmit={submit}>
            {current.fields.map(([name, label, type, required]) => <label key={name}>{label}
              {['customer', 'vehicle', 'service'].includes(type) ? <select required={required} value={form[name] || ''} onChange={e => {
                const value = e.target.value ? Number(e.target.value) : ''
                setForm({ ...form, [name]: value, ...(type === 'customer' ? { kendaraan_id: '', service_id: '' } : type === 'vehicle' ? { service_id: '' } : {}) })
              }}><option value="">Pilih {label.toLowerCase()}</option>{(type === 'customer' ? customerOptions : type === 'vehicle' ? vehicleOptions : serviceOptions).map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
              : <input required={required} type={type} value={form[name] ?? ''} onChange={e => setForm({ ...form, [name]: e.target.value })} />}</label>)}
            <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Menyimpan...' : editId ? 'Simpan perubahan' : 'Simpan data'}</button>{editId && <button type="button" className="button secondary" onClick={() => { setEditId(null); setForm({}); setNotice('Edit dibatalkan.') }}>Batal edit</button>}</div>
          </form>
        </Panel>
      </section>}
      {!loading && active === 'rfm' && <section className="rfm-layout">
        <Panel title="Hitung segmentasi pelanggan" subtitle="Pilih pelanggan untuk menghitung Recency, Frequency, dan Monetary">
          <div className="form"><label>Pelanggan<select value={rfmCustomer} onChange={e => setRfmCustomer(e.target.value)}><option value="">Pilih pelanggan</option>{customerOptions.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><button className="button primary" disabled={!rfmCustomer} onClick={runRfm}>Hitung RFM dan rekomendasi promo</button></div>
        </Panel>
        {rfmResult && <Panel title="Hasil analisis" subtitle="Hasil perhitungan dari layanan AI"><RfmResult result={rfmResult} /></Panel>}
        <div className="info-note"><strong>Penjelasan singkat</strong><p>Recency mengukur jarak hari sejak transaksi terakhir. Frequency menghitung jumlah transaksi. Monetary menjumlahkan nilai transaksi pelanggan.</p></div>
      </section>}
      <footer>Family Teknik · Sistem Rekomendasi Promo Adaptif berbasis RFM</footer>
    </main>
  </div>
}

function Stat({ label, value, icon }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div> }
function Panel({ title, subtitle, children }) { return <div className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div></div>{children}</div> }
function Empty() { return <div className="empty"><span>Belum ada data</span><p>Tambahkan data melalui formulir di samping.</p></div> }
function TransactionTable({ rows, data }) {
  if (!rows.length) return <Empty />
  return <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Pelanggan</th><th>Kendaraan</th><th>Total</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{dateText(r.transactions_date)}</td><td>{data.customers.find(x => x.id === r.customers_id)?.name || '-'}</td><td>{data.kendaraan.find(x => x.id === r.kendaraan_id)?.plat_nomer || '-'}</td><td>{money(r.total_amount)}</td></tr>)}</tbody></table></div>
}
function RfmResult({ result }) {
  if (result.error) return <div className="alert error">{result.error}</div>
  const rfm = result.result?.rfm
  const promo = result.result?.promo_recommendation
  if (!rfm || rfm.recency === null) return <p className="muted">Belum ada transaksi untuk pelanggan ini.</p>
  return <div><div className="rfm-stats"><div><span>Recency</span><strong>{rfm.recency} hari</strong></div><div><span>Frequency</span><strong>{rfm.frequency} kali</strong></div><div><span>Monetary</span><strong>{money(rfm.monetary)}</strong></div></div><div className="segment"><span>Segmen pelanggan</span><h2>{result.result.segment}</h2></div>{promo && <div className="promo"><strong>Rekomendasi promo</strong><p>{promo.promo}</p><small>{promo.alasan}</small></div>}</div>
}
export default App
