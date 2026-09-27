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
                        <button
                            className="
                                py-2 px-4 rounded-2xl
                                bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                                text-white font-bold
                                transition duration-100
                            "
                        >
                            {t("header.login")}
                        </button>
                    </Link>
                </div>
            </Header>

            {/* 主內容區塊 */}
            <main className="flex flex-col items-center px-6 py-10 pt-40 space-y-8 text-center">
                <h1 className="text-5xl font-bold text-gray-800">
                    {t("aboutPage.title")}
                </h1>

                <section className="text-xl md:text-lg text-gray-700 space-y-6 max-w-4xl text-left">

                    <h2 className="text-3xl font-bold mt-10">
                        {t("aboutPage.sectionQuestionnaire")}
                    </h2>

                    <table className="w-full border border-gray-400 mt-4">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-gray-400 px-4 py-2">
                                    {t("aboutPage.table.question")}
                                </th>
                                <th className="border border-gray-400 px-4 py-2">
                                    {t("aboutPage.table.version")}
                                </th>
                                <th className="border border-gray-400 px-4 py-2">
                                    {t("aboutPage.table.updatedAt")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-400 px-4 py-2">
                                    <a
                                        href="/slides/before.pptx"
                                        download
                                        className="text-blue-600 underline hover:text-blue-400"
                                    >
                                        {t("aboutPage.beforeModeling")}
                                    </a>
                                </td>
                                <td className="border border-gray-400 px-4 py-2">1.0</td>
                                <td className="border border-gray-400 px-4 py-2">2025-12-03</td>
                            </tr>

                            <tr>
                                <td className="border border-gray-400 px-4 py-2">
                                    <a
                                        href="/slides/before.pptx"
                                        download
                                        className="text-blue-600 underline hover:text-blue-400"
                                    >
                                        {t("aboutPage.duringModeling")}
                                    </a>
                                </td>
                                <td className="border border-gray-400 px-4 py-2">1.0</td>
                                <td className="border border-gray-400 px-4 py-2">2025-12-03</td>
                            </tr>

                            <tr>
                                <td className="border border-gray-400 px-4 py-2">
                                    <a
                                        href="/slides/after.docx"
                                        download
                                        className="text-blue-600 underline hover:text-blue-400"
                                    >
                                        {t("aboutPage.afterModeling")}
                                    </a>
                                </td>
                                <td className="border border-gray-400 px-4 py-2">1.0</td>
                                <td className="border border-gray-400 px-4 py-2">2025-12-03</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2 className="text-3xl font-bold mt-10">
                        {t("aboutPage.sectionLaw")}
                    </h2>

                    <p>{t("aboutPage.law.intro")}</p>

                    {/* --- I. 個資法 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.pdpa.title")}
                    </h3>

                    <p><strong>{t("aboutPage.law.pdpa.item1.title")}</strong></p>
                    <p>{t("aboutPage.law.pdpa.item1.law")}</p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item1.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item1.point2")}</li>
                        <li>{t("aboutPage.law.pdpa.item1.point3")}</li>
                    </ul>

                    <p><strong>{t("aboutPage.law.pdpa.item2.title")}</strong></p>
                    <p>{t("aboutPage.law.pdpa.item2.law")}</p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item2.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item2.point2")}</li>
                    </ul>

                    <p><strong>{t("aboutPage.law.pdpa.item3.title")}</strong></p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item3.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item3.point2")}</li>
                    </ul>

                    <p><strong>{t("aboutPage.law.pdpa.item4.title")}</strong></p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item4.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item4.point2")}</li>
                        <li>{t("aboutPage.law.pdpa.item4.point3")}</li>
                    </ul>

                    <p><strong>{t("aboutPage.law.pdpa.item5.title")}</strong></p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item5.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item5.point2")}</li>
                        <li>{t("aboutPage.law.pdpa.item5.point3")}</li>
                    </ul>

                    <p><strong>{t("aboutPage.law.pdpa.item6.title")}</strong></p>
                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.pdpa.item6.point1")}</li>
                        <li>{t("aboutPage.law.pdpa.item6.point2")}</li>
                    </ul>

                    {/* --- II. 智財權 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.ip.title")}
                    </h3>

                    <p><strong>{t("aboutPage.law.ip.item1.title")}</strong></p>
                    <p>{t("aboutPage.law.ip.item1.law")}</p>

                    <p><strong>{t("aboutPage.law.ip.item2.title")}</strong></p>
                    <p>{t("aboutPage.law.ip.item2.law")}</p>

                    <p><strong>{t("aboutPage.law.ip.item3.title")}</strong></p>

                    {/* --- III. 開放資料 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.opendata.title")}
                    </h3>

                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.opendata.point1")}</li>
                        <li>{t("aboutPage.law.opendata.point2")}</li>
                        <li>{t("aboutPage.law.opendata.point3")}</li>
                    </ul>

                    {/* --- IV. AI 責任歸屬 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.responsibility.title")}
                    </h3>

                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.responsibility.point1")}</li>
                        <li>{t("aboutPage.law.responsibility.point2")}</li>
                        <li>{t("aboutPage.law.responsibility.point3")}</li>
                    </ul>

                    {/* --- V. 使用者權益 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.userRights.title")}
                    </h3>

                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.userRights.point1")}</li>
                        <li>{t("aboutPage.law.userRights.point2")}</li>
                        <li>{t("aboutPage.law.userRights.point3")}</li>
                    </ul>

                    {/* --- VI. 資安 --- */}
                    <h3 className="text-2xl font-bold mt-6">
                        {t("aboutPage.law.cybersecurity.title")}
                    </h3>

                    <ul className="list-disc ml-6">
                        <li>{t("aboutPage.law.cybersecurity.point1")}</li>
                        <li>{t("aboutPage.law.cybersecurity.point2")}</li>
                        <li>{t("aboutPage.law.cybersecurity.point3")}</li>
                    </ul>

                </section>

                {/* 返回按鈕 */}
                <Link href="/">
                    <button
                        className="
                            mt-8 py-2 px-6 rounded-2xl
                            bg-gray-500 hover:bg-gray-400 active:bg-gray-600
                            text-white font-bold
                            transition duration-100
                        "
                    >
                        {t("aboutPage.back")}
                    </button>
                </Link>
            </main>
        </div>
    );
}
