// src/components/FloatingChatWindow.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLlmResponse } from '@/services/llm.chat.service'; 

// --- 1. 引入 ReactMarkdown 與相關插件 ---
import ReactMarkdown from 'react-markdown'; 
import remarkMath from 'remark-math';    // 數學公式語法支援
import rehypeKatex from 'rehype-katex';  // 數學公式渲染
import remarkGfm from 'remark-gfm';      // 表格、刪除線等 GitHub 風格 Markdown 支援
import 'katex/dist/katex.min.css';       // 數學公式樣式

// ----------------------------------------------------
// LLM 相關介面
// ----------------------------------------------------
interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'llm';
    isStreaming?: boolean; 
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
            setMessages([
                { id: 0, text: t("FloatingChatWindow.InitialMessage"), sender: 'llm' }
            ]);
        }
    }, [messages.length, t]);

    // 自動捲動到最新訊息
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    // --- 2. LaTeX 預處理函式 ---
    // 目的：將 LLM 輸出的 \[ ... \] 轉為 $$ ... $$ 以便正確渲染數學公式
    const preprocessLaTeX = useCallback((content: string) => {
        if (!content) return '';
        return content
            .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$') // 轉換區塊公式
            .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$') // 轉換行內公式
            // 寬鬆處理：針對你截圖中可能出現的 [ ... ] 且內部包含數學特徵的情況
            .replace(/\[\s*(\\?[a-zA-Z]+\^[\s\S]*?)\s*\]/g, '$$$1$$');
    }, []);

    // 處理使用者送出
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const userMessage = input.trim();
        if (!userMessage || isThinking) return;

        setInput('');
        setIsThinking(true);
        
        const userMsgId = Date.now();
        setMessages(prev => [...prev, { id: userMsgId, text: userMessage, sender: 'user' }]);

        const loadingMsgId = userMsgId + 1;
        setMessages(prev => [...prev, { id: loadingMsgId, text: t('Thinking...') || 'AI 正在思考...', sender: 'llm', isStreaming: true }]);

        try {
            const llmResponse = await getLlmResponse(userMessage);

            setMessages(prev => {
                const updatedMessages = prev.filter(msg => msg.id !== loadingMsgId);
                return [...updatedMessages, { id: loadingMsgId, text: llmResponse, sender: 'llm', isStreaming: false }];
            });

        } catch (error) {
            console.error('LLM 呼叫錯誤:', error);
            setMessages(prev => {
                const updatedMessages = prev.filter(msg => msg.id !== loadingMsgId);
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
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            handleSend(e as unknown as React.FormEvent);
        }
    };

    return (
        <div 
            className={`fixed bottom-20 right-4 w-full max-w-sm h-[400px] bg-white rounded-xl shadow-2xl transition-transform duration-300 transform border border-gray-200 z-50 flex flex-col
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        >
            <div className="flex justify-between items-center p-3 border-b bg-indigo-600 rounded-t-xl shrink-0">
                <h4 className="text-white font-bold">{t('AI assistance') || 'AI 助手'}</h4>
                <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">&times;</button>
            </div>
            
            <div ref={chatBoxRef} className="p-3 space-y-3 overflow-y-auto flex-grow bg-gray-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
                            msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white' 
                                : msg.isStreaming 
                                    ? 'bg-white text-gray-500 animate-pulse border border-gray-200' 
                                    : 'bg-white text-gray-800 border border-gray-200'
                        }`}>
                            {msg.sender === 'llm' && !msg.isStreaming ? (
                                <div className="markdown-content prose prose-sm max-w-none 
                                    prose-p:my-1 prose-ul:my-1 prose-li:my-0
                                    /* --- 3. 表格樣式優化 --- */
                                    prose-table:border-collapse prose-table:border prose-table:w-full 
                                    prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2 prose-th:text-xs
                                    prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-td:text-xs">
                                    
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm]} // 同時加入數學與表格插件
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {preprocessLaTeX(msg.text)}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <span className="whitespace-pre-wrap">{msg.text}</span>
                            )}

                            {msg.isStreaming && <span className="ml-0.5">...</span>}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t bg-white rounded-b-xl shrink-0">
                <div className="flex space-x-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('Input something...') || '輸入您的問題...'}
                        disabled={isThinking}
                        rows={1}
                        className="flex-grow p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isThinking || input.trim() === ''}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium text-sm"
                    >
                        {isThinking ? '...' : t('Send') || '發送'}
                    </button>
                </div>
            </form>
        </div>
    );
};


export default FloatingChatWindow;
