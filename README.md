# html-to-canvas

This library can render the current DOM to a canvas element on the users browser, similar to [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas).

It achieves superior performance by supporting a limited set of CSS features. This focused approach allows for faster rendering times compared to html2canvas, making it an ideal choice for scenarios where high performance is prioritized over complete CSS feature support.

## Usage

The library is provided as an ES module. You can import it directly into your project:

```js
import { htmlToCanvas } from "html-to-canvas.js";

const canvas = htmlToCanvas(document.body);
document.body.appendChild(canvas);
```

## Building

Clone the repository:

```shell-session
$ git clone https://github.com/sharapeco/html-to-canvas.git
```

Install dependencies:

```shell-session
$ npm install
```

Build the library:

```shell-session
$ npm run build
```
