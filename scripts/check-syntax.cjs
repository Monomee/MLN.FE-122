const fs=require('node:fs');
const path=require('node:path');
let ts;try{ts=require('typescript');}catch{ts=require('../.tooling/package/lib/typescript.js');}
let files=0,errors=0;
function check(file){
  files++;
  const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});
  for(const diagnostic of result.diagnostics??[])if(diagnostic.category===ts.DiagnosticCategory.Error){errors++;console.error(file+': '+ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n'));}
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.tsx?$/.test(e.name))check(file);}}
walk('src');walk('e2e');check('vite.config.ts');check('playwright.config.ts');
console.log(`${files} TS/TSX files parsed, ${errors} syntax errors. This does not replace TypeScript type checking.`);process.exitCode=errors?1:0;
