from pathlib import Path
p=Path('public/index.html');s=p.read_text(encoding='utf8').replace('es una<br>','es una <br>').replace('y convierte<br>','y convierte <br>');p.write_text(s,encoding='utf8')
p=Path('public/supervisor.js');s=p.read_text(encoding='utf8').replace('step="0.01"','step="any"');p.write_text(s,encoding='utf8')
p=Path('public/acciones.html');s=p.read_text(encoding='utf8').replace('</head>','<style>aside,header,footer{display:none!important}.shell{margin-left:0!important}main{padding:22px!important}.page-heading h1{font-size:25px!important}</style></head>');p.write_text(s,encoding='utf8')
p=Path('public/report-pdf.js');s=p.read_text(encoding='utf8');s=s.replace("block('Control del documento',r.status+' | Última actualización: '+String(r.updated||'').slice(0,19).replace('T',' ')+' UTC. Los nombres capturados no sustituyen firmas autógrafas o electrónicas.',title,sub);", "text(r.status+' | Actualización: '+String(r.updated||'').slice(0,19).replace('T',' ')+' UTC | Los nombres capturados no sustituyen firmas autógrafas o electrónicas.',M,40,7,gray);")
p.write_text(s,encoding='utf8')
