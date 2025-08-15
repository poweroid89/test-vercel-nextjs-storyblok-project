import { getStoryblokApi } from '@storyblok/react/rsc';
import Image from 'next/image';

interface Rate {
    name: string;
    buy: string;
    sell: string;
}

interface Bank {
    name: string;
    logo?: { filename: string };
    rates?: Rate[];
}

interface BankListContent {
    name: string;
    banks?: Bank[];
}

export default async function Home() {
    const storyblokApi = getStoryblokApi();

    try {
        const { data } = await storyblokApi.get('cdn/stories/bank-list', {
            version: 'draft',
        });

        const content: BankListContent = data.story.content;

        return (
            <main className="container mx-auto p-4">
                <h1 className="text-3xl font-bold">{content.name}</h1>

                {content.banks && content.banks.length > 0 ? (
                    content.banks.map((bank, index) => (
                        <div key={index} className="mt-6">
                            <h2 className="text-2xl font-semibold">{bank.name}</h2>
                            {bank.logo?.filename && (
                                <Image
                                    src={bank.logo.filename}
                                    alt={bank.name}
                                    width={100}
                                    height={50}
                                    className="mt-2 mb-2"
                                />
                            )}

                            {bank.rates && bank.rates.length > 0 && (
                                <table className="table-auto mt-2 border border-gray-300">
                                    <thead>
                                    <tr className="bg-gray-200">
                                        <th className="px-4 py-2 border">Валюта</th>
                                        <th className="px-4 py-2 border">Купівля</th>
                                        <th className="px-4 py-2 border">Продаж</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {bank.rates.map((rate, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 border">{rate.name}</td>
                                            <td className="px-4 py-2 border">{rate.buy}</td>
                                            <td className="px-4 py-2 border">{rate.sell}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))
                ) : (
                    <p>Немає банків для відображення.</p>
                )}
            </main>
        );
    } catch (error) {
        return (
            <main className="container mx-auto p-4">
                <p>Перевірте, чи існує Story зі slug у Storyblok.</p>
            </main>
        );
    }
}

export const revalidate = 3600;
