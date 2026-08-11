# shPlay Licensing

Every file in `public/shplay/` is covered by one of the two licenses below.
There is **no q5play license obligation** on any file here — shPlay is an
independent reimplementation, not a fork or copy of q5play.

## 1. shplay.js, shplay.d.ts, runner.html, assets/ — MIT

The shPlay engine facade, its type declarations, the sandbox host, and the
example art are original work written for this course and released under the
MIT license:

```
MIT License

Copyright (c) 2026 Steven Huff

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. planck.min.js — MIT (upstream)

`planck.min.js` is planck.js v1.5.0, vendored unmodified. Its license header
(kept intact in the file) reads:

```
Planck.js v1.5.0
@license The MIT license
@copyright Copyright (c) 2026 Erin Catto, Ali Shakiba

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 3. Design attribution

The shPlay API surface mirrors the design of [q5play][] (created by Quinton
Ashley), which this course previously used. shPlay is a clean-room-style,
license-clean reimplementation of that API over planck.js — it contains no
q5play source code and is not subject to the q5play Creator License or its
CS-education restriction. The q5play project remains the design credit for the
API shape.

[q5play]: https://q5play.org
