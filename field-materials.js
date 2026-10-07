/* CC0 photographic microdetail; venue colours and mowing patterns remain world mapped. */
(function(root){
 root.CPBLFieldMaterials={install(T,turf,clay){
  if(!document.createElementNS)return;
  const loader=new T.TextureLoader();
  function apply(materials,kind,repeat,strength){
   const mean=kind==='grass'?.145:.391,contrast=kind==='grass'?.40:.80;
   const detail=loader.load(`assets/surfaces/${kind}-albedo.jpg`),normal=loader.load(`assets/surfaces/${kind}-normal.jpg`),rough=loader.load(`assets/surfaces/${kind}-roughness.jpg`);
   detail.colorSpace=T.SRGBColorSpace;for(const texture of [detail,normal,rough]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=4;}
   for(const material of materials){
    material.normalMap=normal;material.normalScale=new T.Vector2(strength,strength);material.roughnessMap=rough;
    material.onBeforeCompile=shader=>{
     shader.uniforms.fieldDetail={value:detail};
     shader.vertexShader='varying vec2 vFieldDetailUv;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFieldDetailUv = uv;');
     shader.fragmentShader='uniform sampler2D fieldDetail;\nvarying vec2 vFieldDetailUv;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nvec3 photograph=texture2D(fieldDetail,vFieldDetailUv*${repeat.toFixed(1)}).rgb;float microLuma=dot(photograph,vec3(.2126,.7152,.0722));\ndiffuseColor.rgb *= mix(vec3(1.),clamp(photograph/max(microLuma,.04),vec3(.72),vec3(1.28)),.45)*clamp(pow(max(microLuma,.01)/${mean.toFixed(3)},${contrast.toFixed(2)}),.65,1.25);`);
     // Dry turf and clay scatter light; a dark roughness texel must not turn them into wet mirrors.
     shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, ${kind==='grass'?'0.90':'0.95'});`);
    };
    material.customProgramCacheKey=()=>`field-${kind}-${repeat}`;material.needsUpdate=true;
   }
  }
  apply(turf,'grass',165,.18);apply(clay,'dirt',165,.09);
 }};
})(window);
