[English](README.md) | [日本語](README.ja.md)

# html-to-canvas

DOMをクライアントブラウザ上でcanvas要素にレンダリングするライブラリです。類似のライブラリとして [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas)、[tsayen/dom-to-image](https://github.com/tsayen/dom-to-image)、[1904labs/dom-to-image-more](https://github.com/1904labs/dom-to-image-more) などがあります。

このライブラリは、CSS機能やDOMのサポートを限定することにより、ほかのライブラリよりも優れたパフォーマンスを実現しています。あらゆるケースを完全にレンダリングするよりも、使用するCSSがあらかじめ決まっていて、高いパフォーマンスが必要な用途に最適です。

## 使用方法

このライブラリはESモジュールとして提供されます。プロジェクトに直接インポートして使用できます：

```js
import { htmlToCanvas } from "html-to-canvas.js";

const canvas = await htmlToCanvas(document.body);
document.body.appendChild(canvas);
```

## ビルド方法

リポジトリをクローンします：

```shell-session
$ git clone https://github.com/sharapeco/html-to-canvas.git
```

依存関係をインストールします：

```shell-session
$ npm install
```

ライブラリをビルドします：

```shell-session
$ npm run build
```