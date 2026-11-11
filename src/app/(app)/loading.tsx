export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-3 h-4 w-32" /><div className="skeleton mb-8 h-10 w-80" />
      <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>
      <div className="skeleton mt-6 h-64" />
    </div>
  );
}
