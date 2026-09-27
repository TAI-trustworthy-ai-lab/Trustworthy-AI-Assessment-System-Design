import React, { useState } from 'react';
import html2canvas from 'html2canvas-pro'; // 保持使用 pro 版本
import { jsPDF } from 'jspdf'; 

interface PdfExportProps {
    contentId: string; 
    projectName: string | null;
    modelStage: string | null; 
    preparingText: string;
    generateText: string;
    icon: React.ReactNode;
}


export default function PdfExportButton({ contentId, projectName, modelStage, preparingText, generateText, icon }: PdfExportProps) {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const addElementToPdf = async (
    pdf: jsPDF,
    elementId: string,
    pdfPageWidth: number,
    pdfPageHeight: number
    ) => {
    const input = document.getElementById(elementId);
    if (!input) return;

    // 1. 先用 html2canvas 把整個內容變成一張長圖
    const originalCanvas = await html2canvas(input, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
    });

    const originalWidth = originalCanvas.width;
    const originalHeight = originalCanvas.height;

    // 2. PDF 邊界設定（單位：mm）
    const FIRST_PAGE_TOP = 0;   // 第一頁留 3mm
    
    const MARGIN_LEFT = 10;
    const MARGIN_RIGHT = 10;
    const MARGIN_TOP = 13;
    const MARGIN_BOTTOM = 13;

    const pdfUsableWidth = pdfPageWidth - MARGIN_LEFT - MARGIN_RIGHT;
    const pdfUsableHeight = pdfPageHeight - MARGIN_TOP - MARGIN_BOTTOM;

    // 3. 算出從 canvas 像素到 PDF mm 的縮放比例
    //    （把整張圖寬度縮到 pdfUsableWidth，依比例算高度）
    const scale = pdfUsableWidth / originalWidth;

    // 一頁在「原始 canvas 像素座標」中可容納的高度
    const pageHeightInCanvasPx = pdfUsableHeight / scale;

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < originalHeight) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = originalWidth;

        const remainingHeight = originalHeight - renderedHeight;

        // ⭐ 依頁數決定這一頁的上邊距
        const topMargin = pageIndex === 0 ? FIRST_PAGE_TOP : MARGIN_TOP;

        // ⭐ 這一頁在 PDF 裡的「可用高度」
        const pageUsableHeightInPdf = pdfPageHeight - topMargin - MARGIN_BOTTOM;

        // ⭐ 換算成原始 canvas 的高度
        const pageHeightInCanvasPx = pageUsableHeightInPdf / scale;

        const thisPageCanvasHeight = Math.min(pageHeightInCanvasPx, remainingHeight);
        pageCanvas.height = thisPageCanvasHeight;

        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) break;

        pageCtx.drawImage(
            originalCanvas,
            0,
            renderedHeight,
            originalWidth,
            thisPageCanvasHeight,
            0,
            0,
            originalWidth,
            thisPageCanvasHeight
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);

        if (pageIndex > 0) {
            pdf.addPage();
        }

        const imgHeightInPdf = thisPageCanvasHeight * scale;

        pdf.addImage(
            imgData,
            "JPEG",
            MARGIN_LEFT,
            topMargin,            // ← 這一頁的 top
            pdfUsableWidth,
            imgHeightInPdf
        );

        renderedHeight += thisPageCanvasHeight;
        pageIndex += 1;
    }
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);

        // 3. 創建 PDF 文件
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth(); 
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        try {

            await addElementToPdf(
                pdf,
                contentId,
                pdfPageWidth,
                pdfPageHeight
            );
            
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0]; // yyyy-mm-dd
            const fileName = `${projectName}_${modelStage}_${dateStr}.pdf`;
            // 5. 下載文件
            //const fileName = `${projectName || 'Report'}_Report_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error("生成 PDF 時發生錯誤:", error);
            console.warn('PDF 生成失敗，請查看控制台錯誤訊息。'); 
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`
                w-auto py-3 px-6 text-lg font-semibold rounded-full 
                bg-indigo-700 text-white shadow-2xl hover:bg-indigo-600
                transition duration-150 ease-in-out 
                focus:outline-none focus:ring-4 focus:ring-purple-300
                flex items-center space-x-2
            `}
        >
            {icon}
            <span className='hidden md:inline'> {isGeneratingPdf ? preparingText : generateText} </span>
        </button>
    );
}