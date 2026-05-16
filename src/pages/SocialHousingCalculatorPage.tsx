import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

type ScenarioResult = {
    name: string;
    grossMonthly: number;
    netMonthly: number;
    netTotal: number;
};

function toCurrency(value: number) {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        maximumFractionDigits: 0,
    }).format(value);
}

function safeNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function SocialHousingCalculatorPage() {
    const [monthlyRent, setMonthlyRent] = useState('25000');
    const [leaseMonths, setLeaseMonths] = useState('12');
    const [socialDiscountPercent, setSocialDiscountPercent] = useState('20');
    const [socialMonthlySubsidy, setSocialMonthlySubsidy] = useState('0');
    const [pureRentSubsidy, setPureRentSubsidy] = useState('6000');
    const [monthlyCost, setMonthlyCost] = useState('1500');

    const report = useMemo(() => {
        const rent = safeNumber(monthlyRent);
        const months = Math.max(1, safeNumber(leaseMonths));
        const socialDiscount = Math.max(0, safeNumber(socialDiscountPercent));
        const socialSubsidy = safeNumber(socialMonthlySubsidy);
        const pureSubsidy = safeNumber(pureRentSubsidy);
        const cost = safeNumber(monthlyCost);

        const socialGross = rent * (1 - socialDiscount / 100) + socialSubsidy;
        const pureGross = rent + pureSubsidy;
        const noneGross = rent;

        const scenarios: ScenarioResult[] = [
            { name: '社宅方案', grossMonthly: socialGross, netMonthly: socialGross - cost, netTotal: (socialGross - cost) * months },
            { name: '純租屋補助', grossMonthly: pureGross, netMonthly: pureGross - cost, netTotal: (pureGross - cost) * months },
            { name: '無社宅/無補助', grossMonthly: noneGross, netMonthly: noneGross - cost, netTotal: (noneGross - cost) * months },
        ];

        const baseline = scenarios[2];
        const bestScenario = [...scenarios].sort((a, b) => b.netTotal - a.netTotal)[0];

        const reportText = [
            '社宅比較報告',
            '=======================',
            `月租金: ${toCurrency(rent)}`,
            `租期(月): ${months}`,
            `社宅折減(%): ${socialDiscount}%`,
            `社宅每月加成/補貼: ${toCurrency(socialSubsidy)}`,
            `純租屋補助(月): ${toCurrency(pureSubsidy)}`,
            `每月固定成本: ${toCurrency(cost)}`,
            '',
            '比較結果',
            ...scenarios.map((scenario) =>
                `${scenario.name} | 每月淨收入 ${toCurrency(scenario.netMonthly)} | 全期淨收入 ${toCurrency(scenario.netTotal)}`
            ),
            '',
            `建議優先方案: ${bestScenario.name}`,
            `相較無補助方案差額: ${toCurrency(bestScenario.netTotal - baseline.netTotal)}`,
        ].join('\n');

        return { scenarios, baseline, bestScenario, months, reportText };
    }, [monthlyRent, leaseMonths, socialDiscountPercent, socialMonthlySubsidy, pureRentSubsidy, monthlyCost]);

    function downloadReport() {
        const blob = new Blob([report.reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '社宅比較報告.txt';
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <nav className="border-b border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-blue-700">社宅計算工具</h1>
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-slate-600 hover:text-blue-600">PDF 編輯器</Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-4 md:p-8 grid gap-6">
                <section className="bg-white border border-slate-200 rounded-2xl p-6 grid md:grid-cols-2 gap-4">
                    {[
                        { label: '房屋原始月租金 (元)', value: monthlyRent, onChange: setMonthlyRent },
                        { label: '租約期數 (月)', value: leaseMonths, onChange: setLeaseMonths },
                        { label: '社宅折減比例 (%)', value: socialDiscountPercent, onChange: setSocialDiscountPercent },
                        { label: '社宅每月加成/補貼 (元)', value: socialMonthlySubsidy, onChange: setSocialMonthlySubsidy },
                        { label: '純租屋補助每月金額 (元)', value: pureRentSubsidy, onChange: setPureRentSubsidy },
                        { label: '每月固定成本 (元)', value: monthlyCost, onChange: setMonthlyCost },
                    ].map((field) => (
                        <label key={field.label} className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            {field.label}
                            <input
                                type="number"
                                min="0"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-base"
                            />
                        </label>
                    ))}
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h2 className="text-lg font-bold">三種方案比較表（給屋主確認）</h2>
                        <button
                            type="button"
                            onClick={downloadReport}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            下載報告
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-200 p-2 text-left">方案</th>
                                    <th className="border border-slate-200 p-2 text-right">每月總收入</th>
                                    <th className="border border-slate-200 p-2 text-right">每月淨收入</th>
                                    <th className="border border-slate-200 p-2 text-right">{report.months} 個月淨收入</th>
                                    <th className="border border-slate-200 p-2 text-right">相較無補助差額</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.scenarios.map((scenario) => (
                                    <tr key={scenario.name} className={scenario.name === report.bestScenario.name ? 'bg-emerald-50' : ''}>
                                        <td className="border border-slate-200 p-2">{scenario.name}</td>
                                        <td className="border border-slate-200 p-2 text-right">{toCurrency(scenario.grossMonthly)}</td>
                                        <td className="border border-slate-200 p-2 text-right">{toCurrency(scenario.netMonthly)}</td>
                                        <td className="border border-slate-200 p-2 text-right">{toCurrency(scenario.netTotal)}</td>
                                        <td className="border border-slate-200 p-2 text-right">
                                            {toCurrency(scenario.netTotal - report.baseline.netTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-2">摘要報告</h2>
                    <p className="text-slate-700 mb-1">建議優先方案：<span className="font-semibold text-blue-700">{report.bestScenario.name}</span></p>
                    <p className="text-slate-700">
                        相較「無社宅/無補助」，可多 {toCurrency(report.bestScenario.netTotal - report.baseline.netTotal)}（以整段租期計算）。
                    </p>
                </section>
            </main>
        </div>
    );
}
