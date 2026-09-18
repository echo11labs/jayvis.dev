'use client';

import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';

/**
 * Exports the current React Flow canvas as a PNG image.
 *
 * Uses the viewport's <svg> + foreignObject (React Flow renders nodes as
 * HTML inside SVG foreignObject). We serialize the SVG, draw it onto a
 * canvas, and export as PNG.
 */
export function useErdPngExport() {
  const { getNodes, getEdges } = useReactFlow();

  const exportPng = async (filename = 'stitchdb-erd.png') => {
    const nodes = getNodes();
    if (nodes.length === 0) {
      toast.error('Nothing to export — the canvas is empty');
      return;
    }

    try {
      // React Flow renders the viewport as an <svg> with class
      // "react-flow__viewport" containing <g> transforms + foreignObject
      // for the HTML nodes. We grab the entire .react-flow__edges svg +
      // the .react-flow__viewport node and serialize.
      const flowEl = document.querySelector('.react-flow') as HTMLElement | null;
      if (!flowEl) {
        toast.error('Canvas not found');
        return;
      }

      // Compute bounding box of all nodes.
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const n of nodes) {
        const w = (n.measured?.width ?? 280) as number;
        const h = (n.measured?.height ?? 200) as number;
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      }
      const padding = 60;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Clone the flow DOM, position it absolutely so we can rasterize.
      const clone = flowEl.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.background = '#0a0a0a';

      // Adjust the viewport transform so all nodes are visible.
      const viewport = clone.querySelector('.react-flow__viewport') as HTMLElement | null;
      if (viewport) {
        viewport.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;
      }

      // Temporarily attach to DOM for rendering.
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Use the SVG foreignObject approach: build an SVG wrapping the HTML.
      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.setAttribute('xmlns', svgNs);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const bgRect = document.createElementNS(svgNs, 'rect');
      bgRect.setAttribute('width', String(width));
      bgRect.setAttribute('height', String(height));
      bgRect.setAttribute('fill', '#0a0a0a');
      svg.appendChild(bgRect);

      const foreign = document.createElementNS(svgNs, 'foreignObject');
      foreign.setAttribute('width', String(width));
      foreign.setAttribute('height', String(height));
      foreign.appendChild(clone);
      svg.appendChild(foreign);

      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      const scale = 2; // 2x for crisp output
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(svgUrl);
      document.body.removeChild(wrapper);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filename}`);
      }, 'image/png');
    } catch (err: any) {
      console.error('PNG export failed:', err);
      toast.error('PNG export failed — see console');
    }
  };

  return { exportPng };
}
