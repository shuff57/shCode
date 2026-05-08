// 3.2.4e Lab — random() colors — solution
let spheres = [];

function setup() {
  for (let i = 0; i < 5; i++) {
    let s = new Sphere(random(-5, 5), 0, random(-5, 5), 0.5);
    let r = Math.floor(random(50, 255));
    let g = Math.floor(random(50, 255));
    let b = Math.floor(random(50, 255));
    s.color = 'rgb(' + r + ',' + g + ',' + b + ')';
    spheres.push(s);
  }
}

function draw() {
  background('#111');
}
