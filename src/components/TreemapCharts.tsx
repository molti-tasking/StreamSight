import * as d3 from "d3";
import { useMemo } from "react";

type ClusterComponentType = (props: {
  totalMaxWidth: number;
  currentWidth: number;
}) => React.ReactNode;

interface TreemapProps {
  height?: number;
  width?: number;

  leaves: {
    name: string;
    /**
     * The significance of the leaf to be indicating the size of the children component.
     */
    significance: number;
    ClusterComponent: ClusterComponentType;
  }[];
}

type LeafDatum = {
  name: string;
  size: number;
  ClusterComponent: ClusterComponentType;
};

export const TreemapCharts = ({
  height = 400,
  width = 600,
  ...props
}: TreemapProps) => {
  // Pure layout: d3.treemap computes tile rectangles from the leaves' sizes.
  const { nodes, maxWidth } = useMemo(() => {
    const data = {
      children: (props.leaves ?? []).map((leaf) => ({
        name: leaf.name,
        size: leaf.significance,
        ClusterComponent: leaf.ClusterComponent,
      })),
    } as unknown as LeafDatum;

    const root = d3
      .hierarchy<LeafDatum>(data)
      .sum((d) => d.size ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const laidOut = d3.treemap<LeafDatum>().size([width, height]).padding(4)(
      root
    );

    const nodes = laidOut.leaves().map((d) => ({
      x: d.x0,
      y: d.y0,
      width: d.x1 - d.x0,
      height: d.y1 - d.y0,
      ClusterComponent: d.data.ClusterComponent,
    }));
    const maxWidth = Math.max(0, ...nodes.map((node) => node.width));
    return { nodes, maxWidth };
  }, [height, width, props.leaves]);

  return (
    <div style={{ position: "relative", width, height }}>
      {nodes.map(({ x, y, width, height, ClusterComponent }, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: width,
            height: height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: "rgba(238, 238, 238, 0.2)",
            // FLIP-style animation: cells smoothly resize/reposition as cluster
            // sizes change between ticks instead of snapping.
            transition: "left 500ms ease, top 500ms ease, width 500ms ease, height 500ms ease",
          }}
        >
          <ClusterComponent currentWidth={width} totalMaxWidth={maxWidth} />
        </div>
      ))}
    </div>
  );
};
