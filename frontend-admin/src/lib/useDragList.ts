import { useRef, useState, type DragEvent } from "react";

/** 排序模式拖拽列表状态：本地重排，保存时读取 items 提交 */
export function useDragList<T>() {
  const [items, setItems] = useState<T[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  function reset(next: T[]) {
    setItems(next);
    dragIndexRef.current = null;
    setDraggingIndex(null);
  }

  function onDragStart(e: DragEvent, index: number) {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // Firefox 需要 setData 才允许拖动
  }

  function onDragEnter(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setItems((list) => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
    setDraggingIndex(index);
  }

  function onDragEnd() {
    dragIndexRef.current = null;
    setDraggingIndex(null);
  }

  return { items, draggingIndex, reset, onDragStart, onDragEnter, onDragEnd };
}
