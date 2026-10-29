(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const stage=$('#stage'), telas=$$('.tela'), wipe=$('#wipe'), prog=$('#prog i'), cont=$('#cont'), capTxt=$('#capTxt');
  // ?pdf=1: cada tela já no estado final, sem transição nem temporizador (usado para gerar o PDF)
  const modoPdf=new URLSearchParams(location.search).has('pdf');
  if(modoPdf)document.documentElement.classList.add('pdf');
  // no PDF, a tela com botões vira uma página por botão (o gerador clica cada um): fica o layout da tela, não o resumo
  if(modoPdf)telas.forEach(t=>{if(t.dataset.estados)t.classList.add('estados');});
  const reduz=matchMedia('(prefers-reduced-motion: reduce)').matches||modoPdf;
  let atual=0, escalaAtual=1, emTransicao=false, pendente=null;
  const total=telas.length, dd=n=>String(n).padStart(2,'0');
  const autos={};let autoAtivos=[];

  /* miolo: o conteúdo de cada tela encolhe por igual, centralizado; o que tem a classe sangra fica na tela inteira */
  telas.forEach(t=>{
    const m=document.createElement('div');m.className='miolo';
    [...t.childNodes].forEach(n=>{if(!(n.nodeType===1&&n.classList.contains('sangra')))m.appendChild(n);});
    t.appendChild(m);
  });
  // sequência: cada filho ganha a sua posição para entrar um depois do outro
  $$('[data-seq]').forEach(p=>[...p.children].forEach((c,i)=>c.style.setProperty('--i',i)));

  /* palco */
  function escala(){escalaAtual=Math.min(innerWidth/1600,innerHeight/900);stage.style.transform='scale('+escalaAtual+')';}
  addEventListener('resize',escala);escala();

  /* contadores */
  function contar(el){
    const alvo=parseFloat(el.dataset.conta),casas=+el.dataset.casas||0,t0=performance.now(),dur=1300;
    const fmt=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas});
    if(reduz){el.textContent=fmt.format(alvo);return;}
    (function passo(t){const p=Math.min(1,(t-t0)/dur),v=alvo*(1-Math.pow(1-p,3));el.textContent=fmt.format(v);if(p<1)requestAnimationFrame(passo);})(t0);
  }

  /* navegação */
  const aoEntrar={};
  function aplicar(n){
    telas[atual].querySelectorAll('video').forEach(v=>v.pause());
    pararAutos();
    telas[atual].classList.remove('ativa');
    atual=n;const t=telas[n];
    t.classList.add('ativa');
    stage.className='t-'+({claro:'claro',claro2:'claro',escuro:'escuro',lime:'lime',foto:'foto'}[t.dataset.tema]||'escuro')+(n===0?' capa':'');
    capTxt.textContent=t.dataset.cap||'';
    prog.style.width=((n+1)/total*100)+'%';
    cont.textContent=dd(n+1)+' / '+dd(total);
    $('#ant').disabled=n===0;$('#prox').disabled=n===total-1;
    t.querySelectorAll('[data-conta]').forEach(contar);
    $$('#sumLista button').forEach(b=>b.classList.toggle('atual',+b.dataset.i===n));
    history.replaceState(null,'','#'+(n+1));
    const fn=aoEntrar[t.classList[1]];if(fn)fn(t);
    iniciarAutos(t);
  }
  function ir(n){
    n=Math.max(0,Math.min(total-1,n));
    if(emTransicao){pendente=n;return;}
    if(n===atual)return;
    if(reduz||!wipe.animate){aplicar(n);return;}
    const dir=n>atual?1:-1, paraLime=telas[n].dataset.tema==='lime';
    wipe.classList.toggle('ink',paraLime);
    // a transição mostra o logo da Arcor
    const de=dir>0?'inset(0 0 0 100%)':'inset(0 100% 0 0)', meio='inset(0 0 0 0)', para=dir>0?'inset(0 100% 0 0)':'inset(0 0 0 100%)';
    emTransicao=true;
    const ease='cubic-bezier(.7,0,.3,1)';
    // se a aba fica em segundo plano a animação para no meio: o relógio garante que a troca termina
    const uma=f=>{let feito=false;return()=>{if(!feito){feito=true;f();}};};
    const sai=uma(()=>{emTransicao=false;if(pendente!==null){const p=pendente;pendente=null;ir(p);}});
    const entra=uma(()=>{
      aplicar(n);
      const b=wipe.animate([{clipPath:meio},{clipPath:para}],{duration:420,easing:ease,fill:'forwards'});
      b.onfinish=sai;setTimeout(()=>{b.finish();sai();},900);
    });
    const a=wipe.animate([{clipPath:de},{clipPath:meio}],{duration:360,easing:ease,fill:'forwards'});
    a.onfinish=entra;setTimeout(()=>{a.finish();entra();},800);
  }
  addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10);if(!isNaN(n))ir(n-1);});
  $('#ant').addEventListener('click',e=>{e.stopPropagation();ir(atual-1);});
  $('#prox').addEventListener('click',e=>{e.stopPropagation();ir(atual+1);});
  // data-ir aponta para o id da tela (ou o número dela, contado de 1)
  const indice=v=>/^\d+$/.test(v)?+v-1:telas.findIndex(t=>t.id===v);
  $$('[data-ir]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();ir(indice(b.dataset.ir));}));

  /* sumário agrupado por capítulo */
  const sum=$('#sumario'), lista=$('#sumLista');
  let capAnt='';
  telas.forEach((t,i)=>{
    const c=(t.dataset.cap||'').match(/^\((\d+)\) (.*)$/);
    if(c&&c[1]!==capAnt){capAnt=c[1];const h=document.createElement('li');h.className='cap-s';h.textContent=c[1]+' · '+c[2];lista.appendChild(h);}
    if(t.classList.contains('s-cap'))return;
    const li=document.createElement('li'), b=document.createElement('button');
    b.innerHTML='<b>'+dd(i+1)+'</b>';b.append(t.dataset.titulo);b.dataset.cursor='Ir';b.dataset.i=i;
    b.addEventListener('click',e=>{e.stopPropagation();fecharSum();setTimeout(()=>ir(i),60);});
    li.appendChild(b);lista.appendChild(li);
  });
  function abrirSum(){sum.classList.add('aberto');}
  function fecharSum(){sum.classList.remove('aberto');}
  $$('[data-sumario]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();abrirSum();}));
  $('.fechar',sum).addEventListener('click',e=>{e.stopPropagation();fecharSum();});

  /* teclado, clique e toque */
  addEventListener('keydown',e=>{
    if(caixa.classList.contains('aberta')){if(e.key==='Escape')fecharCaixa();return;}
    if(sum.classList.contains('aberto')){if(e.key==='Escape')fecharSum();return;}
    if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();ir(atual+1);}
    else if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();ir(atual-1);}
    else if(e.key==='Home')ir(0);else if(e.key==='End')ir(total-1);
    else if(e.key==='m'||e.key==='M')sum.classList.contains('aberto')?fecharSum():abrirSum();
  });
  const INTERATIVO='a,button,input,.amplia,[data-cursor],#sumario,.ct,.dentro li,.trilha-cap span';
  $('#wrap').addEventListener('click',e=>{
    if(e.target.closest(INTERATIVO))return;
    if(sum.classList.contains('aberto'))return;
    ir(e.clientX>innerWidth/2?atual+1:atual-1);
  });
  let x0=null,y0=null;
  addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  addEventListener('touchend',e=>{
    if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)&&!e.target.closest('model-viewer'))ir(dx<0?atual+1:atual-1);x0=null;
  });

  /* lightbox */
  const caixa=$('#caixa');
  function fecharCaixa(){caixa.classList.remove('aberta');}
  function abrirCaixa(img,leg){$('#cxImg').src=img;$('#cxTxt').textContent=leg||'';caixa.classList.add('aberta');}
  $$('[data-amplia]').forEach(el=>el.addEventListener('click',e=>{
    e.stopPropagation();$('#cxImg').src=el.dataset.amplia;$('#cxTxt').textContent=el.dataset.legenda||'';caixa.classList.add('aberta');
  }));
  caixa.addEventListener('click',e=>{if(e.target===caixa||e.target.closest('.fechar'))fecharCaixa();});

  /* cursor em dois tons e luz que segue o mouse */
  const cur=$('#cursor'),anel=$('#anel'),anelTxt=$('#anelTxt');
  let mx=innerWidth/2,my=innerHeight/2,ax=mx,ay=my;
  addEventListener('mousemove',e=>{
    document.body.classList.add('tem-mouse');mx=e.clientX;my=e.clientY;
    cur.style.transform='translate('+mx+'px,'+my+'px)';
    const alvo=e.target.closest('[data-cursor],a,button,.amplia');
    anel.classList.toggle('sobre',!!alvo);
    anelTxt.textContent=alvo?(alvo.dataset.cursor||'Ir'):'';
    const r=stage.getBoundingClientRect();
    stage.style.setProperty('--mx',((mx-r.left)/escalaAtual)+'px');stage.style.setProperty('--my',((my-r.top)/escalaAtual)+'px');
  },{passive:true});
  (function segue(){ax+=(mx-ax)*.2;ay+=(my-ay)*.2;anel.style.transform='translate('+ax+'px,'+ay+'px)';requestAnimationFrame(segue);})();
  addEventListener('mousedown',()=>document.body.classList.add('clicou'));
  addEventListener('mouseup',()=>document.body.classList.remove('clicou'));
  addEventListener('touchstart',()=>document.body.classList.remove('tem-mouse'),{passive:true});
  $('#verAssim').addEventListener('click',()=>document.body.classList.add('forcar'));

  /* capas de capítulo: trilha e itens levam à tela */
  telas.filter(t=>t.classList.contains('s-cap')).forEach(c=>{
    const n=c.dataset.capitulo,i0=telas.indexOf(c);
    c.querySelectorAll('.trilha-cap span').forEach(s=>{
      s.classList.toggle('on',s.dataset.c===n);s.classList.toggle('feito',s.dataset.c<n);s.dataset.cursor='Ir';
      s.addEventListener('click',e=>{e.stopPropagation();const alvo=telas.findIndex(t=>(t.dataset.cap||'').startsWith('('+s.dataset.c+')'));if(alvo>=0)ir(alvo);});
    });
    c.querySelectorAll('.dentro li').forEach((li,k)=>{li.dataset.cursor='Ir';li.addEventListener('click',e=>{e.stopPropagation();ir(i0+1+k);});});
  });

  /* galeria: marca, peso e ficha de cada peça */
  const COD={rocklets:'RK',tortuguita:'TG','7belo':'7B','butter-toffees':'BT'};
  const MARCAS=window.MARCAS||[];
  const cod=(m,p)=>COD[m.id]+'-'+String(p.n).padStart(2,'0');
  const src=(m,p,peq)=>'assets/pecas/'+m.id+'/'+p.arq+(peq?'-p':'')+'.webp';
  const fmt=n=>new Intl.NumberFormat('pt-BR').format(n);
  (function(){
    const bm=$('#galMarcas'),bp=$('#galPesos'),grade=$('#galGrade'),ficha=$('#galFicha');
    if(!bm)return;
    let mi=0,peso='todas';
    MARCAS.forEach((m,i)=>{const b=document.createElement('button');b.textContent=m.nome+' · '+m.pecas.length;b.dataset.cursor='Ver';if(!i)b.classList.add('on');
      b.addEventListener('click',e=>{e.stopPropagation();mi=i;$$('button',bm).forEach(x=>x.classList.toggle('on',x===b));desenha();});bm.appendChild(b);});
    ['todas','leve','média','pesada'].forEach((p,i)=>{const b=document.createElement('button');b.textContent=p==='todas'?'Todas':p==='leve'?'Leves':p==='média'?'Médias':'Pesadas';b.dataset.cursor='Filtrar';if(!i)b.classList.add('on');
      b.addEventListener('click',e=>{e.stopPropagation();peso=p;$$('button',bp).forEach(x=>x.classList.toggle('on',x===b));desenha();});bp.appendChild(b);});
    function mostra(m,p,bt){
      $$('button',grade).forEach(x=>x.classList.toggle('on',x===bt));
      ficha.innerHTML='<figure data-cursor="Ampliar"><img alt=""></figure><div class="dados"><span class="cod"></span><b></b><p></p><dl><div><dt>Peso</dt><dd class="pe"></dd></div><div><dt>Medida</dt><dd class="me"></dd></div><div><dt>Material</dt><dd class="ma"></dd></div><div><dt>Tiragem</dt><dd class="ti"></dd></div></dl></div>';
      $('img',ficha).src=src(m,p);$('img',ficha).alt=p.nome+' '+m.nome;
      $('.cod',ficha).textContent=cod(m,p)+' · '+m.nome;$('b',ficha).textContent=p.nome;$('p',ficha).textContent=p.funcao;
      $('.pe',ficha).textContent=p.peso;$('.me',ficha).textContent=p.medida;$('.ma',ficha).textContent=p.material;$('.ti',ficha).textContent=fmt(p.tiragem)+' un.';
      $('figure',ficha).addEventListener('click',e=>{e.stopPropagation();abrirCaixa(src(m,p),cod(m,p)+' · '+p.nome+' '+m.nome+' · '+p.medida+' · '+p.material);});
    }
    function desenha(){
      const m=MARCAS[mi];grade.innerHTML='';
      const lista=m.pecas.filter(p=>peso==='todas'||p.peso===peso);
      lista.forEach((p,k)=>{const b=document.createElement('button');b.dataset.cursor='Ver';b.style.animationDelay=(k*.03)+'s';
        b.innerHTML='<img alt="" loading="lazy"><span></span>';$('img',b).src=src(m,p,1);$('span',b).textContent=cod(m,p)+' · '+p.nome;
        b.addEventListener('click',e=>{e.stopPropagation();mostra(m,p,b);});grade.appendChild(b);});
      if(lista.length)mostra(m,lista[0],grade.firstChild);
    }
    desenha();
    // no PDF, as 55 de uma vez
    const todas=$('#galTodas');
    MARCAS.forEach(m=>m.pecas.forEach(p=>{const d=document.createElement('div');d.innerHTML='<img alt=""><span></span>';$('img',d).src=src(m,p,1);$('span',d).textContent=cod(m,p);todas.appendChild(d);}));
    roteiro('s-gal',{itens:()=>$$('button',bm),ms:()=>7000});
  })();

  /* a mesma peça nas quatro marcas */
  (function(){
    const tipos=$('#cmpTipos'),grade=$('#cmpGrade'),txt=$('#cmpTxt');
    if(!tipos)return;
    const COR={rocklets:'#E52421',tortuguita:'#FFD200','7belo':'#FF4D7A','butter-toffees':'#D9B26A'};
    const T=[['display-balcao','Display de balcão','O mesmo display de caixa de 40 cm: o pirulito em volume na 7Belo, a tartaruga recortada na Tortuguita, a espiral na Rocklets e o dourado na Butter Toffees.'],
      ['wobbler','Wobbler','A mesma haste e o mesmo tamanho de 15 cm. O que muda é o recorte, que é sempre o herói da marca.'],
      ['ponta-gondola','Ponta de gôndola','Mesma estrutura de 1 × 2 m em MDF, mesma lógica de header recortado e prateleiras abastecidas.'],
      ['totem','Totem','Mesma base de 60 × 180 cm. A silhueta recortada é o que faz o totem ser reconhecido do outro lado da loja.']];
    T.forEach(([id,nome,t],i)=>{const b=document.createElement('button');b.textContent=nome;b.dataset.cursor='Ver';if(!i)b.classList.add('on');
      b.addEventListener('click',e=>{e.stopPropagation();$$('button',tipos).forEach(x=>x.classList.toggle('on',x===b));desenha(id,t);});tipos.appendChild(b);});
    function desenha(id,t){
      grade.innerHTML='';
      MARCAS.forEach(m=>{const p=m.pecas.find(x=>x.id===id);if(!p)return;
        const f=document.createElement('figure');f.className='amplia';f.dataset.cursor='Ampliar';f.style.setProperty('--cor',COR[m.id]);
        f.innerHTML='<img alt=""><span class="etq"><b></b></span>';$('img',f).src=src(m,p);$('b',f).textContent=cod(m,p);$('.etq',f).append(m.nome);
        f.addEventListener('click',e=>{e.stopPropagation();abrirCaixa(src(m,p),cod(m,p)+' · '+p.nome+' '+m.nome);});grade.appendChild(f);});
      txt.textContent=t;
    }
    desenha(T[0][0],T[0][2]);
    roteiro('s-cmp',{itens:()=>$$('button',tipos),ms:()=>6500});
  })();

  /* temporizador: os botões abrem sozinhos, um de cada vez, com tempo para ler;
     o primeiro clique de verdade da pessoa na tela para tudo até ela sair e voltar */
  function roteiro(cls,cfg){(autos[cls]=autos[cls]||[]).push(cfg);}
  const leitura=txt=>Math.max(4500,Math.min(12000,3000+String(txt||'').replace(/\s+/g,' ').trim().length*45));
  function pararAutos(){autoAtivos.forEach(clearTimeout);autoAtivos=[];$$('.relogio-auto').forEach(r=>r.remove());}
  function iniciarAutos(t){
    if(modoPdf)return;
    (autos[t.classList[1]]||[]).forEach(cfg=>{
      const itens=cfg.itens(),n=itens.length;if(!n)return;
      const ms=k=>cfg.ms?cfg.ms(k):leitura(cfg.texto?cfg.texto(k):itens[k].textContent)+(cfg.extra||0);
      let i=Math.max(0,itens.findIndex(x=>x.matches('.on')||x.parentElement.classList.contains('on')));
      function relogio(k,dur){
        $$('.relogio-auto',t).forEach(r=>r.remove());
        const r=document.createElement('i');r.className='relogio-auto';itens[k].appendChild(r);
        r.style.transitionDuration=dur+'ms';void r.offsetWidth;r.classList.add('corre');
      }
      function passo(){i=(i+1)%n;itens[i].click();const d=ms(i);relogio(i,d);autoAtivos.push(setTimeout(passo,d));}
      const d=ms(i);relogio(i,d);autoAtivos.push(setTimeout(passo,d));
    });
  }
  stage.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.target.closest('.tela.ativa'))pararAutos();},true);

  /* início */
  const h=parseInt(location.hash.slice(1),10);
  const n0=isNaN(h)?0:Math.max(0,Math.min(total-1,h-1));
  telas.forEach(t=>t.classList.remove('ativa'));
  atual=n0===0?1:0;aplicar(n0);
  telas.forEach((t,i)=>{if(i!==n0)t.classList.remove('ativa');});
})();
