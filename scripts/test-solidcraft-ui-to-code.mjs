// Features made with SolidCraft's own tools, written back in reSHape Script
// (lib/solidcraft-ui-to-code.ts). The round trip itself (made with the tools, written as code,
// rebuilt through the guarded host page and compared) is a browser check; this pins the writing.
import assert from 'node:assert/strict';
import { matchFaces, curvesCode, featureCode, featuresCode, sketchPlane } from '../lib/solidcraft-ui-to-code.ts';

// ---- sketch planes, from SolidCraft's frame ---------------------------------------------------------
const XY={origin:[0,0,0],u:[1,0,0],v:[0,1,0]};
assert.deepEqual((({args,flip})=>({args,flip}))(sketchPlane(XY)),{args:"'top'",flip:false});
const top10=sketchPlane({origin:[3,4,10],u:[1,0,0],v:[0,1,0]});
assert.equal(top10.args,"'top', 10",'a plane up the Z axis is the top plane moved up');assert.deepEqual(top10.map([1,2]),[4,6],'its points are carried through the frame into the model');
// SolidCraft's XZ plane runs its y along -Z, and its normal is +Y; reSHape's front plane is X and Z, its normal -Y
const XZ=sketchPlane({origin:[0,0,0],u:[1,0,0],v:[0,0,-1]});
assert.equal(XZ.args,"'front'");assert.deepEqual(XZ.map([5,-2]),[5,2]);assert.equal(XZ.flip,true);
const YZ=sketchPlane({origin:[7,0,0],u:[0,1,0],v:[0,0,1]});
assert.equal(YZ.args,"'side', 7");assert.deepEqual(YZ.map([4,6]),[4,6]);assert.equal(YZ.flip,false);
// a slanted plane is reSHape's frame form, u and v written in full, the points in the sketch's own axes
const slant=sketchPlane({origin:[0,0,5],u:[1,0,0],v:[0,0.6,0.8]});
assert.equal(slant.args,'{ origin: [0, 0, 5], u: [1, 0, 0], v: [0, 0.6, 0.8] }');assert.deepEqual(slant.map([3,4]),[3,4]);assert.equal(slant.flip,false);
const r2=Math.SQRT1_2;assert.equal(sketchPlane({origin:[0,0,0],u:[r2,0,r2],v:[0,1,0]}).args,`{ origin: [0, 0, 0], u: [${r2}, 0, ${r2}], v: [0, 1, 0] }`,'not rounded: reSHape checks the frame to 1e-6');
assert.equal(sketchPlane({origin:[0,0,0],u:[1,0,0],v:[0,0.6,0.81]}).error,'its plane\'s axes are not square to each other');
assert.equal(sketchPlane(undefined).error,'its plane could not be read');
console.log('PASS sketch planes from SolidCraft\'s frame: top, front and side, with offsets, and slanted planes as a frame');

// ---- sketches --------------------------------------------------------------------------------------
const L=(id,a,b,extra={})=>({id,type:'line',start_at:a,end_at:b,...extra});
assert.deepEqual(curvesCode('sk',[L('l1',[0,0],[60,0]),L('l2',[60,0],[60,40]),L('l3',[60,40],[0,40]),L('l4',[0,40],[0,0])]),{lines:['sk.rectangle([0, 0], [60, 40]);']});
assert.deepEqual(curvesCode('sk',[L('l1',[0,0],[60,0]),L('l3',[0,40],[60,40]),L('l2',[60,0],[60,40]),L('l4',[0,0],[0,40])]),{lines:['sk.rectangle([0, 0], [60, 40]);']},'lines in any order and direction');
assert.deepEqual(curvesCode('sk',[L('l1',[0,0],[10,0]),L('l2',[10,0],[0,8]),L('l3',[0,8],[0,0])]),{lines:['sk.lines([[0, 0], [10, 0], [0, 8], [0, 0]]);']},'a closed chain is drawn back to its start');
assert.deepEqual(curvesCode('sk',[L('l1',[0,0],[10,0])]),{lines:['sk.line([0, 0], [10, 0]);']});
assert.deepEqual(curvesCode('sk',[L('j',[0,0],[60,0],{link:'j1'}),{id:'c1',type:'circle',center_at:[30,20],radius:6}]),{lines:['sk.circle([30, 20], { r: 6 });']},'a projected outline is not drawn again');
assert.deepEqual(curvesCode('sk',[{id:'a1',type:'arc',center_at:[10,5],radius:5,start_at:[15,5],end_at:[5,5]}]),{lines:["sk.arc([10, 5], [15, 5], [5, 5], 'ccw');"]});
assert.deepEqual(curvesCode('sk',[{id:'a1',type:'arc',center_at:[10,5],radius:5,start_at:[15,5],end_at:[5,5]}],p=>[p[0],-p[1]]),{lines:["sk.arc([10, -5], [15, -5], [5, -5], 'cw');"]},'a frame that mirrors the sketch turns an arc the other way');
assert.match(curvesCode('sk',[L('l1',[0,0],[1,0],{construction:true})]).error,/construction/);
assert.match(curvesCode('sk',[{id:'s1',type:'spline'}]).error,/spline/);
console.log('PASS sketches: rectangles, chains, lines, circles, arcs');

