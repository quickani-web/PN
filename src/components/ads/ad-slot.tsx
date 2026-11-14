export function AdSlot({
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`min-h-24 w-full ${className}`}
      aria-hidden="true"
      data-ad-slot
    />
  );
}
