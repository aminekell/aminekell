/** Validate the buildless site and stage exactly what Pages will publish. */
import {readFile, readdir, stat, mkdir, rm, cp} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'portfolio');
const files=await readdir(source,{recursive:true,withFileTypes:true});
// Publish the restored original. Later experiments remain in the checkout and
// saved snapshots, without adding their unused graphics stack to the artifact.
const entryFiles=['.gitkeep','index.html','styles.css','app.js','world.js','simulations.js','lab-renderer.js','fallback-map.svg'];
const filePaths=files.filter(f=>f.isFile()).map(f=>resolve(f.parentPath,f.name))
 .filter(file=>entryFiles.some(name=>file===resolve(source,name))||file.startsWith(resolve(source,'fonts')+'/'));
const html=await readFile(resolve(source,'index.html'),'utf8');
for(const required of entryFiles) {
 if(!filePaths.includes(resolve(source,required)))throw new Error(`Missing site file: ${required}`);
}
for(const file of filePaths.filter(f=>f.endsWith('.js'))) {
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr);
 const content=await readFile(file,'utf8');
 for(const match of content.matchAll(/(?:from\s*|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
  await stat(resolve(dirname(file),match[1]));
 }
}
for(const stylesheet of filePaths.filter(f=>f.endsWith('.css'))){
const css=await readFile(stylesheet,'utf8');
for(const match of css.matchAll(/url\(\s*(?:(["'])([\s\S]*?)\1|([^\)\s]+))\s*\)/g)) {
 const ref=match[2]||match[3];
 if(/^(https?:|data:|#)/.test(ref))continue;
 await stat(resolve(dirname(stylesheet),ref));
}
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML id');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
 const ref=match[1];if(/^(https?:|data:)/.test(ref))continue;
 if(ref.startsWith('/'))throw new Error(`Root-relative asset breaks project Pages: ${ref}`);
 await stat(resolve(source,ref));
}
const app=await readFile(resolve(source,'app.js'),'utf8');
for(const match of app.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(match[1]))throw new Error(`Missing DOM target ${match[1]}`);
const dist=resolve(root,'dist');await rm(dist,{recursive:true,force:true});await mkdir(dist);
for(const file of filePaths){
 const destination=resolve(dist,file.slice(source.length+1));
 await mkdir(dirname(destination),{recursive:true});await cp(file,destination);
}
const bytes=(await Promise.all(filePaths.map(async f=>(await stat(f)).size))).reduce((a,b)=>a+b,0);
console.log(`Static build validated: ${filePaths.length} files, ${bytes.toLocaleString()} bytes. Output: dist/ (relative assets, no runtime dependencies).`);
