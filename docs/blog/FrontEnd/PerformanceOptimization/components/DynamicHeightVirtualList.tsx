import React, { useRef, useState, useEffect } from "react";

const DynamicHeightVirtualList = ({ totalCount, renderItem, height }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [heights, setHeights] = useState(new Array(totalCount).fill(50)); // 初始估值
  const containerRef = useRef(null);
  const itemRefs = useRef({});

  // 动态测量高度
  useEffect(() => {
    Object.keys(itemRefs.current).forEach((key) => {
      const node = itemRefs.current[key];
      if (node) {
        const h = node.getBoundingClientRect().height;
        if (heights[key] !== h) {
          setHeights((prev) => {
            const next = [...prev];
            next[key] = h;
            return next;
          });
        }
      }
    });
  }, [scrollTop]);

  // 计算累计位置
  const positions = heights.reduce((acc, h, i) => {
    acc.push((acc[i - 1] || 0) + h);
    return acc;
  }, []);

  // 二分查找 startIndex
  const findStartIndex = (scrollTop) => {
    let low = 0,
      high = totalCount - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return low;
  };

  const startIndex = findStartIndex(scrollTop);
  let offsetY = positions[startIndex - 1] || 0;
  let endIndex = startIndex;
  let sumHeight = 0;
  while (endIndex < totalCount && sumHeight < height) {
    sumHeight += heights[endIndex];
    endIndex++;
  }

  return (
    <div
      ref={containerRef}
      style={{ overflowY: "auto", height }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: positions[totalCount - 1] }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {Array.from({ length: endIndex - startIndex }).map((_, i) => {
            const idx = startIndex + i;
            return (
              <div key={idx} ref={(el) => (itemRefs.current[idx] = el)}>
                {renderItem(idx)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { DynamicHeightVirtualList };
