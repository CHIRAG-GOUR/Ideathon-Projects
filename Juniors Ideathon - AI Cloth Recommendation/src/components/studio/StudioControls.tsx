import React, { useState } from 'react';
import { 
  Bookmark, 
  RotateCcw, 
  Sparkles, 
  Info, 
  Camera, 
  ZoomIn, 
  Compass, 
  Check 
} from 'lucide-react';
import { useFashionStore } from '../../store/useFashionStore';
import confetti from 'canvas-confetti';

interface StudioControlsProps {
  onResetCamera: () => void;
  onSetCameraView: (view: 'default' | 'closeup' | 'back' | 'upper' | 'shoes') => void;
}

export function StudioControls({ onResetCamera, onSetCameraView }: StudioControlsProps) {
  const { 
    currentMood, 
    setMood, 
    saveCurrentLook, 
    resetOutfit,
    cameraView,
    equipped,
    currentPose,
    setPose,
    isPoseAutoFlow,
    togglePoseAutoFlow
  } = useFashionStore();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const moodsList = ['happy', 'calm', 'confident', 'tired', 'chill'] as const;

  const handleCycleMood = () => {
    const currentIdx = moodsList.indexOf(currentMood as typeof moodsList[number]);
    const nextMood = moodsList[(currentIdx + 1) % moodsList.length];
    setMood(nextMood, false);
  };

  const handleSave = () => {
    saveCurrentLook();
    setSavedSuccess(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FF8978', '#E9E4FF', '#DDF3E7', '#29243B']
    });
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <>
      {/* Top Left Floating Icons (as in reference FitMe image) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleCycleMood}
          title={`Cycle Mood (Current: ${currentMood})`}
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-border-light shadow-card flex items-center justify-center text-plum hover:text-coral hover:border-coral/40 hover:scale-105 active:scale-95 transition-all group"
        >
          <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12 text-coral" />
        </button>

        <button
          onClick={() => setShowInfoModal(true)}
          title="Virtual Studio & Rig Info"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-border-light shadow-card flex items-center justify-center text-plum-muted hover:text-plum hover:scale-105 active:scale-95 transition-all"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Top Right Floating Icons (as in reference FitMe image) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleSave}
          title="Save Outfit to Favorites"
          className={`w-10 h-10 rounded-2xl backdrop-blur-sm border shadow-card flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            savedSuccess 
              ? 'bg-mint text-teal border-teal/40' 
              : 'bg-white/95 text-plum border-border-light hover:text-coral hover:border-coral/40'
          }`}
        >
          {savedSuccess ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Bookmark className="w-4 h-4" />}
        </button>

        <button
          onClick={resetOutfit}
          title="Reset Equipped Outfit"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-border-light shadow-card flex items-center justify-center text-plum-muted hover:text-coral hover:border-coral/40 hover:scale-105 active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Camera Switcher & Model Pose Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none gap-2">
        {/* Model Editorial Poses Selector */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-full border border-border-light shadow-card text-[11px]">
          <span className="pl-2.5 pr-1 font-semibold text-plum-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            Pose:
          </span>
          <button
            onClick={() => setPose('runway-stride')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              currentPose === 'runway-stride' ? 'bg-coral text-white shadow-xs' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            Runway
          </button>
          <button
            onClick={() => setPose('hand-on-hip')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              currentPose === 'hand-on-hip' ? 'bg-coral text-white shadow-xs' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            Editorial
          </button>
          <button
            onClick={() => setPose('lapel-check')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              currentPose === 'lapel-check' ? 'bg-coral text-white shadow-xs' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            Lapel Check
          </button>
          <button
            onClick={() => setPose('casual-lean')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              currentPose === 'casual-lean' ? 'bg-coral text-white shadow-xs' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            Casual Lean
          </button>
          <button
            onClick={() => setPose('gq-turn')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              currentPose === 'gq-turn' ? 'bg-coral text-white shadow-xs' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            GQ Profile
          </button>
          <div className="w-[1px] h-4 bg-border-light mx-0.5" />
          <button
            onClick={togglePoseAutoFlow}
            title={isPoseAutoFlow ? "Disable continuous pose rotation" : "Enable continuous runway posing"}
            className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
              isPoseAutoFlow ? 'bg-lavender text-plum font-semibold' : 'text-plum-muted hover:text-plum hover:bg-ivory'
            }`}
          >
            <span>Auto</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isPoseAutoFlow ? 'bg-teal' : 'bg-border-light'}`} />
          </button>
        </div>

        {/* Camera viewpoint pills */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md rounded-full border border-border-light shadow-card text-xs">
          <button
            onClick={() => onSetCameraView('default')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              cameraView === 'default' ? 'bg-plum text-white shadow-xs' : 'text-plum-muted hover:text-plum'
            }`}
          >
            Full Body
          </button>
          <button
            onClick={() => onSetCameraView('upper')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              cameraView === 'upper' ? 'bg-plum text-white shadow-xs' : 'text-plum-muted hover:text-plum'
            }`}
          >
            Tops / Chest
          </button>
          <button
            onClick={() => onSetCameraView('shoes')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              cameraView === 'shoes' ? 'bg-plum text-white shadow-xs' : 'text-plum-muted hover:text-plum'
            }`}
          >
            Pants & Shoes
          </button>
          <button
            onClick={() => onSetCameraView('closeup')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              cameraView === 'closeup' ? 'bg-plum text-white shadow-xs' : 'text-plum-muted hover:text-plum'
            }`}
          >
            Face / Mood
          </button>
          <button
            onClick={() => onSetCameraView('back')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              cameraView === 'back' ? 'bg-plum text-white shadow-xs' : 'text-plum-muted hover:text-plum'
            }`}
          >
            Rear
          </button>
          <button
            onClick={onResetCamera}
            title="Reset Orbit Camera"
            className="p-1 rounded-full text-plum-muted hover:text-plum hover:bg-ivory transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 360 Curved Rotation Indicator matching screenshot */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-plum-muted tracking-wide select-none opacity-80">
          <svg className="w-5 h-5 text-plum-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12a8 8 0 0 1 14.93-4" strokeLinecap="round"/>
            <polyline points="20 4 20 8 16 8"/>
          </svg>
          <span>360° DRAG TO ROTATE</span>
          <svg className="w-5 h-5 text-plum-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 12a8 8 0 0 1-14.93 4" strokeLinecap="round"/>
            <polyline points="4 20 4 16 8 16"/>
          </svg>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-border-light shadow-float">
            <div className="flex items-center justify-between pb-3 border-b border-border-light mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lavender flex items-center justify-center text-plum font-bold text-sm">
                  3D
                </div>
                <div>
                  <h3 className="font-bold text-plum text-base">WearWise Virtual Studio</h3>
                  <p className="text-xs text-plum-muted">Real-Time WebGL Character & Garment Rig</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-plum-muted hover:text-plum"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-plum-muted leading-relaxed">
              <p>
                <strong className="text-plum font-semibold">Hero 3D Model:</strong> An anatomically rigged humanoid avatar with facial blendshapes (smiling, opening) and skeletal posture controllers.
              </p>
              <p>
                <strong className="text-plum font-semibold">Real-Time Mood Response:</strong> Changing moods smoothly lerps bone rotations (shoulders, spine, head) and facial morph targets without page reloads.
              </p>
              <p>
                <strong className="text-plum font-semibold">PBR Fabrics:</strong> Garments feature custom physically based materials for French Terry, Merino wool, Raw Denim, and Nappa Leather.
              </p>
              <p>
                <strong className="text-plum font-semibold">Interaction:</strong> Drag any wardrobe card directly onto the avatar, or click "Wear" on any item.
              </p>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-6 w-full btn-primary"
            >
              Got it, let's style
            </button>
          </div>
        </div>
      )}
    </>
  );
}
