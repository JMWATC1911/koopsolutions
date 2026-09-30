/* ============ UI ============ */
(function(){
  var btn=document.getElementById('menuBtn'),panel=document.getElementById('menuPanel');
  function setMenu(open){
    panel.classList.toggle('open',open);
    btn.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
  }
  btn.addEventListener('click',function(e){e.stopPropagation();setMenu(!panel.classList.contains('open'));});
  document.addEventListener('click',function(e){
    if(panel.classList.contains('open')&&!panel.contains(e.target)&&!btn.contains(e.target))setMenu(false);
  });
  panel.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setMenu(false);});});

  var toTop=document.getElementById('toTop');
  toTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
  window.addEventListener('scroll',function(){toTop.classList.toggle('show',window.scrollY>400);},{passive:true});

  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
})();

/* Contact form: send in the background and show an on-page thank-you */
(function(){
  var form=document.getElementById('contactForm');
  if(!form||!window.fetch)return;
  var thanks=document.getElementById('formThanks'),err=document.getElementById('formError'),
      label=document.getElementById('submitLabel'),btn=form.querySelector('button[type="submit"]');
  form.addEventListener('submit',function(e){
    if(!form.checkValidity())return;
    e.preventDefault();
    err.hidden=true;btn.disabled=true;label.textContent='Sending\u2026';
    fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}})
      .then(function(r){
        if(!r.ok)throw new Error('send failed');
        form.reset();form.hidden=true;thanks.hidden=false;thanks.classList.add('in');thanks.focus();
      })
      .catch(function(){err.hidden=false;})
      .then(function(){btn.disabled=false;label.textContent='Send Message';});
  });
  document.getElementById('sendAnother').addEventListener('click',function(){
    thanks.hidden=true;form.hidden=false;form.querySelector('input').focus();
  });
})();
