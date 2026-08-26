// 2D Shapes and Transforms
const { primitives, transforms } = require('@jscad/modeling')

function main() {
  // Face base: a big circle
  const head = primitives.circle({ radius: 30, segments: 64 })

  // Eyes: two small circles moved into position
  const leftEye = transforms.translate([-10, 10],
    primitives.circle({ radius: 4, segments: 32 })
  )
  const rightEye = transforms.translate([10, 10],
    primitives.circle({ radius: 4, segments: 32 })
  )

  // Nose: a triangle rotated and centered
  const nose = transforms.translate([0, 2],
    primitives.polygon({ points: [[-3, 0], [3, 0], [0, -6]] })
  )

  // Mouth: a wide thin rectangle, slightly rotated for a smirk
  const mouth = transforms.translate([0, -10],
    transforms.rotate([0, 0, Math.PI / 36],
      primitives.rectangle({ size: [20, 3] })
    )
  )

  // Hat brim: wide rectangle on top
  const brim = transforms.translate([0, 30],
    primitives.rectangle({ size: [50, 4] })
  )

  // Hat top: tall rectangle
  const hatTop = transforms.translate([0, 42],
    primitives.rectangle({ size: [30, 20] })
  )

  return [head, leftEye, rightEye, nose, mouth, brim, hatTop]
}

module.exports = { main }
