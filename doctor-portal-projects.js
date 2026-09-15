/* Project identity + persistent private access. The rich recording UX stays owned by doctor-portal-ux7.js. */
(()=>{
  'use strict';
  const ACCESS_KEY='do_portal_access_v1';
  try{
    const u=new URL(location.href),incoming=u.searchParams.get('token'),saved=localStorage.getItem(ACCESS_KEY)||'';
    if(!incoming&&saved){u.searchParams.set('token',saved);location.replace(u.toString());return;}
    if(incoming){
      let tries=0;
      const remember=()=>{
        if(typeof P!=='undefined'&&P?.negocio){
          localStorage.setItem(ACCESS_KEY,incoming);
          u.searchParams.delete('token');
          history.replaceState(null,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
          return;
        }
        if(++tries<50)setTimeout(remember,200);
      };
      setTimeout(remember,0);
    }
  }catch{}

  const M=window.RecordingModel;
  if(typeof renderVideos==='function'){
    const richRenderVideos=renderVideos;
    renderVideos=function(items){
      richRenderVideos(items);
      document.querySelectorAll('#videos .jsV').forEach((el,i)=>{
        const label=M?.projectLabel?.(items[i]?.pieza)||'';
        if(!label||el.querySelector('.project-card-label'))return;
        const title=el.querySelector('h3');
        const tag=document.createElement('p');
        tag.className='project-card-label';
        tag.textContent=label;
        title?.before(tag);
      });
    };
  }
})();
