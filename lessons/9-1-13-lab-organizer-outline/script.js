// The organizer base outline. All measurements are in millimetres.
const width = 50;
const depth = 30;

const sk = sketch('top');
const base = sk.rectangle([0, 0], [width, depth]);
sk.length(base.bottom, width);
sk.length(base.right, depth);
