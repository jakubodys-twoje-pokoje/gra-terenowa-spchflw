/* eslint-disable @next/next/no-img-element */

// logoHeight kept for backwards compat — not used visually
interface Props {
  logoHeight?: string;
}

export default function PartnerLogos({ logoHeight: _logoHeight }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">
        Organizator
      </p>
      <a href="https://speechflow.org" target="_blank" rel="noopener noreferrer"
        className="hover:opacity-75 transition-opacity">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10">
          <img src="/icons/speechflow-logo.png" alt="SpeechFlow" className="h-7 w-auto object-contain" />
        </div>
      </a>
    </div>
  );
}
