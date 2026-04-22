import VisitorCounter from "./VisitorCounter";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 pt-5 font-mono text-[11px] text-ink-faint md:mr-[260px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>© johnprk · {new Date().getFullYear()}</span>
        <div className="flex items-center gap-3">
          <VisitorCounter />
          <span className="text-ink-faint/60">|</span>
          <span>built with next · three.js · study</span>
        </div>
      </div>
    </footer>
  );
}
