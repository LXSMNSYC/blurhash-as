import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import * as blurhash from 'blurhash-as/browser';
import wasmURL from 'blurhash-as/build/optimized.wasm?url';

blurhash.setURL(wasmURL);

export default function App(): JSX.Element {
  const [skeleton, setSkeleton] = useState(true);
  const [placeholder, setPlaceholder] = useState(true);

  const [hash, setHash] = useState<string>();
  const [imageSrc, setImageSrc] = useState('');
  const [svgSrc, setSVGSrc] = useState('');
  const [cssObject, setCSSObject] = useState<CSSProperties>();
  const [buffer, setBuffer] = useState<Uint8ClampedArray>();

  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setSkeleton(true);
    setHash(undefined);
    setImageSrc('');
    setSVGSrc('');
    setCSSObject(undefined);
    setBuffer(undefined);

    let mounted = true;

    async function processImageData(imageData: ImageData) {
      const encoded = await blurhash.encode(
        imageData.data,
        imageData.width,
        imageData.height,
        4,
        3,
      );

      if (mounted) {
        setHash(encoded);

        const sheet = await blurhash.toCSSObject(
          encoded,
          8,
          6,
        );

        if (mounted) {
          setCSSObject(sheet);
        }

        const svg = await blurhash.toSVG(
          encoded,
          8,
          6,
        );

        if (mounted) {
          const encodedSVG = encodeURIComponent(svg);
          const dataUri = `data:image/svg+xml,${encodedSVG}`;
          setSVGSrc(dataUri);
        }

        const decoded = await blurhash.decode(
          encoded,
          1024,
          768,
        );

        if (mounted) {
          setBuffer(decoded);
        }

        setSkeleton(false);
      }
    }

    async function processImage() {
      const response = await fetch(`https://source.unsplash.com/1024x768/?v=${Date.now()}`);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1024;
      canvas.height = 768;

      if (ctx && mounted) {
        const image = new Image();
        image.src = response.url;
        image.crossOrigin = 'anonymous';

        setImageSrc(response.url);

        const imageData = await new Promise<ImageData>((resolve) => {
          image.onload = () => {
            ctx.drawImage(image, 0, 0);
            resolve(ctx.getImageData(0, 0, 1024, 768));
          };
        });
        await processImageData(imageData);
      }
    }

    processImage().catch(() => {
      //
    });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  let message: string;

  if (hash) {
    message = hash;
  } else if (imageSrc) {
    message = 'Processing hash...';
  } else {
    message = 'Preparing image...';
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const { current } = canvasRef;
    if (current && buffer) {
      const ctx = current.getContext('2d');
      if (!ctx) {
        return;
      }
      const imageData = ctx.createImageData(1024, 768);
      imageData.data.set(buffer);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [buffer]);

  return (
    <div className="page">
      <div className="container">
        <div className="showcase">
          <div className="showcase-item">
            <h1>Original Image</h1>
            <div className="aspect-ratio-box">
              <div className="aspect-ratio-content">
                <div className="image-container">
                  <img className={`src ${(skeleton) ? 'hidden' : ''}`} src={imageSrc} alt="" />
                  <div className={`skeleton ${!skeleton ? 'hidden' : ''}`} />
                </div>
              </div>
            </div>
          </div>
          <div className="showcase-item">
            <h1>CSS</h1>
            <div className="aspect-ratio-box">
              <div className="aspect-ratio-content">
                <div className="image-container">
                  <img className={`src ${skeleton ? 'hidden' : ''}`} src={imageSrc} alt="" />
                  <div className={`placeholder blurscale ${!placeholder ? 'hidden' : ''}`} style={cssObject} />
                  <div className={`skeleton ${!skeleton ? 'hidden' : ''}`} />
                </div>
              </div>
            </div>
          </div>
          <div className="showcase-item">
            <h1>SVG</h1>
            <div className="aspect-ratio-box">
              <div className="aspect-ratio-content">
                <div className="image-container">
                  <img className={`src ${skeleton ? 'hidden' : ''}`} src={imageSrc} alt="" />
                  <img className={`placeholder blurscale ${!placeholder ? 'hidden' : ''}`} src={svgSrc} alt="" />
                  <div className={`skeleton ${!skeleton ? 'hidden' : ''}`} />
                </div>
              </div>
            </div>
          </div>
          <div className="showcase-item">
            <h1>Canvas</h1>
            <div className="aspect-ratio-box">
              <div className="aspect-ratio-content">
                <div className="image-container">
                  <img className={`src ${skeleton ? 'hidden' : ''}`} src={imageSrc} alt="" />
                  <canvas ref={canvasRef} width="1024" height="768" className={`placeholder ${!placeholder ? 'hidden' : ''}`} />
                  <div className={`skeleton ${!skeleton ? 'hidden' : ''}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hash-container">
          <span className="hash">{message}</span>
        </div>
        <div className="">
          <button
            type="button"
            className="refresh"
            onClick={() => {
              setRefresh(refresh + 1);
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="placeholder-toggle"
            onClick={() => {
              setPlaceholder(!placeholder);
            }}
          >
            {`Show ${placeholder ? 'Image' : 'Placeholder'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
