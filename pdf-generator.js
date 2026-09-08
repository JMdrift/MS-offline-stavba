/* ==========================================================
   PDF JADRO — offline, tiskove A4, ceska diakritika.
   Kazdy jsPDF dokument dostava font znovu: VFS je vlastnost
   konkretni instance a globalni registrace zpusobovala, ze druhy
   export po spusteni appky o diakritiku prisel.
   ========================================================== */
const MsPdf = (function(){
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const BOTTOM = 280;
  const INK = [43, 40, 37];
  const MUTED = [112, 104, 94];
  const BRICK = [200, 86, 47];
  const DARK = [31, 28, 25];
  const LINE = [202, 194, 183];
  const CREAM = [247, 243, 236];

  function sanitize(text){
    return String(text == null ? '' : text)
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[^\S\r\n]+/g, ' ');
  }

  function newDoc(options){
    options = options || {};
    if(!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF knihovna není dostupná.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:options.format || 'a4', orientation:options.orientation || 'portrait', compress:true });
    let customFont = false;
    if(typeof MS_PDF_FONT_REGULAR_B64 !== 'undefined' && typeof MS_PDF_FONT_BOLD_B64 !== 'undefined'){
      try{
        doc.addFileToVFS('DejaVuCZ.ttf', MS_PDF_FONT_REGULAR_B64);
        doc.addFont('DejaVuCZ.ttf', 'DejaVuCZ', 'normal');
        doc.addFileToVFS('DejaVuCZ-Bold.ttf', MS_PDF_FONT_BOLD_B64);
        doc.addFont('DejaVuCZ-Bold.ttf', 'DejaVuCZ', 'bold');
        customFont = true;
      }catch(error){ console.warn('Český PDF font se nepodařilo načíst.', error); }
    }
    doc.__msPdfFont = customFont ? 'DejaVuCZ' : 'helvetica';
    doc.setFont(doc.__msPdfFont, 'normal');
    return doc;
  }

  function font(doc){ return (doc && doc.__msPdfFont) || 'helvetica'; }

  function pageBorder(doc){
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20);
    doc.setFillColor(...BRICK);
    doc.rect(10, 10, 2.3, PAGE_H - 20, 'F');
  }

  function makeCursor(doc){
    let y = MARGIN;
    let onPageBreak = null;
    const api = {
      get y(){ return y; },
      set y(value){ y = value; },
      remaining(){ return BOTTOM - y; },
      setPageBreakHandler(handler){ onPageBreak = handler || null; },
      addPage(options){
        options = options || {};
        doc.addPage();
        pageBorder(doc);
        y = MARGIN;
        if(!options.skipHandler && onPageBreak) onPageBreak(api);
      },
      ensure(height){
        if(y + height > BOTTOM) api.addPage();
      }
    };
    return api;
  }

  function heading(doc, cur, text, size){
    cur.ensure(17);
    doc.setFont(font(doc), 'bold');
    doc.setFontSize(size || 16);
    doc.setTextColor(...INK);
    doc.text(sanitize(text), MARGIN, cur.y);
    cur.y += 3.5;
    doc.setDrawColor(...BRICK);
    doc.setLineWidth(1.15);
    doc.line(MARGIN, cur.y, MARGIN + 22, cur.y);
    cur.y += 9;
  }

  function paragraph(doc, cur, text, options){
    options = options || {};
    const x = options.x == null ? MARGIN : options.x;
    const width = options.width || (PAGE_W - MARGIN * 2);
    const lineHeight = options.lineH || 4.8;
    doc.setFont(font(doc), options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.size || 10.1);
    doc.setTextColor(...(options.color || INK));
    const blocks = sanitize(text).split('\n');
    blocks.forEach((block, blockIndex)=>{
      const lines = doc.splitTextToSize(block || ' ', width);
      lines.forEach(line=>{
        cur.ensure(lineHeight);
        doc.text(line, x, cur.y);
        cur.y += lineHeight;
      });
      if(blockIndex < blocks.length - 1) cur.y += options.paragraphGap == null ? 1.2 : options.paragraphGap;
    });
  }

  function measureParagraphHeight(doc, text, options){
    options = options || {};
    doc.setFont(font(doc), options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.size || 10.1);
    const width = options.width || (PAGE_W - MARGIN * 2);
    const lineHeight = options.lineH || 4.8;
    let height = 0;
    sanitize(text).split('\n').forEach((block, index, blocks)=>{
      height += doc.splitTextToSize(block || ' ', width).length * lineHeight;
      if(index < blocks.length - 1) height += options.paragraphGap == null ? 1.2 : options.paragraphGap;
    });
    return height;
  }

  function labelValueRow(doc, cur, label, value){
    const labelWidth = 48;
    const valueWidth = PAGE_W - MARGIN * 2 - labelWidth;
    doc.setFont(font(doc), 'normal');
    doc.setFontSize(9.7);
    const lines = doc.splitTextToSize(sanitize(value || '-'), valueWidth);
    const rowHeight = Math.max(6.6, lines.length * 4.5 + 1.2);
    cur.ensure(rowHeight);
    doc.setFont(font(doc), 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(label).toUpperCase(), MARGIN, cur.y);
    doc.setFont(font(doc), 'normal');
    doc.setFontSize(9.7);
    doc.setTextColor(...INK);
    lines.forEach((line, index)=> doc.text(line, MARGIN + labelWidth, cur.y + index * 4.5));
    cur.y += rowHeight;
  }

  function infoPill(doc, x, y, label, value, width){
    doc.setFillColor(...CREAM);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, width, 13, 1.3, 1.3, 'FD');
    doc.setFont(font(doc), 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(label).toUpperCase(), x + 3, y + 4.2);
    doc.setFont(font(doc), 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const short = doc.splitTextToSize(sanitize(value || '-'), width - 6)[0] || '-';
    doc.text(short, x + 3, y + 9.4);
  }

  function table(doc, cur, columns, rows){
    const totalWidth = columns.reduce((sum, column)=> sum + column.w, 0);
    function header(){
      cur.ensure(10);
      doc.setFillColor(...DARK);
      doc.rect(MARGIN, cur.y - 4.8, totalWidth, 8, 'F');
      doc.setFont(font(doc), 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(247, 243, 236);
      let x = MARGIN;
      columns.forEach(column=>{
        doc.text(sanitize(column.label), column.align === 'right' ? x + column.w - 2 : x + 2, cur.y, {align:column.align === 'right' ? 'right' : 'left'});
        x += column.w;
      });
      cur.y += 6;
    }
    header();
    rows.forEach((row, rowIndex)=>{
      if(cur.remaining() < 9){ cur.addPage(); header(); }
      if(rowIndex % 2){ doc.setFillColor(...CREAM); doc.rect(MARGIN, cur.y - 4.3, totalWidth, 7.2, 'F'); }
      doc.setFont(font(doc), 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(...INK);
      let x = MARGIN;
      row.forEach((value, index)=>{
        const column = columns[index];
        const lines = doc.splitTextToSize(sanitize(value), column.w - 4);
        const rendered = lines[0] || '';
        doc.text(rendered, column.align === 'right' ? x + column.w - 2 : x + 2, cur.y, {align:column.align === 'right' ? 'right' : 'left'});
        x += column.w;
      });
      cur.y += 7.2;
    });
  }

  function coverPage(doc, cur, title, subtitle, metaRows, summary){
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PAGE_W, 74, 'F');
    doc.setFillColor(...BRICK);
    doc.rect(0, 0, 7, 74, 'F');
    doc.setFont(font(doc), 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRICK);
    doc.text('MOJE STAVBA', MARGIN, 23);
    doc.setFontSize(27);
    doc.setTextColor(247, 243, 236);
    doc.text(sanitize(title), MARGIN, 42);
    doc.setFont(font(doc), 'normal');
    doc.setFontSize(13);
    doc.setTextColor(205, 196, 185);
    doc.text(doc.splitTextToSize(sanitize(subtitle), PAGE_W - MARGIN * 2), MARGIN, 53);

    cur.y = 87;
    metaRows.filter(row=> row[1]).forEach(([label, value])=> labelValueRow(doc, cur, label, value));
    cur.y += 3;
    doc.setDrawColor(...BRICK);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, cur.y, PAGE_W - MARGIN, cur.y);
    cur.y += 8;
    paragraph(doc, cur, summary, {size:9.5, color:MUTED});

    const boxY = Math.max(cur.y + 7, 226);
    doc.setFillColor(...CREAM);
    doc.setDrawColor(...LINE);
    doc.roundedRect(MARGIN, boxY, PAGE_W - MARGIN * 2, 42, 1.5, 1.5, 'FD');
    doc.setFont(font(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...MUTED);
    doc.text('LISTINNÝ ORIGINÁL', MARGIN + 5, boxY + 7);
    doc.setFont(font(doc), 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...INK);
    doc.text('Deník je připraven pro ruční podpisy a otisky razítek.', MARGIN + 5, boxY + 14);
    doc.setDrawColor(...LINE);
    doc.line(MARGIN + 5, boxY + 31, MARGIN + 78, boxY + 31);
    doc.line(PAGE_W - MARGIN - 78, boxY + 31, PAGE_W - MARGIN - 5, boxY + 31);
    doc.setFontSize(7.8);
    doc.setTextColor(...MUTED);
    doc.text('stavebník - datum a podpis', MARGIN + 5, boxY + 36);
    doc.text('stavební dozor - podpis / razítko', PAGE_W - MARGIN - 78, boxY + 36);
  }

  function imageSize(dataUrl){
    return new Promise(resolve=>{
      const image = new Image();
      image.onload = ()=> resolve({w:image.naturalWidth || 1, h:image.naturalHeight || 1});
      image.onerror = ()=> resolve(null);
      image.src = dataUrl;
    });
  }

  async function photoRow(doc, cur, photos, options){
    options = options || {};
    const list = (photos || []).filter(Boolean);
    if(!list.length) return;
    const gap = 4;
    const boxHeight = options.h || 49;
    const boxWidth = (PAGE_W - MARGIN * 2 - gap) / 2;
    for(let start = 0; start < list.length; start += 2){
      const pair = list.slice(start, start + 2);
      cur.ensure(boxHeight + 7);
      for(let index = 0; index < pair.length; index++){
        const x = MARGIN + index * (boxWidth + gap);
        const y = cur.y;
        doc.setDrawColor(...LINE);
        doc.setFillColor(...CREAM);
        doc.rect(x, y, boxWidth, boxHeight, 'FD');
        const size = await imageSize(pair[index]);
        if(!size) continue;
        const scale = Math.min((boxWidth - 2) / size.w, (boxHeight - 2) / size.h);
        const drawWidth = size.w * scale;
        const drawHeight = size.h * scale;
        try{
          doc.addImage(pair[index], undefined, x + (boxWidth - drawWidth) / 2, y + (boxHeight - drawHeight) / 2, drawWidth, drawHeight, undefined, 'FAST');
        }catch(error){ console.warn('Fotku se nepodařilo vložit do PDF.', error); }
      }
      cur.y += boxHeight + 7;
    }
  }

  function toBlob(source){
    if(source instanceof Blob) return source;
    if(source && source.blob instanceof Blob) return source.blob;
    if(source && source.output) return source.output('blob');
    throw new Error('PDF data nejsou dostupná.');
  }

  function saveOrShare(source, filename){
    const blob = toBlob(source);
    // (30.8.2026) Nejdriv zkusit nativni cestu (appka na telefonu) -
    // teprve kdyz appka nebezi jako nativni, nebo nativni cesta selze,
    // padej na puvodni webove chovani.
    if(typeof msNativniUlozitASdilet === 'function' && typeof msJeNativniAppka === 'function' && msJeNativniAppka()){
      msNativniUlozitASdilet(blob, filename, {title: filename, dialogTitle: 'Uložit nebo otevřít deník'})
        .then(ok=>{ if(!ok) zkusitWebovouCestu(); });
      return;
    }
    zkusitWebovouCestu();

    function zkusitWebovouCestu(){
      const file = new File([blob], filename, {type:'application/pdf'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:filename}).catch(()=> download(blob, filename));
      }else download(blob, filename);
    }
  }

  function download(blob, filename){
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 30000);
  }

  function getBlobUrl(source){ return URL.createObjectURL(toBlob(source)); }

  return {
    newDoc, font, sanitize, makeCursor, pageBorder, heading, paragraph,
    measureParagraphHeight, labelValueRow, infoPill, table, coverPage,
    photoRow, saveOrShare, getBlobUrl, toBlob,
    PAGE_W, PAGE_H, MARGIN, BOTTOM, INK, MUTED, BRICK, DARK, LINE, CREAM
  };
})();
