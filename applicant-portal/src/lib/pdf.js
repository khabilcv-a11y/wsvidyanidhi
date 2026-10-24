import { jsPDF } from 'jspdf'
import logoUrl from '@shared/brand/logo-wisdom-students.png'
import { LABELS, REVIEW_GROUPS, SECTIONS, display } from './sections.js'

const RED = [200, 16, 46]
const INK = [17, 18, 19]
const GREY = [110, 110, 110]
const PAGE = { w: 210, h: 297, m: 16 }

async function loadLogo() {
  try {
    const blob = await (await fetch(logoUrl)).blob()
    const dataUrl = await new Promise((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.readAsDataURL(blob)
    })
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = dataUrl
    })
    return { dataUrl, ratio: img.width / img.height }
  } catch {
    return null
  }
}

// Builds the applicant's copy of the application as a PDF and saves it.
// `form` holds all answers, `docs` is [{ label, files:[{size,status}] }], `submitted` tells if it has been submitted.
export async function downloadApplication({ form, application, docs, submitted }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const no = application.application_no || 'Draft'
  const logo = await loadLogo()
  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  doc.setProperties({
    title: `Application ${no} – WISDOM Students VIDYANIDHI Scholarship Programme`,
    subject: 'Applicant copy of the scholarship application',
    author: 'WISDOM Students VIDYANIDHI Scholarship Programme, Kerala State Committee',
    keywords: `application ${no}, scholarship, Vidyanidhi`,
    creator: 'Vidyanidhi applicant portal',
  })

  let y = 0
  const letterhead = () => {
    if (logo) {
      const h = 9
      doc.addImage(logo.dataUrl, 'PNG', PAGE.m, 12, h * logo.ratio, h)
    }
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...INK)
    doc.text('WISDOM Islamic Students Organization', PAGE.w - PAGE.m, 14, { align: 'right' })
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY)
    doc.text('Kerala State Committee', PAGE.w - PAGE.m, 18, { align: 'right' })
    doc.text('C V. Complex, P.V. Swami Road, Kozhikode, Kerala, India 673 002', PAGE.w - PAGE.m, 22, { align: 'right' })
    doc.text('wisdomstudentskerala@gmail.com  |  +91 7560902902', PAGE.w - PAGE.m, 26, { align: 'right' })
    doc.setDrawColor(...RED).setLineWidth(0.8).line(PAGE.m, 30, PAGE.w - PAGE.m, 30)
    y = 38
  }
  const ensure = (need) => {
    if (y + need > PAGE.h - 22) {
      doc.addPage()
      letterhead()
    }
  }
  letterhead()

  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK)
  doc.text('WISDOM Students VIDYANIDHI Scholarship Programme', PAGE.m, y)
  y += 6.5
  doc.setFontSize(11).setTextColor(...RED)
  doc.text('Application form: applicant copy', PAGE.m, y)
  y += 8

  // Summary box
  doc.setFillColor(246, 244, 240).roundedRect(PAGE.m, y, PAGE.w - PAGE.m * 2, 20, 2, 2, 'F')
  const box = [['Application number', no], ['Status', submitted ? 'Submitted' : 'Draft (not submitted)'], ['Name', form.full_name || '-'], ['Downloaded on', when]]
  box.forEach(([k, v], i) => {
    const x = PAGE.m + 4 + (i % 2) * 90
    const yy = y + 7 + Math.floor(i / 2) * 8
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GREY).text(k.toUpperCase(), x, yy - 2.5)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text(String(v), x, yy + 1.5, { maxWidth: 84 })
  })
  y += 28

  const colW = (PAGE.w - PAGE.m * 2) / 2
  Object.entries(REVIEW_GROUPS).forEach(([sec, fields]) => {
    const rows = fields.filter((f) => String(form[f] ?? '') !== '')
    const lines = rows.map((f) => [LABELS[f] || f, display(f, form)])
    if (!lines.length) return
    ensure(24)
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK).text(SECTIONS.find((s) => s.key === sec).title, PAGE.m, y)
    doc.setDrawColor(220, 220, 220).setLineWidth(0.3).line(PAGE.m, y + 1.8, PAGE.w - PAGE.m, y + 1.8)
    y += 7
    for (let i = 0; i < lines.length; i += 2) {
      const pair = lines.slice(i, i + 2)
      const heights = pair.map(([, v]) => doc.splitTextToSize(String(v), colW - 6).length)
      const h = 5 + Math.max(...heights) * 4.6
      ensure(h)
      pair.forEach(([k, v], j) => {
        const x = PAGE.m + j * colW
        doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GREY).text(k.toUpperCase(), x, y)
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK).text(doc.splitTextToSize(String(v), colW - 6), x, y + 4.3)
      })
      y += h + 1.5
    }
    y += 3
  })

  if (form.backpapers) {
    ensure(20)
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK).text('Back papers', PAGE.m, y)
    y += 6
    String(form.backpapers).split('\n').filter(Boolean).forEach((r) => {
      const [s, sem] = r.split('|')
      ensure(6)
      doc.setFont('helvetica', 'normal').setFontSize(10).text(`${s || '-'}   (Semester ${sem || '-'})`, PAGE.m + 2, y)
      y += 5.5
    })
    y += 3
  }

  // Documents
  ensure(30)
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK).text('Documents', PAGE.m, y)
  doc.setDrawColor(220, 220, 220).line(PAGE.m, y + 1.8, PAGE.w - PAGE.m, y + 1.8)
  y += 8
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GREY)
  doc.text('DOCUMENT', PAGE.m, y)
  doc.text('FILES', PAGE.m + 100, y)
  doc.text('SIZE', PAGE.m + 118, y)
  doc.text('STATUS', PAGE.m + 140, y)
  y += 5
  docs.forEach((d) => {
    ensure(8)
    const active = d.files.filter((f) => f.status !== 'reupload')
    const size = active.reduce((n, f) => n + (f.size || 0), 0)
    const st = active.length ? (active.every((f) => f.status === 'accepted') ? 'Accepted' : 'Uploaded, under review') : d.files.some((f) => f.status === 'reupload') ? 'Please upload again' : 'Not added yet'
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK)
    doc.text(d.label, PAGE.m, y, { maxWidth: 96 })
    doc.text(String(active.length), PAGE.m + 100, y)
    doc.text(size ? (size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`) : '-', PAGE.m + 118, y)
    doc.setTextColor(...(active.length ? [28, 138, 76] : RED)).text(st, PAGE.m + 140, y)
    doc.setDrawColor(235, 235, 235).line(PAGE.m, y + 2.2, PAGE.w - PAGE.m, y + 2.2)
    y += 7
  })

  y += 6
  ensure(26)
  doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(...GREY)
  const note = doc.splitTextToSize(
    'This is the applicant copy of the details entered in the portal. It is not an offer or approval of a scholarship. The scholarship committee decides after verification. Keep your application number safe: with your mobile number it lets you see your application status.',
    PAGE.w - PAGE.m * 2)
  doc.text(note, PAGE.m, y)

  // Watermark, footer and page numbers on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.07 }))
    doc.setFont('helvetica', 'bold').setFontSize(92).setTextColor(...INK)
    doc.text('PREVIEW', PAGE.w / 2, PAGE.h / 2 + 10, { align: 'center', angle: 38 })
    doc.restoreGraphicsState()
    doc.setDrawColor(220, 220, 220).setLineWidth(0.3).line(PAGE.m, PAGE.h - 15, PAGE.w - PAGE.m, PAGE.h - 15)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY)
    doc.text(`Application ${no}  |  WISDOM Students VIDYANIDHI Scholarship Programme`, PAGE.m, PAGE.h - 10)
    doc.text(`Page ${p} of ${pages}`, PAGE.w - PAGE.m, PAGE.h - 10, { align: 'right' })
  }
  doc.save(`Vidyanidhi-application-${no}.pdf`)
}
