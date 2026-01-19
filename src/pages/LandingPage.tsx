import { Link } from 'react-router-dom';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-blue-600">EditPdf</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link to="/app" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
                                進入編輯器
                            </Link>
                            <Link
                                to="/app"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                立即開始
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-slate-900">
                        簡單、快速、安全的 <span className="text-blue-600">PDF 編輯器</span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                        無需上傳檔案到伺服器。完全在您的瀏覽器中運行，確保您的文件 100% 安全隱私。
                        支援簽名、標註、螢光筆等多種功能。
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link
                            to="/app"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-4 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
                        >
                            免費開始使用
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                title: '隱私優先',
                                desc: '本機處理，檔案不離手。',
                                icon: (
                                    <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )
                            },
                            {
                                title: '功能強大',
                                desc: '簽名、畫筆、圖片插入、螢光筆。',
                                icon: (
                                    <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                )
                            },
                            {
                                title: '極速體驗',
                                desc: '輕量化設計，瞬間開啟，無廣告。',
                                icon: (
                                    <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                )
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-xl transition-all">
                                {feature.icon}
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 text-center">
                <div className="max-w-7xl mx-auto px-4">
                    <p>&copy; 2026 EditPdf. Powerful, Privacy-First PDF Editor.</p>
                </div>
            </footer>
        </div>
    );
}
