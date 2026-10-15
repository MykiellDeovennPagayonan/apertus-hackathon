import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

// Keep labels in the scene's renderer so teardown doesn't unmount nested DOM roots.
export function TownLabel({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    context.font = "600 28px sans-serif";
    canvas.width = Math.ceil(context.measureText(text).width) + 48;
    canvas.height = 64;
    context.font = "600 28px sans-serif";
    context.fillStyle = "#fffbef";
    context.beginPath();
    context.roundRect(1, 1, canvas.width - 2, 62, 12);
    context.fill();
    context.strokeStyle = "#d5cdbb";
    context.stroke();
    context.fillStyle = "#365c52";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, 32);
    const label = new CanvasTexture(canvas);
    label.colorSpace = SRGBColorSpace;
    setTexture(label);
    return () => label.dispose();
  }, [text]);

  if (!texture) return null;
  return (
    <sprite
      position={position}
      scale={[texture.image.width / 40, 1.6, 1]}
      renderOrder={1}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