// ---- features --------------------------------------------------------------------------------------
const face=(index,name,n,c)=>({index,name,centroid:c,point:c,plane_normal:n});
const box=[face(0,'T',[0,0,1],[30,20,10]),face(1,'B',[0,0,-1],[30,20,0]),face(2,'F',[0,-1,0],[30,0,5]),face(3,'K',[0,1,0],[30,40,5]),face(4,'Lf',[-1,0,0],[0,20,5]),face(5,'R',[1,0,0],[60,20,5])];
const boxEdges=[{index:7,name:'T|R',mid:[60,20,10],start:[60,0,10],end:[60,40,10]},{index:8,name:'T|F',mid:[30,0,10],start:[0,0,10],end:[60,0,10]}];
const ctx=()=>({sketchVars:new Map(),bodyVars:new Map([['b_pull1','part']]),taken:new Set(['width','part']),geometry:new Map([['b_pull1',{faces:box,edges:boxEdges}]]),boxes:new Map([['b_pull1',{min:[0,0,0],max:[60,40,10]}]])});
{
 const c=ctx();
 assert.deepEqual(featureCode({id:1,name:'Base',type:'Sketch',definition:{},frame:XY,curves:[L('l1',[0,0],[60,0]),L('l2',[60,0],[60,40]),L('l3',[60,40],[0,40]),L('l4',[0,40],[0,0])]},c),{lines:["const sk = sketch('top');",'sk.rectangle([0, 0], [60, 40]);']});
 assert.deepEqual(featureCode({id:2,name:'Extrude1',type:'ExtrudeFeature',definition:{body_names:['Body2'],extent:{direction:'positive',distance:'10'},operation:'new_body',profiles:{type:'all'},sketch:1}},c),{lines:['const part2 = extrude(sk, 10);']});
 assert.equal(c.bodyVars.get('Body2'),'part2');
 assert.deepEqual(featureCode({id:3,name:'Lid',type:'Sketch',definition:{},frame:{origin:[0,0,10],u:[1,0,0],v:[0,1,0]},curves:[{id:'c',type:'circle',center_at:[30,20],radius:6}]},c),{lines:["const sk2 = sketch('top', 10);",'sk2.circle([30, 20], { r: 6 });']});
 assert.deepEqual(featureCode({id:4,name:'Extrude2',type:'ExtrudeFeature',definition:{extent:{direction:'negative',distance:'4'},operation:'cut',profiles:{type:'all'},sketch:3,targets:['b_pull1']}},c),{lines:['pocket(sk2, part, 4);']},'a cut into the part below its sketch is a pocket');
 assert.deepEqual(featureCode({id:5,name:'Extrude3',type:'ExtrudeFeature',definition:{extent:{type:'through_all',direction:'negative'},operation:'cut',profiles:{type:'all'},sketch:3,targets:['b_pull1']}},c),{lines:['pocket(sk2, part, 1, { through: true });']});
 assert.deepEqual(featureCode({id:6,name:'Extrude4',type:'ExtrudeFeature',definition:{extent:{direction:'positive',distance:'5'},operation:'join',profiles:{type:'all'},sketch:3,targets:['b_pull1']}},c),{lines:['union(part, extrude(sk2, 5));']},'a join is a union with the new solid');
 // front: SolidCraft's normal is +Y and reSHape's -Y, so SolidCraft's 'negative' is reSHape's own direction
 assert.deepEqual(featureCode({id:7,name:'Front',type:'Sketch',definition:{},frame:{origin:[0,0,0],u:[1,0,0],v:[0,0,-1]},curves:[L('a',[5,-2],[15,-2]),L('b',[15,-2],[15,-8]),L('c',[15,-8],[5,-8]),L('d',[5,-8],[5,-2])]},c),{lines:["const sk3 = sketch('front');",'sk3.rectangle([5, 2], [15, 8]);']});
 assert.deepEqual(featureCode({id:8,name:'Extrude5',type:'ExtrudeFeature',definition:{body_names:['Body3'],extent:{direction:'negative',distance:'5'},operation:'new_body',profiles:{type:'all'},sketch:7}},c),{lines:['const part3 = extrude(sk3, 5);']});
 assert.deepEqual(featureCode({id:9,name:'Extrude6',type:'ExtrudeFeature',definition:{body_names:['Body4'],extent:{direction:'positive',distance:'5'},operation:'new_body',profiles:{type:'all'},sketch:7}},c),{lines:['const part4 = extrude(sk3, 5, { reversed: true });']});
 assert.deepEqual(featureCode({id:10,name:'Fillet1',type:'FilletFeature',definition:{edges:[[60,20,10]],radius:'1'}},c),{lines:["fillet(part.edge('top', 'right'), 1);"]});
 assert.deepEqual(featureCode({id:11,name:'Chamfer1',type:'ChamferFeature',definition:{edges:[[60,20,10],[30,0,10]],distance:'0.5'}},c),{lines:["chamfer([part.edge('top', 'right'), part.edge('top', 'front')], 0.5);"]});
 assert.deepEqual(featureCode({id:12,name:'Shell1',type:'ShellFeature',definition:{faces:[[30,20,10]],thickness:'2'}},c),{lines:["shell(part, { wall: 2, open: 'top' });"]});
 assert.deepEqual(featureCode({id:13,name:'Box1',type:'BoxFeature',definition:{body_names:['Body5'],corner:[70,0,0],length:'10',width:'6',height:'4',operation:'new_body'}},c),{lines:['const block = cuboid(10, 6, 4, { at: [75, 3, 2] });']},'a box by its corner is a cuboid centred on its middle');
 assert.deepEqual(featureCode({id:14,name:'Cyl1',type:'CylinderFeature',definition:{body_names:['Body6'],radius:'3',height:'10',base:[0,0,0]}},c),{lines:['const rod = cylinder(6, 10, { at: [0, 0, 5] });']},'a cylinder by radius and base is reSHape\'s by diameter and centre');
 assert.deepEqual(featureCode({id:15,name:'Combine1',type:'CombineFeature',definition:{keep_tools:false,operation:'cut',target:'b_pull1',tools:['Body5']}},c),{lines:['subtract(part, block);']});
 assert.deepEqual(featureCode({id:16,name:'Pattern1',type:'RectangularPatternFeature',definition:{bodies:['Body6'],pattern:{dir1:[1,0,0],count1:'3',spacing1:'20'}}},c),{lines:['linearPattern(rod, { count: 3, step: [20, 0, 0] });']});
 assert.deepEqual(featureCode({id:17,name:'Move1',type:'MoveFeature',definition:{bodies:['Body6'],translate:[0,0,5]}},c),{lines:['move(rod, [0, 0, 5]);']});
 // refused, with the reason
 assert.match(featureCode({id:20,name:'Extrude9',type:'ExtrudeFeature',definition:{sketch:1,profiles:{type:'indices',indices:[0]},extent:{distance:'1'},operation:'new_body'}},c).error,/Extrude9 \(made in SolidCraft\) cannot be written as code: it uses only some regions of its sketch\./);
 assert.match(featureCode({id:21,name:'Sweep1',type:'SweepFeature',definition:{}},c).error,/SolidCraft's sweep is not one of the code's words yet/);
 // the Hole tool: at from the centre of the part's box (30, 20, 5), blind only from the high end of its axis
 assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'simple'},position:[50,30,10],direction:[0,0,-1]}},c),{lines:['hole(part, { across: 4, at: [20, 10] });']},'a through hole from the top');
 assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'simple'},position:[50,30,0],direction:[0,0,1]}},c),{lines:['hole(part, { across: 4, at: [20, 10] });']},'a through hole from the bottom is the same hole');
 assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',depth:'6',hole:{type:'simple'},position:[50,30,10],direction:[0,0,-1]}},c),{lines:['hole(part, { across: 4, deep: 6, at: [20, 10] });']},'a blind hole from the top');
 assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'3',hole:{type:'simple'},position:[60,10,8],direction:[-1,0,0]}},c),{lines:["hole(part, { across: 3, at: [-10, 3], along: 'x' });"]},'along x: at is y and z');
 assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',depth:'6',hole:{type:'simple'},position:[50,30,0],direction:[0,0,1]}},c).error,/stops part way/,'a blind hole from the bottom is not written');
 assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'counterbore',cb_diameter:'8',cb_depth:'3'},position:[50,30,10],direction:[0,0,-1]}},c),{lines:['hole(part, { across: 4, at: [20, 10], counterbore: { across: 8, deep: 3 } });']},'a counterbore from the top');
