"use client";
import Link from "next/link";
import Header from "@/components/Header";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col justify-center">
            {/* Header：保留標題與登入按鈕 */}
            <Header titleHref="/">
                <div className="flex justify-end space-x-5 items-center">
                    <Link href="/login" className="mr-3">
                        <button className="
              py-2 px-4 rounded-2xl
              bg-blue-500 hover:bg-blue-400 active:bg-blue-600
              text-white font-bold
              transition duration-100
            ">
                            {t("header.login")}
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
                </div>
            </div>
            {/* 主內容區塊 */}
            <main className="flex flex-col items-center px-6 py-10 space-y-8 text-center">
                <h1 className="text-5xl font-bold text-gray-800">
                    {t("aboutPage.title")}
                </h1>

                <section className="text-xl md:text-lg text-gray-700 space-y-6 max-w-3xl">
                    <p>{t("aboutPage.introduction")}</p>
                    <p>{t("aboutPage.mission")}</p>
                    <p>{t("aboutPage.values")}</p>
                    <p>{t("aboutPage.future")}</p>
                </section>

                {/* 返回按鈕 */}
                <Link href="/">
                    <button className="
            mt-8 py-2 px-6 rounded-2xl
            bg-gray-500 hover:bg-gray-400 active:bg-gray-600
            text-white font-bold
            transition duration-100
          ">
                        {t("aboutPage.back")}
                    </button>
                </Link>
            </main>
        </div>
    );
}
