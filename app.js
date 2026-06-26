/* Take Back Control — shared behavior.
   Runs only the parts whose elements exist on the current page.
   No data ever leaves the device: checklist and log live in this browser only. */
(function(){
  "use strict";
  var mem = {};
  var store = {
    get:function(k){ try{return localStorage.getItem(k);}catch(e){return (k in mem)?mem[k]:null;} },
    set:function(k,v){ try{localStorage.setItem(k,v);}catch(e){mem[k]=v;} },
    del:function(k){ try{localStorage.removeItem(k);}catch(e){delete mem[k];} }
  };
  function esc(t){ var d=document.createElement('div'); d.textContent=t==null?'':String(t); return d.innerHTML; }

  // Namespaced per page so /leaked and /shared keep separate progress.
  var ns = (document.body.getAttribute('data-page') || 'page');
  var CK = 'tbc_'+ns+'_checks', LK = 'tbc_'+ns+'_log';

  // ---- Checklist ----
  var checklist = document.getElementById('checklist');
  if(checklist){
    var boxes = Array.prototype.slice.call(checklist.querySelectorAll('input[type=checkbox]'));
    var bar = document.getElementById('bar');
    var ptext = document.getElementById('ptext');
    var paint = function(){
      var done=0;
      boxes.forEach(function(b){ var li=b.closest('li'); if(b.checked){done++;li.classList.add('done');}else{li.classList.remove('done');} });
      if(bar) bar.style.width=(done/boxes.length*100)+'%';
      if(ptext) ptext.textContent=done+' of '+boxes.length+' done';
    };
    var saved = store.get(CK);
    if(saved){ try{ var s=JSON.parse(saved); boxes.forEach(function(b){ if(s[b.id]) b.checked=true; }); }catch(e){} }
    paint();
    boxes.forEach(function(b){ b.addEventListener('change',function(){
      var s={}; boxes.forEach(function(x){ s[x.id]=x.checked; });
      store.set(CK, JSON.stringify(s)); paint();
    }); });
  }

  // ---- Evidence log ----
  var entriesEl = document.getElementById('entries');
  if(entriesEl){
    var emptyEl=document.getElementById('empty');
    var fUrl=document.getElementById('f-url'), fWhere=document.getElementById('f-where'), fStatus=document.getElementById('f-status');
    var log=[]; var s2=store.get(LK); if(s2){ try{ log=JSON.parse(s2)||[]; }catch(e){ log=[]; } }
    var saveLog=function(){ store.set(LK, JSON.stringify(log)); };
    var render=function(){
      entriesEl.innerHTML='';
      if(emptyEl) emptyEl.style.display=log.length?'none':'block';
      log.forEach(function(item,i){
        var li=document.createElement('li');
        li.innerHTML='<div class="e-main"><div class="e-url">'+esc(item.url)+'</div>'+
          '<div class="e-sub">'+esc(item.where||'not yet reported')+' \u00b7 '+esc(item.date)+'</div></div>'+
          '<div style="display:flex;align-items:center;gap:8px">'+
          '<span class="e-status">'+esc(item.status)+'</span>'+
          '<button class="x" title="Remove" aria-label="Remove entry">\u00d7</button></div>';
        li.querySelector('.x').addEventListener('click',function(){ log.splice(i,1); saveLog(); render(); });
        entriesEl.appendChild(li);
      });
    };
    render();
    var add=function(){
      var url=fUrl.value.trim(); if(!url){ fUrl.focus(); return; }
      var d=new Date();
      var date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      log.unshift({url:url,where:fWhere.value.trim(),status:fStatus.value,date:date});
      saveLog(); render(); fUrl.value=''; fWhere.value=''; fStatus.value=fStatus.options[0].value; fUrl.focus();
    };
    var addBtn=document.getElementById('add'); if(addBtn) addBtn.addEventListener('click',add);
    [fUrl,fWhere].forEach(function(el){ if(el) el.addEventListener('keydown',function(e){ if(e.key==='Enter') add(); }); });
    var exp=document.getElementById('export');
    if(exp) exp.addEventListener('click',function(){
      if(!log.length) return;
      var rows=[['URL','Reported to','Status','Date']];
      log.forEach(function(i){ rows.push([i.url,i.where||'',i.status,i.date]); });
      var csv=rows.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\r\n');
      var blob=new Blob([csv],{type:'text/csv'}); var a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='evidence-log.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    });
    var clr=document.getElementById('clearall');
    if(clr) clr.addEventListener('click',function(){
      if(confirm('Clear the checklist and the whole evidence log on this device? This cannot be undone.')){
        log=[]; saveLog(); render();
        if(checklist){ checklist.querySelectorAll('input[type=checkbox]').forEach(function(b){ b.checked=false; }); store.del(CK);
          var bar2=document.getElementById('bar'), pt=document.getElementById('ptext');
          if(bar2) bar2.style.width='0%'; if(pt) pt.textContent='0 of '+checklist.querySelectorAll('input').length+' done';
        }
      }
    });
  }

  // ---- Copy buttons ----
  Array.prototype.slice.call(document.querySelectorAll('.copy')).forEach(function(btn){
    btn.addEventListener('click',function(){
      var pre=document.getElementById(btn.getAttribute('data-t'));
      var text=pre?pre.textContent:''; var label=btn.textContent;
      var ok=function(){ btn.textContent='Copied \u2713'; setTimeout(function(){ btn.textContent=label; },1600); };
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(ok).catch(fb); } else { fb(); }
      function fb(){ var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');ok();}catch(e){} document.body.removeChild(ta); }
    });
  });
})();
