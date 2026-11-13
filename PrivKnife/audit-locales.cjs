const fs=require('fs'),ts=require('typescript');
function read(lang){let code=ts.transpileModule(fs.readFileSync('src/app/core/i18n/locales/'+lang+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;let e={};new Function('exports',code)(e);return e[lang]}
function flat(o,p='',r={}){for(const[k,v]of Object.entries(o)) typeof v==='object'?flat(v,p+k+'.',r):r[p+k]=v;return r}
const en=flat(read('en')),es=flat(read('es'));fs.writeFileSync('../audit-evidence/locales.json',JSON.stringify({englishKeys:Object.keys(en).length,spanishKeys:Object.keys(es).length,missing:Object.keys(en).filter(k=>!(k in es)),identical:Object.keys(en).filter(k=>en[k]===es[k]).map(k=>({key:k,text:en[k]}))},null,2));
