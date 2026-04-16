// Libraries and JSCAD Introduction
const { primitives, transforms, booleans, colors } = require('@jscad/modeling')

function main() {
  // A cube sitting on a platform with a sphere on top
  const platform = primitives.cuboid({ size: [30, 30, 3] })
  const box = transforms.translate([0, 0, 8],
    primitives.cube({ size: 12 })
  )
  const ball = transforms.translate([0, 0, 18],
    primitives.sphere({ radius: 6, segments: 32 })
  )
  const pole = transforms.translate([0, 0, 10],
    primitives.cylinder({ radius: 1.5, height: 20 })
  )

  // Cut a hole through the platform
  const hole = primitives.cylinder({ radius: 4, height: 10 })
  const platformWithHole = booleans.subtract(platform, hole)

  return [platformWithHole, box, ball, pole]
}

module.exports = { main }
