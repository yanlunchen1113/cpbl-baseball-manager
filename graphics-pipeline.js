/* Physical HDR lighting and depth-based screen-space ambient occlusion for Three.js r160. */
(function(root){
 root.CPBLGraphics={create(T,renderer,scene,stage){
  if(!document.createElementNS||!T.PMREMGenerator)return null;
  fetch('assets/lighting/stadium-bake.json').then(r=>{if(!r.ok)throw Error('Stadium bake unavailable');return r.json();}).then(async manifest=>{const r=await fetch('assets/lighting/stadium-bake.bin');if(!r.ok)throw Error('Stadium bake unavailable');const data=await r.arrayBuffer(),profiles={};for(const [key,groups] of Object.entries(manifest.profiles))profiles[key]=groups.map(g=>({count:g.count,ambient:new Uint8Array(data,g.ambient,g.count),day:new Uint8Array(data,g.day,g.count),night:new Uint8Array(data,g.night,g.count)}));root.CPBL_BAKED_LIGHTING=profiles;root.dispatchEvent(new Event('cpbl-baked-lighting'));}).catch(error=>console.warn('Static stadium lighting',error));
  const environments=new Map(),sources=new Map(),pending=new Map();let mode='day',reduced=false;
  const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
  function setStrength(value){scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial)m.envMapIntensity=value;});}
  function installEnvironment(key){if(environments.has(key)){scene.environment=environments.get(key).texture;stage.dataset.environment=key+'-pmrem';setStrength(key==='day'?.38:key==='indoor'?.70:6.0);}}
  function configure(key){mode=key;stage.dataset.renderPipeline='physical-hdr-ssao';installEnvironment(key);
   if(key==='indoor'&&!environments.has(key)){
    const room=new T.Scene();room.background=new T.Color('#14181c');const walls=new T.Mesh(new T.BoxGeometry(70,50,90),new T.MeshStandardMaterial({color:'#b1b6b7',side:T.BackSide,roughness:1}));room.add(walls);
    for(const x of [-22,22])for(const z of [-24,0,24]){const lamp=new T.Mesh(new T.PlaneGeometry(12,3),new T.MeshBasicMaterial({color:new T.Color(5.5,5.8,6.2)}));lamp.position.set(x,23,z);lamp.rotation.x=Math.PI/2;room.add(lamp);}
    environments.set(key,pmrem.fromScene(room,.02,.1,150));room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});installEnvironment(key);
   }else if(key!=='indoor'&&!environments.has(key)&&!pending.has(key)&&root.CPBLRGBELoader){
    pending.set(key,true);new root.CPBLRGBELoader().load('assets/lighting/'+(key==='day'?'day-stadium.hdr':'night-environment.hdr'),texture=>{sources.set(key,texture);environments.set(key,pmrem.fromEquirectangular(texture));texture.dispose();if(mode===key)installEnvironment(key);},undefined,error=>{pending.delete(key);stage.dataset.environment='unavailable';console.warn('HDR lighting unavailable',error);});
   }
  }
  const capable=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
  if(!capable)return {configure,refreshMaterials:()=>setStrength(mode==='day'?.38:mode==='indoor'?.70:6.0),render:(s,c)=>renderer.render(s,c),reduce(){},restore(){for(const [key,source] of sources){environments.get(key)?.dispose();environments.set(key,pmrem.fromEquirectangular(source));source.dispose();}if(mode==='indoor'){environments.get('indoor')?.dispose();environments.delete('indoor');configure(mode);}else installEnvironment(mode);}};
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter});target.texture.colorSpace=T.LinearSRGBColorSpace;target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);target.samples=Math.min(2,renderer.capabilities.maxSamples||0);
  const ao=new T.WebGLRenderTarget(1,1,{depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));quad.frustumCulled=false;quadScene.add(quad);
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const kernel=[];for(let i=0;i<12;i++){const a=i*2.399963,z=.18+(i%4)*.19,r=Math.sqrt(1-z*z),scale=.22+.78*Math.pow((i+1)/12,2);kernel.push(new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,z).multiplyScalar(scale));}
  const aoMaterial=new T.ShaderMaterial({vertexShader:vertex,depthTest:false,depthWrite:false,uniforms:{depthMap:{value:target.depthTexture},projection:{value:new T.Matrix4()},inverseProjection:{value:new T.Matrix4()},kernel:{value:kernel},size:{value:new T.Vector2(1,1)},radius:{value:.85},sampleCount:{value:12}},fragmentShader:`
   varying vec2 vUv;uniform sampler2D depthMap;uniform mat4 projection,inverseProjection;uniform vec3 kernel[12];uniform vec2 size;uniform float radius;uniform int sampleCount;
   vec3 positionAt(vec2 uv){vec4 p=inverseProjection*vec4(uv*2.-1.,texture2D(depthMap,uv).x*2.-1.,1.);return p.xyz/p.w;}
   void main(){float depth=texture2D(depthMap,vUv).x;if(depth>.999995){gl_FragColor=vec4(1.);return;}vec3 p=positionAt(vUv),normal=normalize(cross(dFdx(p),dFdy(p)));if(dot(normal,-p)<0.)normal=-normal;
    float angle=fract(sin(dot(floor(vUv*size),vec2(12.9898,78.233)))*43758.5453)*6.28318;vec3 noise=vec3(cos(angle),sin(angle),.25),tangent=normalize(noise-normal*dot(noise,normal));mat3 basis=mat3(tangent,cross(normal,tangent),normal);float occ=0.;
    for(int i=0;i<12;i++){if(i>=sampleCount)break;vec3 sampleP=p+basis*kernel[i]*radius;vec4 projected=projection*vec4(sampleP,1.);vec2 uv=projected.xy/projected.w*.5+.5;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)continue;vec3 surface=positionAt(uv);float range=1.-smoothstep(radius*.3,radius*2.,abs(surface.z-p.z));occ+=step(sampleP.z+.025,surface.z)*range;}
    gl_FragColor=vec4(vec3(1.-occ/float(sampleCount)),1.);
   }`});
  const output=new T.ShaderMaterial({vertexShader:vertex,depthTest:false,depthWrite:false,toneMapped:true,uniforms:{colorMap:{value:target.texture},aoMap:{value:ao.texture},depthMap:{value:target.depthTexture},pixel:{value:new T.Vector2()},aoPixel:{value:new T.Vector2()},cameraNearFar:{value:new T.Vector2()},aoStrength:{value:.48},bloom:{value:0},bloomThreshold:{value:3}},fragmentShader:`
   #include <common>
   varying vec2 vUv;uniform sampler2D colorMap,aoMap,depthMap;uniform vec2 pixel,aoPixel,cameraNearFar;uniform float aoStrength,bloom,bloomThreshold;
   float viewDepth(vec2 uv){float d=texture2D(depthMap,uv).x,n=cameraNearFar.x,f=cameraNearFar.y;return n*f/(f-d*(f-n));}
   void main(){vec3 color=texture2D(colorMap,vUv).rgb;float center=viewDepth(vUv),sum=0.,weight=0.;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 uv=vUv+vec2(float(x),float(y))*aoPixel;float w=exp(-abs(viewDepth(uv)-center)*10.);sum+=texture2D(aoMap,uv).r*w;weight+=w;}float shade=sum/max(weight,.001);color*=mix(1.,shade,aoStrength);
    if(bloom>0.){vec3 glow=vec3(0.);for(int i=0;i<4;i++){float a=float(i)*1.5708;vec3 c=texture2D(colorMap,vUv+vec2(cos(a),sin(a))*pixel*3.).rgb;glow+=max(c-vec3(bloomThreshold),vec3(0.));}color+=glow*bloom*.25;}
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  let width=0,height=0;const drawSize=new T.Vector2();
  return {configure,refreshMaterials:()=>setStrength(mode==='day'?.38:mode==='indoor'?.70:6.0),render(s,c){renderer.getDrawingBufferSize(drawSize);if(drawSize.x!==width||drawSize.y!==height){width=drawSize.x;height=drawSize.y;target.setSize(width,height);const div=reduced?3:2;ao.setSize(Math.ceil(width/div),Math.ceil(height/div));output.uniforms.pixel.value.set(1/width,1/height);output.uniforms.aoPixel.value.set(div/width,div/height);aoMaterial.uniforms.size.value.set(width/div,height/div);}
    renderer.setRenderTarget(target);renderer.render(s,c);
    {aoMaterial.uniforms.projection.value.copy(c.projectionMatrix);aoMaterial.uniforms.inverseProjection.value.copy(c.projectionMatrixInverse);quad.material=aoMaterial;renderer.setRenderTarget(ao);renderer.render(quadScene,quadCamera);}
    output.uniforms.cameraNearFar.value.set(c.near,c.far);output.uniforms.bloom.value=mode==='day'?0:.015;output.uniforms.bloomThreshold.value=3/renderer.toneMappingExposure;output.uniforms.aoStrength.value=reduced?.36:.48;quad.material=output;renderer.setRenderTarget(null);renderer.render(quadScene,quadCamera);
    stage.dataset.occlusion=reduced?'depth-ssao-6':'depth-ssao-12';
   },reduce(){reduced=true;target.dispose();target.samples=0;width=0;aoMaterial.uniforms.sampleCount.value=6;stage.dataset.renderQuality='reduced';},restore(){for(const [key,source] of sources){environments.get(key)?.dispose();environments.set(key,pmrem.fromEquirectangular(source));source.dispose();}if(mode==='indoor'){environments.get('indoor')?.dispose();environments.delete('indoor');configure(mode);}else installEnvironment(mode);}
  };
 }};
})(window);
