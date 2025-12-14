"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";
import ProtectedLayout from "@/components/ProtectedLayout";
// Services
import { checkTaiStatus, saveTaiPriority } from '@/services/taiService';
// Constants and Translation
import { TAI_INDICATOR_MAP_ZH_EN, TAI_INDICATOR_MAP_EN_ZH } from '@/config/constants';
import { useTranslation } from 'react-i18next';
import translate from 'google-translate-api-x'; 


// ----------------------------------------------------
// Translation Utility (API-X)
// ----------------------------------------------------
const translateText = async (text: string, source = "zh-CN", target = "en") => {
    const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target })
    });

    const data = await res.json();
    return data.translatedText;
};


// ----------------------------------------------------
// Constants and Types
// ----------------------------------------------------
const DEFAULT_WEIGHTS = [15, 15, 15, 15, 8, 8, 8, 4, 4, 4, 4]; // Default weights (sum to 100)
const initialIndicators = [ // Default TAI indicators (in Chinese)
    "準確性", "可靠性", "安全性",
    "韌性", "透明性", "當責性",
    "可解釋性", "自主性", "隱私",
    "公平性", "資訊安全",
];

const getWeightForIndex = (index: number) => {
    return DEFAULT_WEIGHTS[index] !== undefined ? DEFAULT_WEIGHTS[index] : 0;
}

type SortingMode = 'drag-sort' | 'custom-weight' | 'disabled';


