export type ToolType = 'select' | 'text' | 'pen' | 'rect' | 'line' | 'highlighter' | 'eraser' | 'textOverlay';
export type FontFamily = 'Helvetica' | 'Times-Roman' | 'Courier' | 'Noto Sans TC';

// Base annotation with shared properties
interface BaseAnnotation {
    id: string;
    page: number;
    x: number;
    y: number;
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    opacity?: number;
}

export interface TextAnnotation extends BaseAnnotation {
    type: 'text';
    text?: string;
    fontSize?: number;
    fontFamily?: string;
}

export interface RectAnnotation extends BaseAnnotation {
    type: 'rect';
    width?: number;
    height?: number;
}

export interface PenAnnotation extends BaseAnnotation {
    type: 'pen' | 'highlighter';
    paths?: { x: number; y: number }[];
}

export interface LineAnnotation extends BaseAnnotation {
    type: 'line';
    x2?: number;
    y2?: number;
}

// NEW: Text overlay for editing existing PDF text
export interface TextOverlayAnnotation extends BaseAnnotation {
    type: 'textOverlay';
    originalText: string;      // Original PDF text
    editedText: string;        // Modified text
    coveredArea: {             // Area to cover with white rectangle
        x: number;
        y: number;
        width: number;
        height: number;
    };
    fontSize: number;
    fontFamily: string;
    textColor: string;
}

// NEW: Image insertion
export interface ImageAnnotation extends BaseAnnotation {
    type: 'image';
    file: File;        // The image file
    width: number;
    height: number;
    rotation?: number; // Optional rotation
}

export type Annotation = TextAnnotation | RectAnnotation | PenAnnotation | LineAnnotation | TextOverlayAnnotation | ImageAnnotation;

export interface EditorState {
    scale: number;
    activeTool: ToolType;
    activeStrokeColor: string;
    activeStrokeWidth: number;
    activeFillColor: string;
    activeFontSize: number;
    activeFontFamily: FontFamily;
    activeOpacity: number;
    selectedId: string | null;
}
