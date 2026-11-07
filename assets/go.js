// Shared redirect for /go/full and /go/series: reads assets/links.json, shows the video, then opens it.
(function(){
  var kind=document.body.dataset.kind;
  fetch("../../assets/links.json",{cache:"no-cache"}).then(function(r){return r.json();}).then(function(j){
    var v=j[kind]||{url:j.channel,title:"TheRealRealtor Sam Surya"};
    document.getElementById("t").textContent=v.title; var a=document.getElementById("go"); a.href=v.url;
    setTimeout(function(){ location.href=v.url; },1800);
  }).catch(function(){ location.href="https://www.youtube.com/@SamtheRealRealtor"; });
})();
