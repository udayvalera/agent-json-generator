// src/hooks/useCanvasZoom.ts
import { useState, useRef, useCallback } from 'react';
import { AgentNode } from '../types/workflow';

export const useCanvasZoom = (nodes: AgentNode[]) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      e.preventDefault();
    }
  }, [canvasOffset]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setCanvasOffset(newOffset);
    }
  }, [isDraggingCanvas, dragStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));

  const handleZoomToFit = useCallback(() => {
    if (nodes.length === 0 || !canvasRef.current) return;

    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const nodeWidth = 320; // w-80 in WorkflowNode
    const nodeHeight = 300; // Estimated average height

    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const padding = 100;

    const zoomX = canvasWidth / (boundsWidth + padding * 2);
    const zoomY = canvasHeight / (boundsHeight + padding * 2);
    const newZoom = Math.min(zoomX, zoomY, 2);

    const newCanvasOffsetX = (canvasWidth - (boundsWidth * newZoom)) / 2 - minX * newZoom;
    const newCanvasOffsetY = (canvasHeight - (boundsHeight * newZoom)) / 2 - minY * newZoom;

    setZoom(newZoom);
    setCanvasOffset({ x: newCanvasOffsetX, y: newCanvasOffsetY });
  }, [nodes]);

  return {
    canvasRef,
    zoom,
    canvasOffset,
    isDraggingCanvas,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleZoomIn,
    handleZoomOut,
    handleZoomToFit
  };
};