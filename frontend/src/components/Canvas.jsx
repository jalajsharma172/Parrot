import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../services/SocketContext';
import { Undo, Trash2, Edit3 } from 'lucide-react';

const COLORS = [
  '#000000', // Black
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Yellow
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ffffff'  // White (Eraser)
];

const BRUSH_SIZES = [2, 5, 10, 20];

export default function Canvas({ isDrawer }) {
  const { socket, gameState } = useSocket();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  // Track local list of drawing operations for quick local rendering / redrawing
  const strokesRef = useRef([]);

  // Base canvas logical size
  const LOGICAL_WIDTH = 800;
  const LOGICAL_HEIGHT = 600;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set logical dimensions
    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Redraw canvas if there are existing strokes (sync mid-game joins)
    if (gameState.drawingStrokes && gameState.drawingStrokes.length > 0) {
      drawHistory(gameState.drawingStrokes);
    }
  }, []);

  // Update canvas when drawingStrokes updates (sync mid-game joins or general updates)
  useEffect(() => {
    if (!isDrawer && gameState.drawingStrokes) {
      drawHistory(gameState.drawingStrokes);
    }
  }, [gameState.drawingStrokes, isDrawer]);

  // Handle incoming socket drawing events (for non-drawers)
  useEffect(() => {
    if (!socket || isDrawer) return;

    const handleDrawData = (data) => {
      const ctx = contextRef.current;
      if (!ctx) return;

      if (data.type === 'start') {
        ctx.beginPath();
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.moveTo(data.x, data.y);
      } else if (data.type === 'move') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (data.type === 'end') {
        ctx.closePath();
      }
    };

    const handleClear = () => {
      clearLocalCanvas();
    };

    const handleUndo = () => {
      // For undo, we clear and redraw based on updated state if needed.
    };

    socket.on('draw_data', handleDrawData);
    socket.on('canvas_clear', handleClear);
    socket.on('draw_undo', handleUndo);

    return () => {
      socket.off('draw_data', handleDrawData);
      socket.off('canvas_clear', handleClear);
      socket.off('draw_undo', handleUndo);
    };
  }, [socket, isDrawer]);

  // Update context stroke settings
  useEffect(() => {
    const ctx = contextRef.current;
    if (ctx) {
      ctx.strokeStyle = isEraser ? '#ffffff' : color;
      ctx.lineWidth = brushSize;
    }
  }, [color, brushSize, isEraser]);

  // Helper to translate event coordinates to logical (800x600) canvas coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    // Touch vs Mouse support
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale coordinates to the logical dimensions
    const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    return { x, y };
  };

  const startDrawing = (e) => {
    if (!isDrawer) return;

    // Prevent scrolling on touch devices
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);

      const strokeColor = isEraser ? '#ffffff' : color;

      // Emit to server
      if (socket) {
        socket.emit('draw_start', { x, y, color: strokeColor, size: brushSize });
      }

      // Save local stroke history
      strokesRef.current.push({ type: 'start', x, y, color: strokeColor, size: brushSize });
    }
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer) return;

    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;

    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();

      if (socket) {
        socket.emit('draw_move', { x, y });
      }

      strokesRef.current.push({ type: 'move', x, y });
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing || !isDrawer) return;

    if (e.cancelable) e.preventDefault();

    const ctx = contextRef.current;
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);

    if (socket) {
      socket.emit('draw_end');
    }

    strokesRef.current.push({ type: 'end' });
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    clearLocalCanvas();
    strokesRef.current = [];
    if (socket) {
      socket.emit('canvas_clear');
    }
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (gameState.phase === 'round_end' || gameState.phase === 'word_selection' || gameState.phase === 'lobby') {
      clearLocalCanvas();
      strokesRef.current = [];
    }
  }, [gameState.phase]);

  const handleUndo = () => {
    if (!isDrawer) return;
    if (socket) {
      socket.emit('draw_undo');
    }

    // Undo locally by slicing and redrawing
    const strokes = strokesRef.current;
    if (strokes.length > 0) {
      let i = strokes.length - 1;
      while (i >= 0 && strokes[i].type !== 'start') {
        i--;
      }
      if (i >= 0) {
        strokesRef.current = strokes.slice(0, i);
      } else {
        strokesRef.current = [];
      }
      drawHistory(strokesRef.current);
    }
  };

  // Re-draws the canvas given a historical array of strokes
  const drawHistory = (strokes) => {
    clearLocalCanvas();
    const ctx = contextRef.current;
    if (!ctx || !strokes || strokes.length === 0) return;

    // Save previous state to restore
    const origStroke = ctx.strokeStyle;
    const origWidth = ctx.lineWidth;

    strokes.forEach(stroke => {
      if (stroke.type === 'start') {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.moveTo(stroke.x, stroke.y);
      } else if (stroke.type === 'move') {
        ctx.lineTo(stroke.x, stroke.y);
        ctx.stroke();
      } else if (stroke.type === 'end') {
        ctx.closePath();
      }
    });

    // Restore brush defaults
    ctx.strokeStyle = origStroke;
    ctx.lineWidth = origWidth;
    strokesRef.current = [...strokes];
  };

  return (
    <div className="canvas-main-panel select-none">
      {/* Drawer Control Panel */}
      {isDrawer && (
        <div className="canvas-toolbar">
          {/* Colors */}
          <div className="canvas-colors-row">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  if (c === '#ffffff') {
                    setIsEraser(true);
                  } else {
                    setColor(c);
                    setIsEraser(false);
                  }
                }}
                className={`btn-color-pick ${(isEraser && c === '#ffffff') || (!isEraser && color === c && c !== '#ffffff') ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                title={c === '#ffffff' ? 'Eraser' : c}
              />
            ))}
          </div>

          {/* Sizes */}
          <div className="canvas-sizes-group">
            <span className="canvas-sizes-label">Size:</span>
            <div className="canvas-sizes-buttons">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`btn-size-pick ${brushSize === size ? 'active' : ''}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Actions */}
          <div className="canvas-actions-row">
            <button
              onClick={handleUndo}
              className="btn-canvas-action"
              title="Undo Last Stroke"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={clearCanvas}
              className="btn-canvas-action danger"
              title="Clear Canvas"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Non-drawer info banner */}
      {!isDrawer && (
        <div className="drawer-notify-banner">
          <Edit3 size={15} className="animate-pulse" />
          <span>{gameState.drawerName} is currently drawing. Make your guess!</span>
        </div>
      )}

      {/* Canvas container with correct aspect ratio */}
      <div className="canvas-element-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`canvas-element ${isDrawer ? 'drawer' : 'guesser'}`}
        />

        {gameState.phase === 'word_selection' && (
          <div className="word-selection-overlay">
            {isDrawer ? (
              <div className="word-selection-box animate-fade-in">
                <h3 className="word-selection-title">
                  Choose a Word to Draw
                </h3>
                <p className="word-selection-text">
                  Select one of the words below to begin drawing. You have {gameState.timeLeft} seconds remaining.
                </p>
                <div className="word-options-grid">
                  {gameState.wordOptions.map((word) => (
                    <button
                      key={word}
                      onClick={() => socket.emit('word_chosen', { word })}
                      className="btn-word-option"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="guesser-waiting-box animate-pulse">
                <div className="spinner-ring mb-4" />
                <h3 className="guesser-waiting-title">
                  Waiting for {gameState.drawerName} to select a word...
                </h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
