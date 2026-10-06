/* CC0 photographic microdetail; venue colours and mowing patterns remain world mapped. */
(function(root){
 root.CPBLFieldMaterials={install(T,turf,clay){
  if(!document.createElementNS)return;
  const loader=new T.TextureLoader();
  function apply(materials,kind,repeat,strength){
   const detail=loader.load(`assets/surfaces/${kind}-albedo.jpg`),normal=loader.load(`assets/surfaces/${kind}-normal.jpg`),rough=loader.load(`assets/surfaces/${kind}-roughness.jpg`);
   for(const texture of [detail,normal,rough]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=4;}
   for(const material of materials){
    material.normalMap=normal;material.normalScale=new T.Vector2(strength,strength);material.roughnessMap=rough;
    material.onBeforeCompile=shader=>{
     shader.uniforms.fieldDetail={value:detail};
     shader.vertexShader='varying vec2 vFieldDetailUv;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFieldDetailUv = uv;');
     shader.fragmentShader='uniform sampler2D fieldDetail;\nvarying vec2 vFieldDetailUv;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nfloat microLuma=dot(texture2D(fieldDetail,vFieldDetailUv*${repeat.toFixed(1)}).rgb,vec3(.2126,.7152,.0722));\ndiffuseColor.rgb *= clamp(.82 + microLuma * .35,.85,1.10);`);
    };
    material.customProgramCacheKey=()=>`field-${kind}-${repeat}`;material.needsUpdate=true;
   }
  }
  apply(turf,'grass',135,.13);apply(clay,'dirt',165,.09);
 }};
})(window);
