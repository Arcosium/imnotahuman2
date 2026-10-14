import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
const manifest=JSON.parse(await readFile(new URL('../assets.manifest.json',import.meta.url),'utf8'));
const directory=new URL('../public/assets/',import.meta.url);await mkdir(directory,{recursive:true});
for(const asset of manifest){
 if(basename(asset.file)!==asset.file)throw new Error('Invalid asset path');
 const target=new URL(asset.file,directory);let old;try{old=await readFile(target);}catch{}
 const hash=b=>createHash('sha256').update(b).digest('hex');if(old&&hash(old)===asset.sha256)continue;
 if(old)throw new Error('Existing asset differs; preserve it before replacing: '+asset.file);
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Asset unavailable: '+asset.file);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==asset.bytes||hash(bytes)!==asset.sha256)throw new Error('Asset integrity mismatch: '+asset.file);
 const temp=new URL(asset.file+'.download',directory);await writeFile(temp,bytes,{flag:'wx'});await rename(temp,target);console.log('Verified asset:',asset.file);
}
