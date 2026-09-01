'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function fmt(v: any){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0); }

interface ClienteFiel { id: string; nome: string; pontosFidelidade: number; totalGasto: any; ultimaVisita: string | null; tag: string | null; }

function tagCor(tag: string): string {
  if(tag==='VIP') return '#EAB308'; if(tag==='frequente') return '#22C55E'; return '#71717A';
}

export default function FidelidadePage() {
  var [dados, setDados] = useState<ClienteFiel[]>([]);
  var [segmentos, setSegmentos] = useState<any[]>([]);
  var [aba, setAba] = useState('ranking');

  useEffect(function(){
    api.get('/fidelidade/ranking/empresa').then(function(r){ setDados(r.data); }).catch(function(){});
    api.get('/fidelidade/segmentar/empresa').then(function(r){ setSegmentos(r.data); }).catch(function(){});
  }, []);

  return React.createElement('div', null,
    React.createElement('h2', {style:{color:'#FAFAFA',fontSize:20,fontWeight:'bold'}}, 'Fidelidade'),
    React.createElement('p', {style:{color:'#71717A',fontSize:13,marginTop:4}}, 'Programa de pontos e segmentacao de clientes'),

    React.createElement('div', {style:{display:'flex',gap:8,marginTop:24}},
      React.createElement('button', {onClick:function(){setAba('ranking');},style:{padding:'8px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:'bold',cursor:'pointer',background:aba==='ranking'?'#6366F1':'#111116',color:aba==='ranking'?'#FAFAFA':'#A1A1AA'}}, 'Ranking'),
      React.createElement('button', {onClick:function(){setAba('segmentos');},style:{padding:'8px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:'bold',cursor:'pointer',background:aba==='segmentos'?'#6366F1':'#111116',color:aba==='segmentos'?'#FAFAFA':'#A1A1AA'}}, 'Segmentos')
    ),

    aba==='ranking' && React.createElement('div', {style:{marginTop:24,overflow:'auto',borderRadius:12,background:'#111116',border:'1px solid rgba(255,255,255,0.06)'}},
      React.createElement('table', {style:{width:'100%',fontSize:13,textAlign:'left'}},
        React.createElement('thead', null, React.createElement('tr', {style:{borderBottom:'1px solid rgba(255,255,255,0.06)'}},
          ['#','Cliente','Pontos','Gasto','Ultima Visita','Tag'].map(function(h,i){ return React.createElement('th', {key:i,style:{padding:'12px 16px',color:'#71717A',fontWeight:'500'}}, h); })
        )),
        React.createElement('tbody', null, dados.map(function(c,i){ return React.createElement('tr', {key:c.id,style:{borderBottom:'1px solid rgba(255,255,255,0.04)'}},
          React.createElement('td', {style:{padding:'10px 16px',color:'#A1A1AA'}}, i+1),
          React.createElement('td', {style:{padding:'10px 16px',color:'#FAFAFA',fontWeight:'500'}}, c.nome),
          React.createElement('td', {style:{padding:'10px 16px',color:'#818CF8',fontWeight:'bold'}}, c.pontosFidelidade),
          React.createElement('td', {style:{padding:'10px 16px',color:'#22C55E'}}, fmt(c.totalGasto)),
          React.createElement('td', {style:{padding:'10px 16px',color:'#71717A'}}, c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('pt-BR') : '-'),
          React.createElement('td', {style:{padding:'10px 16px'}}, React.createElement('span', {style:{padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:'bold',color:tagCor(c.tag||''),background:'rgba(255,255,255,0.04)'}}, c.tag||'-'))
        ); }))
      )
    ),

    aba==='segmentos' && React.createElement('div', {style:{marginTop:24}},
      ['ativo','em_risco','inativo','novo'].map(function(seg){
        var items = segmentos.filter(function(s:any){ return s.segmento===seg; });
        return React.createElement('div', {key:seg,style:{marginBottom:24}},
          React.createElement('h3', {style:{color:'#FAFAFA',fontSize:15,fontWeight:'bold',marginBottom:12}},
            seg==='ativo' ? '\u{1F7E2} Ativos ('+items.length+')' :
            seg==='em_risco' ? '\u{1F7E1} Em Risco ('+items.length+')' :
            seg==='inativo' ? '\u{1F534} Inativos ('+items.length+')' :
            '\u{1F535} Novos ('+items.length+')'
          ),
          React.createElement('div', {style:{display:'flex',flexWrap:'wrap',gap:8}}, items.map(function(c:any){ return React.createElement('div', {key:c.id,style:{padding:'8px 16px',borderRadius:8,background:'#111116',border:'1px solid rgba(255,255,255,0.06)',color:'#FAFAFA',fontSize:13}}, c.nome+' \u00B7 '+fmt(c.gasto)); }))
        );
      })
    )
  );
}
