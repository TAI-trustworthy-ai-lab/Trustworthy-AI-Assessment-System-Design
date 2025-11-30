import React, { useState } from 'react';
import html2canvas from 'html2canvas-pro'; // 保持使用 pro 版本
import { jsPDF } from 'jspdf'; 

interface PdfExportProps {
    contentId: string; 
    projectName: string | null;
    preparingText: string;
    generateText: string;
    icon: React.ReactNode;
}


export default function PdfExportButton({ contentId, projectName, preparingText, generateText, icon }: PdfExportProps) {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const addElementToPdf = async (
        pdf: jsPDF,
        elementId: string,
        pdfPageWidth: number,
        pdfPageHeight: number
    ) => {
        const input = document.getElementById(elementId);
        if (!input) return;

        const canvas = await html2canvas(input, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const imgProps = pdf.getImageProperties(imgData);

        const GLOBAL_SCALE = 0.85;

        const imgWidth = pdfPageWidth * GLOBAL_SCALE;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        const xCenter = (pdfPageWidth - imgWidth) / 2;

        // ⭐ 新增上下 margin
        const TOP_MARGIN = 5;
        const BOTTOM_MARGIN = 5;


        const usablePageHeight = pdfPageHeight - TOP_MARGIN - BOTTOM_MARGIN;

        let heightLeft = imgHeight;
        let position = TOP_MARGIN;

        // 第一頁
        pdf.addImage(imgData, "JPEG", xCenter, position, imgWidth, imgHeight);
        heightLeft -= (pdfPageHeight - TOP_MARGIN - BOTTOM_MARGIN);

        // 分頁
        while (heightLeft > 0) {
            pdf.addPage();
            position = TOP_MARGIN - (imgHeight - heightLeft);
            pdf.addImage(imgData, "JPEG", xCenter, position, imgWidth, imgHeight);
            heightLeft -= (pdfPageHeight - TOP_MARGIN - BOTTOM_MARGIN);
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

            // 5. 下載文件
            const fileName = `${projectName || 'Report'}_Report_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.pdf`;
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
                bg-purple-800 text-white shadow-2xl hover:bg-purple-700
                transition duration-150 ease-in-out 
                focus:outline-none focus:ring-4 focus:ring-purple-300
                flex items-center space-x-2
            `}
        >
            {icon}
            <span> {isGeneratingPdf ? preparingText : generateText} </span>
        </button>
    );
}