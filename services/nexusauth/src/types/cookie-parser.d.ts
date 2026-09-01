declare module 'cookie-parser' {
  function cookieParser(secret?: string | string[], options?: any): any;
  namespace cookieParser {
    function JSONCookie(str: string): any;
    function JSONCookies(obj: any): any;
    function signedCookie(str: string, secret: string | string[]): any;
    function signedCookies(obj: any, secret: string | string[]): any;
  }
  export = cookieParser;
}
