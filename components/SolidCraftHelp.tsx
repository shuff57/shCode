'use client';
import { SOLIDCRAFT_PROJECT_STARTER } from '../lib/solidcraft-project';
import { CAD_STARTER } from '../lib/solidcraft-code';
export default function SolidCraftHelp({ words = false }: { words?: boolean }){if(words)return <WordsHelp/>;return <section style={{fontSize:13,lineHeight:1.6}} aria-label="SolidCraft CAD help">
  <h2>SolidCraft CAD</h2>
  <p>Your sketches and 3D steps share one file, script.js. Edit it and press Run, or Ctrl/Command+Enter. Measurements are in millimetres.</p>
  <h3>Sketch, then use it</h3><pre style={{whiteSpace:'pre-wrap'}}>{SOLIDCRAFT_PROJECT_STARTER}</pre>
  <p>A sketch is an ordinary variable. Pass it straight to a 3D step, like <code>extrude(sk, height)</code>, and add holes, hollows or other supported operations after it. Changing the sketch changes the part on the next Run.</p>
  <p>A refused feature is explained beside what did build. Adjust its inputs or use a supported operation, then Run again.</p>
  <h3>Sketch view</h3>
  <p>Sketch shows one sketch from script.js in SolidCraft’s 2D sketcher. Choose it under Sketch; New sketch adds one to the end of script.js. Edit the code, Run to update the view, then press Finish sketch to return to Model. A sketch view shows sketches on <code>'top'</code>; others still work in your 3D steps.</p>
  <h3>Functions and classes</h3>
  <p>Everything in script.js can see everything above it, so a class or function that draws a sketch is available to your 3D steps. Return the sketch and assign it to a variable outside the class or function, then choose that variable:</p>
  <pre style={{whiteSpace:'pre-wrap'}}>{`class Tray {\n  constructor(width, depth) { this.width = width; this.depth = depth; }\n  draw() {\n    const outline = sketch('top');\n    outline.rectangle([0, 0], [this.width, this.depth]);\n    return outline;\n  }\n}\nconst tray = new Tray(60, 40).draw();\nconst part = extrude(tray, 10);\n`}</pre>
  <h3>Extrude</h3><p>In Model, choose a sketch and a height and press Extrude. It adds one line to the end of script.js, which you can edit like any other. Your previous script is kept in History.</p>
  <h3>Hand tools</h3><p>Your teacher controls hand tools. Finish sketch always uses your script and preserves your functions and classes. Mouse edits stay separate from your code; Run keeps them in History before rebuilding from your script. In 3D, project saving keeps the script—build from code to reproduce your part.</p>
  <h3>Keep your work</h3><p>Projects keep independent drafts. Save uploads to your account when signed in; History can restore an earlier version. Reset keeps the current project in History before restoring its starters. A project made with a separate sketch.js has its sketch moved to the top of script.js when it opens; the two old files stay in History.</p>
</section>;}

const pre={whiteSpace:'pre-wrap' as const};
/** Help for a code-first CAD project, written in reSHape Script (lib/solidcraft-code.ts). */
function WordsHelp(){return <section style={{fontSize:13,lineHeight:1.6}} aria-label="SolidCraft CAD help">
  <h2>SolidCraft CAD</h2>
  <p>script.js is your model, in reSHape Script: each line is one step, in order. Change a number and press Run, or Ctrl/Command+Enter. Measurements are in millimetres.</p>
  <pre style={pre}>{CAD_STARTER}</pre>
  <h3>Built or refused</h3>
  <p>Every Run is checked step by step. A step SolidCraft cannot build correctly is not built: it is listed above the code with the reason, and the steps before it stay. Change that step and Run again.</p>
  <h3>Sketches</h3>
  <p><code>sketch('top')</code> is flat (X and Y), <code>sketch('front')</code> stands up facing you (X and Z), <code>sketch('side')</code> faces right (Y and Z). A second number moves the plane: <code>sketch('top', 10)</code> is 10 mm up, on top of a 10 mm part. Draw with <code>.rectangle([x0, y0], [x1, y1])</code>, <code>.circle([x, y], {'{'} r: 5 {'}'})</code>, <code>.line(start, end)</code>, <code>.lines([a, b, c])</code> and <code>.arc(centre, from, to, 'ccw')</code>.</p>
  <h3>Solids</h3>
  <p><code>extrude(sketch, height)</code>, <code>pocket(sketch, part, depth)</code> or <code>pocket(sketch, part, depth, {'{'} through: true {'}'})</code>, <code>revolve(sketch, angle)</code>, <code>cuboid(width, depth, height)</code>, <code>cylinder(diameter, height)</code>, <code>sphere(diameter)</code>, <code>cone(diameter, height)</code>, <code>torus(diameter, tube)</code>. Place a shape with <code>{'{'} at: [x, y, z] {'}'}</code>; it is centred there.</p>
  <h3>Changing a solid</h3>
  <p><code>fillet(edges, radius)</code>, <code>chamfer(edges, distance)</code>, <code>shell(part, {'{'} wall: 2, open: 'top' {'}'})</code>, <code>hole(part, {'{'} across: 6 {'}'})</code>, <code>union(a, b)</code>, <code>subtract(a, b)</code>, <code>intersect(a, b)</code>, <code>mirror(part, 'left-right')</code>, <code>linearPattern(part, {'{'} count: 3, step: [20, 0, 0] {'}'})</code>, <code>polarPattern(part, {'{'} count: 6 {'}'})</code>, <code>move(part, [x, y, z])</code>, <code>turn(part, [x, y, z])</code>.</p>
  <h3>Faces, edges and planes</h3>
  <p>Faces are named <code>top</code>, <code>bottom</code>, <code>front</code> (towards you), <code>back</code>, <code>left</code> and <code>right</code>: <code>part.face('top')</code>. An edge is where two faces meet: <code>part.edge('top', 'front')</code>.</p>
  <p>Type <code>sketch(</code>, <code>part.face(</code>, <code>part.edge(</code>, <code>fillet(</code>, <code>chamfer(</code>, <code>hole(</code> or <code>shell(</code> and a list shows the planes, faces, edges and parts your model has. The one you move to in the list is selected in the view; Enter puts it in. The list is from the last Run.</p>
  <p>The view shows these names on the faces and planes (Labels). Click a label, or a face or edge in the view, to put its name in your code. With the cursor in the brackets of <code>sketch()</code>, a face gives the plane through it, like <code>'top', 10</code>.</p>
  <h3>SolidCraft’s tools</h3>
  <p>With SolidCraft tools on, build as on the web. When you finish a sketch or a feature, its code is added to the end of script.js and the part is rebuilt from the code, with the same checks. A feature the code cannot write yet is explained, with Undo. Your code is kept in History before each change.</p>
  <h3>Files and classes</h3>
  <p>New file and New class add files; share code with <code>export</code> and <code>import {'{'} Tray {'}'} from './tray.js'</code>. script.js is the file that runs; a file it does not import is not run.</p>
</section>;}
