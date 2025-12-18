
import React, { useState, useRef, useEffect } from 'react';
import { 
  WorkflowState, 
  WorkflowStep, 
  INITIAL_STATE, 
  GeneratedAsset, 
  GeneratedSite,
  ResearchResult,
  DeploymentState
} from './types';
import { 
  analyzeScreenshot, 
  conductResearch, 
  generateNanoImage, 
  generateSiteCode 
} from './services/gemini';
import { StepIndicator } from './components/StepIndicator.tsx';
import { AnalysisView } from './components/AnalysisView.tsx';
import { PreviewFrame } from './components/PreviewFrame.tsx';
import { ResearchRefinery } from './components/ResearchRefinery.tsx';
import { AssetStudio } from './components/AssetStudio.tsx';
import { RemixGallery } from './components/RemixGallery.tsx';
import { UploadCloud, Zap, Rocket, Wand2, Terminal, X } from 'lucide-react';

// Safe storage wrapper for environments that restrict localStorage
const storage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied, falling back to session memory.");
      return (window as any)._nanoForgeCache?.[key] || null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      if (!(window as any)._nanoForgeCache) (window as any)._nanoForgeCache = {};
      (window as any)._nanoForgeCache[key] = value;
    }
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<WorkflowState>(() => {
    const saved = storage.getItem('nano-forge-gallery');
    return { ...INITIAL_STATE, gallery: saved ? JSON.parse(saved) : [] };
  });
  
  const [isAssetStudioOpen, setIsAssetStudioOpen] = useState(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storage.setItem('nano-forge-gallery', JSON.stringify(state.gallery));
  }, [state.gallery]);

  const addLog = (msg: string) => {
    setState(prev => ({ ...prev, logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setState(prev => ({ ...prev, isProcessing: true, step: WorkflowStep.UPLOAD, error: null, logs: [] }));
    addLog("Initializing Neural Forge kernel...");
    
    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
    });

    try {
      const base64Images = await Promise.all(promises);
      setState(prev => ({ ...prev, uploadedImages: base64Images }));
      addLog(`Blueprints received: ${files.length} design files.`);
      await runAnalysisPhase(base64Images);
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, isProcessing: false, error: err.message || "Forge sequence failed to initialize." }));
      addLog(`[ERROR] ${err.message}`);
    }
  };

  const runAnalysisPhase = async (base64Images: string[]) => {
    setState(prev => ({ ...prev, step: WorkflowStep.ANALYSIS }));
    addLog("Deconstructing visual hierarchy...");
    const analysis = await analyzeScreenshot(base64Images);
    setState(prev => ({ ...prev, analysis }));
    
    setState(prev => ({ ...prev, step: WorkflowStep.RESEARCH }));
    addLog("Mining sector intelligence & trending design patterns...");
    const research = await conductResearch(analysis);
    setState(prev => ({ ...prev, research, step: WorkflowStep.EDITOR, isProcessing: false }));
    addLog("Harvest complete. Ready for catalog setup.");
  };

  const handleRefineryConfirm = (overrides: Partial<ResearchResult>) => {
    setState(prev => ({ ...prev, researchOverrides: overrides, step: WorkflowStep.GENERATION, isProcessing: true }));
    addLog("Refinery settings locked. Casting production assets...");
    runAssetPhase({ ...state.research!, ...overrides });
  };

  const runAssetPhase = async (finalResearch: ResearchResult) => {
    const analysis = state.analysis!;
    
    const assetPrompts: { type: 'hero' | 'feature' | 'product' | 'icon' | 'car'; prompt: string; existingUrl?: string }[] = [
      { 
        type: 'hero', 
        prompt: `High-end minimalist hero visual for ${analysis.industry}. Theme: ${finalResearch.marketContent.valueProposition}` 
      },
      { type: 'feature', prompt: `Abstract high-tech professional background for ${analysis.industry}` }
    ];

    // Add product images: use existing if provided by user, else generate
    if (finalResearch.products && finalResearch.products.length > 0) {
      finalResearch.products.forEach((product) => {
        if (product.image) {
          // If the user uploaded an image, we don't need to generate one
          assetPrompts.push({ type: 'product', prompt: `User uploaded product: ${product.name}`, existingUrl: product.image });
        } else {
          assetPrompts.push({ 
            type: 'product', 
            prompt: `High-end commercial photography of ${product.name}. 8K, Clean background.` 
          });
        }
      });
    }

    const assets: GeneratedAsset[] = [];
    for (const req of assetPrompts) {
       if (req.existingUrl) {
         addLog(`Using user-uploaded artifact for ${req.type}...`);
         assets.push({ id: Math.random().toString(36).substr(2, 9), ...req, url: req.existingUrl });
         continue;
       }

       addLog(`Forging ${req.type} artifact: ${req.prompt.substring(0, 30)}...`);
       try {
         const url = await generateNanoImage(req.prompt, req.type);
         assets.push({ id: Math.random().toString(36).substr(2, 9), ...req, url });
       } catch (e) {
         addLog(`[WARN] Generation for ${req.type} failed. Using placeholder.`);
         assets.push({ id: Math.random().toString(36).substr(2, 9), ...req, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' });
       }
    }
    setState(prev => ({ ...prev, generatedAssets: assets }));

    setState(prev => ({ ...prev, step: WorkflowStep.CODING }));
    addLog("Architecting multi-page source via Gemini Forge...");
    const pages = await generateSiteCode(analysis, finalResearch, assets.map(a => a.url));
    
    const newSite: GeneratedSite = {
      id: Math.random().toString(36).substr(2, 9),
      name: finalResearch.marketContent.valueProposition || 'AI Generated Store',
      pages,
      activePageIndex: 0,
      timestamp: Date.now(),
      assets,
      analysis
    };

    setState(prev => ({ 
      ...prev, 
      site: newSite, 
      gallery: [newSite, ...prev.gallery].slice(0, 20),
      step: WorkflowStep.PREVIEW,
      isProcessing: false 
    }));
    addLog("Foundry sequence complete. Store is live for testing.");
  };

  const handleDeploymentComplete = (deployment: DeploymentState) => {
    setState(prev => {
      if (!prev.site) return prev;
      const updatedSite = { 
        ...prev.site, 
        deployment: {
          ...deployment,
          siteId: deployment.siteId 
        } 
      };
      const updatedGallery = prev.gallery.map(s => s.id === updatedSite.id ? updatedSite : s);
      return { ...prev, site: updatedSite, gallery: updatedGallery };
    });
    addLog(`DEPLOYMENT SYNC VERIFIED: ${deployment.url}`);
  };

  const handleAssetUpdated = (assetId: string, newUrl: string) => {
    setState(prev => {
      if (!prev.site) return prev;
      const updatedAssets = prev.generatedAssets.map(a => a.id === assetId ? { ...a, url: newUrl } : a);
      const oldAsset = prev.generatedAssets.find(a => a.id === assetId);
      if (!oldAsset) return prev;
      
      const updatedPages = prev.site.pages.map(page => ({
        ...page,
        code: page.code.split(oldAsset.url).join(newUrl)
      }));

      const updatedSite = { ...prev.site, pages: updatedPages, assets: updatedAssets };
      return {
        ...prev,
        generatedAssets: updatedAssets,
        site: updatedSite,
        gallery: prev.gallery.map(s => s.id === updatedSite.id ? updatedSite : s)
      };
    });
    addLog(`Asset ${assetId} hot-swapped.`);
  };

  const handleRemix = (site: GeneratedSite) => {
    setState(prev => ({
      ...prev,
      site,
      step: WorkflowStep.PREVIEW,
      uploadedImages: [],
      analysis: site.analysis || null,
      generatedAssets: site.assets,
      isProcessing: false
    }));
    addLog(`Reloading archive: ${site.name}`);
  };

  return (
    <div className="min-h-screen bg-nano-dark text-gray-100 font-sans selection:bg-brand-500/30">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setState(INITIAL_STATE)}>
            <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)] group-hover:rotate-12 transition-all">
              <Zap className="text-black fill-black" size={20} />
            </div>
            <span className="font-extrabold text-2xl tracking-tighter uppercase italic">
              NanoWeb<span className="text-brand-500">Forge</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             {state.step === WorkflowStep.PREVIEW && (
               <button 
                onClick={() => setIsAssetStudioOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-brand-500 shadow-lg"
               >
                 <Wand2 size={14} /> Studio
               </button>
             )}
             <button 
               onClick={() => setIsTerminalVisible(!isTerminalVisible)}
               className={`p-2 rounded-xl border transition-all ${isTerminalVisible ? 'bg-brand-500/20 border-brand-500/50 text-brand-500' : 'bg-white/5 border-white/10 text-gray-500'}`}
             >
               <Terminal size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
        <StepIndicator currentStep={state.step} />

        {state.step === WorkflowStep.UPLOAD && !state.isProcessing && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center space-y-12 py-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-500 text-xs font-bold tracking-widest uppercase">
                  <Rocket size={14} /> Production Pipeline Active
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
                  Forge Pro.<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700">Ship Fast.</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light">
                  Convert design mockups into fully-responsive stores with integrated UPI payment & checkout forms.
                </p>
              </div>
              
              <div 
                className="w-full max-w-2xl mx-auto h-80 border-2 border-dashed border-white/10 bg-white/5 backdrop-blur-xl rounded-[40px] cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden hover:border-brand-500 transition-all duration-500 shadow-2xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 shadow-xl">
                  <UploadCloud className="text-brand-500" size={48} />
                </div>
                <p className="text-2xl font-black text-white">Upload Design Artifacts</p>
                <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-[0.3em]">JPEG, PNG, WEBP Supported</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              </div>
            </div>

            <RemixGallery gallery={state.gallery} onRemix={handleRemix} />
          </div>
        )}

        {state.step === WorkflowStep.EDITOR && state.research && (
          <ResearchRefinery research={state.research} onConfirm={handleRefineryConfirm} />
        )}

        {(state.isProcessing || state.step === WorkflowStep.PREVIEW) && state.step !== WorkflowStep.EDITOR && (
          <div className="w-full flex flex-col items-center gap-10">
            {state.analysis && <AnalysisView analysis={state.analysis} research={state.research} />}

            {state.isProcessing && (
              <div className="flex flex-col items-center gap-8 w-full max-w-xl animate-in zoom-in">
                 <div className="relative">
                   <div className="w-24 h-24 border-4 border-brand-500/10 border-t-brand-500 rounded-full animate-spin shadow-[0_0_40px_rgba(250,204,21,0.1)]"></div>
                   <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500" size={32} />
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-black text-white">
                     {state.step === WorkflowStep.ANALYSIS && "Deconstructing Pixels..."}
                     {state.step === WorkflowStep.RESEARCH && "Scanning Global Intelligence..."}
                     {state.step === WorkflowStep.GENERATION && "Forging Visual Assets..."}
                     {state.step === WorkflowStep.CODING && "Architecting Source Structure..."}
                   </p>
                   <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-ping" />
                      <p className="text-brand-500/60 font-mono text-[10px] uppercase tracking-[0.3em]">Production Thread Active</p>
                   </div>
                 </div>
              </div>
            )}

            {state.step === WorkflowStep.PREVIEW && state.site && (
               <PreviewFrame 
                site={state.site} 
                onRetry={() => runAnalysisPhase(state.uploadedImages)} 
                onDeploymentComplete={handleDeploymentComplete}
                onPageChange={(index) => setState(prev => ({ ...prev, site: prev.site ? { ...prev.site, activePageIndex: index } : null }))} 
               />
            )}
          </div>
        )}
      </main>

      {isTerminalVisible && (
        <div className="fixed bottom-6 right-6 w-96 h-64 z-[70] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-white/5 border-b border-white/5 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-brand-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Forge Console</span>
            </div>
            <button onClick={() => setIsTerminalVisible(false)} className="text-gray-600 hover:text-white">
              <X size={12} />
            </button>
          </div>
          <div className="p-4 font-mono text-[10px] text-gray-400 overflow-y-auto h-[calc(100%-40px)] space-y-1">
            {state.logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-brand-500/30">[{i}]</span>
                <span>{log}</span>
              </div>
            ))}
            {state.isProcessing && <div className="text-brand-500 animate-pulse">_</div>}
          </div>
        </div>
      )}

      {isAssetStudioOpen && state.generatedAssets.length > 0 && (
        <AssetStudio 
          assets={state.generatedAssets} 
          onAssetUpdated={handleAssetUpdated}
          onClose={() => setIsAssetStudioOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
