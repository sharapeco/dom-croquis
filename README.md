[English](README.md) | [日本語](README.ja.md)

# html-to-canvas

This library can render the current DOM to a canvas element on the users browser, similar to [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas), [tsayen/dom-to-image](https://github.com/tsayen/dom-to-image), and [1904labs/dom-to-image-more](https://github.com/1904labs/dom-to-image-more).

It achieves superior performance by supporting a limited set of CSS features. This focused approach allows for faster rendering times compared to other libraries, making it an ideal choice for scenarios where high performance is prioritized over complete CSS feature support.

## Usage

The library is provided as an ES module. You can import it directly into your project:

```js
import { htmlToCanvas } from "html-to-canvas.js";

const canvas = await htmlToCanvas(document.body);
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
