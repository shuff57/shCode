window.TIMINGS = {
 "hello": {
  "dur": 13.176,
  "marks": {
   "hi": 0.125,
   "move": 0.889,
   "never": 3.931,
   "here": 10.694
  },
  "cues": [
   [
    0.125,
    "Hi!"
   ],
   [
    0.889,
    "Your player can already move left and right."
   ],
   [
    3.931,
    "It has a ground to stand on, and keys that move it,"
   ],
   [
    7.722,
    "but nothing has ever lifted it into the air."
   ],
   [
    10.694,
    "Here is how to make it jump with the space bar."
   ]
  ],
  "caps": [
   [
    0.125,
    "Hi!"
   ],
   [
    0.889,
    "Your player can already move left and right."
   ],
   [
    3.931,
    "It has a ground to stand on, and keys that move it,"
   ],
   [
    7.722,
    "but nothing has ever lifted it into the air."
   ],
   [
    10.694,
    "Here is how to make it jump with the space bar."
   ]
  ],
  "capsNarrow": [
   [
    0.125,
    "Hi!"
   ],
   [
    0.889,
    "Your player can already"
   ],
   [
    1.75,
    "move left and right."
   ],
   [
    3.931,
    "It has a ground to stand on,"
   ],
   [
    6.083,
    "and keys that move it,"
   ],
   [
    7.722,
    "but nothing has ever"
   ],
   [
    8.875,
    "lifted it into the air."
   ],
   [
    10.694,
    "Here is how to make it"
   ],
   [
    11.375,
    "jump with the space bar."
   ]
  ]
 },
 "press": {
  "dur": 26.304,
  "marks": {
   "two": 0.125,
   "checks": 2.931,
   "move": 7.708,
   "space": 11.403,
   "once": 13.5,
   "presses": 17.5,
   "hold": 23.181
  },
  "cues": [
   [
    0.125,
    "The key code you know is kb.pressing."
   ],
   [
    2.931,
    "It asks the same question every frame:"
   ],
   [
    6.194,
    "is the key held down?"
   ],
   [
    7.708,
    "So the player keeps moving for as long as you hold it."
   ],
   [
    11.403,
    "The space bar needs something different."
   ],
   [
    13.5,
    "One tap should give one jump, not one jump every frame."
   ],
   [
    17.5,
    "That is kb.presses: it fires once,"
   ],
   [
    20.875,
    "on the frame the key goes down."
   ],
   [
    23.181,
    "Hold the key down, and it does not fire again."
   ]
  ],
  "caps": [
   [
    0.125,
    "The key code you know is kb.pressing."
   ],
   [
    2.931,
    "It asks the same question every frame:"
   ],
   [
    6.194,
    "is the key held down?"
   ],
   [
    7.708,
    "So the player keeps moving for as long as you hold it."
   ],
   [
    11.403,
    "The space bar needs something different."
   ],
   [
    13.5,
    "One tap should give one jump, not one jump every frame."
   ],
   [
    17.5,
    "That is kb.presses: it fires once,"
   ],
   [
    20.875,
    "on the frame the key goes down."
   ],
   [
    23.181,
    "Hold the key down, and it does not fire again."
   ]
  ],
  "capsNarrow": [
   [
    0.125,
    "The key code you know is kb.pressing."
   ],
   [
    2.931,
    "It asks the same question every frame:"
   ],
   [
    6.194,
    "is the key held down?"
   ],
   [
    7.708,
    "So the player keeps moving"
   ],
   [
    9.306,
    "for as long as you hold it."
   ],
   [
    11.403,
    "The space bar needs"
   ],
   [
    12.264,
    "something different."
   ],
   [
    13.5,
    "One tap should give one jump,"
   ],
   [
    15.347,
    "not one jump every frame."
   ],
   [
    17.5,
    "That is kb.presses: it fires once,"
   ],
   [
    20.875,
    "on the frame the key goes down."
   ],
   [
    23.181,
    "Hold the key down,"
   ],
   [
    24.444,
    "and it does not fire again."
   ]
  ]
 },
 "ground": {
  "dur": 23.184,
  "marks": {
   "ground": 0.111,
   "collide": 2.333,
   "off": 7.514,
   "why": 10.458,
   "any": 14.611,
   "lamp": 19.569
  },
  "cues": [
   [
    0.111,
    "A jump also needs the ground."
   ],
   [
    2.333,
    "player.colliding(ground) is true"
   ],
   [
    5.389,
    "while the player touches the ground."
   ],
   [
    7.514,
    "Walk off the edge, and it is false."
   ],
   [
    10.458,
    "Without it, the player could"
   ],
   [
    11.597,
    "jump in mid-air, again and again."
   ],
   [
    14.611,
    "The ground is just a sprite you can stand on;"
   ],
   [
    17.653,
    "any static sprite will do."
   ],
   [
    19.569,
    "So the jump needs both: a press, and the ground."
   ]
  ],
  "caps": [
   [
    0.111,
    "A jump also needs the ground."
   ],
   [
    2.333,
    "player.colliding(ground) is true"
   ],
   [
    5.389,
    "while the player touches the ground."
   ],
   [
    7.514,
    "Walk off the edge, and it is false."
   ],
   [
    10.458,
    "Without it, the player could"
   ],
   [
    11.597,
    "jump in mid-air, again and again."
   ],
   [
    14.611,
    "The ground is just a sprite you can stand on;"
   ],
   [
    17.653,
    "any static sprite will do."
   ],
   [
    19.569,
    "So the jump needs both: a press, and the ground."
   ]
  ],
  "capsNarrow": [
   [
    0.111,
    "A jump also needs the ground."
   ],
   [
    2.333,
    "player.colliding(ground) is true"
   ],
   [
    5.389,
    "while the player touches the ground."
   ],
   [
    7.514,
    "Walk off the edge, and it is false."
   ],
   [
    10.458,
    "Without it, the player could"
   ],
   [
    11.597,
    "jump in mid-air, again and again."
   ],
   [
    14.611,
    "The ground is just"
   ],
   [
    15.611,
    "a sprite you can stand on;"
   ],
   [
    17.653,
    "any static sprite will do."
   ],
   [
    19.569,
    "So the jump needs both:"
   ],
   [
    21.347,
    "a press, and the ground."
   ]
  ]
 },
 "jump": {
  "dur": 19.992,
  "marks": {
   "line": 0.139,
   "and": 1.792,
   "then": 5.903,
   "neg": 9.583,
   "gravity": 13.986,
   "once": 18.278
  },
  "cues": [
   [
    0.139,
    "Here is the line."
   ],
   [
    1.792,
    "The space bar is pressed,"
   ],
   [
    3.819,
    "and the player is touching the ground."
   ],
   [
    5.903,
    "Then set vel.y to -7."
   ],
   [
    9.583,
    "Negative y is up the screen, so the player rises."
   ],
   [
    13.986,
    "Gravity slows it down, and it falls back to the ground."
   ],
   [
    18.278,
    "One press, one jump."
   ]
  ],
  "caps": [
   [
    0.139,
    "Here is the line."
   ],
   [
    1.792,
    "The space bar is pressed,"
   ],
   [
    3.819,
    "and the player is touching the ground."
   ],
   [
    5.903,
    "Then set vel.y to -7."
   ],
   [
    9.583,
    "Negative y is up the screen, so the player rises."
   ],
   [
    13.986,
    "Gravity slows it down, and it falls back to the ground."
   ],
   [
    18.278,
    "One press, one jump."
   ]
  ],
  "capsNarrow": [
   [
    0.139,
    "Here is the line."
   ],
   [
    1.792,
    "The space bar is pressed,"
   ],
   [
    3.819,
    "and the player is touching the ground."
   ],
   [
    5.903,
    "Then set vel.y to -7."
   ],
   [
    9.583,
    "Negative y is up the screen,"
   ],
   [
    12.319,
    "so the player rises."
   ],
   [
    13.986,
    "Gravity slows it down,"
   ],
   [
    16.319,
    "and it falls back to the ground."
   ],
   [
    18.278,
    "One press, one jump."
   ]
  ]
 },
 "bug": {
  "dur": 23.808,
  "marks": {
   "skip": 0.111,
   "air": 1.958,
   "twice": 6.069,
   "worse": 10.139,
   "every": 13.806,
   "rule": 18.667
  },
  "cues": [
   [
    0.111,
    "What if you skip the ground check?"
   ],
   [
    1.958,
    "Press again in mid-air,"
   ],
   [
    3.597,
    "and the player launches a second time."
   ],
   [
    6.069,
    "Two presses, and it flies off the top of the canvas."
   ],
   [
    10.139,
    "Using kb.pressing is worse."
   ],
   [
    13.806,
    "It sets the speed every frame,"
   ],
   [
    16.542,
    "so the player never falls at all."
   ],
   [
    18.667,
    "A press, plus the ground."
   ],
   [
    21.0,
    "Leave one out, and the jump does not work."
   ]
  ],
  "caps": [
   [
    0.111,
    "What if you skip the ground check?"
   ],
   [
    1.958,
    "Press again in mid-air,"
   ],
   [
    3.597,
    "and the player launches a second time."
   ],
   [
    6.069,
    "Two presses, and it flies off the top of the canvas."
   ],
   [
    10.139,
    "Using kb.pressing is worse."
   ],
   [
    13.806,
    "It sets the speed every frame,"
   ],
   [
    16.542,
    "so the player never falls at all."
   ],
   [
    18.667,
    "A press, plus the ground."
   ],
   [
    21.0,
    "Leave one out, and the jump does not work."
   ]
  ],
  "capsNarrow": [
   [
    0.111,
    "What if you skip the ground check?"
   ],
   [
    1.958,
    "Press again in mid-air,"
   ],
   [
    3.597,
    "and the player launches a second time."
   ],
   [
    6.069,
    "Two presses, and it flies"
   ],
   [
    8.139,
    "off the top of the canvas."
   ],
   [
    10.139,
    "Using kb.pressing is worse."
   ],
   [
    13.806,
    "It sets the speed every frame,"
   ],
   [
    16.542,
    "so the player never falls at all."
   ],
   [
    18.667,
    "A press, plus the ground."
   ],
   [
    21.0,
    "Leave one out,"
   ],
   [
    22.111,
    "and the jump does not work."
   ]
  ]
 },
 "try": {
  "dur": 12.528,
  "marks": {
   "try": 0.111,
   "change": 1.264,
   "higher": 4.208,
   "back": 8.889
  },
  "cues": [
   [
    0.111,
    "Try this."
   ],
   [
    1.264,
    "Change -7 to -5."
   ],
   [
    4.208,
    "The player jumps about half as high,"
   ],
   [
    6.639,
    "and comes back down sooner."
   ],
   [
    8.889,
    "Change it back to -7 for the big jump."
   ]
  ],
  "caps": [
   [
    0.111,
    "Try this."
   ],
   [
    1.264,
    "Change -7 to -5."
   ],
   [
    4.208,
    "The player jumps about half as high,"
   ],
   [
    6.639,
    "and comes back down sooner."
   ],
   [
    8.889,
    "Change it back to -7 for the big jump."
   ]
  ],
  "capsNarrow": [
   [
    0.111,
    "Try this."
   ],
   [
    1.264,
    "Change -7 to -5."
   ],
   [
    4.208,
    "The player jumps about half as high,"
   ],
   [
    6.639,
    "and comes back down sooner."
   ],
   [
    8.889,
    "Change it back to -7 for the big jump."
   ]
  ]
 },
 "close": {
  "dur": 13.176,
  "marks": {
   "sum": 0.111,
   "ground": 3.389,
   "rule": 5.278,
   "next": 8.083,
   "bye": 12.194
  },
  "cues": [
   [
    0.111,
    "kb.presses fires once per press."
   ],
   [
    3.389,
    "colliding checks the ground."
   ],
   [
    5.278,
    "Together they make the jump work."
   ],
   [
    8.083,
    "Up next, the reading, then you add a jump yourself."
   ],
   [
    12.194,
    "See you there!"
   ]
  ],
  "caps": [
   [
    0.111,
    "kb.presses fires once per press."
   ],
   [
    3.389,
    "colliding checks the ground."
   ],
   [
    5.278,
    "Together they make the jump work."
   ],
   [
    8.083,
    "Up next, the reading, then you add a jump yourself."
   ],
   [
    12.194,
    "See you there!"
   ]
  ],
  "capsNarrow": [
   [
    0.111,
    "kb.presses fires once per press."
   ],
   [
    3.389,
    "colliding checks the ground."
   ],
   [
    5.278,
    "Together they make the jump work."
   ],
   [
    8.083,
    "Up next, the reading,"
   ],
   [
    10.306,
    "then you add a jump yourself."
   ],
   [
    12.194,
    "See you there!"
   ]
  ]
 }
};
