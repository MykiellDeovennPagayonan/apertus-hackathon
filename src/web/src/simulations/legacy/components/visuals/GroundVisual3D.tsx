export function GroundVisual3D({
  width,
  depth,
  color,
}: {
  width: number;
  depth: number;
  color: string;
}) {
  return (
    <>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={color} />
    </>
  );
}
