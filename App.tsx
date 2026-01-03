
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Download, Box, MessageSquare, ArrowRight, Zap, Loader2, User, Scan, 
  Palette, History, CheckCircle2, ArrowLeft, Grid, Wand2, Target, 
  Upload, UserPlus, PersonStanding, Check, ChevronRight, Users, Trash, ShieldCheck, Split, RefreshCw,
  UserCircle, Baby, GraduationCap, Languages, Paintbrush, Ruler, Info, Fingerprint, Type, MousePointer2, Megaphone,
  Layers, Stars, Crown, Globe, Leaf, ZapOff, Gem, Layout, Monitor, Copy, Clock, MoreVertical, Heart, Dna, CheckSquare, Square,
  Image as ImageIcon, X, Shield, Bookmark, Save, Trash2, Eye, UserCheck, ArrowLeftCircle, Edit2, Camera, UserPlus2
} from 'lucide-react';
import { StudioImage, ImageAnalysis, ChatMessage, Project, ProductionMode, WorkflowStage, AIModel, AspectRatio } from './types';
import { analyzeProductImage, editProductImage, refreshAnalysisSuggestion, refreshSingleProp, generateAdHeadline, generateModelHeadshot } from './services/gemini';

const DB_NAME = 'SnapStudioDB';
const PROJECTS_STORE = 'Projects';
const MODELS_STORE = 'ModelLibrary';

const DEFAULT_MODEL: AIModel = {
  id: 'temp-' + Date.now(),
  name: 'New Talent',
  age: 'Adult',
  gender: 'Female',
  ethnicity: 'White',
  skinTone: 'Fair',
  faceShape: 'Oval',
  eyeColor: 'Brown',
  hairStyle: 'Long',
  hairColor: 'Black',
  bodyType: 'Slim',
  height: 'Average'
};

