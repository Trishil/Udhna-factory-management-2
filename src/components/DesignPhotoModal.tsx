import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  Smartphone, 
  RotateCw, 
  Plus, 
  Info,
  Layers,
  Database,
  ExternalLink,
  Trash2,
  Tag
} from 'lucide-react';
import { WorkflowItem, DesignPhoto, WorkflowCustomMetadataField, WorkflowStageId } from '../types';
import { WORKFLOW_STAGES } from '../utils/workflowData';
import { uploadDesignImage } from '../services/firebaseService';

interface DesignPhotoModalProps {
  item: WorkflowItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updated: WorkflowItem) => void;
}

export const DesignPhotoModal: React.FC<DesignPhotoModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateItem
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'camera' | 'android_info'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [capturedStage, setCapturedStage] = useState<WorkflowStageId>('fabric');
  const [operatorName, setOperatorName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Custom Metadata attached to photo or design
  const [customMetadata, setCustomMetadata] = useState<WorkflowCustomMetadataField[]>([]);
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaVal, setNewMetaVal] = useState('');

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = React.useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check permissions or upload an image file directly.');
      setIsCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (item && isOpen) {
      setCapturedStage(item.currentStage);
      setOperatorName(item.assignedOperator || 'Supervisor');
      setCaption(`${item.designNumber} - ${item.fabricType} Photo`);
      setCustomMetadata(item.customMetadata ? [...item.customMetadata] : []);
    } else if (!isOpen) {
      stopCamera();
    }
  }, [item, isOpen, stopCamera]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPreviewUrl(dataUrl);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMeta = () => {
    if (newMetaKey.trim() && newMetaVal.trim()) {
      setCustomMetadata(prev => [...prev, { key: newMetaKey.trim(), value: newMetaVal.trim() }]);
      setNewMetaKey('');
      setNewMetaVal('');
    }
  };

  const handleRemoveMeta = (index: number) => {
    setCustomMetadata(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAttach = async () => {
    if (!item) return;
    if (!previewUrl && !selectedFile) {
      alert('Please take a photo or select an image file first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading to Firebase Storage...');

    try {
      let downloadUrl = previewUrl || '';
      let storagePath = '';

      // Try uploading to Firebase Storage
      try {
        const payload = selectedFile || previewUrl!;
        const uploadResult = await uploadDesignImage(
          item.designNumber || item.id,
          payload,
          selectedFile?.name || `photo_${Date.now()}.jpg`
        );
        downloadUrl = uploadResult.downloadUrl;
        storagePath = uploadResult.storagePath;
      } catch (fbErr) {
        console.warn('Firebase Storage direct upload note (falling back to base64 data):', fbErr);
        // If storage bucket rules or offline, fallback to data URL directly
      }

      setUploadProgress('Attaching to Design record...');

      const newPhoto: DesignPhoto = {
        id: `photo-${Date.now()}`,
        url: downloadUrl,
        storagePath: storagePath || undefined,
        caption: caption.trim() || undefined,
        stageCapturedAt: capturedStage,
        capturedBy: operatorName.trim() || undefined,
        timestamp: new Date().toISOString(),
        deviceSource: activeMode === 'camera' ? 'web_camera' : 'web_upload',
        metadata: {
          stageName: WORKFLOW_STAGES.find(s => s.id === capturedStage)?.name,
          capturedTime: new Date().toLocaleString(),
          notes: caption
        }
      };

      const existingPhotos = item.photos || [];
      const updatedPhotos = [newPhoto, ...existingPhotos];

      const updatedItem: WorkflowItem = {
        ...item,
        designImage: downloadUrl, // Set primary design photo
        photos: updatedPhotos,
        customMetadata: customMetadata.length > 0 ? customMetadata : item.customMetadata,
        lastSyncedWithFirebase: new Date().toISOString()
      };

      onUpdateItem(updatedItem);
      onClose();
    } catch (err: any) {
      console.error('Error attaching photo:', err);
      alert('Failed to attach photo: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      stopCamera();
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600 shadow-md shadow-blue-500/30">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Add Design Photo & Metadata
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[10px] font-mono font-bold">
                  {item.designNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Lot {item.lotNumber} • {item.fabricType} • {item.quantity} {item.unit}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => { stopCamera(); setActiveMode('upload'); }}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors ${
              activeMode === 'upload'
                ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload Image File</span>
          </button>

          <button
            onClick={() => { setActiveMode('camera'); startCamera(); }}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors ${
              activeMode === 'camera'
                ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Live Camera Capture</span>
          </button>

          <button
            onClick={() => { stopCamera(); setActiveMode('android_info'); }}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors ${
              activeMode === 'android_info'
                ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Smartphone className="h-4 w-4 text-emerald-600" />
            <span>Android App Integration</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* ANDROID APP PROMPT & INSTRUCTION TAB */}
          {activeMode === 'android_info' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">
                      Mobile Android App & Firebase Cloud Storage
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Operators on the factory floor can use an Android App to scan barcodes/lots, click live photos of the fabric at any stage (Inspection, Patta, Embroidery, Altering, Folding), attach custom metadata, and immediately sync directly to this dashboard via Firebase Firestore & Cloud Storage.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                  <span className="font-bold text-blue-400">Firebase Firestore Document Target</span>
                  <span>Collection: workflow_designs</span>
                </div>
                <div className="text-slate-300">
                  <p className="text-emerald-400 font-semibold">// Document ID: {item.id}</p>
                  <p>lotNumber: "{item.lotNumber}"</p>
                  <p>designNumber: "{item.designNumber}"</p>
                  <p>currentStage: "{item.currentStage}"</p>
                  <p>designImage: "https://firebasestorage.googleapis.com/.../photos/{item.designNumber}.jpg"</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
                <p className="font-bold mb-1 flex items-center space-x-1.5">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span>Storage Location</span>
                </p>
                <p className="text-blue-800">
                  Images are stored securely in <strong>Firebase Storage</strong> bucket (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">excellent-nexus-442111-t5.firebasestorage.app</code>), under <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">design_photos/{'{designNumber}'}/*.jpg</code>.
                </p>
              </div>
            </div>
          )}

          {/* UPLOAD FILE MODE */}
          {activeMode === 'upload' && (
            <div className="space-y-4">
              {!previewUrl ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/30 group">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    Click to select fabric photo or drag & drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports JPG, PNG, WEBP high-resolution photos
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center group">
                  <img
                    src={previewUrl}
                    alt="Selected Preview"
                    className="object-contain max-h-64 w-full"
                  />
                  <button
                    onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LIVE CAMERA MODE */}
          {activeMode === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <p className="font-bold">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-2 px-3 py-1 bg-amber-600 text-white rounded-lg font-bold"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : !previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 inset-x-0 flex justify-center items-center space-x-4">
                    <button
                      type="button"
                      onClick={captureCameraPhoto}
                      className="p-4 rounded-full bg-white text-blue-600 shadow-xl border-4 border-blue-500 hover:scale-105 transition-transform flex items-center justify-center"
                      title="Click Photo"
                    >
                      <Camera className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-64 flex items-center justify-center border border-slate-800">
                  <img
                    src={previewUrl}
                    alt="Captured preview"
                    className="object-contain max-h-64 w-full"
                  />
                  <button
                    onClick={() => { setPreviewUrl(null); startCamera(); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Photo & Metadata Details Form */}
          {activeMode !== 'android_info' && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Captured At Stage
                  </label>
                  <select
                    value={capturedStage}
                    onChange={(e) => setCapturedStage(e.target.value as WorkflowStageId)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {WORKFLOW_STAGES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operator / Inspector Name
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo Caption / Description
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Front embroidery panel inspection close-up"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Design Metadata Key-Values */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
                    <Tag className="h-3.5 w-3.5 text-blue-600" />
                    <span>Design Custom Metadata</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Synced with Firebase & Android
                  </span>
                </div>

                {/* Existing Meta Tags */}
                {customMetadata.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customMetadata.map((meta, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                      >
                        <span className="text-blue-600 font-bold">{meta.key}:</span>
                        <span>{meta.value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMeta(idx)}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add new key value */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Field (e.g. Storage Bin, Stitch Count)"
                    value={newMetaKey}
                    onChange={(e) => setNewMetaKey(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-300"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Rack C-4, 185000)"
                    value={newMetaVal}
                    onChange={(e) => setNewMetaVal(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddMeta}
                    disabled={!newMetaKey.trim() || !newMetaVal.trim()}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {isUploading ? uploadProgress : 'Photos stored in Firebase Cloud Storage'}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            {activeMode !== 'android_info' && (
              <button
                type="button"
                onClick={handleUploadAndAttach}
                disabled={!previewUrl || isUploading}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {isUploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Attach Photo & Save Metadata</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
