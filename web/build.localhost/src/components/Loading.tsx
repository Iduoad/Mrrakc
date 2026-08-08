// Centered spinner sized to fill whatever container it is dropped into.
export default function Loading({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-terra" />
        <p className="font-serif italic text-terra">{label}</p>
      </div>
    </div>
  );
}