assert.deepEqual(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',depth:6,hole:{type:'countersink',cs_diameter:'8',cs_angle:'90 deg'},position:[50,30,10],direction:[0,0,-1]}},c),{lines:['hole(part, { across: 4, deep: 6, at: [20, 10], countersink: { across: 8, angle: 90 } });']},'a blind countersink from the top');
assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'counterbore',cb_diameter:'8',cb_depth:'3'},position:[50,30,0],direction:[0,0,1]}},c).error,/counterbore is on a face the code cannot cut it from/,'a counterbore from below is not written: the guarded build cuts it at the top');
assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'counterbore',cb_diameter:'w',cb_depth:'3'},position:[50,30,10],direction:[0,0,-1]}},c).error,/counterbore is an expression/);
assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',depth:6,hole:{type:'drilled',tip_angle:'118 deg'},position:[50,30,10],direction:[0,0,-1]}},c).error,/drill point/);
assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'counterbore',cb_diameter:'8',cb_depth:'3',tip_angle:'118 deg'},position:[50,30,10],direction:[0,0,-1]}},c).error,/drill point/);
 assert.match(featureCode({id:22,name:'Hole1',type:'HoleFeature',definition:{diameter:'4',hole:{type:'simple'},position:[50,30,10],direction:[0,0.6,-0.8]}},c).error,/not drilled along X, Y or Z/);
 // a turn about an axis through the origin: reSHape's turn about the box's centre (30, 20, 5), then the move that puts it where SolidCraft did
 assert.deepEqual(featureCode({id:24,name:'Move2',type:'MoveFeature',definition:{bodies:['b_pull1'],translate:['0','0','0'],angle:'90',rotate_axis:[0,0,1]}},c),{lines:['turn(part, [0, 0, 90]);','move(part, [-50, 10, 0]);']});
 assert.match(featureCode({id:24,name:'Move2',type:'MoveFeature',definition:{bodies:['b_pull1'],translate:['0','0','0'],angle:'30',rotate_axis:[1,1,0]}},c).error,/not X, Y or Z/);
 assert.deepEqual(featureCode({id:24,name:'Move2',type:'MoveFeature',definition:{bodies:['b_pull1'],translate:['5','0','0'],angle:'90',rotate_axis:[0,0,1]}},c),{lines:['turn(part, [0, 0, 90]);','move(part, [-45, 10, 0]);']},'a move and a turn at once: SolidCraft turns, then moves; the move after the turn takes both');
 // a copy, a pattern in two directions, a cut both ways
 assert.match(featureCode({id:29,name:'Move3',type:'MoveFeature',definition:{bodies:['b_pull1'],body_names:['b_pull1 (2)'],copy:true,translate:['0','0','30']}},c).error,/copies the part/,'the guarded build refuses a copying move, so it is not written');
 assert.deepEqual(featureCode({id:30,name:'Pattern2',type:'RectangularPatternFeature',definition:{bodies:['b_pull1'],features:[],pattern:{count1:'3',count2:'2',dir1:[1,0,0],dir2:[0,1,0],spacing1:'50',spacing2:'40',type:'rectangular'}}},c),{lines:['linearPattern(part, { count: 3, step: [50, 0, 0] });','linearPattern(part, { count: 2, step: [0, 40, 0] });']});
 assert.deepEqual(featureCode({id:31,name:'Extrude7',type:'ExtrudeFeature',definition:{extent:{convention:'total_distance',direction:'symmetric',distance:'10'},operation:'cut',profiles:{type:'all'},sketch:7,targets:['b_pull1']}},c),{lines:['pocket(sk3, part, 10, { midplane: true });']});
 assert.match(featureCode({id:31,name:'Extrude7',type:'ExtrudeFeature',definition:{extent:{direction:'symmetric',distance:'10'},operation:'cut',profiles:{type:'all'},sketch:7,targets:['b_pull1']}},c).error,/both ways/,'both ways with no total-distance convention is not written');
 // in the same go as another step, a hole's or turn's place cannot be measured
 const c2=ctx();
 assert.match(featuresCode([{id:40,name:'Move4',type:'MoveFeature',definition:{bodies:['b_pull1'],translate:['5','0','0']}},{id:41,name:'Hole2',type:'HoleFeature',definition:{diameter:'4',hole:{type:'simple'},position:[50,30,10],direction:[0,0,-1]}}],c2).error,/Hole2.*same go/);
 assert.match(featureCode({id:23,name:'Cone1',type:'ConeFeature',definition:{radius:'5',top_radius:'2',height:'8'}},c).error,/pointed/);
 assert.match(featureCode({id:25,name:'Fillet2',type:'FilletFeature',definition:{edges:[[1,2,3]],radius:'1'}},c).error,/could not be found/);
 assert.match(featureCode({id:26,name:'Fillet3',type:'FilletFeature',definition:{edges:[[60,20,10]],radius:'1'}},{...ctx(),bodyVars:new Map()}).error,/not in a variable of script\.js/);
 assert.match(featuresCode([{id:27,name:'Box2',type:'BoxFeature',definition:{length:'1',width:'1',height:'1'}},{id:28,name:'Loft1',type:'LoftFeature',definition:{}}],c).error,/Loft1/,'one feature that cannot be written stops the lot');
}
// the check after writing: flat faces matched one to one, in any order
{
  const ringTop = [235.6186763075792, 9.889334874029553, 9.88933487402955, 0], ringBottom = [235.61867630757922, 9.88933487402955, 9.889334874029549, -10];
  assert.equal(matchFaces([ringTop, ringBottom], [[235.61867630757922, 9.88933487402955, 9.88933487402955, 0], [235.6186763075792, 9.889334874029553, 9.88933487402955, -10]]), true, 'two rings whose areas differ in the last digit, listed the other way round');
  assert.equal(matchFaces([ringTop, ringTop], [ringTop, ringBottom]), false, 'one face cannot stand for two');
  assert.equal(matchFaces([ringTop], [[235.6186763075792, 9.889334874029553, 9.88933487402955, 0.001]]), false, 'a face 1e-3 away is not the same face');
}
// a revolve: a new sketch with the profile laid out as spin() reads it (x out from the axis, y along it), then spin, groove or union
{
  const ctx = () => ({ sketchVars: new Map(), bodyVars: new Map([['b_box1', 'b']]), taken: new Set(['b']), geometry: new Map([['b_box1', { faces: [], edges: [] }]]) });
  const rect = (x0, y0, x1, y1) => [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(([a, b, c, d], i) => ({ id: `l${i}`, type: 'line', start_at: [a, b], end_at: [c, d] }));
  const XZ = { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, -1] }, XY = { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0] };
  const rev = (definition, profile) => featureCode({ id: 9, name: 'Revolve1', type: 'RevolveFeature', definition: { profiles: { type: 'all' }, convention: 'sketch_normal', operation: 'new_body', body_names: ['Body1'], ...definition }, profile }, ctx());
  assert.deepEqual(rev({ axis: { type: 'world', axis: 'Z' }, angle: '90' }, { curves: rect(10, 0, 20, 10), frame: XZ }).lines,
    ["const sk = sketch('top');", 'sk.polygon([[10, 0], [20, 0], [20, -10], [10, -10]]);', 'const part = spin(sk, 90);'], 'about Z, from the XZ plane, towards +Y');
  assert.deepEqual(rev({ axis: { type: 'sketch_axis', axis: 'y' }, angle: '120' }, { curves: rect(10, 0, 20, 10), frame: XY }).lines.at(-1), 'const part = spin(sk, -120);', 'about Y: SolidCraft turns towards its normal (+Z), reSHape\'s +a from +X towards -Z');
  assert.deepEqual(rev({ axis: { type: 'world', axis: 'Z' }, angle: '360', operation: 'cut', targets: ['b_box1'] }, { curves: rect(10, 0, 20, 10), frame: XZ }).lines.at(-1), 'groove(sk, b, 360);');
  assert.deepEqual(rev({ axis: { type: 'world', axis: 'Z' }, angle: '360', operation: 'join', targets: ['b_box1'] }, { curves: rect(10, 0, 20, 10), frame: XZ }).lines.at(-1), 'union(b, spin(sk, 360));');
  assert.deepEqual(rev({ axis: { type: 'world', axis: 'Z' }, angle: '360' }, { curves: [{ id: 'c', type: 'circle', center_at: [15, 5], radius: 3 }], frame: XZ }).lines.slice(0, 2), ["const sk = sketch('top');", 'sk.circle(3, { at: [15, -5] });'], 'one circle');
  assert.match(rev({ axis: { type: 'line', origin: [5, 0, 0], dir: [0, 0, 1] }, angle: '90' }, { curves: rect(10, 0, 20, 10), frame: XZ }).error, /not X, Y or Z through the origin/);
  assert.match(rev({ axis: { type: 'sketch_line', curve: 'l0' }, angle: '90' }, { curves: rect(10, 0, 20, 10), frame: XZ }).error, /edge or an axis the code cannot name/);
  assert.match(rev({ axis: { type: 'world', axis: 'Z' }, angle: '90' }, { curves: rect(10, 0, 20, 10), frame: { origin: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1] } }).error, /part way, from a plane the code cannot start a spin from/, 'part way from the YZ plane: reSHape starts from +X');
  assert.match(rev({ axis: { type: 'world', axis: 'Z' }, angle: '90', symmetric: true }, { curves: rect(10, 0, 20, 10), frame: XZ }).error, /options the code cannot write/);
  assert.match(rev({ axis: { type: 'world', axis: 'Z' }, angle: '90' }, { curves: [...rect(10, 0, 20, 10), { id: 'c', type: 'circle', center_at: [30, 5], radius: 2 }], frame: XZ }).error, /one outline of straight lines or one circle/);
  assert.match(rev({ axis: { type: 'world', axis: 'Z' }, angle: 'a' }, { curves: rect(10, 0, 20, 10), frame: XZ }).error, /angle is an expression/);
}
// a torus, and a mirror at the end of the part's box nearer zero
{
  const ctx = (box) => ({ sketchVars: new Map(), bodyVars: new Map([['b_box1', 'b']]), taken: new Set(['b']), geometry: new Map(), boxes: new Map([['b_box1', box]]) });
  const B = { min: [0, 0, 0], max: [40, 30, 20] };
  assert.deepEqual(featureCode({ id: 3, name: 'Torus1', type: 'TorusFeature', definition: { body_names: ['Body1'], center: [5, 6, 7], major: '10', minor: '2', operation: 'new_body' } }, ctx(B)).lines, ['const donut = ring(24, 4, { at: [5, 6, 7] });']);
  const mir = (plane, extra = {}, box = B) => featureCode({ id: 4, name: 'Mirror1', type: 'MirrorFeature', definition: { bodies: ['b_box1'], combine: true, features: [], plane, ...extra } }, ctx(box));
  assert.deepEqual(mir({ type: 'origin', name: 'YZ' }).lines, ["mirror(b, 'left-right');"], 'across YZ, the low face of a part from x = 0');
  assert.deepEqual(mir({ type: 'origin', name: 'XY' }).lines, ["mirror(b, 'top-bottom');"]);
  assert.deepEqual(mir({ type: 'custom', plane: { origin: [0, 0, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] } }).lines, ["mirror(b, 'front-back');"]);
  assert.match(mir({ type: 'custom', plane: { origin: [40, 0, 0], x_dir: [0, 1, 0], y_dir: [0, 0, 1] } }).error, /not at the end of the part nearer the origin/, 'across its far face: reSHape mirrors across the near one');
  assert.deepEqual(mir({ type: 'custom', plane: { origin: [0, 0, 0], x_dir: [0, 1, 0], y_dir: [0, 0, 1] } }, {}, { min: [-40, 0, 0], max: [0, 30, 20] }).lines, ["mirror(b, 'left-right');"], 'a part on the minus side: its high face is the nearer one');
  assert.match(mir({ type: 'origin', name: 'YZ' }, { combine: false }).error, /keeps the mirrored copy apart/);
  assert.match(mir({ type: 'custom', plane: { origin: [0, 0, 0], x_dir: [0.6, 0.8, 0], y_dir: [0, 0, 1] } }).error, /not square to X, Y or Z/);
  assert.match(mir({ type: 'origin', name: 'YZ' }, {}, { min: [-10, 0, 0], max: [30, 30, 20] }).error, /not at the end of the part/, 'a part across the plane');
}
// a draft: every side wall, or one named face, pulled along +X, +Y or +Z about the plane at neutral
{
  const sq = (i, n, c, area = 600) => ({ index: i, plane_normal: n, centroid: c, area });
  const faces = [sq(0, [1, 0, 0], [40, 15, 10]), sq(1, [-1, 0, 0], [0, 15, 10]), sq(2, [0, 1, 0], [20, 30, 10], 800), sq(3, [0, -1, 0], [20, 0, 10], 800), sq(4, [0, 0, 1], [20, 15, 20], 1200), sq(5, [0, 0, -1], [20, 15, 0], 1200)];
  const ctx = () => ({ sketchVars: new Map(), bodyVars: new Map([['b_box1', 'b']]), taken: new Set(['b']), geometry: new Map([['b_box1', { faces, edges: [] }]]) });
  const dr = (extra) => featureCode({ id: 5, name: 'Draft1', type: 'DraftFeature', definition: { faces: [[40, 15, 10]], angle: '8', neutral: { type: 'origin', name: 'XY' }, pull: [0, 0, 1], body: 'b_box1', ...extra } }, ctx());
  assert.deepEqual(dr({}).lines, ["draft(b.face('right'), 8);"]);
  assert.deepEqual(dr({ faces: [[40, 15, 10], [0, 15, 10], [20, 30, 10], [20, 0, 10]], angle: '5' }).lines, ['draft(b, 5);'], 'every side wall: the whole part');
  assert.deepEqual(dr({ neutral: { type: 'custom', plane: { origin: [0, 0, 5], x_dir: [1, 0, 0], y_dir: [0, 1, 0] } } }).lines, ["draft(b.face('right'), 8, { neutral: 5 });"]);
  assert.match(dr({ faces: [[40, 15, 10], [0, 15, 10]] }).error, /some of the side walls/);
  assert.match(dr({ pull: [0, 0, -1] }).error, /pulls along a direction/);
  assert.match(dr({ neutral: { type: 'origin', name: 'YZ' } }).error, /neutral plane is not one the code can name/);
  assert.match(dr({ angle: 'a' }).error, /angle is an expression/);
}
console.log('SolidCraft tools to reSHape Script: planes from frames, sketches, extrude, pocket, union, fillet, chamfer, shell, cuboid, cylinder, subtract, patterns, moves, holes, turns, two-way patterns, cuts both ways, and refusals pass.');