const getModeLabels = (mode: ProductionMode | null) => {
  switch (mode) {
    case ProductionMode.STUDIO:
      return { stage: 'Studio', context: 'Studio Photography', object: 'Studio Shot', labTitle: 'Studio Directives', action: 'Generate Shot', assetSub: 'Neural material mapping.' };
    case ProductionMode.FASHION:
      return { stage: 'Editorial', context: 'Fashion Editorial', object: 'Model Shoot', labTitle: 'Editorial Studio', action: 'Generate Editorial', assetSub: 'Model-fit analysis.' };
    case ProductionMode.AD_GEN:
      return { stage: 'Campaign', context: 'Strategic Campaign', object: 'Ad Campaign', labTitle: 'Template Production Lab', action: 'Synthesize Campaign', assetSub: 'Visual style synthesis.' };
    default:
      return { stage: 'Creative', context: 'Production', object: 'Output', labTitle: 'Directives', action: 'Synthesize', assetSub: 'Analysis phase.' };
  }
};

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(MODELS_STORE)) db.createObjectStore(MODELS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [savedModels, setSavedModels] = useState<AIModel[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<WorkflowStage>(WorkflowStage.DASHBOARD);
  const [productionMode, setProductionMode] = useState<ProductionMode | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
  const [compareMode, setCompareMode] = useState(false);
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshingSuggestion, setIsRefreshingSuggestion] = useState(false);
  const [isRefreshingHeadline, setIsRefreshingHeadline] = useState(false);
  const [refreshingPropIndex, setRefreshingPropIndex] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [selectedThematicProps, setSelectedThematicProps] = useState<string[]>([]);
  const [background, setBackground] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [adHeadline, setAdHeadline] = useState('');
  const [adCta, setAdCta] = useState('');
  const [styleTemplate, setStyleTemplate] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isLibraryView, setIsLibraryView] = useState(false);
  const [isGeneratingHeadshot, setIsGeneratingHeadshot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentImage = images[currentImageIndex] || null;
  const originalImage = images.find(img => img.type === 'original');
  const labels = getModeLabels(productionMode);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const refreshProjects = useCallback(() => {
    initDB().then(db => {
      const tx = db.transaction(PROJECTS_STORE, 'readonly');
      const store = tx.objectStore(PROJECTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => setProjects(req.result.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, []);

  const refreshModels = useCallback(() => {
    initDB().then(db => {
      const tx = db.transaction(MODELS_STORE, 'readonly');
      const store = tx.objectStore(MODELS_STORE);
      const req = store.getAll();
      req.onsuccess = () => setSavedModels(req.result);
    });
  }, []);

  useEffect(() => { 
    refreshProjects(); 
    refreshModels();
  }, [refreshProjects, refreshModels]);

  useEffect(() => {
    if (analysis && !background) {
      setBackground(analysis.suggestedBackground || '');
      setAtmosphere(analysis.suggestedAtmosphere || '');
      setSelectedThematicProps(analysis.thematicProps || []);
      if (productionMode === ProductionMode.AD_GEN) setAdHeadline(analysis.suggestedAdCopy || '');
    }
  }, [analysis, productionMode]);

  useEffect(() => {
    if (currentProjectId && productionMode && images.length > 0) {
      const project: Project = {
        id: currentProjectId,
        name: `Production ${currentProjectId.slice(0, 4)}`,
        mode: productionMode,
        images,
        analysis,
        background,
        atmosphere,
        additionalDetails: '',
        chatMessages,
        timestamp: Date.now(),
        modelId: selectedModel?.id,
        aspectRatio: selectedAspectRatio,
        adText: adHeadline,
        adCta: adCta,
        styleTemplateUrl: styleTemplate || undefined,
        logoUrl: brandLogo || undefined,
        selectedThematicProps
      };
      initDB().then(db => {
        const tx = db.transaction(PROJECTS_STORE, 'readwrite');
        tx.objectStore(PROJECTS_STORE).put(project);
      });
    }
  }, [images, analysis, background, atmosphere, chatMessages, selectedModel, currentProjectId, productionMode, selectedAspectRatio, adHeadline, adCta, styleTemplate, brandLogo, selectedThematicProps]);

  const handleGenerateHeadshot = async () => {
    if (!selectedModel || isGeneratingHeadshot) return;
    setIsGeneratingHeadshot(true);
    try {
      const url = await generateModelHeadshot(selectedModel);
      setSelectedModel(prev => prev ? ({ ...prev, headshotUrl: url }) : null);
    } catch (e) {
      alert("Casting vision failed. Try refining DNA.");
    } finally {
      setIsGeneratingHeadshot(false);
    }
  };

  const saveModelToLibrary = (asNew = false) => {
    if (!selectedModel) return;
    const modelToSave = { 
      ...selectedModel, 
      id: asNew ? 'model-' + Date.now() : selectedModel.id,
      isSaved: true 
    };
    initDB().then(db => {
      const tx = db.transaction(MODELS_STORE, 'readwrite');
      tx.objectStore(MODELS_STORE).put(modelToSave);
      refreshModels();
      setSelectedModel(modelToSave);
      alert(`Talent "${modelToSave.name}" profile ${asNew ? 'created' : 'updated'} in library.`);
    });
  };

  const deleteModelFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    initDB().then(db => {
      const tx = db.transaction(MODELS_STORE, 'readwrite');
      tx.objectStore(MODELS_STORE).delete(id);
      refreshModels();
      if (selectedModel?.id === id) {
        setSelectedModel({ ...DEFAULT_MODEL, id: 'temp-' + Date.now() });
      }
    });
  };

  const handleRefreshSingleProp = async (propToReplace: string, index: number) => {
    if (!originalImage || !analysis || refreshingPropIndex !== null) return;
    setRefreshingPropIndex(index);
    try {
      const newProp = await refreshSingleProp(originalImage.url, analysis, propToReplace);
      setAnalysis(prev => {
        if (!prev) return null;
        const nextProps = [...prev.thematicProps];
        nextProps[index] = newProp;
        return { ...prev, thematicProps: nextProps };
      });
      setSelectedThematicProps(prev => prev.map(p => p === propToReplace ? newProp : p));
    } catch (e) { console.error(e); } finally { setRefreshingPropIndex(null); }
  };

  const handleRefreshHeadline = async () => {
    if (!originalImage || isRefreshingHeadline) return;
    setIsRefreshingHeadline(true);
    try {
      const newHeadline = await generateAdHeadline(originalImage.url, analysis);
      setAdHeadline(newHeadline);
    } catch (e) { console.error(e); } finally { setIsRefreshingHeadline(false); }
  };

  const handleRefreshSuggestion = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!analysis || !originalImage || isRefreshingSuggestion) return;
    setIsRefreshingSuggestion(true);
    try {
      const res = await refreshAnalysisSuggestion(originalImage.url, productionMode!, analysis);
      setBackground(res.background);
      setAtmosphere(res.atmosphere);
      setAnalysis(prev => prev ? ({ ...prev, emotionalEssence: res.emotionalEssence, suggestedBackground: res.background, suggestedAtmosphere: res.atmosphere }) : null);
    } catch (e) { console.error(e); } finally { setIsRefreshingSuggestion(false); }
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newImg: StudioImage = { id: Math.random().toString(), url: base64, type: 'original', timestamp: Date.now(), aspectRatio: '1:1' };
      setImages([newImg]);
      setCurrentImageIndex(0);
      setAnalysis(null);
      setBackground('');
      setAtmosphere('');
      setSelectedThematicProps([]);
      setCurrentStage(WorkflowStage.ASSET);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleTemplateUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setStyleTemplate(event.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setBrandLogo(event.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleProduction = async () => {
    if (!originalImage || !productionMode) return;
    setIsProcessing(true);
    setProcessingStatus(`Synthesizing Vision...`);
    try {
      const urls = await editProductImage(originalImage.url, `${background}. Atmosphere: ${atmosphere}`, productionMode, analysis, {
        aspectRatio: selectedAspectRatio,
        adHeadline: adHeadline,
        adCta: adCta,
        styleTemplateImage: styleTemplate || undefined,
        logoImage: brandLogo || undefined,
        aiModel: selectedModel || undefined,
        count: generateCount,
        selectedProps: selectedThematicProps
      });
      const newImages: StudioImage[] = urls.map(url => ({ id: Math.random().toString(), url, type: 'edited', timestamp: Date.now(), aspectRatio: selectedAspectRatio }));
      setImages(prev => {
        const next = [...prev, ...newImages];
        setCurrentImageIndex(next.length - newImages.length); 
        return next;
      });
      setCurrentStage(WorkflowStage.REVIEW);
    } catch (e) { alert("Production failed."); } finally { setIsProcessing(false); }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt || !currentImage || isProcessing) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsProcessing(true);
    setProcessingStatus('Refining high-end output...');
    try {
      const refinedUrls = await editProductImage(currentImage.url, prompt, productionMode!, analysis, {
        aspectRatio: selectedAspectRatio,
        adHeadline: adHeadline,
        adCta: adCta,
        styleTemplateImage: styleTemplate || undefined,
        logoImage: brandLogo || undefined,
        aiModel: selectedModel || undefined,
        count: 1 
      });
      const newImg: StudioImage = { id: Math.random().toString(), url: refinedUrls[0], type: 'edited', timestamp: Date.now(), aspectRatio: selectedAspectRatio, prompt };
      setImages(prev => {
        const next = [...prev, newImg];
        setCurrentImageIndex(next.length - 1);
        return next;
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Refinement applied successfully." }]);
    } catch (error) { setChatMessages(prev => [...prev, { role: 'assistant', content: "Refinement error." }]); } finally { setIsProcessing(false); }
  };

  const startNew = (mode: ProductionMode) => {
    setImages([]); setAnalysis(null); setBackground(''); setAtmosphere(''); setAdHeadline(''); setAdCta(''); setStyleTemplate(null); setBrandLogo(null);
    setChatMessages([]); setGenerateCount(1); setSelectedThematicProps([]);
    setSelectedModel(mode === ProductionMode.FASHION ? { ...DEFAULT_MODEL, id: 'temp-' + Date.now() } : null);
    setCurrentProjectId(Math.random().toString(36).substr(2, 9));
    setProductionMode(mode); setCurrentStage(WorkflowStage.ASSET);
    setIsLibraryView(false);
  };

  const loadProject = (p: Project) => {
    setCurrentProjectId(p.id);
    setProductionMode(p.mode);
    setImages(p.images);
    setCurrentImageIndex(p.images.length - 1);
    setAnalysis(p.analysis);
    setBackground(p.background);
    setAtmosphere(p.atmosphere);
    setChatMessages(p.chatMessages);
    setSelectedAspectRatio(p.aspectRatio);
    setAdHeadline(p.adText || '');
    setAdCta(p.adCta || '');
    setStyleTemplate(p.styleTemplateUrl || null);
    setBrandLogo(p.logoUrl || null);
    setSelectedThematicProps(p.selectedThematicProps || []);
    setIsLibraryView(false);
    
    if (p.modelId && p.mode === ProductionMode.FASHION) {
      const found = savedModels.find(m => m.id === p.modelId);
      setSelectedModel(found || { ...DEFAULT_MODEL, id: p.modelId });
    } else if (p.mode === ProductionMode.FASHION) {
      setSelectedModel({ ...DEFAULT_MODEL, id: 'temp-' + Date.now() });
    } else {
      setSelectedModel(null);
    }
    
    if (p.images.some(img => img.type === 'edited')) {
      setCurrentStage(WorkflowStage.REVIEW);
    } else if (p.analysis) {
      setCurrentStage(WorkflowStage.CREATIVE);
    } else {
      setCurrentStage(WorkflowStage.ASSET);
    }
  };

  const toggleSingleProp = (prop: string) => {
    setSelectedThematicProps(prev => 
      prev.includes(prop) ? prev.filter(p => p !== prop) : [...prev, prop]
    );
  };

  if (currentStage === WorkflowStage.DASHBOARD) {
    return (
      <div className="min-h-screen bg-[#030407] p-12 lg:p-24 flex flex-col items-center overflow-y-auto">
        <div className="max-w-7xl w-full space-y-32">
          <div className="flex justify-between items-end">
             <div className="space-y-4">
               <h1 className="text-[10vw] lg:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.85]">SnapStudio <span className="text-indigo-500">AI</span></h1>
               <p className="text-slate-500 text-[12px] uppercase tracking-[0.8em]">Elite Commercial Synthesis</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ModeCard title="Studio" icon={<Box />} desc="Clean minimalism" onClick={() => startNew(ProductionMode.STUDIO)} />
            <ModeCard title="Fashion" icon={<UserPlus />} desc="Model Casting" onClick={() => startNew(ProductionMode.FASHION)} />
            <ModeCard title="Ad Lab" icon={<Megaphone />} desc="Template Synthesis" onClick={() => startNew(ProductionMode.AD_GEN)} />
            <ModeCard title="Custom" icon={<Grid />} desc="Layout Scan" onClick={() => startNew(ProductionMode.TEMPLATES)} />
          </div>
          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
              {projects.map(p => (
                <div key={p.id} onClick={() => loadProject(p)} className="group relative aspect-[3/4] bg-slate-950 rounded-[3rem] overflow-hidden cursor-pointer border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
                  <img src={p.images[p.images.length-1].url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black to-transparent">
                     <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">{p.mode}</span>
                     <h4 className="text-white font-black uppercase text-sm tracking-tight">{p.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#030407] text-slate-200 overflow-hidden font-inter">
      <aside className="w-28 bg-slate-950 border-r border-white/5 flex flex-col items-center py-12 gap-12 shrink-0">
        <button onClick={() => setCurrentStage(WorkflowStage.DASHBOARD)} className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white"><ArrowLeft size={28}/></button>
        <NavBtn icon={<Scan size={24}/>} label="Scan" active={currentStage === WorkflowStage.ASSET} onClick={() => setCurrentStage(WorkflowStage.ASSET)} />
        {productionMode === ProductionMode.FASHION && <NavBtn icon={<UserCircle size={24}/>} label="Casting" active={currentStage === WorkflowStage.HUMAN_BUILDER} onClick={() => setCurrentStage(WorkflowStage.HUMAN_BUILDER)} />}
        <NavBtn icon={<Palette size={24}/>} label={labels.stage} active={currentStage === WorkflowStage.CREATIVE} onClick={() => analysis && setCurrentStage(WorkflowStage.CREATIVE)} disabled={!analysis} />
        <NavBtn icon={<History size={24}/>} label="Review" active={currentStage === WorkflowStage.REVIEW} onClick={() => setCurrentStage(WorkflowStage.REVIEW)} disabled={images.length < 2} />
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#05060a]">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 bg-slate-950/50 backdrop-blur-3xl z-10 shrink-0">
          <div className="flex flex-col"><span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Suite</span><span className="text-sm font-black text-white uppercase italic">{labels.context}</span></div>
          <div className="flex gap-6">
            <button onClick={() => setCompareMode(!compareMode)} className={`p-4 rounded-2xl ${compareMode ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]' : 'bg-white/5 text-slate-500'}`}><Split size={24}/></button>
            <a href={currentImage?.url} download className="px-10 py-4 bg-white text-black text-[12px] font-black uppercase rounded-2xl hover:bg-slate-200 transition-all">Download</a>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-20 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px]">
          {currentImage ? (
            <div className="relative max-h-full max-w-full flex gap-12 items-center animate-in zoom-in-95 duration-700">
              {compareMode && originalImage && <div className="p-1 bg-slate-900 border border-white/5 rounded-[2.5rem]"><img src={originalImage.url} className="max-h-[55vh] object-contain rounded-[2.2rem] opacity-30" /></div>}
              <div className="relative p-1 bg-slate-900 rounded-[4.5rem] border border-white/5 shadow-2xl">
                <img src={currentImage.url} className={`max-h-[65vh] object-contain rounded-[4.2rem] transition-all duration-700 ${isProcessing ? 'opacity-20 blur-3xl grayscale scale-95' : 'opacity-100 scale-100'}`} />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="text-center">
                      <Loader2 className="animate-spin text-indigo-500 mx-auto mb-8" size={64} />
                      <p className="text-[14px] font-black uppercase tracking-widest text-white animate-pulse">{processingStatus}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()} className="w-[35rem] h-[35rem] border-2 border-dashed border-slate-800 rounded-[8rem] flex flex-col items-center justify-center gap-12 cursor-pointer hover:border-indigo-500 transition-all group">
              <Upload size={48} className="text-slate-700 group-hover:text-indigo-500 transition-all" />
              <p className="text-2xl font-black text-slate-500 group-hover:text-white uppercase tracking-widest italic transition-all">Import Asset</p>
            </div>
          )}
        </div>
      </main>

      <aside className="w-[550px] bg-slate-950 border-l border-white/5 flex flex-col shadow-2xl overflow-hidden shrink-0">
        <div className="p-12 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-16">
          {currentStage === WorkflowStage.ASSET && (
            <div className="space-y-12 animate-in slide-in-from-right-10">
              <h3 className="text-2xl font-black uppercase text-white italic">Neural Analysis</h3>
              {!analysis ? (
                <button onClick={async () => {
                  if (!currentImage) return;
                  setIsProcessing(true); setProcessingStatus('Analyzing DNA...');
                  try { const res = await analyzeProductImage(currentImage.url, productionMode!); setAnalysis(res); } catch (e) { alert("Analysis error."); } finally { setIsProcessing(false); }
                }} className="w-full py-8 bg-white text-black font-black uppercase rounded-3xl active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.1)]">Execute Deep Scan</button>
              ) : (
                <div className="p-12 bg-indigo-500/5 border border-indigo-500/10 rounded-[4rem] space-y-10 animate-in fade-in zoom-in">
                  <div className="flex items-center gap-4 text-emerald-400 font-black text-[12px] uppercase"><CheckCircle2 size={24} /> Neural DNA Synced</div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Identified Entity</span>
                    <p className="text-2xl font-black text-white uppercase italic">{analysis.productType}</p>
                  </div>
                  <button onClick={() => setCurrentStage(productionMode === ProductionMode.FASHION ? WorkflowStage.HUMAN_BUILDER : WorkflowStage.CREATIVE)} className="w-full py-7 bg-indigo-600 text-white font-black uppercase rounded-3xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">Proceed to {labels.stage} <ChevronRight size={20} className="inline ml-2"/></button>
                </div>
              )}
            </div>
          )}

          {currentStage === WorkflowStage.HUMAN_BUILDER && selectedModel && (
            <div className="space-y-12 animate-in slide-in-from-right-10 pb-12">
               {!isLibraryView ? (
                 <>
                   <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                        <h3 className="text-2xl font-black uppercase text-white italic">Persona Casting</h3>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedModel.id.startsWith('temp') ? 'Creating New Talent' : `Editing: ${selectedModel.name}`}</span>
                     </div>
                     <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl relative group">
                        {selectedModel.headshotUrl ? (
                          <img src={selectedModel.headshotUrl} className="w-full h-full object-cover animate-in fade-in duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                             <UserCircle size={40} />
                          </div>
                        )}
                        {isGeneratingHeadshot && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                            <Loader2 className="animate-spin text-indigo-500" size={24} />
                          </div>
                        )}
                     </div>
                   </div>

                   <div className="space-y-10">
                      <div className="p-8 bg-black/40 rounded-[3rem] border border-white/5 space-y-10 animate-in zoom-in-95">
                        
                        <div className="space-y-4 mb-6">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em]">Talent Signature</label>
                              <button onClick={() => setSelectedModel({ ...DEFAULT_MODEL, id: 'temp-' + Date.now() })} className="text-[9px] font-black text-slate-500 hover:text-white uppercase flex items-center gap-2"><UserPlus2 size={12}/> Nuovo Casting</button>
                           </div>
                           <div className="relative group/name">
                             <input 
                              type="text" 
                              value={selectedModel.name} 
                              onChange={(e) => setSelectedModel({...selectedModel, name: e.target.value})}
                              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:border-indigo-500 transition-all pr-12"
                              placeholder="Assign name..."
                             />
                             <Edit2 size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover/name:text-indigo-400" />
                           </div>
                        </div>

                        <BuilderRow label="Identity" icon={<Users size={16}/>}>
                          <div className="grid grid-cols-2 gap-4 w-full">
                             <BuilderSelect label="Age" value={selectedModel.age} options={['Child', 'Teen', 'Adult', 'Senior']} onChange={(v) => setSelectedModel({...selectedModel, age: v as any})} />
                             <BuilderSelect label="Gender" value={selectedModel.gender} options={['Male', 'Female', 'Neutral']} onChange={(v) => setSelectedModel({...selectedModel, gender: v as any})} />
                          </div>
                        </BuilderRow>
                        
                        <BuilderRow label="Physiology" icon={<Fingerprint size={16}/>}>
                          <div className="grid grid-cols-2 gap-4 w-full">
                             <BuilderSelect label="Ethnicity" value={selectedModel.ethnicity} options={['White', 'Black', 'East Asian', 'South Asian', 'Hispanic', 'Middle Eastern']} onChange={(v) => setSelectedModel({...selectedModel, ethnicity: v as any})} />
                             <BuilderSelect label="Skin Tone" value={selectedModel.skinTone} options={['Fair', 'Olive', 'Deep', 'Golden', 'Warm Ivory', 'Cool Ebony']} onChange={(v) => setSelectedModel({...selectedModel, skinTone: v as any})} />
                          </div>
                        </BuilderRow>

                        <BuilderRow label="Facial Assets" icon={<Eye size={16}/>}>
                          <div className="grid grid-cols-2 gap-4 w-full">
                             <BuilderSelect label="Eyes" value={selectedModel.eyeColor} options={['Brown', 'Blue', 'Green', 'Hazel', 'Grey']} onChange={(v) => setSelectedModel({...selectedModel, eyeColor: v as any})} />
                             <BuilderSelect label="Face Shape" value={selectedModel.faceShape} options={['Oval', 'Round', 'Heart', 'Square', 'Diamond']} onChange={(v) => setSelectedModel({...selectedModel, faceShape: v as any})} />
                          </div>
                        </BuilderRow>

                        <BuilderRow label="Hair DNA" icon={<Paintbrush size={16}/>}>
                          <div className="grid grid-cols-2 gap-4 w-full">
                             <BuilderSelect label="Style" value={selectedModel.hairStyle} options={['Straight', 'Wavy', 'Curly', 'Coily', 'Short', 'Long', 'Pixie', 'Buzzcut', 'Braids']} onChange={(v) => setSelectedModel({...selectedModel, hairStyle: v as any})} />
                             <BuilderSelect label="Color" value={selectedModel.hairColor} options={['Black', 'Dark Brown', 'Light Brown', 'Blonde', 'Red', 'Grey', 'Platinum', 'Auburn']} onChange={(v) => setSelectedModel({...selectedModel, hairColor: v as any})} />
                          </div>
                        </BuilderRow>

                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setIsLibraryView(true)} className="py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500/20 transition-all">
                            <Bookmark size={14}/> Casting Vault
                          </button>
                          <button onClick={handleGenerateHeadshot} disabled={isGeneratingHeadshot} className="py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-all">
                            {isGeneratingHeadshot ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14}/>} Sintetizza Viso
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button onClick={() => saveModelToLibrary(false)} className="flex-1 py-6 bg-white/5 border border-white/10 rounded-3xl text-[12px] font-black uppercase flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                          <Save size={18}/> {selectedModel.id.startsWith('temp') ? 'Save' : 'Update'}
                        </button>
                        {!selectedModel.id.startsWith('temp') && (
                          <button onClick={() => saveModelToLibrary(true)} className="flex-1 py-6 bg-white/5 border border-white/10 rounded-3xl text-[12px] font-black uppercase flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                            <Copy size={18}/> As New
                          </button>
                        )}
                        <button onClick={() => setCurrentStage(WorkflowStage.CREATIVE)} className="flex-[1.5] py-6 bg-indigo-600 text-white rounded-3xl text-[12px] font-black uppercase shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3">
                           Lock Casting <ArrowRight size={18}/>
                        </button>
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="space-y-12 animate-in slide-in-from-right-10">
                    <div className="flex items-center gap-6">
                       <button onClick={() => setIsLibraryView(false)} className="p-3 bg-white/5 text-slate-400 rounded-xl hover:text-white transition-all"><ArrowLeft size={20}/></button>
                       <h3 className="text-2xl font-black uppercase text-white italic">Casting Vault</h3>
                    </div>
                    
                    <div className="space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                       {savedModels.length === 0 ? (
                         <div className="py-20 text-center opacity-30 space-y-4">
                           <UserCheck size={48} className="mx-auto" />
                           <p className="text-[11px] font-black uppercase tracking-widest">Vault is empty.</p>
                         </div>
                       ) : (
                         savedModels.map(m => (
                           <div key={m.id} onClick={() => { setSelectedModel(m); setIsLibraryView(false); }} className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedModel?.id === m.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-slate-900/50 hover:border-white/10'}`}>
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                                    {m.headshotUrl ? <img src={m.headshotUrl} className="w-full h-full object-cover" /> : <PersonStanding size={32} className="text-indigo-400 opacity-20" />}
                                    {selectedModel?.id === m.id && <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center"><Check size={20} className="text-white"/></div>}
                                 </div>
                                 <div>
                                   <h4 className="text-sm font-black text-white uppercase tracking-tight">{m.name}</h4>
                                   <p className="text-[10px] text-slate-500 uppercase tracking-widest">{m.ethnicity} {m.gender}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={(e) => deleteModelFromLibrary(m.id, e)} className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all">
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                    <button onClick={() => { setSelectedModel({ ...DEFAULT_MODEL, id: 'temp-' + Date.now() }); setIsLibraryView(false); }} className="w-full py-6 bg-white/5 border border-white/10 rounded-3xl text-[11px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                       <UserPlus size={18}/> Create New Talent
                    </button>
                 </div>
               )}
            </div>
          )}

          {currentStage === WorkflowStage.CREATIVE && (
            <div className="space-y-12 animate-in slide-in-from-right-10 pb-12">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase text-white italic">{labels.labTitle}</h3>
                {productionMode === ProductionMode.FASHION && selectedModel && (
                  <div onClick={() => setCurrentStage(WorkflowStage.HUMAN_BUILDER)} className="flex items-center gap-4 bg-indigo-600/10 border border-indigo-600/20 p-3 rounded-2xl cursor-pointer hover:bg-indigo-600/20 transition-all group">
                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                        {selectedModel.headshotUrl ? <img src={selectedModel.headshotUrl} className="w-full h-full object-cover" /> : <UserCircle size={20} className="m-auto mt-2 text-indigo-400" />}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-indigo-500">Active Talent</span>
                        <span className="text-[10px] font-black text-white uppercase group-hover:text-indigo-400">{selectedModel.name}</span>
                     </div>
                     <RefreshCw size={14} className="text-slate-600 group-hover:text-indigo-400 ml-2" />
                  </div>
                )}
              </div>
              
              {/* DNA Accents */}
              {analysis && analysis.thematicProps.length > 0 && (
                <div className="p-8 bg-black/40 rounded-[3rem] border border-white/5 space-y-8 animate-in zoom-in-95">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-3"><Gem size={16} className="text-indigo-500"/> DNA Accents</span>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Included scene elements</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {analysis.thematicProps.map((p, i) => {
                      const isSelected = selectedThematicProps.includes(p);
                      const isRefreshing = refreshingPropIndex === i;
                      return (
                        <div key={i} className="flex items-center gap-2 group/prop">
                          <button 
                            onClick={() => toggleSingleProp(p)}
                            className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 ${isSelected ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md' : 'border-white/5 bg-white/5 text-slate-600 hover:border-white/10'}`}
                          >
                            {isSelected ? <CheckSquare size={12} className="text-indigo-400"/> : <Square size={12} className="text-slate-700"/>}
                            <span className="text-[9px] font-black uppercase">{p}</span>
                          </button>
                          <button onClick={() => handleRefreshSingleProp(p, i)} disabled={isRefreshing} className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-slate-500 hover:text-indigo-400 transition-all ${isRefreshing ? 'animate-pulse' : 'opacity-0 group-hover/prop:opacity-100'}`}>
                            <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {productionMode === ProductionMode.AD_GEN && (
                <div className="space-y-12">
                   <div className="p-10 bg-indigo-600/5 border border-indigo-600/10 rounded-[3rem] animate-in zoom-in-95 space-y-12">
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-3"><ImageIcon size={14}/> Reference Template</label>
                          {styleTemplate && <button onClick={() => setStyleTemplate(null)} className="text-[10px] font-black text-red-500 uppercase hover:text-red-400">Clear</button>}
                        </div>
                        <div className="flex flex-col gap-6">
                          {!styleTemplate ? (
                            <button onClick={() => templateInputRef.current?.click()} className="w-full py-16 bg-slate-900 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">
                              <Upload size={32} className="text-indigo-500" />
                              <div className="text-center">
                                <span className="text-[11px] font-black uppercase block">Upload Ad Template</span>
                                <span className="text-[9px] text-slate-500 uppercase mt-1 block">Mimic font, color & layout</span>
                              </div>
                            </button>
                          ) : (
                            <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-2xl">
                               <img src={styleTemplate} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[2px] flex items-center justify-center">
                                  <span className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase rounded-xl shadow-lg">Reference Active</span>
                               </div>
                            </div>
                          )}
                          <input type="file" ref={templateInputRef} onChange={handleTemplateUpload} className="hidden" accept="image/*" />
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-3"><Shield size={14}/> Brand Logo (Optional)</label>
                          {brandLogo && <button onClick={() => setBrandLogo(null)} className="text-[10px] font-black text-red-500 uppercase hover:text-red-400">Clear</button>}
                        </div>
                        <div className="flex flex-col gap-6">
                          {!brandLogo ? (
                            <button onClick={() => logoInputRef.current?.click()} className="w-full py-10 bg-slate-900 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">
                              <Upload size={24} className="text-indigo-500" />
                              <span className="text-[10px] font-black uppercase">Upload Brand Logo</span>
                            </button>
                          ) : (
                            <div className="relative h-24 bg-slate-900 rounded-3xl flex items-center justify-center border-2 border-indigo-500/50 shadow-xl overflow-hidden">
                               <img src={brandLogo} className="h-16 object-contain" />
                               <div className="absolute inset-0 bg-indigo-600/5 flex items-center justify-center group-hover:bg-indigo-600/10 transition-all pointer-events-none">
                                  <Check size={16} className="text-indigo-500"/>
                               </div>
                            </div>
                          )}
                          <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-10 p-10 bg-slate-900/50 border border-white/5 rounded-[3rem] animate-in zoom-in-95">
                      <div className="flex items-center justify-between"><h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-3"><Megaphone size={18}/> Campaign Copy</h4><button onClick={handleRefreshHeadline} disabled={isRefreshingHeadline} className="p-2 bg-white/5 text-indigo-400 rounded-xl hover:bg-white/10 transition-all"><RefreshCw size={16} className={isRefreshingHeadline ? 'animate-spin' : ''} /></button></div>
                      <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Primary Headline</label>
                        <textarea value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-3xl p-6 text-[13px] font-bold text-white h-24 focus:border-indigo-500 outline-none transition-all" placeholder="Enter ad text..." />
                      </div>
                      <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">CTA Label</label>
                        <input type="text" value={adCta} onChange={e => setAdCta(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 px-6 text-[13px] font-bold text-white focus:border-indigo-500 outline-none transition-all" placeholder="SHOP NOW" />
                      </div>
                   </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-500 uppercase">Set Architectural Details</label><button onClick={handleRefreshSuggestion} disabled={isRefreshingSuggestion} className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-3 bg-indigo-500/5 py-2 px-5 rounded-2xl hover:bg-white/5 hover:text-white transition-all"><RefreshCw size={14} className={isRefreshingSuggestion ? 'animate-spin' : ''}/> Pivot Scene</button></div>
                <textarea value={background} onChange={e => setBackground(e.target.value)} className="w-full h-48 bg-slate-900 border border-white/10 rounded-[3rem] p-8 text-[14px] text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Materials, textures, geometry..." />
              </div>

              <div className="space-y-8">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-4">
                  {(['1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map(r => (
                    <button key={r} onClick={() => setSelectedAspectRatio(r)} className={`py-5 text-[11px] font-black rounded-2xl border-2 transition-all ${selectedAspectRatio === r ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg' : 'border-white/5 text-slate-600 hover:border-white/10'}`}>{r}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleProduction} disabled={isProcessing || !background.trim()} className="w-full py-8 bg-indigo-600 text-white font-black uppercase rounded-[3rem] shadow-2xl hover:bg-indigo-500 active:scale-95 transition-all text-[14px] tracking-[0.3em] flex items-center justify-center gap-4">
                {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Zap size={24}/>} {isProcessing ? 'Synthesizing...' : labels.action}
              </button>
            </div>
          )}

          {currentStage === WorkflowStage.REVIEW && (
            <div className="space-y-12 animate-in slide-in-from-right-10 flex flex-col h-full">
               <h3 className="text-2xl font-black uppercase text-white italic">Master Review</h3>
               <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar px-2">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setCurrentImageIndex(i)} className={`w-24 h-24 shrink-0 rounded-3xl border-2 overflow-hidden transition-all ${currentImageIndex === i ? 'border-indigo-500 scale-110 shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}><img src={img.url} className="w-full h-full object-cover" /></button>
                ))}
              </div>
              <div className="flex-1 bg-slate-900/40 rounded-[4rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl min-h-0">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                      <MessageSquare size={48} className="text-indigo-500" />
                      <p className="text-[11px] font-black uppercase tracking-widest italic leading-relaxed">"Add soft light from top", "More wood texture", "Darken shadows"</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-6 rounded-[2.5rem] text-[13px] font-black leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-white/5'}`}>{msg.content}</div></div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChatSubmit} className="p-8 border-t border-white/5 flex gap-4 shrink-0 bg-slate-950/50"><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Refine output..." className="flex-1 bg-slate-900 border border-white/10 rounded-3xl px-8 py-5 text-white focus:border-indigo-500 outline-none" /><button type="submit" disabled={!chatInput.trim() || isProcessing} className="p-5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 active:scale-95 transition-all"><ArrowRight /></button></form>
              </div>
              <div className="grid grid-cols-2 gap-8 shrink-0">
                 <button onClick={() => setCurrentStage(WorkflowStage.CREATIVE)} className="py-7 bg-white/5 border border-white/10 text-white font-black uppercase text-[12px] rounded-3xl hover:bg-white/10 transition-all">Back to Edit</button>
                 <button onClick={() => startNew(productionMode!)} className="py-7 bg-white text-black font-black uppercase text-[12px] rounded-3xl shadow-xl hover:bg-slate-200 transition-all">New Asset</button>
              </div>
            </div>
          )}
        </div>
      </aside>
      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
    </div>
  );
};

const BuilderRow = ({ label, icon, children }: any) => (
  <div className="space-y-5">
    <div className="flex items-center gap-4 text-slate-500">
      {icon} <span className="text-[11px] font-black uppercase tracking-[0.4em]">{label}</span>
    </div>
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

const BuilderSelect = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div className="space-y-3">
    <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest block">{label}</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none focus:border-indigo-500 transition-all"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const ModeCard = ({ title, icon, desc, onClick }: any) => (
  <button onClick={onClick} className="p-12 bg-slate-900 rounded-[5rem] border border-white/5 hover:border-indigo-500 transition-all text-left active:scale-[0.97] group shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-20 transition-all text-indigo-500">{icon}</div>
    <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center mb-10 bg-white/5 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">{icon}</div>
    <h3 className="text-4xl font-black italic text-white uppercase mb-3 tracking-tighter">{title}</h3>
    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{desc}</p>
  </button>
);

const NavBtn = ({ icon, label, active, onClick, disabled }: any) => (
  <button onClick={onClick} disabled={disabled} className={`p-6 rounded-[2.5rem] transition-all flex flex-col items-center gap-4 group ${disabled ? 'opacity-10 cursor-not-allowed' : active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}>
    {icon}<span className="text-[9px] font-black uppercase tracking-[0.3em]">{label}</span>
  </button>
);

export default App;
