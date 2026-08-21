const code = 200;

switch (code) {
  case 200:
    console.log('OK');
    break;
  case 301:
    console.log('Moved Permanently');
    break;
  case 404:
    console.log('Not Found');
    break;
  case 500:
    console.log('Internal Server Error');
    break;
  default:
    console.log('Unknown status code');
}
