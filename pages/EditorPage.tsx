/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setIsLoading, setError, addImageToHistory, setHistoryIndex } from '../store/editorSlice';
import * as geminiService from '../services/geminiService';
import Spinner from '../components/Spinner';
import FilterPanel from '../components/FilterPanel';
import AdjustmentPanel from '../components/AdjustmentPanel';
import CropPanel from '../components/CropPanel';
import UpscalePanel from '../components/UpscalePanel';
import StylePresetPanel from '../components/ArtStylePanel';
import HistoryPanel from '../components/HistoryPanel';
import CompareSlider from '../components/CompareSlider';
import MagicEraserPanel from '../components/MagicEraserPanel';
import Tooltip from '../components/Tooltip';
import { EyeIcon } from '../components/icons';
import { dataURLtoFile } from '../App';

type Tab = 'generative fill' | 'magic eraser' | 'adjust' | 'filters' | 'style presets' | 'crop' | 'upscale';

interface EditorPageProps {
    onUploadNew: () => void;
    onMint: () => void;
}

const EditorPage: React.FC<EditorPageProps> = ({
    onUploadNew,
    onMint
}) => {
    const dispatch: AppDispatch = useDispatch();
    const { history, historyIndex, isLoading, error } = useSelector((state: RootState) => state.editor);

    const [historyImageUrls, setHistoryImageUrls] = useState<string[]>([]);
    
    const [prompt, setPrompt] = useState<string>('');
    const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
    const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('generative fill');
    
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>();
    const [isCompareMode, setIsCompareMode] = useState<boolean>(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(30);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    
    // Effect to create/revoke object URLs for the entire history stack
    useEffect(() => {
        const newUrls = history.map(file => URL.createObjectURL(file));
        setHistoryImageUrls(newUrls);
        return () => {
            newUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [history]);

    const currentImageUrl = historyImageUrls[historyIndex] ?? null;
    const originalImageUrl = historyImageUrls[0] ?? null;

    // Effect for resizing the magic eraser canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imgRef.current;

        const resizeCanvas = () => {
            if (activeTab === 'magic eraser' && canvas && image && image.clientHeight > 0) {
                if (canvas.width !== image.clientWidth || canvas.height !== image.clientHeight) {
                    canvas.width = image.clientWidth;
                    canvas.height = image.clientHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        setMaskDataUrl(null);
                    }
                }
            }
        };

        const resizeObserver = new ResizeObserver(resizeCanvas);
        if (image) {
            image.addEventListener('load', resizeCanvas, { once: true });
            resizeObserver.observe(image);
        }

        return () => {
            if (image) {
                resizeObserver.unobserve(image);
            }
        };
    }, [currentImageUrl, activeTab]);
    
    const addNewImage = useCallback((newImageFile: File, newTab?: Tab) => {
        dispatch(addImageToHistory(newImageFile));
        setCrop(undefined);
        setCompletedCrop(undefined);
        setMaskDataUrl(null);
        if(newTab) setActiveTab(newTab);
        if(canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }, [dispatch]);

    const handleGenerate = useCallback(async () => {
        const currentImage = history[historyIndex];
        if (!currentImage || !prompt.trim() || !editHotspot) return;

        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const editedImageUrl = await geminiService.generateEditedImage(currentImage, prompt, editHotspot);
            const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
            addNewImage(newImageFile);
            setEditHotspot(null);
            setDisplayHotspot(null);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, prompt, editHotspot, addNewImage, dispatch]);
    
    const handleApplyFilter = useCallback(async (filterPrompt: string) => {
        const currentImage = history[historyIndex];
        if (!currentImage) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const filteredImageUrl = await geminiService.generateFilteredImage(currentImage, filterPrompt);
            const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, addNewImage, dispatch]);
    
    const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
        const currentImage = history[historyIndex];
        if (!currentImage) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const adjustedImageUrl = await geminiService.generateAdjustedImage(currentImage, adjustmentPrompt);
            const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, addNewImage, dispatch]);

    const handleRemoveBackground = useCallback(async () => {
        const currentImage = history[historyIndex];
        if (!currentImage) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const resultImageUrl = await geminiService.removeImageBackground(currentImage);
            const newImageFile = dataURLtoFile(resultImageUrl, `bg-removed-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, addNewImage, dispatch]);

    const handleApplyCrop = useCallback(() => {
        if (!completedCrop || !imgRef.current) return;
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
        const croppedImageUrl = canvas.toDataURL('image/png');
        const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
        addNewImage(newImageFile);
    }, [completedCrop, addNewImage]);

    const handleUpscale = useCallback(async (scaleFactor: number) => {
        const currentImage = history[historyIndex];
        if (!currentImage) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const upscaledImageUrl = await geminiService.upscaleImage(currentImage, scaleFactor);
            const newImageFile = dataURLtoFile(upscaledImageUrl, `upscaled-${scaleFactor}x-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, addNewImage, dispatch]);
    
    const handleApplyArtStyle = useCallback(async (stylePrompt: string) => {
        const currentImage = history[historyIndex];
        if (!currentImage) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const styledImageUrl = await geminiService.generateArtStyleImage(currentImage, stylePrompt);
            const newImageFile = dataURLtoFile(styledImageUrl, `styled-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, addNewImage, dispatch]);

    const handleMagicErase = useCallback(async () => {
        const currentImage = history[historyIndex];
        if (!currentImage || !maskDataUrl || !canvasRef.current || !imgRef.current) return;
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const maskCanvas = document.createElement('canvas');
            const image = imgRef.current;
            maskCanvas.width = image.naturalWidth;
            maskCanvas.height = image.naturalHeight;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) throw new Error("Could not create mask context.");
            maskCtx.drawImage(canvasRef.current, 0, 0, image.naturalWidth, image.naturalHeight);
            const maskFile = dataURLtoFile(maskCanvas.toDataURL('image/png'), `mask-${Date.now()}.png`);
            const resultUrl = await geminiService.removeObjectWithMask(currentImage, maskFile);
            const newImageFile = dataURLtoFile(resultUrl, `erased-${Date.now()}.png`);
            addNewImage(newImageFile);
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [history, historyIndex, maskDataUrl, addNewImage, dispatch]);

    const handleHistoryNavigation = useCallback((index: number) => {
        if (index >= 0 && index < history.length) {
            dispatch(setHistoryIndex(index));
            setEditHotspot(null);
            setDisplayHotspot(null);
        }
    }, [history.length, dispatch]);
    
    const handleReset = useCallback(() => {
        if (history.length > 0) {
            dispatch(setHistoryIndex(0));
            dispatch(setError(null));
            setEditHotspot(null);
            setDisplayHotspot(null);
        }
    }, [history, dispatch]);

    const handleExport = useCallback(() => {
        if (currentImageUrl) {
            const link = document.createElement('a');
            link.href = currentImageUrl;
            link.download = `pixshop-art-${Date.now()}.png`;
            link.click();
        }
    }, [currentImageUrl]);
    
    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (activeTab !== 'generative fill') return;
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        setDisplayHotspot({ x: offsetX, y: offsetY });
        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
        const scaleX = naturalWidth / clientWidth;
        const scaleY = naturalHeight / clientHeight;
        setEditHotspot({ x: Math.round(offsetX * scaleX), y: Math.round(offsetY * scaleY) });
    };
    
    const handleTabChange = (tab: Tab) => {
        if (tab === 'crop' || tab === 'magic eraser') {
            setIsCompareMode(false);
        }
        setActiveTab(tab);
    };

    const getCoords = (e: React.MouseEvent | React.TouchEvent): {x: number, y: number} => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        setIsDrawing(true);
        ctx.beginPath();
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'white';
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(getCoords(e).x, getCoords(e).y);
        ctx.stroke();
    };

    const finishDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setMaskDataUrl(canvasRef.current?.toDataURL() || null);
    };

    const handleClearMask = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setMaskDataUrl(null);
        }
    }, []);

    const handleCanvasContainerMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    if (error) {
        return (
            <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                <p className="text-md text-red-400">{error}</p>
                <button onClick={() => dispatch(setError(null))} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors">Try Again</button>
            </div>
        );
    }
    
    const imageDisplay = (
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl!}
            alt="Current"
            onClick={handleImageClick}
            className={`w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'generative fill' ? 'cursor-crosshair' : ''}`}
        />
    );
    
    const canUndo = historyIndex > 0;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div 
          className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20 flex justify-center items-center max-h-[60vh]"
          onMouseMove={activeTab === 'magic eraser' ? handleCanvasContainerMouseMove : undefined}
          onMouseLeave={activeTab === 'magic eraser' ? () => setCursorPos({x: -100, y: -100}) : undefined}
          style={activeTab === 'magic eraser' ? { cursor: 'none' } : {}}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {isCompareMode && originalImageUrl && currentImageUrl ? (
                <CompareSlider beforeImageUrl={originalImageUrl} afterImageUrl={currentImageUrl} />
            ) : activeTab === 'crop' ? (
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[60vh]">
                <img ref={imgRef} key={`crop-${currentImageUrl}`} src={currentImageUrl!} alt="Crop this image" className="w-full h-auto object-contain max-h-[60vh] rounded-xl" />
              </ReactCrop>
            ) : imageDisplay }
            
            {activeTab === 'magic eraser' && (
              <>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full opacity-50 pointer-events-auto z-20" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={finishDrawing} onMouseLeave={finishDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={finishDrawing}/>
                 <div className="absolute rounded-full border-2 border-white bg-white/20 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30" style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px`, width: `${brushSize}px`, height: `${brushSize}px` }} />
              </>
            )}

            {displayHotspot && !isLoading && activeTab === 'generative fill' && !isCompareMode && (
                <div className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}>
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-4 md:grid-cols-8 items-center justify-center gap-2 backdrop-blur-sm">
            {(['generative fill', 'magic eraser', 'adjust', 'filters', 'style presets', 'crop', 'upscale'] as Tab[]).map(tab => (
                 <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full capitalize font-semibold py-3 px-2 md:px-5 rounded-md transition-all duration-200 text-sm md:text-base ${ activeTab === tab ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' : 'text-gray-300 hover:text-white hover:bg-white/10' }`}>
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'generative fill' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">{editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}</p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"} className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || !editHotspot} />
                        <Tooltip text="Apply the described edit to the selected point."><button type="submit" className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none" disabled={isLoading || !prompt.trim() || !editHotspot}>Generate</button></Tooltip>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'magic eraser' && <MagicEraserPanel onMagicErase={handleMagicErase} onClearMask={handleClearMask} isMasked={!!maskDataUrl} brushSize={brushSize} onBrushSizeChange={setBrushSize} isLoading={isLoading} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} onRemoveBackground={handleRemoveBackground} isLoading={isLoading} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'style presets' && <StylePresetPanel onApplyArtStyle={handleApplyArtStyle} onReset={handleReset} isLoading={isLoading} originalImageUrl={originalImageUrl} />}
            {activeTab === 'upscale' && <UpscalePanel onApplyUpscale={handleUpscale} isLoading={isLoading} />}
        </div>
        
        {historyImageUrls.length > 1 && ( <HistoryPanel historyUrls={historyImageUrls} currentIndex={historyIndex} onNavigate={handleHistoryNavigation} /> )}
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {canUndo && activeTab !== 'crop' && activeTab !== 'magic eraser' && ( <Tooltip text="Toggle a slider to compare with the original image."><button onClick={() => setIsCompareMode(!isCompareMode)} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base" aria-label="Toggle before/after comparison view"><EyeIcon className="w-5 h-5 mr-2" />{isCompareMode ? 'Exit Compare' : 'Compare'}</button></Tooltip> )}
            <Tooltip text="Revert all changes and go back to the original image."><button onClick={handleReset} disabled={!canUndo} className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent">Reset</button></Tooltip>
            <Tooltip text="Upload a new image and clear the current session."><button onClick={onUploadNew} className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base">Start Over</button></Tooltip>
            <Tooltip text="Download the current image to your device."><button onClick={handleExport} className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base">Export</button></Tooltip>
            <Tooltip text="Prepare and mint your artwork as an NFT on the blockchain."><button onClick={onMint} className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base">Mint NFT</button></Tooltip>
        </div>
      </div>
    );
};

export default EditorPage;