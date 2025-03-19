import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

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

export const TreemapCharts = ({
  height = 400,
  width = 600,
  ...props
}: TreemapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>(0);
  const [nodes, setNodes] = useState<
    {
      x: number;
      y: number;
      width: number;
      height: number;
      ClusterComponent: ClusterComponentType;
    }[]
  >([]);

  const buildTreemap = () => {
    const data = {
      children: [
        ...props.leaves?.map((leaf) => ({
          name: leaf.name,
          size: leaf.significance,
          ClusterComponent: leaf.ClusterComponent,
        })),
      ],
    };

    // 1. Construct a root node with d3.hierarchy
    // 2. Sum values for each node.
    // 3. Optionally sort nodes based on descending value.
    const root = d3
      .hierarchy(data)
      // @ts-expect-error typing needs to be fixed
      .sum((d) => d.size)
      // @ts-expect-error typing needs to be fixed
      .sort((a, b) => b.value - a.value);

    // Initialize treemap layout
    // @ts-expect-error typing needs to be fixed
    d3.treemap().size([width, height]).padding(4)(root);
    let newMaxWidth = 0;
    const newNodes = root.leaves()?.map((d) => {
      // @ts-expect-error typing needs to be fixed
      const width = d.x1 - d.x0;
      if (width > newMaxWidth) {
        newMaxWidth = width;
      }
      return {
        // @ts-expect-error typing needs to be fixed
        x: d.x0,
        // @ts-expect-error typing needs to be fixed
        y: d.y0,
        width,
        // @ts-expect-error typing needs to be fixed
        height: d.y1 - d.y0,
        // @ts-expect-error typing needs to be fixed
        ClusterComponent: d.data.ClusterComponent,
      };
    });

    setNodes(newNodes);
    setMaxWidth(newMaxWidth);

    // Select the <svg> element and set up attributes
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create a color scale for rectangles
    // const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Bind data for each leaf node
    const leaves = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      // @ts-expect-error typing needs to be fixed
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaves
      .append("rect")
      // @ts-expect-error typing needs to be fixed
      .attr("width", (d) => d.x1 - d.x0)
      // @ts-expect-error typing needs to be fixed
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", () => "#eee")
      .attr("fill-opacity", 0.2);
  };

  useEffect(() => {
    buildTreemap();
  }, [height, width, props.leaves]);
  console.log("Render treemap with leaves: ", props.leaves?.length);
  return (
    <div style={{ position: "relative", width, height }}>
      <svg ref={svgRef} style={{ position: "absolute", top: 0, left: 0 }} />
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
          }}
        >
          <ClusterComponent currentWidth={width} totalMaxWidth={maxWidth} />
        </div>
      ))}
    </div>
  );
};
