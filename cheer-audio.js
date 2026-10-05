/* Render downloaded MIDI arrangements as a brass-band background loop. */
(function(){
 const cache=new Map();let source=null,gain=null,key='',pending='',generation=0,started=0,offset=0;
 async function renderSong(song){
  const duration=Math.min(140,song.midi.duration),offline=new OfflineAudioContext(1,Math.ceil(duration*22050),22050);
  const filter=offline.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.6;filter.connect(offline.destination);
  // Keep only the lead melody: accompaniment in multi-part MIDI is not a second background track.
  const step=.025,count=Math.ceil(duration/step),pitchAt=new Int16Array(count),volumeAt=new Uint8Array(count);
  for(const [at,length,pitch,velocity] of song.midi.notes){if(at>=duration||pitch<52||velocity<35)continue;for(let i=Math.max(0,Math.floor(at/step)),end=Math.min(count,Math.ceil((at+length)/step));i<end;i++){if(pitch>pitchAt[i]){pitchAt[i]=pitch;volumeAt[i]=velocity}}}
  const notes=[];for(let i=0;i<count;){const pitch=pitchAt[i],start=i,velocity=volumeAt[i];while(i<count&&pitchAt[i]===pitch)i++;if(pitch)notes.push([start*step,(i-start)*step,pitch,velocity]);}
  const scale=.12;
  for(let i=0;i<notes.length;i++){
   const [at,length,pitch,velocity]=notes[i],end=Math.min(duration,at+length),osc=offline.createOscillator(),envelope=offline.createGain();
   osc.type='triangle';osc.frequency.value=440*Math.pow(2,(pitch-69)/12);envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(scale*velocity/127,Math.min(end,at+.018));envelope.gain.setValueAtTime(scale*.75*velocity/127,Math.max(at,end-.04));envelope.gain.linearRampToValueAtTime(0,end);osc.connect(envelope);envelope.connect(filter);osc.start(at);osc.stop(end+.005);
   if(i%120===119)await new Promise(resolve=>setTimeout(resolve,0));
  }
  return offline.startRendering();
 }
 function songKey(song){return song.team+':'+song.title}
 function stop(){generation++;pending='';if(source){offset=(offset+audioCtx.currentTime-started)%source.buffer.duration;try{source.stop()}catch(e){}source.disconnect();source=null}}
 async function play(song){
  const nextKey=songKey(song);if(source&&key===nextKey||pending===nextKey)return;
  stop();if(key!==nextKey){key=nextKey;offset=0}pending=nextKey;const token=++generation;
  if(!cache.has(nextKey)){cache.set(nextKey,renderSong(song));while(cache.size>3)cache.delete(cache.keys().next().value)}
  try{const buffer=await cache.get(nextKey);if(token!==generation||!musicEnabled||masterMuted||tv.paused)return;
   audioUnlock();if(!audioCtx)return;if(!gain){gain=audioCtx.createGain();gain.gain.value=.55;gain.connect(audioCtx.destination)}
   source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start(0,offset%buffer.duration);started=audioCtx.currentTime;pending='';
  }catch(error){if(token===generation)pending='';cache.delete(nextKey);console.warn('Cheer rendering',error)}
 }
 window.CPBLMusic={play,stop};
})();
