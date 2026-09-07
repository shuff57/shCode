const material = 'PLA';

// If this break were removed, PLA's settings would print and then PETG's
// settings would print too, because the case below it would fall through.
switch (material) {
  case 'PLA':
    console.log('Temperature: 200, Speed: 60');
    break;
  case 'ABS':
    console.log('Temperature: 240, Speed: 50');
    break;
  case 'PETG':
    console.log('Temperature: 230, Speed: 55');
    break;
  case 'TPU':
    console.log('Temperature: 220, Speed: 40');
    break;
  default:
    console.log('Unknown material');
}
