'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { X, Share2, Facebook } from 'lucide-react';

interface Props {
  icon: string;
  name: string;
  description: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gra.speechflow.org';

export default function AchievementBadge({ icon, name, description, color, unlocked, unlockedAt }: Props) {
  const [open, setOpen] = useState(false);

  const shareText = `Zdobyłem odznakę „${name}" w logopedycznej grze terenowej SpeechFlow! 🏆 Dołącz do zabawy:`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Odznaka: ${name}`, text: shareText, url: SITE_URL });
      } catch { /* user cancelled */ }
    } else {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(shareText)}`,
        '_blank', 'noopener,noreferrer,width=600,height=500',
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => unlocked && setOpen(true)}
        className={clsx(
          'flex flex-col items-center p-4 rounded-3xl border-2 transition-all duration-300 w-full text-left',
          unlocked
            ? 'bg-white border-transparent shadow-card active:scale-95'
            : 'bg-gray-50 border-dashed border-gray-200 opacity-60 grayscale cursor-default',
        )}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner"
          style={{ background: unlocked ? `${color}22` : '#e5e7eb' }}
        >
          <span className={clsx(!unlocked && 'opacity-30')}>{icon}</span>
        </div>
        <h3
          className="font-bold text-center text-sm leading-tight"
          style={{ color: unlocked ? color : '#9ca3af' }}
        >
          {name}
        </h3>
        <p className="text-gray-400 text-xs text-center mt-1 leading-snug">{description}</p>
        {unlocked && unlockedAt && (
          <p className="text-ocean-400 text-xs mt-2">
            {new Date(unlockedAt).toLocaleDateString('pl-PL')}
          </p>
        )}
        {!unlocked && (
          <p className="text-gray-400 text-xs mt-2">🔒 Zablokowana</p>
        )}
      </button>

      {/* Badge detail popup */}
      {open && (
        <div
          className="fixed inset-0 z-[900] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Close */}
            <div className="flex justify-end px-4 pb-0">
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 p-1">
                <X size={18} />
              </button>
            </div>

            {/* Badge icon */}
            <div className="flex flex-col items-center px-6 pb-2">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg mb-4"
                style={{ background: `${color}22` }}
              >
                {icon}
              </div>
              <h2 className="text-xl font-extrabold text-center" style={{ color }}>
                {name}
              </h2>
              <p className="text-gray-400 text-sm text-center mt-2 leading-relaxed">{description}</p>
              {unlockedAt && (
                <p className="text-ocean-400 text-xs mt-2">
                  Odblokowana {new Date(unlockedAt).toLocaleDateString('pl-PL')}
                </p>
              )}
            </div>

            {/* Share buttons */}
            <div className="px-6 pt-4 space-y-2.5">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition"
                style={{ background: color }}
              >
                <Share2 size={16} />
                Udostępnij osiągnięcie
              </button>
              <button
                onClick={() => {
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(shareText)}`,
                    '_blank', 'noopener,noreferrer,width=600,height=500',
                  );
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm bg-[#1877F2] text-white transition"
              >
                <Facebook size={16} />
                Udostępnij na Facebooku
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
