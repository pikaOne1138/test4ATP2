import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
const config=JSON.parse(readFileSync('site.config.json','utf8'));
const base=process.env.ASTRO_BASE_PATH||'/';
const out='qa-artifacts/'+(base==='/'?'root':'subpath');mkdirSync(out,{recursive:true});
const origin='http://127.0.0.1:4329';
const server=spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port','4329'],{stdio:'ignore'});
let browser;const rows=[];const failures=[];
try{
 let ready=false;
 for(let n=0;n<60;n++){try{if((await fetch(origin+base)).ok){ready=true;break}}catch{}await pause(500)}
 if(!ready)throw Error('preview process not ready');
 browser=await chromium.launch();
 const paths=['',...config.navigation.map(x=>x.id+'/'),...(config.kind==='knowledge'?['articles/qa-observation/']:[])];
 for(const width of [1440,1280,768,390]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  for(const route of paths){
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(origin+base+route,{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   const audit=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth+2,
    brokenImages:[...document.images].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src),
    noindex:document.head.querySelector('meta[name="robots"]')?.content.includes('noindex'),
    metadataInHead:!!document.head.querySelector('meta[name="description"]')&&!!document.head.querySelector('link[rel="canonical"]'),
    fakeLinks:[...document.querySelectorAll('a')].filter(x=>!x.getAttribute('href')||x.getAttribute('href')==='#').map(x=>x.textContent),
    links:[...document.querySelectorAll('a[href],img[src],link[rel="stylesheet"]')].map(x=>x.href||x.src).filter(Boolean),
    nav:[...document.querySelectorAll('header nav a')].map(x=>({text:x.textContent,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})),
    minFont:Math.min(...[...document.querySelectorAll('body *')].filter(x=>x.childNodes.length&&[...x.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&x.getBoundingClientRect().height>0).map(x=>parseFloat(getComputedStyle(x).fontSize)))
   }));
   const badLinks=[];
   for(const href of new Set(audit.links)){
    const u=new URL(href);if(u.origin!==origin)continue;
    if(!u.pathname.startsWith(base)){badLinks.push({href,reason:'base path escaped'});continue}
    const r=await fetch(u);if(!r.ok)badLinks.push({href,status:r.status});
    if(u.hash&&u.pathname===new URL(page.url()).pathname){const id=decodeURIComponent(u.hash.slice(1));if(!await page.locator('[id='+JSON.stringify(id)+']').count())badLinks.push({href,reason:'missing anchor'})}
   }
   const row={width,route:base+route,status:response.status(),...audit,badLinks,errors};delete row.links;rows.push(row);
   if(row.status!==200||row.overflow||row.brokenImages.length||!row.noindex||!row.metadataInHead||row.minFont<12||row.fakeLinks.length||badLinks.length||errors.length)failures.push(row);
   await page.screenshot({path:out+'/'+config.layoutSlug+'-'+(route?route.replaceAll('/','-'):'home')+'-'+width+'.png',fullPage:true,animations:'disabled'});
   if(!route){
    await page.keyboard.press('Tab');const skip=await page.evaluate(()=>document.activeElement?.textContent?.trim());
    await page.keyboard.press('Enter');const focused=await page.evaluate(()=>document.activeElement?.id);
    if(skip!=='跳到主要內容'||focused!=='main')failures.push({width,route,keyboard:{skip,focused}});
   }
   if(route==='faq/'){
    const summary=page.locator('details summary').first();await summary.focus();await page.keyboard.press('Enter');
    if(!await page.locator('details').first().evaluate(x=>x.open))failures.push({width,route,reason:'FAQ keyboard did not open'});
   }
  }
  await page.close();
 }
 const rss=await(await fetch(origin+base+'rss.xml')).text();
 const sitemap=await(await fetch(origin+base+'sitemap.xml')).text();
 const robots=await(await fetch(origin+base+'robots.txt')).text();
 const feedItems=(rss.match(/<item>/g)||[]).length;
 const draftsExcluded=!rss.includes('qa-draft')&&!sitemap.includes('qa-draft')&&!existsSync('dist/articles/qa-draft/index.html');
 if(!draftsExcluded||feedItems!==(config.kind==='knowledge'?1:0)||!robots.includes('Disallow: /'))failures.push({seo:{feedItems,draftsExcluded,robots}});
 const report={repository:process.env.GITHUB_REPOSITORY,head:process.env.QA_HEAD_SHA,layout:config.layoutSlug,base,homepageScreenshotCount:4,rows,seo:{feedItems,draftsExcluded,robots},failures};
 writeFileSync(out+'/results.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({head:report.head,layout:report.layout,rows:rows.length,homepageScreenshots:4,failures:failures.length,seo:report.seo}));
 if(failures.length)process.exitCode=1;
}finally{await browser?.close();server.kill('SIGTERM')}
