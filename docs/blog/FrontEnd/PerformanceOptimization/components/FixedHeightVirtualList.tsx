import React, { useState, useRef } from "react";

const FixedHeightVirtualList = ({
  itemHeight,
  totalCount,
  renderItem,
  height,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(height / itemHeight);
  const endIndex = Math.min(totalCount - 1, startIndex + visibleCount);

  const offsetY = startIndex * itemHeight;
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(renderItem(i));
  }

  return (
    <div
      ref={containerRef}
      style={{ overflowY: "auto", height }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: totalCount * itemHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems}
        </div>
      </div>
    </div>
  );
};

export { FixedHeightVirtualList };
export default FixedHeightVirtualList;
