import React, { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Upload, RefreshCw, X, AlertCircle, PlusCircle, CheckCircle2, ArrowUp } from 'lucide-react';

interface ImageUploadProps {
    onCompressionComplete: (file: File) => void;
    onCompressionStart: () => void;
    onCompressionError?: (error: string) => void;
    onReset: () => void;
    currentImageUrl?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    onCompressionComplete,
    onCompressionStart,
    onCompressionError,
    onReset,
    currentImageUrl
}) => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup local blob URL
    useEffect(() => {
        return () => {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        };
    }, [localPreviewUrl]);

    const simulateProgress = () => {
        setProgress(0);
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) {
                    clearInterval(interval);
                    return 95;
                }
                return prev + 5;
            });
        }, 150);
        return interval;
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset previous states
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setError(null);
        onReset();

        setSelectedFile(file);
        setLocalPreviewUrl(URL.createObjectURL(file));

        // Start eager compression
        await compressAndProcess(file);
    };

    const compressAndProcess = async (file: File) => {
        setIsCompressing(true);
        setError(null);
        onCompressionStart();
        const progressInterval = simulateProgress();

        try {
            const options = {
                maxSizeMB: 0.4,
                maxWidthOrHeight: 1000,
                useWebWorker: true,
                initialQuality: 0.7,
            };

            const compressedFile = await imageCompression(file, options);

            clearInterval(progressInterval);
            setProgress(100);

            onCompressionComplete(compressedFile);
        } catch (err: any) {
            clearInterval(progressInterval);
            const errorMsg = err.message || 'Compression failed';
            setError(errorMsg);
            if (onCompressionError) onCompressionError(errorMsg);
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setError(null);
        setProgress(0);
        setSelectedFile(null);
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(null);
        onReset();
    };

    const displayUrl = currentImageUrl || localPreviewUrl;
    const isImageSelected = !!selectedFile;
    const isUploaded = !!currentImageUrl && !isImageSelected;

    return (
        <div className="image-upload-container w-full flex flex-col gap-2">
            {!displayUrl && !error && (
                <button
                    type="button"
                    onClick={handleButtonClick}
                    className="report-btn-highlight w-full"
                >
                    <ArrowUp size={20} /> UPLOAD PHOTO EVIDENCE
                </button>
            )}



            {(displayUrl || error) && (
                <div
                    style={{
                        aspectRatio: '16 / 9',
                        width: '100%',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: error ? 'transparent' : 'var(--glass-card)',
                        border: error ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-light)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {error ? (
                        <div
                            className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center"
                            onClick={handleButtonClick}
                        >
                            <AlertCircle size={24} className="text-red-500" />
                            <span className="text-red-500 font-bold text-[11px] tracking-widest uppercase">Image Selection Failed</span>
                            <span className="text-[10px] text-red-500/50 uppercase font-black">Try Another</span>
                        </div>
                    ) : (
                        <>
                            <img
                                src={displayUrl || ''}
                                alt="Preview"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />

                            {/* Top Right: Rounded Close Button */}
                            <button
                                type="button"
                                onClick={handleRemove}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    borderRadius: '10px',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    zIndex: 10,
                                    cursor: 'pointer'
                                }}
                                aria-label="Remove image"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </>
                    )}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
                tabIndex={-1}
            />
        </div>
    );
};

export default ImageUpload;
