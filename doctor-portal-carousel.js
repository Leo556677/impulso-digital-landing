(()=>{
  const shots=document.getElementById('shots');
  if(!shots)return;

  let hint=document.getElementById('shotsHint');
  if(!hint){
    hint=document.createElement('div');
    hint.id='shotsHint';
    shots.parentNode.insertBefore(hint,shots);
  }

  let raf=0;
  function sync(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const cards=[...shots.children].filter(x=>x.classList&&x.classList.contains('shot'));
      if(!cards.length){
        hint.style.display='none';
        return;
      }

      hint.style.display='flex';
      const expected=`<b>${cards.length} tomas</b><span class="arrow">Desliza ← →</span>`;
      if(hint.innerHTML!==expected)hint.innerHTML=expected;

      cards.forEach((card,i)=>{
        let c=card.querySelector('.shotcount');
        if(!c){
          c=document.createElement('span');
          c.className='shotcount';
          card.querySelector('.shothead')?.appendChild(c);
        }
        const count=`${i+1}/${cards.length}`;
        if(c.textContent!==count)c.textContent=count;

        const b=card.querySelector('.sleft b');
        if(b){
          const br=/^Recurso|^B-roll/i.test(b.textContent||'');
          const label=`${br?'B-roll':'Toma'} ${i+1}`;
          if(b.textContent!==label)b.textContent=label;
        }
      });
    });
  }

  new MutationObserver(sync).observe(shots,{childList:true});
  sync();
})();
