/* eslint-disable @next/next/no-img-element */

export default function PartnerLogos() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">
        Organizator
      </p>
      <a href="https://speechflow.org" target="_blank" rel="noopener noreferrer"
        className="hover:opacity-75 transition-opacity">
        <div className="px-4 py-2 rounded-xl bg-white/10 text-white font-extrabold text-sm tracking-wide">
          speechflow.org
        </div>
      </a>
    </div>
  );
}
