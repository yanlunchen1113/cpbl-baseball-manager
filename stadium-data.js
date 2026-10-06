/* Distances: feet in source, metres in scene. Intermediate fence shape is interpolated,
   not a surveyed contour. Unconfirmed wall heights are explicit model assumptions. */
(function(root){
 const parks=[
  {id:'dome',name:'臺北大巨蛋',feet:[335,400,335],wallHeight:null,modelWallHeight:3.5,indoor:true,surface:'artificial',outfield:'tiers',levels:4,seat:'#757a80',feature:'封閉式橢圓屋頂、多層看台、人工草皮',sources:['https://www.taipeidome.com.tw/','https://dome.gov.taipei/'],dimensionsStatus:'published-secondary-pending-primary'},
  {id:'tianmu',name:'天母棒球場',feet:[325,400,325],wallHeight:null,modelWallHeight:3.4,surface:'artificial',outfield:'park',levels:2,seat:'#316ca0',feature:'外野無看台、運動公園背景、人工草皮',sources:['https://cpbl.com.tw/field/cont?sid=0M061623807974766861','https://www.cpbl.com.tw/about/structure'],dimensionsStatus:'official'},
  {id:'xinzhuang',name:'新莊棒球場',feet:[325,400,325],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'tiers',levels:2,seat:'#2875a5',feature:'雙層內野看台、獨立外野座席',sources:['https://www.sa.gov.tw/Resource/Attachment/f1494407597005.pdf','https://www.fubonguardians.com/content/stadium/Index'],dimensionsStatus:'official'},
  {id:'taoyuan',name:'樂天桃園棒球場',feet:[330,400,330],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'tiers',levels:3,seat:'#407fa4',feature:'三層建築、環繞看台與遮棚',sources:['https://www.dst.tycg.gov.tw/cp.aspx?n=11740'],dimensionsStatus:'official'},
  {id:'intercontinental',name:'臺中洲際棒球場',feet:[325,400,325],wallHeight:null,modelWallHeight:2.5,surface:'grass',outfield:'tiers',levels:2,seat:'#2e83a4',feature:'美式開放球場、棒球縫線造型屋頂',sources:['https://www.taichung.gov.tw/2266137/2266304/2266421/2280951'],dimensionsStatus:'official'},
  {id:'douliu',name:'斗六棒球場',feet:[330,400,330],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'tiers',levels:2,seat:'#487c90',feature:'雙層內野看台、大型外野座席',sources:['https://cpbl.com.tw/field/cont?sid=0M062384198076732468'],dimensionsStatus:'official'},
  {id:'asia',name:'亞太成棒主球場',feet:[330,400,330],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'tiers',levels:3,seat:'#38796a',feature:'大型開放看台、成棒主副場訓練園區',sources:['https://www.tainan.gov.tw/News_Content.aspx?n=13370&s=8803841','https://iplay.sports.gov.tw/gyminfo/IndexPrint/29874'],dimensionsStatus:'published-secondary-pending-primary'},
  {id:'chengcing',name:'澄清湖棒球場',feet:[328,400,328],wallHeight:null,modelWallHeight:3.5,surface:'grass',outfield:'tiers',levels:4,seat:'#318481',feature:'四層觀眾席建築、雙層內野與外野看台',sources:['https://cpbl.com.tw/field/cont?sid=0M062392119063993008','https://iplay.sports.gov.tw/gyminfo/indexprint/7764'],dimensionsStatus:'official'},
  {id:'chiayi',name:'嘉義市立棒球場',feet:[350,400,350],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'tiers',levels:1,seat:'#62649c',feature:'百年公園球場、較深的兩翼、低層看台',sources:['https://iplay.sports.gov.tw/gyminfo/index/20207','https://stadium.chiayi.gov.tw/'],dimensionsStatus:'published-secondary-pending-primary'},
  {id:'hualien',name:'花蓮德興棒球場',feet:[320,400,320],wallHeight:null,modelWallHeight:3.4,surface:'grass',outfield:'berm',levels:1,seat:'#648b80',feature:'外野草坡看台、德興運動公園',sources:['https://hcs.hl.gov.tw/cp.aspx?n=2220'],dimensionsStatus:'official'},
  {id:'taitung',name:'臺東棒球村第一球場',feet:[320,400,320],wallHeight:null,modelWallHeight:3.4,surface:'dirt-infield',outfield:'low',levels:1,seat:'#6b99a8',feature:'紅土內野、低層看台、都蘭山與小黃山背景',sources:['https://cpbl.com.tw/field/cont?sid=0M062533314743104681'],dimensionsStatus:'official'}
 ];
 parks.forEach(p=>{p.backstopMetres=null;p.modelBackstopMetres=18.288;p.roofHeightMetres=null;p.modelRoofHeight=p.indoor?74.5:12;p.modelFoulPoleHeight=14;});
 const homes=['intercontinental','asia','taoyuan','xinzhuang','dome','chengcing'];
 let active=parks[0];
 function distance(angle){const t=Math.min(1,Math.abs(angle)/(Math.PI/4)),side=angle<0?2:0;return (active.feet[1]+(active.feet[side]-active.feet[1])*Math.pow(t,1.5))*.3048;}
 root.CPBLStadiums={parks,homes,get active(){return active},select(id){active=parks.find(p=>p.id===id)||parks[0];return active},distance,wallHeight(){return active.wallHeight??active.modelWallHeight},scope:'2026 一軍例行賽 11 座球場',surveyedContour:false};
})(globalThis);
