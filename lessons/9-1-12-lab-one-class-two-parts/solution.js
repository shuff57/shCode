class MountingPlate {
  constructor(width, x) {
    this.width = width;
    this.x = x;
  }

  build() {
    const body = box(this.width, 30, 8, { at: [this.x, 0, 0] });
    hole(body, { across: 6 });
  }
}

const small = new MountingPlate(36, 0);
const large = new MountingPlate(54, 80);
small.width = 42;
small.build();
large.build();
