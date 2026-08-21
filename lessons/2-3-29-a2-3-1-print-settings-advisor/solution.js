const material = 'PLA';

switch (material) {
  case 'PLA':
    console.log('Temperature: 200°C, Speed: 60 mm/s');
    break;
  case 'ABS':
    console.log('Temperature: 240°C, Speed: 50 mm/s');
    break;
  case 'PETG':
    console.log('Temperature: 230°C, Speed: 55 mm/s');
    break;
  case 'TPU':
    console.log('Temperature: 220°C, Speed: 40 mm/s');
    break;
  default:
    console.log('Unknown material');
}
