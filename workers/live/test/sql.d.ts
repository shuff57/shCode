// wrangler.test.toml's [[rules]] load a .sql file as its text (the gateway's /setup).
declare module '*.sql' {
  const text: string;
  export default text;
}
