(()=>{
  const RAW=/^https:\/\/raw\.githubusercontent\.com\/Leo556677\/dr-olano-web\/[^/]+\/(.+)$/i;
  const toPages=(src)=>{const m=String(src||'').match(RAW);return m?`https://leo556677.github.io/dr-olano-web/${m[1]}`:src};
  function fix(root=document){
    const list=[];
    if(root.nodeType===1&&root.matches?.('.visual img')) list.push(root);
    root.querySelectorAll?.('.visual img').forEach(img=>list.push(img));
    list.forEach(img=>{
      if(img.dataset.guideFix==='1') return;
      img.dataset.guideFix='1';
      const original=img.getAttribute('src')||'';
      const pages=toPages(original);
      img.loading='eager';
      img.decoding='async';
      if(pages&&pages!==original){img.dataset.rawFallback=original;img.src=pages}
      img.addEventListener('error',()=>{
        const fb=img.dataset.rawFallback||'';
        if(fb){img.dataset.rawFallback='';img.src=fb;return}
        img.closest('.visual')?.classList.add('image-error');
      });
      img.addEventListener('load',()=>img.closest('.visual')?.classList.remove('image-error'));
    });
  }
  const obs=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)fix(n)})));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>fix());else fix();
})();
