"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// 引入更新後的 service
import { getLlmResponse, FrontendChatHistory } from '@/services/llm.chat.service'; 

import ReactMarkdown from 'react-markdown'; 
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'llm';
    isStreaming?: boolean; 
}

interface FloatingChatWindowProps {
    onClose: () => void;
    isVisible: boolean;
}

const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({ onClose, isVisible }) => {
    const { t } = useTranslation(); 
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    // 控制視窗放大/還原的狀態
    const [isExpanded, setIsExpanded] = useState(false);
    
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { id: 0, text: t("FloatingChatWindow.InitialMessage"), sender: 'llm' }
            ]);
        }
    }, [messages.length, t]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    // --- 修改重點 1: 增強預處理函數，解決紅色代碼塊問題 ---
    const preprocessLaTeX = useCallback((content: string) => {
        if (!content) return '';
        
        let processed = content;

        // 步驟 A: 移除被錯誤包裹在 Markdown 行內代碼 (`) 中的 LaTeX 標記
        // 這會將 `\[ ... \]` 還原為 \[ ... \]，讓數學渲染器能讀取到
        processed = processed
            .replace(/`(\\\[[\s\S]*?\\\])`/g, '$1')   // 處理 `\[...\]`
            .replace(/`(\\\([\s\S]*?\\\))`/g, '$1')   // 處理 `\(...\)`
            .replace(/`(\$\$[\s\S]*?\$\$)`/g, '$1')   // 處理 `$$...$$`
            .replace(/`(\$[\s\S]*?\$ )`/g, '$1');     // 處理 `$...$`

        // 步驟 B: 標準化 LaTeX 分隔符
        return processed
            // 將 \[ ... \] 轉為 $$...$$ (區塊公式 Display Mode)
            .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
            
            // 將 \( ... \) 轉為 $...$ (行內公式 Inline Mode)
            // 注意：原本您的代碼轉為 $$，這會導致行內公式強制換行。改為 $ 更符合閱讀習慣。
            .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$') 
            
            // 處理可能出現的特殊括號格式
            .replace(/\[\s*(\\?[a-zA-Z]+\^[\s\S]*?)\s*\]/g, '$$$1$$');
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const userMessage = input.trim();
        if (!userMessage || isThinking) return;

        setInput('');
        setIsThinking(true);
        
        const userMsgId = Date.now();
        const newMessages = [...messages, { id: userMsgId, text: userMessage, sender: 'user' as const }];
        setMessages(newMessages);

        const loadingMsgId = userMsgId + 1;
        setMessages(prev => [...prev, { id: loadingMsgId, text: t("FloatingChatWindow.Thinking"), sender: 'llm', isStreaming: true }]);

        try {
            const history: FrontendChatHistory[] = messages
                .filter(msg => !msg.isStreaming)
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                }));

            const llmResponse = await getLlmResponse(userMessage, history);

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

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div 
            className={`
                fixed bg-white shadow-2xl transition-all duration-300 ease-in-out border border-gray-200 z-50 flex flex-col
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                ${isExpanded 
                    ? 'bottom-4 right-4 w-[90vw] h-[85vh] max-w-5xl rounded-lg' 
                    : 'bottom-20 right-4 w-full max-w-sm h-[400px] rounded-xl' 
                }
            `}
        >
            <div className="flex justify-between items-center p-3 border-b bg-indigo-600 rounded-t-xl shrink-0">
                <h4 className="text-white font-bold">{t("FloatingChatWindow.Assistance")}</h4>
                
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={toggleExpand} 
                        className="text-white hover:text-gray-200 p-1 rounded hover:bg-indigo-500 transition"
                        title={isExpanded ? "還原視窗" : "放大視窗"}
                    >
                        {isExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="8" y="8" width="16" height="16" rx="2" ry="2"></rect>
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                            </svg>
                        )}
                    </button>

                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none p-1 hover:bg-indigo-500 rounded transition">&times;</button>
                </div>
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
                                <div className="markdown-content prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-table:border-collapse prose-table:border prose-table:w-full prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2 prose-th:text-xs prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-td:text-xs">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm]} 
                                        // --- 修改重點 2: 加入 { strict: false } 提高容錯率 ---
                                        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]} 
                                    >
                                        {String(preprocessLaTeX(msg.text))}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <ReactMarkdown 
                                    remarkPlugins={[remarkMath, remarkGfm]} 
                                    // 同步修改這裡的設定
                                    rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
                                >
                                    {String(msg.text)}
                                </ReactMarkdown>
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
                        placeholder={t("FloatingChatWindow.InputPlaceholder")}
                        disabled={isThinking}
                        rows={1}
                        className="flex-grow p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isThinking || input.trim() === ''}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium text-sm"
                    >
                        {isThinking ? '...' : t("FloatingChatWindow.Send")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FloatingChatWindow;