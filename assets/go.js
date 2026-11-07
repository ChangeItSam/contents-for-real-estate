// Shared page for /go/full and /go/series: reads assets/links.json.
// full: shows the latest full video, then opens it. series: a playlist if set, else the list of all episodes.
(function(){
  var kind=document.body.dataset.kind;
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  fetch("../../assets/links.json",{cache:"no-cache"}).then(function(r){return r.json();}).then(function(j){
    if(kind==="series"){
      if(j.series_playlist){ document.getElementById("t").textContent="All episodes, in order."; var a=document.getElementById("go"); a.href=j.series_playlist; a.textContent="▶️ Play all episodes"; setTimeout(function(){location.href=j.series_playlist;},1800); return; }
      var L=(j.series_list||[]); if(!L.length&&j.series) L=[{id:"",title:j.series.title,url:j.series.url}];
      if(L.length>1){
        document.getElementById("t").textContent=L.length+" episodes, in order. Tap one to watch.";
        document.getElementById("go").style.display="none";
        document.getElementById("list").innerHTML=L.map(function(v,i){ var u=v.url||("https://youtu.be/"+v.id); return '<a class="ep" href="'+esc(u)+'"><b>'+(i+1)+'</b><span>'+esc(v.title)+'</span></a>'; }).join("");
        return;
      }
      var v=L[0]; var u=v.url||("https://youtu.be/"+v.id);
      document.getElementById("t").textContent=v.title; document.getElementById("go").href=u; setTimeout(function(){location.href=u;},1800); return;
    }
    var f=j.full||{url:j.channel,title:"TheRealRealtor Sam Surya"};
    document.getElementById("t").textContent=f.title; document.getElementById("go").href=f.url;
    setTimeout(function(){ location.href=f.url; },1800);
  }).catch(function(){ location.href="https://www.youtube.com/@SamtheRealRealtor"; });
})();
