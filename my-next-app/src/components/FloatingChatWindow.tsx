// src/components/FloatingChatWindow.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// 引入我們為非串流 LLM 設計的服務函式
import { getLlmResponse } from '@/services/llm.chat.service'; 

// ----------------------------------------------------
// LLM 相關介面
// ----------------------------------------------------
interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'llm';
    isStreaming?: boolean; // 在非串流中用於顯示載入狀態
}

// ----------------------------------------------------
// FloatingChatWindow 組件定義
// ----------------------------------------------------
interface FloatingChatWindowProps {
    onClose: () => void;
    isVisible: boolean;
}

const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({ onClose, isVisible }) => {
    const { t } = useTranslation(); 
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    // 初始訊息
    useEffect(() => {
        if (messages.length === 0) {
            // 假設 t('Chat.initialPrompt') 存在於您的翻譯檔中
            setMessages([
                { id: 0, text: t('Chat.initialPrompt') || '您有任何疑問嗎？', sender: 'llm' }
            ]);
        }
    }, [messages.length, t]);

    // 自動捲動到最新訊息
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    // 處理使用者送出 (非串流版本，等待單一字串回應)
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const userMessage = input.trim();
        if (!userMessage || isThinking) return;

        // 1. 設置 UI 狀態和顯示使用者訊息
        setInput('');
        setIsThinking(true);
        
        const userMsgId = Date.now();
        setMessages(prev => [...prev, { id: userMsgId, text: userMessage, sender: 'user' }]);

        // 2. 顯示載入中的 AI 訊息佔位符
        const loadingMsgId = userMsgId + 1;
        // isStreaming: true 在非串流中用作 loading 標記
        setMessages(prev => [...prev, { id: loadingMsgId, text: t('Chat.thinking') || 'AI 正在思考...', sender: 'llm', isStreaming: true }]);


        try {
            // --- 呼叫服務層函式 ---
            const llmResponse = await getLlmResponse(userMessage);

            // 3. 移除載入中訊息，並顯示完整的 LLM 回應
            setMessages(prev => {
                const updatedMessages = prev.filter(msg => msg.id !== loadingMsgId); // 移除載入佔位符
                return [...updatedMessages, { id: loadingMsgId, text: llmResponse, sender: 'llm', isStreaming: false }];
            });

        } catch (error) {
            console.error('LLM 呼叫錯誤:', error);
            
            // 4. 處理錯誤訊息
            setMessages(prev => {
                const updatedMessages = prev.filter(msg => msg.id !== loadingMsgId); // 移除載入佔位符
                return [...updatedMessages, { 
                    id: loadingMsgId, 
                    text: `[錯誤] ${error instanceof Error ? error.message : '連線失敗'}`, 
                    sender: 'llm' 
                }];
            });

        } finally {
            setIsThinking(false);
        }
    };
    
    // 允許使用者按 Enter 送出
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            handleSend(e as unknown as React.FormEvent);
        }
    };


    return (
        <div 
            className={`fixed bottom-20 right-4 w-full max-w-sm h-[400px] bg-white rounded-xl shadow-2xl transition-transform duration-300 transform border border-gray-200 z-50
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        >
            <div className="flex justify-between items-center p-3 border-b bg-indigo-600 rounded-t-xl">
                <h4 className="text-white font-bold">{t('Chat.title') || 'AI 助手'}</h4>
                <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">&times;</button>
            </div>
            
            <div ref={chatBoxRef} className="p-3 space-y-3 overflow-y-auto h-[calc(100%-120px)]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-2 rounded-lg text-sm whitespace-pre-wrap ${
                            msg.sender === 'user' 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : msg.isStreaming 
                                    ? 'bg-gray-200 text-gray-500 animate-pulse' // 載入中顏色
                                    : 'bg-gray-100 text-gray-800'
                        }`}>
                            {msg.text}
                            {/* 載入狀態的點點 */}
                            {msg.isStreaming && <span className="ml-0.5">...</span>}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t absolute bottom-0 w-full bg-white rounded-b-xl">
                <div className="flex space-x-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('Chat.placeholder') || '輸入您的問題...'}
                        disabled={isThinking}
                        rows={1}
                        className="flex-grow p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button
                        type="submit"
                        disabled={isThinking || input.trim() === ''}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                    >
                        {isThinking ? '...' : t('Chat.send') || '發送'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FloatingChatWindow;