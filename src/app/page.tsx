"use client";
import Link from 'next/link';
import Header from '@/components/Header';
import { useTranslation } from 'react-i18next';

export default function PreLoginPage() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col justify-center">
            <Header titleHref="/">
                <div className='flex justify-end space-x-5 items-center'>
                    {/* about button */}
                    <Link href="/about" className='mr-3'>
                        <button className="
                            py-2 px-4 rounded-2xl
                            bg-gray-500 hover:bg-gray-400 active:bg-gray-600
                            text-white font-bold
                            transition duration-100
                        ">
                            {t('header.about')}
                        </button>
                    </Link>


                    {/* login button */}
                    <Link href="/login" className='mr-3'>
                        <button className="
                        py-2 px-4 rounded-2xl
                        bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                        text-white font-bold
                        transition duration-100
                    ">
                            {t('header.login')}
                        </button>
                    </Link>
                </div>
            </Header>

            {/* header */}
            <div className="flex-col mb-16 w-full h-fit">
                <div className="
                    flex justify-center items-end
                    mt-25 md:mt-30
                    text-center
                    text-3xl sm:text-5xl md:text-6xl  
                    text-gray-800 font-extrabold 
                    leading-tight
                ">
                    {t('preloginPage.title')}
                </div>
            </div>

            {/* body */}
            <div className="
            w-full
            justify-center items-center
            px-5 space-y-12

            md:flex md:flex-col 
            ">
                <InfoBlock title={t('preloginPage.taiExplain')} content={t('preloginPage.taiExplainContent')} />
                <TaiIntroduction />
                <InfoBlock title={t("preloginPage.questionnairePurpose")} content={t("preloginPage.purposeContent")} />
            </div>
            <div className="
                flex justify-center items-center
                w-full
                py-16 sm:py-24 /* 使用 padding 來控制高度，讓它更靈活 */
                text-4xl sm:text-5xl md:text-6xl text-center /* 響應式字體 */
                text-gray-500 font-extrabold
            ">
                -end-
            </div>
        </div>
    );
}

function InfoBlock({ title, content }: { title: string, content: string }) {
    return (
        <div className="
            flex flex-col justify-center items-center
            w-full px-4 md:px-0
        ">
            <div className="
                mb-5
                text-center
                text-3xl md:text-4xl font-extrabold
                text-gray-700
            ">
                {title}
            </div>
            <div className="
                text-center
                text-lg sm:text-xl
                text-gray-600
                max-w-3xl
                leading-relaxed
            ">
                {content}
            </div>
        </div>
    )
}

function TaiIntroduction() {
    const { t } = useTranslation();
    return (
        <div className="w-full max-w-6xl mx-auto px-4"> 
            <div className="
                w-full grid 
                grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 /* 響應式調整 */
                gap-4 md:gap-6
            ">

                <TaiElement title={t("preloginPage.accuracy")} content={t("preloginPage.accuracyContent")} color="bg-blue-200" />
                <TaiElement title={t("preloginPage.reliability")} content={t("preloginPage.reliabilityContent")} color="bg-blue-200" />
                <TaiElement title={t("preloginPage.security")} content={t("preloginPage.securityContent")} color="bg-blue-200" />
                <TaiElement title={t("preloginPage.toughness")} content={t("preloginPage.toughnessContent")} color="bg-blue-200" />

                <TaiElement title={t("preloginPage.transparency")} content={t("preloginPage.transparencyContent")} color="bg-blue-300" />
                <TaiElement title={t("preloginPage.responsibility")} content={t("preloginPage.responsibilityContent")} color="bg-blue-300" />
                <TaiElement title={t("preloginPage.interpretability")} content={t("preloginPage.interpretabilityContent")} color="bg-blue-300" />
                <TaiElement title={t("preloginPage.autonomy")} content={t("preloginPage.autonomyContent")} color="bg-blue-300" />

                <TaiElement title={t("preloginPage.privacy")} content={t("preloginPage.privacyContent")} color="bg-blue-400" />
                <TaiElement title={t("preloginPage.fairness")} content={t("preloginPage.fairnessContent")} color="bg-blue-400" />
                <TaiElement title={t("preloginPage.informationSecurity")} content={t("preloginPage.informationSecurityContent")} color="bg-blue-400" />

            </div>
        </div>
    )
}

function TaiElement({ title, content, color }: { title: string, content: string, color: string }) {
    const taiStyle = "grow h-20\
        md:grow md:max-w-50 md:h-60 " + color;
    return (
        <div className={`
            flex flex-col p-4 md:p-6
            ${color} rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 /* 增加圓角和陰影 */
            h-auto min-h-[150px] md:min-h-[200px] 
        `}>
            <div className="
                text-center text-xl sm:text-2xl font-extrabold mb-2
                text-gray-800
                border-b border-gray-400/50 pb-2 
            ">
                {title}
            </div>
            <div className="
                text-sm md:text-base text-gray-700
                mt-2 overflow-hidden /* 確保內容不會溢出 */
            ">
                {content}
            </div>
        </div>
    )
}
