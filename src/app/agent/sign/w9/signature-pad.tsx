"use client";

import { useRef, forwardRef, useImperativeHandle, useState } from "react";

export type SignatureHandle = { toPng: () => string | null; clear: () => void };

const SignaturePad = forwardRef<SignatureHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }

  useImperativeHandle(ref, () => ({
    toPng: () => (dirty ? canvasRef.current!.toDataURL("image/png") : null),
    clear: () => {
      const c = canvasRef.current!;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      setDirty(false);
    },
  }));

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={120}
        className="w-full touch-none rounded-lg border border-slate-300 bg-white"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current!.getContext("2d")!;
          const { x, y } = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0f172a";
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext("2d")!;
          const { x, y } = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          setDirty(true);
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerLeave={() => (drawing.current = false)}
      />
      <button
        type="button"
        onClick={() => {
          const c = canvasRef.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setDirty(false);
        }}
        className="mt-1 text-xs text-slate-500 hover:text-navy"
      >
        Clear signature
      </button>
    </div>
  );
});

export default SignaturePad;
