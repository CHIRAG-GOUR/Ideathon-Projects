import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { StudioCanvas } from '../studio/StudioCanvas';
import { User, Sparkles, Check, Smile, RefreshCw } from 'lucide-react';

export function AvatarCustomisationView() {
  const { 
    avatarCustomization, 
    updateAvatarCustomization, 
    setCameraView 
  } = useFashionStore();

  const skinTones = [
    { name: 'Porcelain Ivory', hex: '#F7DFD4' },
    { name: 'Warm Beige', hex: '#EAC8B0' },
    { name: 'Golden Honey', hex: '#D6A374' },
    { name: 'Caramel Bronze', hex: '#B27C4E' },
    { name: 'Deep Espresso', hex: '#684534' }
  ];

  const eyeColors = [
    { name: 'Oceanic Blue', hex: '#3B6E8C' },
    { name: 'Warm Hazel', hex: '#634D2E' },
    { name: 'Deep Amber', hex: '#2E2018' },
    { name: 'Emerald Sage', hex: '#3A5C45' }
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Center 3D Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-editorial font-extrabold text-2xl text-plum">
                Avatar Appearance & Rig
              </h2>
              <p className="text-xs text-plum-muted">
                Tune facial pigment, hair tint, and skeletal posture bias in real-time.
              </p>
            </div>
            <button
              onClick={() => setCameraView('closeup')}
              className="btn-secondary text-xs"
            >
              Zoom to Face
            </button>
          </div>
          <StudioCanvas />
        </div>

        {/* Right Customization Controls */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Skin Tone Palette */}
          <div className="card-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-plum">Skin Pigment</span>
              <span className="text-xs text-plum-muted font-medium">Photorealistic PBR</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {skinTones.map((tone) => {
                const isSelected = avatarCustomization.skinTone === tone.hex;
                return (
                  <button
                    key={tone.hex}
                    onClick={() => updateAvatarCustomization({ skinTone: tone.hex })}
                    title={tone.name}
                    className={`flex flex-col items-center p-2 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-coral bg-coral-light/20 scale-105 shadow-sm'
                        : 'border-border-light hover:border-plum/20 bg-ivory/60'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full border border-plum/10 shadow-xs mb-1"
                      style={{ backgroundColor: tone.hex }}
                    />
                    <span className="text-[10px] text-plum-muted font-medium text-center truncate w-full">
                      {tone.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Facial Hair Controls */}
          <div className="card-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-plum block">Facial Hair & Stubble</span>
                <span className="text-xs text-plum-muted">Modeled 3D beard mesh</span>
              </div>
              <button
                onClick={() => updateAvatarCustomization({ beardVisible: !avatarCustomization.beardVisible })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  avatarCustomization.beardVisible
                    ? 'bg-plum text-white shadow-xs'
                    : 'bg-ivory text-plum-muted border border-border-light'
                }`}
              >
                {avatarCustomization.beardVisible ? 'Beard On' : 'Clean Shave'}
              </button>
            </div>
          </div>

          {/* Reset Baseline */}
          <button
            onClick={() => updateAvatarCustomization({
              skinTone: '#EAC8B0',
              hairColor: '#362B28',
              beardVisible: true,
              eyeColor: '#4A6984'
            })}
            className="w-full btn-secondary text-xs py-2.5"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Reset Avatar to Default Studio Preset</span>
          </button>

        </div>
      </div>
    </div>
  );
}
