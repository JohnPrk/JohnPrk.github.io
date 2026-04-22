export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-line pt-5 font-mono text-[11px] text-ink-faint">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>© johnprk · {new Date().getFullYear()}</span>
        <span>built with next · pages · study</span>
      </div>
    </footer>
  );
}
