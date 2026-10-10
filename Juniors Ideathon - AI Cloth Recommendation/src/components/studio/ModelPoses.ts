export type FashionPoseId = 'runway-stride' | 'hand-on-hip' | 'lapel-check' | 'casual-lean' | 'gq-turn';

export interface ModelPoseDefinition {
  id: FashionPoseId;
  label: string;
  subtitle: string;
  head: [number, number, number];
  neck: [number, number, number];
  spine: [number, number, number];
  spine1: [number, number, number];
  hips: [number, number, number];
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftForeArm: [number, number, number];
  rightForeArm: [number, number, number];
  leftUpLeg: [number, number, number];
  rightUpLeg: [number, number, number];
}

export const FASHION_POSES: Record<FashionPoseId, ModelPoseDefinition> = {
  'runway-stride': {
    id: 'runway-stride',
    label: 'Runway Stride',
    subtitle: 'Dynamic fashion catwalk forward stride',
    head: [-0.02, 0.0, 0.0],
    neck: [-0.01, 0.0, 0.0],
    spine: [0.02, 0.0, 0.0],
    spine1: [0.01, 0.0, 0.0],
    hips: [0.02, 0.06, -0.01],
    leftArm: [0.42, 0.0, 0.05],
    rightArm: [0.38, 0.0, -0.05],
    leftForeArm: [0.0, 0.0, 0.15],
    rightForeArm: [0.0, 0.0, -0.10],
    leftUpLeg: [0.16, 0.04, 0.0],
    rightUpLeg: [-0.12, -0.04, 0.0]
  },

  'hand-on-hip': {
    id: 'hand-on-hip',
    label: 'Hand on Hip',
    subtitle: 'High-fashion editorial contrapposto with left hand on hip',
    head: [0.04, -0.10, -0.06],
    neck: [0.02, -0.05, -0.03],
    spine: [-0.02, 0.08, -0.04],
    spine1: [0.0, 0.06, -0.02],
    hips: [0.02, -0.12, 0.08],
    leftArm: [0.46, 0.0, 0.20],
    rightArm: [0.42, 0.0, 0.0],
    leftForeArm: [0.0, 0.0, 0.65],
    rightForeArm: [0.0, 0.0, -0.10],
    leftUpLeg: [0.08, -0.06, 0.04],
    rightUpLeg: [-0.05, 0.04, -0.06]
  },

  'lapel-check': {
    id: 'lapel-check',
    label: 'Lapel Check',
    subtitle: 'Thoughtful collar and texture inspection with right hand',
    head: [0.14, 0.08, 0.02],
    neck: [0.08, 0.04, 0.01],
    spine: [0.02, 0.04, 0.0],
    spine1: [0.01, 0.02, 0.0],
    hips: [0.0, 0.02, 0.01],
    leftArm: [0.42, 0.0, 0.0],
    rightArm: [0.32, 0.0, -0.22],
    leftForeArm: [0.0, 0.0, 0.10],
    rightForeArm: [0.0, 0.0, -0.80],
    leftUpLeg: [0.02, 0.01, 0.0],
    rightUpLeg: [-0.02, -0.01, 0.0]
  },

  'casual-lean': {
    id: 'casual-lean',
    label: 'Casual Lean',
    subtitle: 'Relaxed streetwear stance with natural arm drape',
    head: [-0.02, 0.08, 0.04],
    neck: [0.0, 0.05, 0.02],
    spine: [-0.02, -0.04, 0.03],
    spine1: [-0.01, -0.02, 0.01],
    hips: [-0.02, 0.06, -0.04],
    leftArm: [0.40, 0.0, 0.04],
    rightArm: [0.42, 0.0, -0.02],
    leftForeArm: [0.0, 0.0, 0.15],
    rightForeArm: [0.0, 0.0, -0.12],
    leftUpLeg: [0.06, -0.05, -0.04],
    rightUpLeg: [-0.03, 0.03, 0.02]
  },

  'gq-turn': {
    id: 'gq-turn',
    label: 'GQ 3/4 Turn',
    subtitle: 'Editorial angled profile with confident chin raise',
    head: [0.02, -0.38, -0.02],
    neck: [0.0, -0.10, 0.0],
    spine: [0.0, 0.14, 0.0],
    spine1: [0.0, 0.10, 0.0],
    hips: [0.0, 0.32, 0.0],
    leftArm: [0.42, 0.0, 0.0],
    rightArm: [0.40, 0.0, 0.0],
    leftForeArm: [0.0, 0.0, 0.12],
    rightForeArm: [0.0, 0.0, -0.12],
    leftUpLeg: [0.04, 0.10, 0.0],
    rightUpLeg: [-0.04, 0.10, 0.0]
  }
};
