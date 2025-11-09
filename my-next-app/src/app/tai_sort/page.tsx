"use client";
import React, { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";
import ProtectedLayout from "@/components/ProtectedLayout";

const useRouter = () => {
    return {
        push: (url: string) => {
            if (typeof window !== 'undefined') {
                window.location.href = url;
            }
        },
    };
};

export default function TAISorter() {
    const router = useRouter();
    const [enableSort, setEnableSort] = useState(true);
    const [indicators, setIndicators] = useState([
        "準確性",
        "可靠性",
        "安全性",
        "韌性",
        "透明性",
        "當責性",
        "可解釋性",
        "自主性",
        "隱私",
        "公平性",
        "資訊安全",
    ]);

    const draggingIndexRef = useRef<number | null>(null);
    const dragOffsetRef = useRef<number>(0);
    const floatingElRef = useRef<HTMLDivElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const targetYRef = useRef<number>(0);
    const placeholderHeightsRef = useRef<number[]>([]);
    const initialTopsRef = useRef<number[]>([]);
    const [dragging, setDragging] = useState(false);

    const handleDragStart = (clientY: number, index: number, itemEl: HTMLDivElement) => {
        if (!enableSort) return;

        draggingIndexRef.current = index;
        setDragging(true);

        // 取消舊動畫與 transform
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        document.querySelectorAll<HTMLDivElement>(".sortable-item").forEach(c => {
            c.style.transition = "none";
            c.style.transform = "translateY(0)";
            c.style.visibility = "visible";
        });

        // 先抓取最新初始座標與高度
        const childrenEls = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        placeholderHeightsRef.current = childrenEls.map(item => item.getBoundingClientRect().height);
        initialTopsRef.current = childrenEls.map(item => item.getBoundingClientRect().top);

        const rect = itemEl.getBoundingClientRect();
        dragOffsetRef.current = clientY - rect.top;
        targetYRef.current = rect.top;

        // 建立浮動元素
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
            opacity: "1", // 直接顯示
            transition: "transform 0.2s ease",
        });

        document.body.appendChild(floating);
        floatingElRef.current = floating;

        // 隱藏原元素
        itemEl.style.visibility = "hidden";
    };



    const handleMove = (clientY: number) => {
        if (!dragging || draggingIndexRef.current === null) return;
        const floating = floatingElRef.current;
        if (!floating) return;

        targetYRef.current = clientY - dragOffsetRef.current;
        const floatingHeight = placeholderHeightsRef.current[draggingIndexRef.current];
        const floatingMiddle = targetYRef.current + floatingHeight / 2;

        const children = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        let newIndex = draggingIndexRef.current;

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
                offset = draggingIndexRef.current! < newIndex ? -floatingHeight : floatingHeight;
            }
            child.style.transition = "transform 0.2s ease";
            child.style.transform = `translateY(${offset}px)`;
        });
    };

    const handleDragEnd = () => {
        if (!dragging || draggingIndexRef.current === null) return;
        const floating = floatingElRef.current;
        if (!floating) return;

        const children = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        const floatingHeight = placeholderHeightsRef.current[draggingIndexRef.current];
        const floatingMiddle = targetYRef.current + floatingHeight / 2;

        let newIndex = 0;
        for (let i = 0; i < initialTopsRef.current.length; i++) {
            if (i === draggingIndexRef.current) continue;
            const childMiddle = initialTopsRef.current[i] + placeholderHeightsRef.current[i] / 2;
            if (floatingMiddle > childMiddle) newIndex++;
        }

        // 移除 transform 並顯示原元素
        children.forEach((c) => {
            c.style.transition = "none";
            c.style.transform = "translateY(0)";
            c.style.visibility = "visible";
        });

        // 更新順序
        const updated = [...indicators];
        const [moved] = updated.splice(draggingIndexRef.current, 1);
        updated.splice(newIndex, 0, moved);
        setIndicators(updated);

        // 平滑落位
        requestAnimationFrame(() => {
            const newChildren = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
            newChildren.forEach((c) => {
                c.style.transition = "transform 0.25s ease";
                c.style.transform = "translateY(0)";
            });
        });

        // 清理浮動元素
        floating.remove();
        floatingElRef.current = null;
        draggingIndexRef.current = null;
        setDragging(false);
    };

    const animate = () => {
        if (!dragging) return;
        const floating = floatingElRef.current;
        if (!floating) return;
        const currentTop = parseFloat(floating.style.top || "0");
        const diff = targetYRef.current - currentTop;
        floating.style.top = `${currentTop + diff * 0.2}px`;
        animationFrameRef.current = requestAnimationFrame(animate);
    };

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
            cancelAnimationFrame(animationFrameRef.current!);
        };
    }, [dragging]);

    const handleStart = () => {
        alert(
            "目前 TAI 指標優先順序：\n" +
            indicators.join(" → ") +
            "\n 是否啟用TAI指標優先順序：" +
            enableSort
        );
        router.push("/choose_questionnaire");
    };

    return (
        <ProtectedLayout>
            <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-6 space-y-6 select-none pt-30">
                <AuthHeader />

                <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl border-t-4 border-indigo-500">
                    <h1 className="text-3xl text-center font-extrabold text-gray-900">TAI 指標優先排序</h1><br />
                    <p className="text-gray-600 text-left mb-6 max-w-xl leading-relaxed">
                        本系統提供<b>TAI 指標優先排序</b>以讓報告將更貼近您專案之特性及核心需求。 <br />
                        請<b>拖曳指標</b>以決定其重要性。若選擇<b>不使用排序功能</b>，所有指標將採相同權重。
                    </p>

                    {/* 啟用/停用按鈕 */}
                    <div className="flex justify-center mb-6">
                        <button
                            onClick={() => setEnableSort(!enableSort)}
                            className={`px-8 py-3 rounded-full text-white font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 ${!enableSort ? "bg-gray-500 hover:bg-gray-600" : "bg-rose-700 hover:bg-rose-800"
                                }`}
                        >
                            {enableSort ? "🔴 不使用排序功能" : "🟢 啟用 11 項 TAI 指標排序功能"}
                        </button>
                    </div>
                </div>

                <div className={`flex flex-col w-full max-w-2xl space-y-3 relative ${!enableSort ? 'opacity-50 cursor-default' : ''}`}>
                    {indicators.map((indicator, index) => (
                        <div
                            key={indicator}
                            className="sortable-item flex items-center p-4 rounded-xl border bg-white shadow-md transition-all duration-200"
                            style={{ cursor: enableSort ? 'grab' : 'default', boxShadow: enableSort ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}

                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleDragStart(e.clientY, index, e.currentTarget);
                            }}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                handleDragStart(e.touches[0].clientY, index, e.currentTarget);
                            }}
                        >
                            <span className="text-2xl font-extrabold mr-4 text-indigo-500 w-8">{index + 1}.</span>
                            <div className="flex flex-col justify-between h-5 w-4 mr-3">
                                <div className="flex justify-center space-x-0.5">
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                </div>
                                <div className="flex justify-center space-x-0.5 mt-1">
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                </div>
                            </div>
                            <span className="flex-1 text-lg user-select-none">{indicator}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleStart}
                    className="mt-8 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-md transition"
                >
                    開始作答
                </button>
            </div>
        </ProtectedLayout>
    );
}
