import React, { useState } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  Code, 
  ExternalLink, 
  Layers, 
  Database, 
  Flame, 
  Sparkles, 
  X, 
  Camera, 
  QrCode,
  Download,
  Info
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface AndroidAppPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppPromptModal: React.FC<AndroidAppPromptModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'architecture' | 'schema' | 'kotlin_sample'>('prompt');

  if (!isOpen) return null;

  const androidPromptText = `You are building a production-ready Native Android Application (Kotlin + Jetpack Compose + CameraX + Firebase) for a Factory Floor Fabric Design & Production Tracking Pipeline.

### APP OVERVIEW & PURPOSE:
The Android app is used by factory floor supervisors, machine operators, and quality inspectors to:
1. Scan or select a Fabric Design / Lot item from the 10-stage workflow pipeline.
2. Click high-resolution photos of the physical fabric / embroidery using CameraX.
3. Automatically compress and upload the clicked photo to Firebase Storage.
4. Add & edit custom metadata (e.g. Storage Bin, Stitch Count, Roll Barcode, Dye Lot, Defect Type, Operator Name) on the design.
5. Update the workflow stage (Fabric Inward, Chalan Slip, Inspection Good/Return, Stitching Patta, Embroidery, Dhaga Cutting, Alter Inspection, Altering, Folding, Prepare Dispatch).
6. Sync in real-time with the Web Factory Dashboard via Firebase Firestore & Cloud Storage.

---

### FIREBASE CONFIGURATION:
- Project ID: ${firebaseConfig.projectId}
- Storage Bucket: ${firebaseConfig.storageBucket}
- Firestore Database ID: ${firebaseConfig.firestoreDatabaseId || '(default)'}
- API Key: ${firebaseConfig.apiKey}
- Application ID: ${firebaseConfig.appId}

---

### FIRESTORE SCHEMA:
Collection: \`workflow_designs\`
Document ID: \`wf-{timestamp}\` or design lot ID

Fields:
\`\`\`json
{
  "id": "wf-1719200000",
  "lotNumber": "LOT-8421",
  "designNumber": "DSG-104",
  "designName": "Bridal Zari Border",
  "fabricType": "Silk Georgette",
  "fabricColor": "Emerald Green",
  "quantity": 120,
  "unit": "meters",
  "currentStage": "embroidery",
  "priority": "high",
  "designImage": "https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/design_photos%2FDSG-104%2Fphoto.jpg?alt=media",
  "photos": [
    {
      "id": "photo-1719200010",
      "url": "https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/...",
      "storagePath": "design_photos/DSG-104/1719200010_cam.jpg",
      "caption": "Close-up after dhaga cutting",
      "stageCapturedAt": "dhaga_cutting",
      "capturedBy": "Ramesh Kumar (Operator)",
      "timestamp": "2026-08-22T10:30:00.000Z",
      "deviceSource": "android_app",
      "metadata": {
        "cameraModel": "Pixel 8",
        "resolution": "1920x1080",
        "notes": "No missed stitches"
      }
    }
  ],
  "customMetadata": [
    {"key": "Storage Bin", "value": "Rack B-12"},
    {"key": "Stitch Density", "value": "145000"}
  ],
  "lastSyncedWithFirebase": "2026-08-22T10:30:00.000Z"
}
\`\`\`

---

### REQUIRED SCREENS IN ANDROID APP:
1. **Design & Lot List Screen**:
   - Displays all active workflow cards with thumbnails, lot number, design number, quantity, and current stage badge.
   - Fast search by Lot #, Design #, Fabric Type, or Barcode scanner button.
   - Filter by Stage (1 to 10) and Priority.

2. **Design Detail & Stage Pipeline Screen**:
   - Shows complete design information, primary photo, and 10-stage progression.
   - Stage Transition buttons (e.g. Advance to "Stitching Patta", "Embroidery", etc.).
   - Quality inspection toggles (Good / Return / Alter).

3. **CameraX Capture & Quality Inspection Screen**:
   - Fullscreen camera viewfinder with grid overlay and flash toggle.
   - Tap-to-capture with instant preview thumbnail.
   - Compression to WebP / JPEG (quality 85) for fast cellular upload.
   - Automatic upload to Firebase Storage path: \`design_photos/{designNumber}/{timestamp}_{fileName}.jpg\`.
   - Adds new photo object into Firestore document array \`photos\` and updates \`designImage\`.

4. **Metadata & Custom Attributes Screen**:
   - Dynamic key-value editor: allows adding any custom field (e.g. "Storage Location", "Dye Bath #", "Inspector Sign").
   - Instant 2-way sync with Firebase Firestore.

---

### TECH STACK & DEPENDENCIES:
- **Language**: Kotlin 2.0+
- **UI Framework**: Jetpack Compose with Material 3
- **Camera**: AndroidX CameraX (camera-camera2, camera-lifecycle, camera-view)
- **Firebase SDK**:
  - \`com.google.firebase:firebase-firestore-ktx\`
  - \`com.google.firebase:firebase-storage-ktx\`
  - \`com.google.firebase:firebase-auth-ktx\`
- **Image Loading**: Coil 3 for Compose (\`io.coil-kt:coil-compose\`)
- **Coroutines & Flow**: Kotlin Coroutines for asynchronous upload and Firestore real-time snapshots.
`;

  const copyToClipboard = (text: string, type: 'prompt' | 'config') => {
    navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-md shadow-emerald-500/30">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">
                  Android App Generator Prompt & Firebase Specs
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-mono font-bold uppercase">
                  Ready to copy
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generate the companion mobile app for camera photo capture & real-time metadata sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'prompt'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Android AI Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Image Storage & Sync Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Firebase Config & Schema</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-800">
          
          {/* PROMPT TAB */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  Copy this comprehensive prompt into Android Studio, AI Studio, or Gemini:
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(androidPromptText, 'prompt')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Full Android Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono border border-slate-800 max-h-[50vh] overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
                {androidPromptText}
              </div>
            </div>
          )}

          {/* ARCHITECTURE TAB */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                <h4 className="font-bold text-sm text-blue-900 mb-2">
                  Image Storage Strategy: Firebase Storage vs Google Drive
                </h4>
                <p className="leading-relaxed">
                  As requested, <strong>Firebase Cloud Storage</strong> is the primary storage engine for design photos because:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-blue-900 font-medium">
                  <li>Direct high-speed SDK uploads from Android CameraX with upload progress callbacks.</li>
                  <li>Direct public CDN URLs rendered seamlessly in this React web app with zero auth headaches.</li>
                  <li>Firestore document linking enables synchronized metadata and photo arrays.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>1. Android App Workflow</span>
                  </span>
                  <p className="text-slate-600">
                    Floor operator opens app → scans barcode / selects Design # → clicks CameraX photo → app automatically uploads to Firebase Storage bucket at <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">design_photos/{'{designNumber}'}/...</code> → app writes download URL into Firestore.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>2. Web Dashboard Workflow</span>
                  </span>
                  <p className="text-slate-600">
                    Web app listens in real-time to Firestore snapshot updates. As soon as the photo is clicked on mobile, the thumbnail appears live in the 10-stage pipeline with all metadata, timestamps, and stage tags.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SCHEMA & CONFIG TAB */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Firebase Applet Configuration:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(firebaseConfig, null, 2), 'config')}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                >
                  {copiedConfig ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedConfig ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                {JSON.stringify(firebaseConfig, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Firebase Firestore & Storage provisioned & active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
