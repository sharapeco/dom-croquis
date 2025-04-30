English | [日本語](README.ja.md)

# dom-croquis

`dom-croquis` is a high-performance library that renders the current DOM to a canvas element in the user’s browser—similar to [html2canvas](https://github.com/niklasvh/html2canvas), [dom-to-image](https://github.com/tsayen/dom-to-image), and [dom-to-image-more](https://github.com/1904labs/dom-to-image-more).

By intentionally supporting a focused subset of CSS features, dom-croquis achieves significantly faster rendering times than comparable libraries.
This makes it ideal for use cases where speed matters more than full CSS coverage.

➡️ See the [Wiki](https://github.com/sharapeco/dom-croquis/wiki/Supported-CSS) for a detailed list of supported CSS properties.

## Usage

The library is provided as an ES module. You can import it directly into your project:

```js
import { htmlToCanvas } from "dom-croquis.js";

const canvas = await htmlToCanvas(document.body);
document.body.appendChild(canvas);
```

You can also use the library via a CDN.

```js
import { htmlToCanvas } from "https://unpkg.com/dom-croquis@latest/dist/dom-croquis.min.js";
```

## Building

Clone the repository:

```shell-session
$ git clone https://github.com/sharapeco/dom-croquis.git
```

Install dependencies:

```shell-session
$ npm install
```

Build the library:

```shell-session
$ npm run build
```
