import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const data={reports:[{id:'isolated-test-record',photos:[{data:'preserved'}]}],actions:[],plans:[],users:[{id:'isolated-user',isOwner:true}],notices:[],reads:{}};
const sha256=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
const file='.qa/migration-preflight-test.json';fs.mkdirSync('.qa',{recursive:true});
fs.writeFileSync(file,JSON.stringify({format:'sierra-madre-local-workspace',version:1,data,sha256}));
const argv=process.argv;process.argv=[...argv.slice(0,2),file];
try{await assert.rejects(()=>import('./migrate-verified-workspace.mjs'),/no se realizó ninguna escritura/);assert(!fs.existsSync('.qa/migration-'+sha256),'El rechazo debe ocurrir antes de preparar la migración');}
finally{process.argv=argv;}
console.log('Migración: respaldo con registros rechazado antes de acceder a credenciales o escribir en la nube: OK');
