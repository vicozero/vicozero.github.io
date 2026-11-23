/* FASE 6 · PDF carta para supervisión y reporte mensual ejecutivo. */
(function(global){
  'use strict';
  const A=global.SMAdvancedCore;
  const LETTER=[612,792];
  const safe=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();

  function requirePdf(){
    const P=global.PDFLib;
    if(!P?.PDFDocument||typeof P.rgb!=='function')throw Error('La librería PDF no está disponible.');
    return P;
  }
  // pdf-lib exige sus propios objetos Color; se crean de forma diferida.
  const C={};
  for(const [name,values] of Object.entries({
    INK:[.08,.14,.18],MUTED:[.36,.42,.46],GOLD:[.73,.58,.26],LINE:[.86,.88,.89],
    WHITE:[1,1,1],NAVY:[.04,.12,.17],SOFT:[.98,.985,.987],TITLE:[.85,.89,.91],SUBTLE:[.92,.94,.95]
  }))Object.defineProperty(C,name,{get(){
    const value=requirePdf().rgb(...values);
    Object.defineProperty(C,name,{value,configurable:true});
    return value;
  },configurable:true});

  function header(page,font,title,subtitle){
    page.drawRectangle({x:0,y:742,width:612,height:50,color:C.NAVY});
    page.drawText('SIERRA MADRE  ·  SEGURIDAD INDUSTRIAL',{x:36,y:760,size:10,font,color:C.WHITE});
    page.drawText(safe(title),{x:36,y:752,size:8,font,color:C.TITLE});
    if(subtitle)page.drawText(safe(subtitle),{x:36,y:724,size:9,font,color:C.MUTED});
  }
  function footer(page,font,folio){
    page.drawLine({start:{x:36,y:38},end:{x:576,y:38},thickness:0.6,color:C.LINE});
    page.drawText(safe(folio||'SM-SIERRA-MADRE'),{x:36,y:24,size:7,font,color:C.MUTED});
    page.drawText('Documento generado electronicamente · Uso interno',{x:330,y:24,size:7,font,color:C.MUTED});
  }
  function textBlock(page,font,lines,x,y,size=10,leading=15){
    let cursor=y;
    for(const line of lines){
      if(cursor<52)break;
      page.drawText(safe(line),{x,y:cursor,size,font,color:C.INK});cursor-=leading;
    }
    return cursor;
  }

  async function generateSupervisionPDF(record={}){
    const P=requirePdf(),doc=await P.PDFDocument.create(),font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold);
    doc.setTitle('Supervisión '+(record.folio||'sin folio'));
    doc.setAuthor('Sierra Madre · Seguridad Industrial');
    const page=doc.addPage(LETTER);
    header(page,font,'SUPERVISION DE SEGURIDAD',record.folio||'');
    page.drawText(safe(record.folio||'SIN FOLIO'),{x:36,y:700,size:16,font:bold,color:C.INK});
    page.drawText(safe(record.status||'Borrador'),{x:440,y:702,size:10,font:bold,color:C.GOLD});
    let y=676;
    const meta=[
      ['Fecha',record.date||''],['Hora',record.time||''],['Turno',record.shift||''],
      ['Unidad',record.unit||record.unitId||''],['Departamento',record.department||record.departmentId||''],
      ['Area',record.place||record.area||''],['Supervisor',record.supervisor||''],['Responsable',record.responsible||''],
      ['Tipo de inspeccion',record.type||'']
    ];
    for(let i=0;i<meta.length;i+=2){
      page.drawLine({start:{x:36,y:y+8},end:{x:576,y:y+8},thickness:0.4,color:C.LINE});
      const left=meta[i],right=meta[i+1];
      page.drawText(safe(left[0]+':'),{x:36,y,size:8,font:bold,color:C.MUTED});page.drawText(safe(left[1]),{x:110,y,size:9,font,color:C.INK});
      if(right){page.drawText(safe(right[0]+':'),{x:330,y,size:8,font:bold,color:C.MUTED});page.drawText(safe(right[1]),{x:410,y,size:9,font,color:C.INK});}
      y-=22;
    }
    y-=6;page.drawText('ACTIVIDADES Y RESULTADOS',{x:36,y,size:10,font:bold,color:C.INK});y-=18;
    const checks=record.checks||[];
    if(checks.length)checks.forEach((check,index)=>{y=textBlock(page,font,[`${index+1}. ${check.question||check.title||''}  ->  ${check.answer||''}${check.reason?' | '+check.reason:''}`],36,y,9,13);y-=3;});
    else y=textBlock(page,font,['Sin controles evaluados.'],36,y,9,13);
    y-=8;page.drawText('OBSERVACIONES',{x:36,y,size:10,font:bold,color:C.INK});y-=16;
    y=textBlock(page,font,String(record.observations||'Sin observaciones.').split(/\r?\n/).slice(0,8),36,y,9,13);
    y-=8;page.drawText('ACCIONES CORRECTIVAS VINCULADAS',{x:36,y,size:10,font:bold,color:C.INK});y-=16;
    const actions=record.actions||record.findings||[];
    y=textBlock(page,font,actions.length?actions.slice(0,6).map(a=>`- ${a.folio||a.id||''} ${a.description||a.title||''} | ${a.risk||''} | ${a.due||''}`):['No se generaron acciones para esta supervision.'],36,y,9,13);
    y-=8;page.drawText('EVIDENCIAS FOTOGRAFICAS',{x:36,y,size:10,font:bold,color:C.INK});y-=16;
    const photos=record.photos||[];
    y=textBlock(page,font,photos.length?photos.map((p,i)=>`${i+1}. ${p.caption||'Evidencia adjunta'}${p.dataUrl||p.data?' (archivo adjunto)':''}`):['No se adjuntaron fotografias.'],36,y,9,13);
    footer(page,font,record.folio);
    return doc.save();
  }

  async function generateMonthlyReportPDF(payload={}){
    const P=requirePdf(),doc=await P.PDFDocument.create(),font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold);
    const period=String(payload.period||A?.today?.().slice(0,7)||'');
    doc.setTitle('Reporte mensual ejecutivo '+period);
    doc.setAuthor('Sierra Madre · Seguridad Industrial');
    const kpi=payload.kpis||A?.computeKpis?.(payload.data||{},payload.filters||{})||{};
    const matrix=payload.matrix||A?.complianceMatrix?.(payload.data||{},payload.filters||{})||[];
    const findings=payload.findings||payload.data?.findings||[];
    const page=doc.addPage(LETTER);
    header(page,font,'REPORTE MENSUAL EJECUTIVO',period);
    page.drawText(safe('RESUMEN GENERAL'),{x:36,y:700,size:12,font:bold,color:C.INK});
    const cards=[
      ['Programadas',kpi.supervisionesProgramadas],['Realizadas',kpi.supervisionesRealizadas],
      ['Cumplimiento',String(kpi.cumplimientoMensual??0)+'%'],['Hallazgos abiertos',kpi.hallazgosAbiertos],
      ['Acciones vencidas',kpi.accionesVencidas],['Riesgos criticos',kpi.hallazgosCriticos]
    ];
    cards.forEach((c,i)=>{const x=36+(i%3)*180,y=676-Math.floor(i/3)*58;page.drawRectangle({x,y,width:168,height:48,borderColor:C.LINE,borderWidth:0.8,color:C.SOFT});page.drawText(safe(c[0]),{x:x+10,y:y+31,size:8,font,color:C.MUTED});page.drawText(safe(c[1]),{x:x+10,y:y+11,size:16,font:bold,color:C.INK});});
    let y=552;page.drawText('CUMPLIMIENTO POR DEPARTAMENTO',{x:36,y,size:10,font:bold,color:C.INK});y-=18;
    for(const row of matrix.slice(0,12)){
      page.drawText(safe(row.department).slice(0,34),{x:36,y,size:9,font,color:C.INK});
      page.drawRectangle({x:250,y:y-2,width:220,height:8,color:C.SUBTLE});
      page.drawRectangle({x:250,y:y-2,width:Math.max(2,220*Math.min(100,row.cumplimiento)/100),height:8,color:C.GOLD});
      page.drawText(String(row.cumplimiento)+'%',{x:480,y,size:9,font,color:C.INK});y-=18;
    }
    y-=10;page.drawText('HALLAZGOS Y RIESGOS CRITICOS',{x:36,y,size:10,font:bold,color:C.INK});y-=16;
    const critical=findings.filter(f=>f.risk==='Crítico'&&f.status!=='Cerrado').slice(0,10);
    y=textBlock(page,font,critical.length?critical.map(f=>`- ${f.folio||f.id||''} | ${f.description||f.title||''} | ${f.departmentId||f.department||''}`):['No hay hallazgos criticos abiertos.'],36,y,9,13);
    y-=10;page.drawText('COMPROMISOS VENCIDOS',{x:36,y,size:10,font:bold,color:C.INK});y-=16;
    const overdue=(payload.data?.actions||[]).filter(a=>A?.trafficLight?.(a)==='Rojo').slice(0,10);
    y=textBlock(page,font,overdue.length?overdue.map(a=>`- ${a.folio||a.id||''} | ${a.owner||''} | ${a.due}`):['No hay compromisos vencidos.'],36,y,9,13);
    footer(page,font,'SM-REPORTE-'+period);
    return doc.save();
  }

  const API={generateSupervisionPDF,generateMonthlyReportPDF,LETTER};
  global.SMAdvancedPDF=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
