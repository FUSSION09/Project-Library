import React, { useState, useEffect } from 'react';

export default function InstallAppPopup() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        // Register service worker if supported
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.warn('SW registration skipped:', err);
            });
        }

        // Check if already in standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
            return;
        }

        // Check if user previously dismissed in this session
        const dismissed = sessionStorage.getItem('installPromptDismissed');

        // Capture PWA beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!dismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check appinstalled event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // Fallback display timer: show after 2.5 seconds if not dismissed
        const timer = setTimeout(() => {
            if (!dismissed && !isInstalled) {
                setIsVisible(true);
            }
        }, 2500);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            clearTimeout(timer);
        };
    }, [isInstalled]);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        } else {
            // If native prompt is not available, show helpful instructions
            setShowInstructions(true);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('installPromptDismissed', 'true');
    };

    if (isInstalled || !isVisible) {
        return null;
    }

    return (
        <>
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 sm:p-5 relative overflow-hidden ring-1 ring-slate-900/5">
                    {/* Decorative gradient top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
                        title="Dismiss"
                        aria-label="Dismiss app install prompt"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>

                    <div className="flex items-start space-x-3.5 pt-1">
                        {/* App Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                            <i className="fa-solid fa-book-open-reader text-xl"></i>
                        </div>

                        {/* Text description */}
                        <div className="grow min-w-0 pr-4">
                            <div className="flex items-center space-x-1.5">
                                <h4 className="text-sm font-bold text-slate-900 leading-tight">Install Friends Library</h4>
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">App</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-snug">
                                Get instant 1-tap access on your home screen or desktop! Fast, lightweight, and works offline.
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2.5 mt-4 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
                        >
                            Not Now
                        </button>
                        <button
                            type="button"
                            onClick={handleInstallClick}
                            className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5"
                        >
                            <i className="fa-solid fa-download text-xs"></i>
                            <span>Install App</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Installation Instructions Modal (Fallback for iOS or non-prompting browsers) */}
            {showInstructions && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i className="fa-solid fa-mobile-screen-button text-xl"></i>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">How to Install</h3>
                        <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">
                            To install Friends Library on your device:
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs text-slate-700 space-y-2 mb-5">
                            <div className="flex items-start space-x-2">
                                <span className="font-bold text-indigo-600">1.</span>
                                <span>On <strong>Chrome/Edge (Desktop):</strong> Click the install icon <i className="fa-solid fa-arrow-down-to-bracket text-[10px]"></i> in your browser's address bar.</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="font-bold text-indigo-600">2.</span>
                                <span>On <strong>Android (Chrome):</strong> Tap the <strong>⋮</strong> menu and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="font-bold text-indigo-600">3.</span>
                                <span>On <strong>iPhone/iPad (Safari):</strong> Tap the <strong>Share</strong> button <i className="fa-solid fa-arrow-up-from-bracket text-[10px]"></i> and select <strong>"Add to Home Screen"</strong>.</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowInstructions(false)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs transition"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

