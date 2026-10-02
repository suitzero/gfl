export interface ExampleScene {
  id: string;
  name: string;
  description: string;
  gfl: string;
}

export const EXAMPLE_SCENES: ExampleScene[] = [
  {
    id: 'scene-a-simple',
    name: 'Sphere and Floor',
    description: 'A simple scene with a sphere and a floor plane.',
    gfl: `
(scene
  (camera :position [0 2 5] :fov 45)
  (union
    (sphere :radius 1.0 :center [0 1 0])
    (plane :normal [0 1 0] :offset 0)
  )
)
`.trim()
  },
  {
    id: 'scene-b-robot',
    name: 'Multi-primitive Robot',
    description: 'A multi-primitive character/robot composed of spheres and boxes with material colors.',
    gfl: `
(scene
  (camera :position [0 2 8] :fov 45)
  (union
    (material :color [0.8 0.8 0.8]
      (plane :normal [0 1 0] :offset 0)
    )
    (translate :offset [0 1.5 0]
      (union
        (material :color [0.2 0.5 0.8]
          (box :size [0.5 0.5 0.5])
        )
        (translate :offset [0 0.8 0]
          (material :color [0.9 0.1 0.1]
            (sphere :radius 0.4)
          )
        )
      )
    )
  )
)
`.trim()
  },
  {
    id: 'scene-c-complex',
    name: 'Repeating Complex Object',
    description: 'A long naive program creating a complex repeating pattern.',
    gfl: `
(scene
  (camera :position [0 5 10] :fov 45)
  (union
    (plane :normal [0 1 0] :offset 0)
    (translate :offset [-2 1 0] (sphere :radius 1))
    (translate :offset [0 1 0] (sphere :radius 1))
    (translate :offset [2 1 0] (sphere :radius 1))
    (translate :offset [-2 3 0] (sphere :radius 1))
    (translate :offset [0 3 0] (sphere :radius 1))
    (translate :offset [2 3 0] (sphere :radius 1))
  )
)
`.trim()
  }
];

export function loadExample(id: string): string | undefined {
  return EXAMPLE_SCENES.find(s => s.id === id)?.gfl;
}

// Scene switcher hook for UI integration
type SceneChangeListener = (gfl: string) => void;
const listeners: SceneChangeListener[] = [];

export function onSceneChanged(listener: SceneChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function dispatchSceneChange(gfl: string): void {
  for (const listener of listeners) {
    listener(gfl);
  }
}
