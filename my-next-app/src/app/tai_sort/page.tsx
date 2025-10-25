"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { LogOut, Loader2 } from 'lucide-react';

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function TAISorter() {
    const router = useRouter();
    const [enableSort, setEnableSort] = useState(false);
    const [indicators, setIndicators] = useState([
        "準確性", "可靠性", "安全性", "韌性", "透明性",
        "當責性", "可解釋性", "自主性", "隱私", "公平性", "資訊安全"
    ]);

    const draggingIndexRef = useRef<number | null>(null);
    const floatingElRef = useRef<HTMLDivElement | null>(null);
    const dragOffsetRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const targetYRef = useRef<number>(0);
    const placeholderHeightsRef = useRef<number[]>([]);
    const initialTopsRef = useRef<number[]>([]);

    // **************************************** 增加 header logout 功能 ****************************************
    const [isLoggingOut, setIsLoggingOut] = useState(false); // 登出狀態
    const titleLinkTarget = '/home';

    // 統一button樣式
    const baseButtonClasses = "flex items-center space-x-2 py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
    
    // 登出功能 
    const handleLogout = async () => {
    if (isLoggingOut) return; // 防止重複點擊
    setIsLoggingOut(true);

    // 檢查登出是否有問題
    try {
        // Token的檢查
        let userToken = null;

        if (typeof window !== 'undefined') {
        userToken = localStorage.getItem('userToken');
        }
        if (userToken) {
        const response = await fetch(`${BASE_URL}/logout`, { 
            method: "DELETE", 
            headers: {
                'Authorization': `Bearer ${userToken}`, 
                'Content-Type': 'application/json',
            },
        });
        
        // 後端回傳error
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
            console.error("登出 API 呼叫失敗 (HTTP 錯誤):", response.status, errorData);
        } else {
            console.log("後端登出成功");
        }
        }
    } catch (error) {
        console.error("登出 API 呼叫時發生錯誤:", error);
    } finally {
        if (typeof window !== 'undefined') {
        localStorage.removeItem('userToken');
        }

        // 跳轉到登入頁面
        router.push('/');
        setIsLoggingOut(false);
    }
    };

    const handleDragStart = (clientY: number, index: number, itemEl: HTMLDivElement) => {
        if (!enableSort) return;
        const rect = itemEl.getBoundingClientRect();
        draggingIndexRef.current = index;
        dragOffsetRef.current = clientY - rect.top;
        targetYRef.current = rect.top;

        const items = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        placeholderHeightsRef.current = items.map(item => item.getBoundingClientRect().height);
        initialTopsRef.current = items.map(item => item.getBoundingClientRect().top);

        const floating = itemEl.cloneNode(true) as HTMLDivElement;
        Object.assign(floating.style, {
            position: "fixed",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: "1000",
            pointerEvents: "none",
            userSelect: "none",
            background: "white",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            borderRadius: "0.5rem",
            cursor: "grabbing",
            transition: "transform 0.2s ease",
        });
        document.body.appendChild(floating);
        floatingElRef.current = floating;
        itemEl.style.visibility = "hidden";
        setDragging(true);
    };

    // 拖曳中更新位置
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

            // 浮動元素向下移動且跨過此元素
            if (floatingMiddle > childMiddle && i > draggingIndexRef.current!) newIndex++;
            // 浮動元素向上移動且跨過此元素
            if (floatingMiddle < childMiddle && i < draggingIndexRef.current!) newIndex--;
        });

        // 更新其他元素 transform
        children.forEach((child, i) => {
            if (i === draggingIndexRef.current) return;
            let offset = 0;
            if ((i > Math.min(draggingIndexRef.current!, newIndex) - 1 && i <= Math.max(draggingIndexRef.current!, newIndex))) {
                offset = draggingIndexRef.current! < newIndex ? -floatingHeight : floatingHeight;
            }
            child.style.transition = "transform 0.2s ease";
            child.style.transform = `translateY(${offset}px)`;
        });
    };

    // 拖曳結束
    const handleDragEnd = () => {
        if (!dragging || draggingIndexRef.current === null) return;
        const floating = floatingElRef.current;
        if (!floating) return;
        cancelAnimationFrame(animationFrameRef.current!);

        const children = Array.from(document.querySelectorAll<HTMLDivElement>(".sortable-item"));
        const floatingHeight = placeholderHeightsRef.current[draggingIndexRef.current];
        const floatingMiddle = targetYRef.current + floatingHeight / 2;

        // 計算最終插入位置
        let newIndex = 0;
        for (let i = 0; i < initialTopsRef.current.length; i++) {
            if (i === draggingIndexRef.current) continue;
            const childMiddle = initialTopsRef.current[i] + placeholderHeightsRef.current[i] / 2;
            if (floatingMiddle > childMiddle) newIndex++;
        }

        // 更新浮動元素順位
        const updated = [...indicators];
        const [moved] = updated.splice(draggingIndexRef.current, 1);
        updated.splice(newIndex, 0, moved);
        setIndicators(updated);

        // 移除浮動元素
        floating.remove();
        floatingElRef.current = null;
        draggingIndexRef.current = null;
        setDragging(false);

        // 恢復其他元素 transform
        children.forEach(c => {
            c.style.visibility = "visible";
            c.style.transform = "translateY(0)";
            c.style.transition = "transform 0.2s ease";
        });
        
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
        const handleTouch = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientY); };
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
        alert("目前 TAI 指標優先順序：\n" + indicators.join(" → ") + "\n 是否啟用TAI指標優先順序：" + enableSort);
        router.push('/choose_questionnaire');
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-6 space-y-6 select-none pt-30">

            {/*********************** 增加header功能 *************************/ }
            <Header titleHref={titleLinkTarget}>
                <div className='flex justify-end space-x-5 items-center'>
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut} // 登出中禁用按鈕
                    className={`${baseButtonClasses} ${
                    isLoggingOut 
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600'
                    }`}
                    title={isLoggingOut ? "登出中..." : "登出"}
                >
                    {isLoggingOut ? (
                    // Loader 圖標
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                    // LogOut 圖標
                    <LogOut className="w-4 h-4" /> 
                    )}
                    <span>{isLoggingOut ? "登出中..." : "登出"}</span>
                </button>
                </div>
            </Header>

            <h1 className="text-3xl font-bold mb-6">TAI 指標排序系統</h1>
            <button
                onClick={() => setEnableSort(!enableSort)}
                className={`px-6 py-3 rounded-xl text-white shadow-md transition ${enableSort ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"}`}
            >
                {enableSort ? "停用排序功能" : "啟用 11 項 TAI 指標排序功能"}
            </button>

            <div className="flex flex-col w-full max-w-lg space-y-3">
                {indicators.map((indicator, index) => (
                    <div
                        key={indicator}
                        className="sortable-item flex items-center p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => handleDragStart(e.clientY, index, e.currentTarget)}
                        onTouchStart={(e) => handleDragStart(e.touches[0].clientY, index, e.currentTarget)}
                    >
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
    );
}
