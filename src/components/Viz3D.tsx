import {
  ArcRotateCamera,
  Color3,
  Engine,
  type EngineOptions,
  HemisphericLight,
  Mesh,
  Scene,
  type SceneOptions,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { useEffect, useRef } from "react";
// import * as anu from "../../../anu/";
import { useRawDataStore } from "@/store/useRawDataStore";
import * as anu from "@jpmorganchase/anu";
import { extent, quantile, scaleLinear, scalePoint, utcFormat } from "d3";

const onSceneReady = (
  scene: Scene,
  dimensions: string[],
  values: Record<string, number>[]
) => {
  // SET UP CAMERA
  //Add a camera that rotates around the origin and adjust its properties
  const camera = new ArcRotateCamera(
    "Camera",
    -(Math.PI / 4) * 3,
    Math.PI / 4,
    10,
    new Vector3(0, 0, 0),
    scene
  );
  camera.wheelPrecision = 20; // Adjust the sensitivity of the mouse wheel's zooming
  camera.minZ = 0; // Adjust the distance of the camera's near plane
  camera.attachControl(true); // Allow the camera to respond to user controls
  camera.position = new Vector3(-3, 2, -3);

  // SET UP LIGHT
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;
  const data = values;
  // This variable dynamically sets the x scale; it should be used as negative and positive value for scaleX in order to ensure that it will be stretched along the center
  const xExtension = Math.max(Math.min(data.length / 20, 4), 2);
  const scaleX = scaleLinear()
    // @ts-expect-error d3 typing has issues
    .domain(extent(data, (d) => Number(+d.timestamp)))
    .range([-xExtension, xExtension]); // Adjust range according to your visualization needs
  const scaleY = scaleLinear().domain([1, 10]);

  //Specify the columns in our dataset that should each be its own line

  const scaleZ = scalePoint().domain(dimensions).range([-1, 1]);
  // scaleLinear().domain([10, 40]).range(["blue", "red"]);
  // let scaleColor = scaleSequential(interpolateBlues).domain([10, 40]);
  //For each column/year/line, map it to its x, y, and z position along each timestep using the D3 scale functions
  const paths = dimensions.map((col) => {
    return data.map(
      (row) =>
        new Vector3(
          scaleX(Number(row.timestamp)),
          scaleY(Number(row[col])),
          scaleZ(col)
        )
    );
  });

  //Bind a new CoT
  const CoT = anu.bind("cot");

  //Bind a new ribbon mesh to the CoT, which we will need to update manually to create our 3D line chart
  CoT.bind(
    "ribbon",
    {
      pathArray: paths,
      updatable: true,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    []
  );

  const formatTime = utcFormat("%M:%S:%L");
  //Use the createAxes() Anu helper function to create the axes for us based on our D3 scale functions
  //Also adjust its visual properties to properly format the axes labels

  anu.createAxes("test", scene, {
    parent: CoT,
    scale: { x: scaleX, y: scaleY, z: scaleZ },
    // domainMaterialOptions: { color: Color3.White(), width: 4 },
    // gridTicks: { x: scaleX.ticks() },
    // labelTicks: { x: scaleX.ticks() },
    labelTicks: {
      x: scaleX.ticks(5),
      y: scaleY.ticks(5),
    },
    labelFormat: {
      // @ts-expect-error anu typing has issues

      x: (text: number) => formatTime(text),
    },
  });

  // Calculate the thresholds using D3
  const allYValues = data.flatMap((row) =>
    dimensions.map((col) => Number(row[col]))
  );

  const threshold25 = quantile(allYValues, 0.25);
  const threshold45 = quantile(allYValues, 0.5);
  const threshold55 = quantile(allYValues, 0.75);

  // Define a function to determine the color based on a Y-value
  const getColorByValue = (value: number) => {
    if (threshold25 !== undefined && value <= threshold25) {
      return Color3.White();
    }
    if (
      threshold25 !== undefined &&
      threshold45 !== undefined &&
      value > threshold25 &&
      value <= threshold45
    ) {
      return Color3.Yellow();
    }
    if (
      threshold45 !== undefined &&
      threshold55 !== undefined &&
      value > threshold45 &&
      value <= threshold55
    ) {
      return Color3.Magenta();
    }
    return Color3.Red();
  };

  //Add some additional red lines for each line (column)
  CoT.bind("lineSystem", { lines: paths })
    .attr("color", Color3.Teal())
    .prop("alpha", 0.3);

  const spheres = CoT.bind(
    "sphere",
    { diameter: 0.03 },
    paths.flatMap((d) => [...d])
  );
  spheres.position((d: number) => d);
  spheres
    .material(
      // @ts-expect-error anu typing has issues
      (_1, _2, index) => new StandardMaterial("myMaterial" + index, scene)
    )
    .diffuseColor((d: { y: number }) => getColorByValue(scaleY.invert(d.y)));
};

export const Viz3D = () => {
  const dimensions = useRawDataStore((state) => state.dimensions);
  const values = useRawDataStore((state) => state.values);

  return (
    <SceneComponent
      antialias
      onSceneReady={(scene) => onSceneReady(scene, dimensions, values)}
      id="my-canvas"
      className="w-full h-full flex-1"
    />
  );
};

interface SceneProps
  extends React.DetailedHTMLProps<
    React.CanvasHTMLAttributes<HTMLCanvasElement>,
    HTMLCanvasElement
  > {
  antialias?: boolean;
  engineOptions?: EngineOptions;
  sceneOptions?: SceneOptions;
  onRender?: (scene: Scene) => void;
  onSceneReady?: (scene: Scene) => void;
}

const SceneComponent = ({
  antialias,
  engineOptions,
  sceneOptions,
  onRender,
  onSceneReady,
  ...rest
}: SceneProps) => {
  const reactCanvas = useRef(null);

  // set up basic engine and scene
  useEffect(() => {
    const { current: canvas } = reactCanvas;

    if (!canvas) return;

    const engine = new Engine(canvas, antialias, engineOptions);
    const scene = new Scene(engine, sceneOptions);
    if (scene.isReady()) {
      onSceneReady?.(scene);
    } else {
      scene.onReadyObservable.addOnce((scene) => onSceneReady?.(scene));
    }

    engine.runRenderLoop(() => {
      if (typeof onRender === "function") onRender(scene);
      scene.render();
    });

    const resize = () => {
      scene.getEngine().resize();
    };

    if (window) {
      window.addEventListener("resize", resize);
    }

    return () => {
      scene.getEngine().dispose();

      if (window) {
        window.removeEventListener("resize", resize);
      }
    };
  }, [antialias, engineOptions, sceneOptions, onRender, onSceneReady]);

  return <canvas ref={reactCanvas} {...rest} />;
};
