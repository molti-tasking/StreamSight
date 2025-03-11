import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

type ClusterComponentType = (props: {
  totalMaxWidth: number;
  currentWidth: number;
}) => React.ReactNode;

interface TreeMapProps {
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

export const TreeMap = ({
  height = 400,
  width = 600,
  ...props
}: TreeMapProps) => {
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
    console.log("Build treemap with leaves: ", props.leaves.length);
    // Sample data (feel free to replace with your own)
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
      .sum((d) => d.size)
      .sort((a, b) => b.value - a.value);

    // Initialize treemap layout
    d3.treemap().size([width, height]).padding(4)(root);
    let newMaxWidth = 0;
    const newNodes = root.leaves()?.map((d) => {
      const width = d.x1 - d.x0;
      if (width > newMaxWidth) {
        newMaxWidth = width;
      }
      return {
        x: d.x0,
        y: d.y0,
        width,
        height: d.y1 - d.y0,
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
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaves
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
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
