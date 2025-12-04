"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useTranslation } from "react-i18next";
import { fetchLatestQuestionnaires } from '@/services/questionnaireService';

const STAGE_NAME_MAP: { [key: string]: 'before' | 'during' | 'after' } = {
    "建模前": 'before',
    "建模中": 'during',
    "建模後": 'after',
};

// ----------------------------------------------------
//  CARD'S UI
// ----------------------------------------------------
const stages = (t: any) => ({
    before: {
        title: t("choosePage.stages.before.title"),
        description: t("choosePage.stages.before.description"),
        iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
        accent: "text-indigo-700",
        iconBg: "bg-gray-100",
        bg: "bg-indigo-200",
        hoverBorder: "hover:border-blue-400",
    },
    during: {
        title: t("choosePage.stages.during.title"),
        description: t("choosePage.stages.during.description"),
        iconPath: "M9.75 17L12 19.25M14.25 17L12 19.25M12 19.25V5.75M5.75 12H19.25",
        accent: "text-purple-700",
        iconBg: "bg-gray-100",
        bg: "bg-purple-100",
        hoverBorder: "hover:border-purple-400",
    },
    after: {
        title: t("choosePage.stages.after.title"),
        description: t("choosePage.stages.after.description"),
        iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
        accent: "text-blue-700",
        iconBg: "bg-gray-100",
        bg: "bg-blue-100",
        hoverBorder: "hover:border-indigo-500",
    },
});


export default function ChooseQuestionnairePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [questionnaireMap, setQuestionnaireMap] = useState<{ [key: string]: number | undefined }>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadQuestionnaireData = async () => {
            try {
                const data = await fetchLatestQuestionnaires();

                const newMap: { [key: string]: number | undefined } = {};

                data.forEach((group: any) => {
                    const groupName = group.name;
                    const latestVersion = group.versions?.[0];
                    const stageKey = STAGE_NAME_MAP[groupName];

                    if (stageKey && latestVersion) {
                        newMap[stageKey] = latestVersion.id;
                    } else if (groupName && !stageKey) {
                        console.warn(`Group Name: "${groupName}" 未在 STAGE_NAME_MAP 中定義。`);
                    }
                });

                setQuestionnaireMap(newMap);
            } catch (error) {
                console.error("問卷資料初始化失敗:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadQuestionnaireData();
    }, []);

    const baseButtonClasses = `
        w-full p-6 text-left border-2 border-gray-200 rounded-xl shadow-lg cursor-pointer
        transition duration-300 ease-in-out transform 
        hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:shadow-md
    `;

    const handleStageClick = (stage: "before" | "during" | "after") => {
        const versionId = questionnaireMap[stage];
        if (!versionId) {
            alert(t("choosePage.error.missingStage", { stage: stages(t)[stage].title }));
            console.error(`Missing QuestionnaireID for stage: ${stage}`);
            return;
        }
        localStorage.setItem("QuestionnaireID", String(versionId));
        router.push(`/questionnaire`);
    };

    const StageButton = ({ stageKey }: { stageKey: keyof ReturnType<typeof stages> }) => {
        const stage = stages(t)[stageKey];
        const isDisabled = isLoading || !questionnaireMap[stageKey];

        return (
            <button
                onClick={() => handleStageClick(stageKey)}
                className={`${baseButtonClasses} ${stage.bg} ${stage.hoverBorder} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'group'}`}
                disabled={isDisabled}
            >
                <div className="flex items-center space-x-5">
                    <div className={`p-3 rounded-xl ${stage.iconBg} ${stage.accent}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stage.iconPath}></path>
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-center text-2xl font-bold text-gray-800">
                            {stage.title}
                            {isDisabled && !isLoading && (
                                <span className="ml-2 text-sm text-red-500 font-normal">
                                    {t("choosePage.error.missingQuestionnaire")}
                                </span>
                            )}
                        </h2>
                        <p className="text-center text-gray-500 text-md mt-1">
                            {stage.description}
                        </p>
                    </div>
                </div>
            </button>
        );
    };

    if (isLoading) {
        return (
            <ProtectedLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">{t("choosePage.loading")}</p>
                </div>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <div className="min-h-screen bg-gray-50">
                <AuthHeader />
                <main className="pt-30 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
                    <div className="max-w-xl text-center mb-10">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                            {t("choosePage.title")}
                        </h1>
                        <p className="text-xl text-gray-600">
                            {t("choosePage.description")}
                        </p>
                    </div>
                    <div className="flex flex-col space-y-6 w-full max-w-lg">
                        <StageButton stageKey="before" />
                        <StageButton stageKey="during" />
                        <StageButton stageKey="after" />
                    </div>
                </main>
            </div>
        </ProtectedLayout>
    );
}
