/* Keep the selected park identical for physics, signage and the 3D scene. */
(function(){
 const parks=CPBLStadiums.parks,chooser=document.createElement('div');chooser.className='opponent-chooser';
 chooser.innerHTML='<label for="stadiumSelect">比賽球場</label><select id="stadiumSelect"><option value="home">主隊預設球場</option>'+parks.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('')+'</select><small id="parkPreview"></small>';
 $('.setup-card').append(chooser);const lightChooser=document.createElement('div');lightChooser.className='opponent-chooser';lightChooser.innerHTML='<label for="lightingSelect">場地光線</label><select id="lightingSelect"><option value="day">日間球賽</option><option value="night">夜間球賽</option></select>';$('.setup-card').append(lightChooser);window.CPBL_LIGHTING='day';$('#lightingSelect').onchange=()=>{window.CPBL_LIGHTING=$('#lightingSelect').value;};
 function preview(){const id=$('#stadiumSelect').value,p=parks.find(p=>p.id===(id==='home'?CPBLStadiums.homes[+$('#teamSelect').value]:id));if(p)$('#parkPreview').textContent=p.name+' · 左 '+p.feet[0]+' / 中 '+p.feet[1]+' / 右 '+p.feet[2]+' 呎 · '+p.feature;}
 $('#stadiumSelect').onchange=preview;$('#teamSelect').addEventListener('change',preview);preview();
 const previousOpponent=updateOpponent;updateOpponent=function(){previousOpponent();preview();};$('#teamSelect').onchange=updateOpponent;
 const previousStart=startGame;
 startGame=function(index){previousStart(index);const id=state.mode==='season'?'home':$('#stadiumSelect').value;const p=CPBLStadiums.select(id==='home'?CPBLStadiums.homes[state.homeIndex]:id);$('#stadiumName').textContent=p.name;stage.dataset.stadium=p.id;};
 const previousMode=setMode;setMode=function(mode){previousMode(mode);chooser.classList.toggle('hidden',mode==='season');};
})();
