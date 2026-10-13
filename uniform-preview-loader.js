/* Visible loading state and recovery for the isolated uniform viewer. */
(function(){
 const panel=document.createElement('aside');panel.id='uniformLoadStatus';panel.setAttribute('role','status');panel.style.cssText='position:fixed;top:10px;left:10px;right:10px;z-index:10001;padding:12px;background:#12263a;color:#fff;border:1px solid #6f8ca3;border-radius:8px;font:14px sans-serif';
 const message=document.createElement('span'),retry=document.createElement('button');retry.textContent='重新載入球衣';retry.style.cssText='margin-left:12px;padding:8px';retry.hidden=true;panel.append(message,retry);document.body.append(panel);message.textContent='正在載入人物與球衣素材…';
 let error='',started=Date.now();
 addEventListener('error',e=>{error=e.message||(e.target?.src?'素材載入失敗：'+e.target.src.split('/').pop():'頁面載入失敗');},true);
 addEventListener('unhandledrejection',e=>{error=String(e.reason||'素材載入失敗');});
 retry.onclick=()=>{const url=new URL(location.href);url.searchParams.set('reload',String(Date.now()));location.replace(url.href);};
 setInterval(()=>{
  const stage=document.querySelector('.broadcast-stage'),ready=stage?.dataset.characterModel==='makehuman-skinned'&&stage?.dataset.uniformNumber;
  if(ready&&!error){panel.hidden=true;return;}
  panel.hidden=false;const failure=error||window.CPBL_HUMAN_ERROR||window.CPBL_WEBGL_ERROR;
  if(failure){message.textContent='球衣尚未載入：'+failure;retry.hidden=false;}
  else if(Date.now()-started>15000){message.textContent='球衣素材載入較久，請稍候或重新載入。';retry.hidden=false;}
  else message.textContent=window.CPBLHuman?.ready?'正在準備球衣畫面…':'正在載入人物與球衣素材…';
 },500);
})();
