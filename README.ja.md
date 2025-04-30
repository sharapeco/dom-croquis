[English](README.md) | 日本語

# dom-croquis

`dom-croquis` はDOMをクライアントブラウザ上でcanvas要素に高速レンダリングするライブラリです。[html2canvas](https://github.com/niklasvh/html2canvas)、[dom-to-image](https://github.com/tsayen/dom-to-image)、[dom-to-image-more](https://github.com/1904labs/dom-to-image-more) といった既存ライブラリと似た使い方ができます。

このライブラリではCSS機能やDOMのサポートを限定することにより、ほかのライブラリよりも高速に動作します。あらゆるケースを完全にレンダリングするよりも、使用するCSSがあらかじめ決まっていて、高いパフォーマンスが必要な用途に最適です。

➡️ 対応しているCSS機能の一覧は [Wiki](https://github.com/sharapeco/dom-croquis/wiki/Supported-CSS) をご覧ください。

## 使用方法

このライブラリはESモジュールとして提供されます。プロジェクトに直接インポートして使用できます。

```js
import { htmlToCanvas } from "dom-croquis.js";

const canvas = await htmlToCanvas(document.body);
document.body.appendChild(canvas);
```

CDN経由でも使用できます。

```js
import { htmlToCanvas } from "https://unpkg.com/dom-croquis@latest/dist/dom-croquis.min.js";
```

## ビルド方法

リポジトリをクローンします：

```shell-session
$ git clone https://github.com/sharapeco/dom-croquis.git
```

依存関係をインストールします：

```shell-session
$ npm install
```

ライブラリをビルドします：

```shell-session
$ npm run build
```