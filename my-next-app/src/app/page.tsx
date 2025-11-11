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
                    <div>
                        {t('header.about')}
                    </div>


                    {/* login button */}
                    <Link href="/login" className='mr-3'>
                        <button className="
                        py-2 px-4 rounded-2xl
                        bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                        text-white font-bold
                        transition duration-100
                    ">
                            Login
                        </button>
                    </Link>
                </div>
            </Header>

            {/* header */}
            <div className="
            flex-col
            mb-10
            w-full h-fit
        ">
                <div className="
                flex justify-center items-end
                mt-50
                whitespace-nowrap
                text-7xl text-center
                text-gray-800
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

            {/* end */}
            <div className="
            flex justify-center items-center
            w-full h-70
            text-7xl text-center
        ">
                -end-
            </div>
        </div>
    );
}

function InfoBlock({ title, content }: { title: string, content: string }) {
    return (
        <div className="
            flex
            flex-col justify-center
        ">
            <div className="
                mb-5
                whitespace-nowrap
                text-center
                text-4xl
            ">
                {title}
            </div>
            <div className="
                text-center
                text-2xl

                md:w-150
                md:text-xl
            ">
                {content}
            </div>
        </div>
    )
}

function TaiIntroduction() {
    const { t } = useTranslation();
    return (
        <div>
            <div className="
                w-full grid grid-cols-2 gap-2
                md:grid md:grid-cols-4 md:gap-2
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
        <div className={taiStyle}>
            <div className="
                flex justify-center items-center h-full
                text-2xl font-bold
                md:h-fit
                md:py-4
            ">
                {title}
            </div>
            <div className="
                hidden

                md:flex md:justify-center md:items-center
                md:px-5
                md:text-left
            ">
                {content}
            </div>
        </div>
    )
}