// ----------------------------------------------------
// Main Component
// ----------------------------------------------------
export default function TAISorter() {
    const router = useRouter();
    const { i18n,t } = useTranslation();

    // UI and Data states
    const [sortingMode, setSortingMode] = useState<SortingMode>('drag-sort');
    const [indicators, setIndicators] = useState(initialIndicators); // Indicator list (order changes in drag-sort mode)
    const [customWeights, setCustomWeights] = useState<string[]>(() => 
        initialIndicators.map((_, index) => String(getWeightForIndex(index))) // Weights (only used in custom-weight mode)
    );
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Dragging Refs (for complex D&D logic)
    const draggingIndexRef = useRef<number | null>(null);
    const dragOffsetRef = useRef<number>(0);
    const floatingElRef = useRef<HTMLDivElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const targetYRef = useRef<number>(0);
    const placeholderHeightsRef = useRef<number[]>([]);
    const initialTopsRef = useRef<number[]>([]);
    const [dragging, setDragging] = useState(false);


    // -------------------
    // Calculations and Validation
    // -------------------
    // 1. Calculate final weights based on current mode
    const finalWeights = useMemo(() => {
        if (sortingMode === 'drag-sort') {
            return indicators.map((_, index) => DEFAULT_WEIGHTS[index]); // Use default weights in the new order
        }
        if (sortingMode === 'custom-weight') {
            return customWeights; // Use user input
        }
        return indicators.map(() => 0); // Disabled mode uses 0 (or equal division)
    }, [sortingMode, indicators, customWeights]);

    // 2. Calculate total sum of custom weights
    const totalCustomWeight = useMemo(() => {
        return customWeights.reduce((sum, weightStr) => {
            const weight = parseInt(weightStr, 10);
            return sum + (isNaN(weight) ? 0 : weight); 
        }, 0);
    }, [customWeights]);


    // 3. Check if custom weight sum is exactly 100
    const isCustomWeightValid = sortingMode === 'custom-weight' ? totalCustomWeight === 100 : true;


    // -------------------
    // Weight Input Handler
    // -------------------
    const handleWeightChange = (index: number, value: string) => {
        const cleanedValue = value.replace(/[^0-9]/g, ''); // Numeric only validation

        const numericValue = parseInt(cleanedValue, 10);
        let finalValueToStore = cleanedValue;
        // Limit input to 100
        if (cleanedValue !== '' && numericValue > 100) {
            finalValueToStore = "100";
        }

        setCustomWeights(prev => {
            const newWeights = [...prev];
            newWeights[index] = finalValueToStore;
            return newWeights;
        });
        setError(null);
    };

    // -------------------
    // Drag and Drop Logic
    // -------------------
    const enableSort = sortingMode === 'drag-sort';

    // Start Drag
    const handleDragStart = (clientY: number, index: number, itemEl: HTMLDivElement) => {
        if (!enableSort) return;

        draggingIndexRef.current = index;
        setDragging(true);

        // Reset previous transforms and transitions
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        document.querySelectorAll<HTMLDivElement>(".sortable-item").forEach(c => {
            c.style.transition = "none";
            c.style.transform = "translateY(0)";
            c.style.visibility = "visible";
        });

        // Capture initial positions and heights
        const childrenEls = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        placeholderHeightsRef.current = childrenEls.map(item => item.getBoundingClientRect().height);
        initialTopsRef.current = childrenEls.map(item => item.getBoundingClientRect().top);

        const rect = itemEl.getBoundingClientRect();
        dragOffsetRef.current = clientY - rect.top;
        targetYRef.current = rect.top;

        // Create floating element
        const floating = itemEl.cloneNode(true) as HTMLDivElement;
        Object.assign(floating.style, {
            position: "fixed",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            zIndex: "9999",
            pointerEvents: "none",
            userSelect: "none",
            backgroundColor: "white",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            borderRadius: "0.5rem",
            cursor: "grabbing",
            opacity: "1",
            transition: "transform 0.2s ease",
        });

        document.body.appendChild(floating);
        floatingElRef.current = floating;

        // Hide original element
        itemEl.style.visibility = "hidden";
    };

    // Handle Drag Movement
    const handleMove = (clientY: number) => {
        if (!dragging || draggingIndexRef.current === null) return;
        const floating = floatingElRef.current;
        if (!floating) return;

        targetYRef.current = clientY - dragOffsetRef.current;
        const floatingHeight = placeholderHeightsRef.current[draggingIndexRef.current];
        const floatingMiddle = targetYRef.current + floatingHeight / 2;

        const children = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        let newIndex = draggingIndexRef.current;

        // Determine new position and calculate offset for siblings
        children.forEach((child, i) => {
            if (i === draggingIndexRef.current) return;
            const childMiddle = initialTopsRef.current[i] + placeholderHeightsRef.current[i] / 2;

            if (floatingMiddle > childMiddle && i > draggingIndexRef.current!) newIndex++;
            if (floatingMiddle < childMiddle && i < draggingIndexRef.current!) newIndex--;
        });

        children.forEach((child, i) => {
            if (i === draggingIndexRef.current) return;
            let offset = 0;
            if (
                i > Math.min(draggingIndexRef.current!, newIndex) - 1 &&
                i <= Math.max(draggingIndexRef.current!, newIndex)
            ) {
                // Determine direction of shift
                offset = draggingIndexRef.current! < newIndex ? -floatingHeight : floatingHeight;
            }
            child.style.transition = "transform 0.2s ease";
            child.style.transform = `translateY(${offset}px)`;
        });
    };

    // End Drag
    const handleDragEnd = () => {
        if (!dragging || draggingIndexRef.current === null) return;
        const floating = floatingElRef.current;
        if (!floating) return;

        // Determine final drop index
        const floatingHeight = placeholderHeightsRef.current[draggingIndexRef.current];
        const floatingMiddle = targetYRef.current + floatingHeight / 2;

        let newIndex = 0;
        for (let i = 0; i < initialTopsRef.current.length; i++) {
            if (i === draggingIndexRef.current) continue;
            const childMiddle = initialTopsRef.current[i] + placeholderHeightsRef.current[i] / 2;
            if (floatingMiddle > childMiddle) newIndex++;
        }

        // Reset all item transformations
        const children = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        children.forEach((c) => {
            c.style.transition = "none";
            c.style.transform = "translateY(0)";
            c.style.visibility = "visible";
        });

        // Update indicator order state
        const updated = [...indicators];
        const [moved] = updated.splice(draggingIndexRef.current, 1);
        updated.splice(newIndex, 0, moved);
        setIndicators(updated);

        // Smooth landing animation (visually snap into place)
        requestAnimationFrame(() => {
            const newChildren = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
            newChildren.forEach((c) => {
                c.style.transition = "transform 0.25s ease";
                c.style.transform = "translateY(0)";
            });
        });

        // Cleanup
        floating.remove();
        floatingElRef.current = null;
        draggingIndexRef.current = null;
        setDragging(false);
    };

    // Floating element animation loop
    const animate = () => {
        if (!dragging) return;
        const floating = floatingElRef.current;
        if (!floating) return;
        // Simple easing/damping effect
        const currentTop = parseFloat(floating.style.top || "0");
        const diff = targetYRef.current - currentTop;
        floating.style.top = `${currentTop + diff * 0.2}px`;
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Global event listeners for drag/touch
    useEffect(() => {
        const handleMouse = (e: MouseEvent) => handleMove(e.clientY);
        const handleTouch = (e: TouchEvent) => {
            e.preventDefault();
            handleMove(e.touches[0].clientY);
        };
        const handleMouseUp = () => handleDragEnd();
        const handleTouchEnd = () => handleDragEnd();

        window.addEventListener("mousemove", handleMouse);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouch, { passive: false });
        window.addEventListener("touchend", handleTouchEnd);

        if (dragging) animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", handleMouse);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouch);
            window.removeEventListener("touchend", handleTouchEnd);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [dragging]);


    // -------------------
    // Initial Load Check
    // -------------------
    // Check if TAI priority has already been set for this project
    useEffect(() => {
        const checkStatusAndRedirect = async () => {
            const projectId = localStorage.getItem('currentProjectId');
            if (!projectId) { setIsLoading(false); return; }

            try {
                const responseBody = await checkTaiStatus(projectId);
                const taiSortData = responseBody.data || [];

                // If TAI data exists, redirect to questionnaire selection
                if (Array.isArray(taiSortData) && taiSortData.length > 0) {
                    router.push('/choose_questionnaire'); 
                } else {
                    // TAI data not set, show the sorter page
                    setIsLoading(false); 
                    setCustomWeights(DEFAULT_WEIGHTS.map(weight => String(weight)));
                }
            } catch (error: any) {
                console.error("Failed to check TAI status:", error);
                setIsLoading(false); 
            }
        };
        checkStatusAndRedirect();
    }, []);


    // -------------------
    // Start Button Handler
    // -------------------
    const handleStart = async () => {
        const projectId = localStorage.getItem('currentProjectId');
        if (!projectId) {
            alert(t('sortPage.noProjectIdError'));
            return;
        }
        
        // 1. Prepare initial data based on current sortingMode
        const initialData = indicators.map((indicatorZh, index) => {
            const indicatorEn = TAI_INDICATOR_MAP_ZH_EN[indicatorZh];
            let weightValue = 0;

            if (sortingMode === 'drag-sort') {
                weightValue = DEFAULT_WEIGHTS[index] !== undefined ? DEFAULT_WEIGHTS[index] : 0;
            } else if (sortingMode === 'custom-weight') {
                const parsedWeight = parseInt(customWeights[index], 10);
                weightValue = isNaN(parsedWeight) ? 0 : parsedWeight;
            } else {
                // Disabled mode: equal weight distribution (approx)
                weightValue = 100 / indicators.length;
            }

            return {
                indicator: indicatorEn,
                rank: index + 1, // Current display rank (before custom weight sort)
                weight: weightValue, // Weight in percent (0-100)
                originalIndex: index,
            };
        });

        // 2. Sort data again if in custom-weight mode (by weight value)
        let sortedData = [...initialData];
        if (sortingMode === 'custom-weight') {
            sortedData.sort((a, b) => {
                if (b.weight !== a.weight) {
                    return b.weight - a.weight; // Sort primarily by weight (desc)
                }
                return a.originalIndex - b.originalIndex; // Secondary sort by original index
            });
        }

        // 3. Prepare final API payload (weights normalized to 0-1, final rank based on sorted order)
        const payload = sortedData.map((item, index) => ({
            indicator: item.indicator,
            rank: index + 1, // Final rank after weight sort
            weight: item.weight / 100, // Normalize to fraction (0.00-1.00)
        }));

        // 4. Confirmation Message (includes translation and current settings summary)
        let confirmationMessage = t('sortPage.warning') + "\n\n";
        if (sortingMode !== 'disabled') {
            const priorityDisplay = sortedData.map((item, index) => {
                // Use sortedData to show the final weight/rank combination
                const indicatorChineseName = TAI_INDICATOR_MAP_EN_ZH[item.indicator] || item.indicator; 
                return `${indicatorChineseName} (${(item.weight).toFixed(0)}%)`;
            }).join(" → ");
            confirmationMessage += t('sortPage.currentPriority') + "\n" + priorityDisplay; 

        } else {
            confirmationMessage += t('sortPage.noSortSelected');
        }

        // Translate confirmation message for English users
        if (i18n.language === "en") {
            confirmationMessage = await translateText(confirmationMessage, "zh-CN", "en");
        }

        const isConfirmed = confirm(confirmationMessage);
        
        // 5. Save and Redirect
        if (isConfirmed) {
            try {
                await saveTaiPriority(projectId, payload);
                router.push("/choose_questionnaire");
            } catch (error: any) {
                let errorDetails = t('sortPage.saveFailed');
                try {
                    const errorObj = JSON.parse(error.message);
                    errorDetails = `${t('sortPage.saveFailed')} (${errorObj.status})：${errorObj.message}`;
                } catch (e) { }
                alert(errorDetails);
            }
        }
    };


    // --- Loading UI ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-600">
                <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                >
                    <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                    ></circle>
                    <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                
                <p className="text-xl font-semibold text-gray-800">
                    {t("sortPage.loading")}
                </p>
            </div>
        );
    }

    // --- Main UI ---
    return (
        <ProtectedLayout>
            <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-6 space-y-6 select-none pt-30">
                <AuthHeader />

                {/* Header and Mode Selection Container */}
                <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl border-t-4 border-indigo-500">
                    <h1 className="text-3xl text-center font-extrabold text-gray-900 mb-5">
                        {t("sortPage.title")}
                    </h1>
                    <p className="text-gray-600 text-left mb-4 max-w-xl">
                        {t("sortPage.description")}
                    </p>
                    <p className="text-red-700 mt-1 mb-6">
                        {t("sortPage.warning")}
                    </p>

                    {/* Mode Switch Buttons */}
                    <div className="flex sm:flex-row flex-col justify-center items-center gap-4 mb-6">
                        {/* Drag Sort Button */}
                        <button
                            onClick={() => { setSortingMode('drag-sort'); setError(null); }}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 
                                ${sortingMode === 'drag-sort' ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                        >
                            {t("sortPage.dragSort")}
                        </button>

                        {/* Custom Weight Button */}
                        <button
                            onClick={() => { setSortingMode('custom-weight'); setError(null); }}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 
                                ${sortingMode === 'custom-weight' ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                        >
                            {t("sortPage.customSort")}
                        </button>
                        
                        {/* Disable Sort Button */}
                        <button
                            onClick={() => { setSortingMode('disabled'); setError(null); }}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 
                                ${sortingMode === 'disabled' ? "bg-rose-700 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                        >
                            {t("sortPage.disableSort")}
                        </button>
                    </div>

                    {/* Custom Weight Total Check */}
                    {sortingMode === 'custom-weight' && (
                        <div className={`text-center p-3 rounded-lg font-bold mb-4 ${isCustomWeightValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {t('sortPage.totalWeight')}: {totalCustomWeight} / 100
                        </div>
                    )}
                    {error && (
                        <p className="text-center text-sm text-red-500 mb-4">{error}</p>
                    )}

                </div>

                {/* Sortable/Input List */}
                <div className={`flex flex-col w-full max-w-2xl space-y-3 relative ${sortingMode === 'disabled' ? 'opacity-50 cursor-default' : ''}`}>
                    {indicators.map((indicator, index) => (
                        <div
                            key={indicator}
                            // Class for Drag-and-Drop system to identify items
                            className="sortable-item flex items-center p-4 rounded-xl border bg-white shadow-md transition-all duration-200"
                            style={{ cursor: enableSort ? 'grab' : 'default', boxShadow: enableSort ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                            
                            // Drag/Touch handlers (only active in drag-sort mode)
                            onMouseDown={(e) => {
                                if (enableSort) {
                                    e.preventDefault();
                                    handleDragStart(e.clientY, index, e.currentTarget);
                                }
                            }}
                            onTouchStart={(e) => {
                                if (enableSort) {
                                    e.stopPropagation();
                                    handleDragStart(e.touches[0].clientY, index, e.currentTarget);
                                }
                            }}
                        >
                            <span className="text-2xl font-extrabold mr-4 text-indigo-500 w-8">{index + 1}.</span>
                            
                            {/* Drag Handle (Visible in drag-sort mode) */}
                            {enableSort && (
                                <div className="flex flex-col justify-between h-5 w-4 mr-3 cursor-grab">
                                    <div className="flex justify-center space-x-0.5"><div className="w-1 h-1 bg-gray-500 rounded-full"></div><div className="w-1 h-1 bg-gray-500 rounded-full"></div><div className="w-1 h-1 bg-gray-500 rounded-full"></div></div>
                                    <div className="flex justify-center space-x-0.5 mt-1"><div className="w-1 h-1 bg-gray-500 rounded-full"></div><div className="w-1 h-1 bg-gray-500 rounded-full"></div><div className="w-1 h-1 bg-gray-500 rounded-full"></div></div>
                                </div>
                            )}

                            {/* Indicator Name (Translated) */}
                            <span className={`flex-1 text-lg user-select-none ${enableSort ? '' : 'ml-4'}`}>
                                {(i18n.language === "zh") ? indicator : TAI_INDICATOR_MAP_ZH_EN[indicator]}
                            </span>

                            {/* Weight Display or Input */}
                            <div className="ml-4 w-28 text-right font-bold flex items-center justify-end">
                                {/* Display default weight in drag-sort mode */}
                                {sortingMode === 'drag-sort' && (
                                    <span className="text-gray-700">
                                        {finalWeights[index]}%
                                    </span>
                                )}
                                {/* Input field in custom-weight mode */}
                                {sortingMode === 'custom-weight' && (
                                    <div className="flex items-center space-x-1">
                                        <input
                                            type="number"
                                            value={customWeights[index]}
                                            onChange={(e) => handleWeightChange(index, e.target.value)}
                                            className="w-16 p-1 border rounded text-center text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="text-gray-700">%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    // Disabled if in custom-weight mode and total weight != 100
                    disabled={sortingMode === 'custom-weight' && !isCustomWeightValid}
                    className={`mt-8 px-8 py-3 rounded-xl font-semibold shadow-md transition 
                        ${(sortingMode === 'custom-weight' && !isCustomWeightValid) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                    {t("sortPage.startButton")}
                </button>
            </div>
        </ProtectedLayout>
    );
}